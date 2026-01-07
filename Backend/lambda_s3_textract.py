"""
Lambda function triggered by S3 object creation.
Processes receipts using AWS Textract.

S3 Event Structure:
{
  'Records': [
    {
      's3': {
        'bucket': {'name': 'bucket-name'},
        'object': {'key': 'receipt_UUID.jpg'}
      }
    }
  ]
}
"""

import boto3
import json
import logging
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, ValidationError
from botocore.config import Config

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

UPLOAD_DIR_NAME = 'uploads/'
FINISHED_DIR_NAME = 'finished/'

# AWS client init
s3_client = boto3.client('s3', config=Config(signature_version="s3v4"))
gateway_client = boto3.client(
    'apigatewaymanagementapi', 
    endpoint_url='https://bdoyue9pj6.execute-api.us-west-1.amazonaws.com/dev/'
)
textract_client = boto3.client('textract')

# Data classes
class ReceiptItem(BaseModel):
    item_name: str
    price: str


class Receipt(BaseModel):
    store_name: Optional[str] = None
    date: Optional[str] = None
    items: List[ReceiptItem]
    total: str


# AWS textract exception
class InvalidTextractResponse(Exception):
    """Exception raised for invalid AWS Textract response format."""
    def __init__(self, missing_field: str,
                message='Invalid AWS Textract response format. Missing key fields:'):
        self.missing_field = missing_field
        self.message = message
        super().__init__(self.message)

    def __str__(self):
        return f"{self.message} {self.missing_field}"


def lambda_handler(event, context):
    """
    Lambda handler triggered by S3 object creation.

    Args:
        event: S3 event containing bucket name and object key
        context: Lambda context object

    Returns:
        Response with statusCode and body
    """

    # Extract S3 information from event
    try:
        record = event['Records'][0]
        bucket = record['s3']['bucket']['name']
        key = record['s3']['object']['key']

        output_body = {}

        if not key.startswith(UPLOAD_DIR_NAME):
            logger.error(f"Invalid s3 key: {key}. Object must be from the {UPLOAD_DIR_NAME} directory.")
            output_body =  {
                'statusCode': 400,
                'body': {'error': 'Invalid S3 object key'}
            }   

        # Check S3 object for valid metadata
        response = s3_client.head_object(Key=key, Bucket=bucket)
        logger.info(f"Head object response: {response}")
        metadata = response['Metadata']
        connection_id = metadata['connectionid']
        file_id = metadata['fileid']
        
        logger.info(f"Processing S3 object: s3://{bucket}/{key}")

    except (KeyError, IndexError) as e:
        logger.error(f"Invalid S3 event structure: {e}")
        output_body =  {
            'statusCode': 400,
            'body': {'error': 'Invalid S3 event'}
        }




    # Process receipt with Textract
    try:
        # Call Textract with S3 reference
        logger.info("Calling Textract analyze_expense...")
        response = textract_client.analyze_expense(
            Document={
                'S3Object': {
                    'Bucket': bucket,
                    'Name': key
                }
            }
        )

        logger.info("Textract analysis complete, parsing results...")
        parsed_receipts = parse_extracted_text(response)

        if not parsed_receipts:
            # Valid execution, but useless result
            output_body = {
                'statusCode': 422,
                'error': {'message': 'No receipt data found in image.'}
            }
        else:
            # Success
            output_body = {
                'statusCode': 200,
                'data': parsed_receipts,
            }
            logger.info(f"Successfully parsed {len(parsed_receipts)} receipt(s)")


    except InvalidTextractResponse as e:
        logger.error(f"Invalid Textract response: {e}")
        output_body =  {
            'statusCode': 400,
            'body': {'error': f"Invalid Textract response: {e}"}
        }

    except Exception as e:
        logger.error(f"Error processing receipt: {e}", exc_info=True)
        output_body = {
            'statusCode': 500,
            'body': {'error': 'Internal processing error.'}
        }
    

    # Always write to websocket to notify frontend of request status
    try:
        gateway_client.post_to_connection(
            ConnectionId=connection_id,
            Data=json.dumps(
                {
                    'body': output_body,
                    'type': 'extractText',
                    'fileId': file_id
                }
            ) 
        )

    except Exception as e:
        logger.error(f'Failed to write to socket: {e}')
        return {
            'statusCode': 500,
        }
    
    return {
            'statusCode': 200,
        }

# ===========================
# TEXTRACT PARSING FUNCTIONS
# ===========================

