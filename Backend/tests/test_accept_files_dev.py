import importlib.util
import json
import os
import unittest
from unittest.mock import MagicMock, patch

from botocore.exceptions import ClientError

# File name has hyphens, so it can't be imported normally.
_PATH = os.path.join(os.path.dirname(__file__), '..', 'accept-files-dev.py')
_spec = importlib.util.spec_from_file_location('accept_files_dev', _PATH)
handler = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(handler)

VALID_FILE = {'id': 'file-1', 'name': 'receipt.jpg', 'type': 'image/jpeg', 'size': 1024}


def ws_event(body, connection_id='conn-1'):
    raw = body if isinstance(body, str) else json.dumps(body)
    return {'body': raw, 'requestContext': {'connectionId': connection_id}}


class AcceptFilesTest(unittest.TestCase):
    def setUp(self):
        self.s3 = MagicMock()
        self.s3.generate_presigned_url.return_value = 'https://signed.example/put'
        self.gateway = MagicMock()
        for name, value in [('get_s3_client', lambda: self.s3),
                            ('get_gateway_client', lambda: self.gateway)]:
            patcher = patch.object(handler, name, value)
            patcher.start()
            self.addCleanup(patcher.stop)
        env = patch.dict(os.environ, {'BUCKET_NAME': 'uploads-bucket'})
        env.start()
        self.addCleanup(env.stop)

    def sent(self):
        """Messages posted to the browser, decoded."""
        return [json.loads(c.kwargs['Data']) for c in self.gateway.post_to_connection.call_args_list]

    def assert_rejected(self, result, status, error_substring):
        self.assertEqual(result['statusCode'], status)
        messages = self.sent()
        self.assertEqual(len(messages), 1)
        self.assertEqual(messages[0]['type'], 'presignError')
        self.assertIn(error_substring, messages[0]['error'])
        self.assertEqual(self.gateway.post_to_connection.call_args.kwargs['ConnectionId'], 'conn-1')

    def test_success_sends_presigned_urls(self):
        result = handler.lambda_handler(ws_event({'files': [VALID_FILE]}), None)

        self.assertEqual(result['statusCode'], 200)
        [message] = self.sent()
        self.assertEqual(message['type'], 'presignedUrls')
        self.assertEqual(message['file_urls'], {'receipt.jpg': 'https://signed.example/put'})

    def test_missing_id_is_rejected_instead_of_crashing(self):
        file_without_id = {k: v for k, v in VALID_FILE.items() if k != 'id'}

        result = handler.lambda_handler(ws_event({'files': [file_without_id]}), None)

        self.assert_rejected(result, 400, 'incorrect format')
        self.s3.generate_presigned_url.assert_not_called()

    def test_oversized_file_error_reaches_the_browser(self):
        big = dict(VALID_FILE, size=11 * 1024 * 1024)

        result = handler.lambda_handler(ws_event({'files': [big]}), None)

        self.assert_rejected(result, 400, 'receipt.jpg is over the 10MB limit')

    def test_wrong_type_error_reaches_the_browser(self):
        gif = dict(VALID_FILE, name='a.gif', type='image/gif')

        result = handler.lambda_handler(ws_event({'files': [gif]}), None)

        self.assert_rejected(result, 400, 'a.gif is not a jpg, png, or pdf')

    def test_missing_files_array_is_rejected(self):
        result = handler.lambda_handler(ws_event({}), None)

        self.assert_rejected(result, 400, 'Missing files array')

    def test_non_json_body_is_rejected_instead_of_crashing(self):
        result = handler.lambda_handler(ws_event('not json'), None)

        self.assert_rejected(result, 400, 'incorrect format')

    def test_missing_bucket_config_is_reported(self):
        with patch.dict(os.environ, {}, clear=True):
            result = handler.lambda_handler(ws_event({'files': [VALID_FILE]}), None)

        self.assert_rejected(result, 500, 'not configured')

    def test_presign_failure_is_reported_instead_of_silently_dropping_the_file(self):
        self.s3.generate_presigned_url.side_effect = ClientError(
            {'Error': {'Code': 'AccessDenied', 'Message': 'denied'}}, 'GeneratePresignedUrl')

        result = handler.lambda_handler(ws_event({'files': [VALID_FILE]}), None)

        self.assert_rejected(result, 500, 'receipt.jpg')


if __name__ == '__main__':
    unittest.main()
