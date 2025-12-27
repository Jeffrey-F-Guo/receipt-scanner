"""
File to experiment with textract before deployment
"""


"""
NOTES:
In the real version lambda can send s3 urls rather than the entire file, triggering textract extraction
"""

import boto3
from pydantic import BaseModel, ValidationError
import logging
from typing import List, Dict, Any, Optional
import json

logger = logging.getLogger(__name__)

file = 'receipts.jpg'

client = boto3.client('textract')


class ReceiptItem(BaseModel):
    item_name: str
    price: str # NOTE: maybe change to float in the future if math is needed

class Receipt(BaseModel):
    store_name: Optional[str] = None
    date: Optional[str] = None
    items: List[ReceiptItem]
    total: str


class InvalidTextractResponse(Exception):
    """Exception raised for invalid AWS Textract response format. """
    def __init__(self, missing_field: str, 
                message='Invalid AWS Textract response format. Missing key fields:'):
        self.missing_field = missing_field
        self.message = message

        super().__init__(self.message)

    def __str__(self):
        return f"{self.message} {self.missing_field} "

def extract_single_file(file: str) -> Dict[str, Any]:
    """
    Extract and parse receipt data from a single file.

    Args:
        file: Path to the receipt image file

    Returns:
        Dictionary with 'statusCode' and 'body' keys containing parsed receipt data or error
    """
    if not file:
        logger.error("No file provided")
        return {
            'statusCode': 400,
            'body': json.dumps({'error': 'No file provided'})
        }

    try:
        with open(file, 'rb') as f:
            file_byte_data = f.read()

            response: Dict[str, Any] = client.analyze_expense(
                Document = {
                    'Bytes': file_byte_data
                }
            )
            print(response)
            try:
                cleaned_text = parse_extracted_text(response)
                return {
                    'statusCode': 200,
                    'body': json.dumps(cleaned_text)
                }
            except InvalidTextractResponse as e:
                # catch format errors
                logger.error(f"Invalid Textract response format: {e}")
                return {
                    'statusCode': 400,
                    'body': json.dumps({'error': f'Invalid response format: {str(e)}'})
                }
            except Exception as e:
                # general unexpected errors during parsing
                logger.error(f'Error parsing Textract response: {e}', exc_info=True)
                return {
                    'statusCode': 500,
                    'body': json.dumps({'error': 'Failed to parse receipt data'})
                }
    except FileNotFoundError as e:
        logger.error(f"File not found: {file}")
        return {
            'statusCode': 404,
            'body': json.dumps({'error': f'File not found: {file}'})
        }
    except Exception as e:
        logger.error(f'Error reading file or calling Textract: {e}', exc_info=True)
        return {
            'statusCode': 500,
            'body': json.dumps({'error': 'Failed to process file'})
        }


def parse_extracted_text(textract_response: Dict[str, Any]) -> List[str]:
    """
    Parse Textract response into structured receipt data.

    Args:
        textract_response: Raw response from Textract analyze_expense call

    Returns:
        List of JSON strings, each representing a parsed receipt

    Raises:
        InvalidTextractResponse: If response format is invalid
    """

    expense_docs = get_expense_documents(textract_response)
    parsed_docs: List[str] = []

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

################
# GETTER METHODS
################
def get_num_documents(textract_response: Dict[str, Any]) -> int:
    """
    Get the number of pages in the document.

    Args:
        textract_response: Raw Textract response

    Returns:
        Number of pages processed

    Raises:
        InvalidTextractResponse: If DocumentMetadata is missing
    """
    if 'DocumentMetadata' not in textract_response:
        logger.error('Textract response missing DocumentMetadata')
        raise InvalidTextractResponse('DocumentMetadata')
    return textract_response['DocumentMetadata']['Pages']


def get_expense_documents(textract_response: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Extract ExpenseDocuments from Textract response.

    Args:
        textract_response: Raw Textract response

    Returns:
        List of expense document dictionaries

    Raises:
        InvalidTextractResponse: If ExpenseDocuments is missing
    """
    if 'ExpenseDocuments' not in textract_response:
        logger.error('Textract response missing ExpenseDocuments')
        raise InvalidTextractResponse('ExpenseDocuments')
    return textract_response['ExpenseDocuments']


def get_summary_fields(expense_doc: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Extract SummaryFields from an expense document.
    SummaryFields: Information found outside of a table by Amazon Textract.

    Args:
        expense_doc: Single expense document from Textract

    Returns:
        List of summary field dictionaries

    Raises:
        InvalidTextractResponse: If SummaryFields is missing
    """
    if 'SummaryFields' not in expense_doc:
        logger.error('Expense document missing SummaryFields')
        raise InvalidTextractResponse('SummaryFields')
    return expense_doc['SummaryFields']


def get_line_item_groups(expense_doc: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Extract LineItemGroups from an expense document.
    LineItemGroups: Tabular data extracted by Amazon Textract.

    Args:
        expense_doc: Single expense document from Textract

    Returns:
        List of line item group dictionaries

    Raises:
        InvalidTextractResponse: If LineItemGroups is missing
    """
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
                # not using default EXPENSE_ROW tag from textract because it has unneeded data for our purpose
                row: Dict[str, str] = {}
                for field in expense_fields:
                    value = field['ValueDetection']['Text']
                    if ((field_label := field['Type']['Text']) == 'ITEM'):
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



if __name__ == '__main__':
    file_content = extract_single_file(file)
    print()
    print(file_content)