def parse_extracted_text(textract_response: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Parse Textract response into structured receipt data.

    Args:
        textract_response: Raw response from Textract analyze_expense call

    Returns:
        List of dictionaries, each representing a parsed receipt

    Raises:
        InvalidTextractResponse: If response format is invalid
    """

    expense_docs = get_expense_documents(textract_response)
    parsed_docs: List[Dict[str, Any]] = []

    # Every expense doc has a summary and lineitems
    for i, doc in enumerate(expense_docs):
        try:
            summary_fields = get_summary_fields(doc)
            parsed_fields = parse_summaryfields(summary_fields)

            line_item_groups = get_line_item_groups(doc)
            parsed_item_group = parse_lineitemgroups(line_item_groups)

            receipt = {
                **parsed_fields,
                'items': parsed_item_group
            }

            Receipt.model_validate(receipt)
            parsed_docs.append(receipt)

        except ValidationError as e:
            logger.warning(f"Failed to validate receipt document {i}: {e}")
            continue

    return parsed_docs


def get_expense_documents(textract_response: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Extract ExpenseDocuments from Textract response."""
    if 'ExpenseDocuments' not in textract_response:
        logger.error('Textract response missing ExpenseDocuments')
        raise InvalidTextractResponse('ExpenseDocuments')
    return textract_response['ExpenseDocuments']


def get_summary_fields(expense_doc: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Extract SummaryFields from an expense document."""
    if 'SummaryFields' not in expense_doc:
        logger.error('Expense document missing SummaryFields')
        raise InvalidTextractResponse('SummaryFields')
    return expense_doc['SummaryFields']


def get_line_item_groups(expense_doc: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Extract LineItemGroups from an expense document."""
    if 'LineItemGroups' not in expense_doc:
        logger.error('Expense document missing LineItemGroups')
        raise InvalidTextractResponse('LineItemGroups')
    return expense_doc['LineItemGroups']


def parse_lineitemgroups(line_item_groups: List[Dict[str, Any]]) -> List[Dict[str, str]]:
    """
    Parse line item groups into a list of receipt items.

    Args:
        line_item_groups: List of line item group dictionaries from Textract

    Returns:
        List of dictionaries with 'item_name' and 'price' keys

    Raises:
        InvalidTextractResponse: If line item structure is invalid
    """
    item_list: List[Dict[str, str]] = []

    try:
        for item_group in line_item_groups:
            line_items = item_group['LineItems']

            # a single line has a list of fields
            for line in line_items:
                expense_fields = line['LineItemExpenseFields']

                # container to hold the data for a single expense row
                row: Dict[str, str] = {}
                for field in expense_fields:
                    value = field['ValueDetection']['Text']
                    field_label = field['Type']['Text']

                    if field_label == 'ITEM':
                        row['item_name'] = value
                    elif field_label == 'PRICE':
                        row['price'] = value

                # if pydantic says the row representation is good, add it to parsed list
                try:
                    ReceiptItem.model_validate(row)
                    item_list.append(row)
                except ValidationError as e:
                    logger.info(f"Skipping invalid line item: {e}")
                    continue

    except KeyError as e:
        logger.error(f"Missing expected key in line item structure: {e}")
        raise InvalidTextractResponse(f"LineItems - missing key: {str(e)}")
    except Exception as e:
        logger.error(f"Error parsing line items: {e}", exc_info=True)
        raise InvalidTextractResponse(f"LineItems - parsing error: {str(e)}")

    return item_list


def parse_summaryfields(summary_fields: List[Dict[str, Any]]) -> Dict[str, str]:
    """
    Parse summary fields to extract key receipt information.

    Args:
        summary_fields: List of summary field dictionaries from Textract

    Returns:
        Dictionary with keys: 'date', 'total', 'store_name' (any or all may be present)

    Raises:
        InvalidTextractResponse: If summary field structure is invalid
    """
    important_fields: Dict[str, str] = {}

    # hardcoded map of values to look for in the summary part
    type_map = {
        'INVOICE_RECEIPT_DATE': 'date',
        'TOTAL': 'total',
        'VENDOR_NAME': 'store_name',
    }

    try:
        for summary in summary_fields:
            summary_type = summary['Type']['Text']
            if summary_type in type_map:
                value = summary['ValueDetection']['Text']
                important_fields[type_map[summary_type]] = value

    except KeyError as e:
        logger.error(f"Missing expected key in summary field structure: {e}")
        raise InvalidTextractResponse(f"SummaryFields - missing key: {str(e)}")
    except Exception as e:
        logger.error(f"Error parsing summary fields: {e}", exc_info=True)
        raise InvalidTextractResponse(f"SummaryFields - parsing error: {str(e)}")

    return important_fields
