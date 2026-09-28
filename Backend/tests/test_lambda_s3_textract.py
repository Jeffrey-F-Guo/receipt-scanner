import os
import sys
import unittest
from unittest.mock import MagicMock, patch

# Module creates boto3 clients at import time; they need a region but no credentials.
os.environ.setdefault('AWS_DEFAULT_REGION', 'us-west-1')
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import lambda_s3_textract as handler  # noqa: E402


def s3_event(key='uploads/receipt_abc.jpg', bucket='clean-bucket'):
    return {'Records': [{'s3': {'bucket': {'name': bucket}, 'object': {'key': key}}}]}


TEXTRACT_RESPONSE = {
    'ExpenseDocuments': [{
        'SummaryFields': [
            {'Type': {'Text': 'TOTAL'}, 'ValueDetection': {'Text': '$23.47'}},
            {'Type': {'Text': 'VENDOR_NAME'}, 'ValueDetection': {'Text': "Trader Joe's"}},
        ],
        'LineItemGroups': [{'LineItems': [{'LineItemExpenseFields': [
            {'Type': {'Text': 'ITEM'}, 'ValueDetection': {'Text': 'BANANAS'}},
            {'Type': {'Text': 'PRICE'}, 'ValueDetection': {'Text': '$0.95'}},
        ]}]}],
    }],
}


class LambdaHandlerTest(unittest.TestCase):
    def setUp(self):
        self.s3 = MagicMock()
        self.s3.head_object.return_value = {
            'Metadata': {'connectionid': 'conn-1', 'fileid': 'file-1'},
        }
        self.textract = MagicMock()
        self.textract.analyze_expense.return_value = TEXTRACT_RESPONSE
        self.gateway = MagicMock()
        for name, mock in [('s3_client', self.s3), ('textract_client', self.textract),
                           ('gateway_client', self.gateway)]:
            patcher = patch.object(handler, name, mock)
            patcher.start()
            self.addCleanup(patcher.stop)

    def test_success_posts_parsed_receipt_to_the_uploader(self):
        result = handler.lambda_handler(s3_event(), None)

        self.assertEqual(result, {'statusCode': 200})
        self.textract.analyze_expense.assert_called_once()
        kwargs = self.gateway.post_to_connection.call_args.kwargs
        self.assertEqual(kwargs['ConnectionId'], 'conn-1')
        self.assertIn('"fileId": "file-1"', kwargs['Data'])
        self.assertIn('"statusCode": 200', kwargs['Data'])

    def test_key_outside_uploads_dir_stops_before_any_aws_call(self):
        result = handler.lambda_handler(s3_event(key='finished/receipt_abc.jpg'), None)

        self.assertEqual(result, {'statusCode': 400})
        self.s3.head_object.assert_not_called()
        self.textract.analyze_expense.assert_not_called()
        self.gateway.post_to_connection.assert_not_called()

    def test_missing_upload_metadata_stops_without_calling_textract(self):
        self.s3.head_object.return_value = {'Metadata': {}}

        result = handler.lambda_handler(s3_event(), None)

        self.assertEqual(result, {'statusCode': 400})
        self.textract.analyze_expense.assert_not_called()
        self.gateway.post_to_connection.assert_not_called()

    def test_malformed_event_returns_400(self):
        result = handler.lambda_handler({}, None)

        self.assertEqual(result, {'statusCode': 400})
        self.s3.head_object.assert_not_called()


class TextractClientConfigTest(unittest.TestCase):
    def test_textract_client_retries_throttling_adaptively(self):
        retries = handler.textract_client.meta.config.retries
        self.assertEqual(retries['mode'], 'adaptive')
        self.assertGreaterEqual(retries['total_max_attempts'], 5)


if __name__ == '__main__':
    unittest.main()
