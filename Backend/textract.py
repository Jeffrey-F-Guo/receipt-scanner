"""
File to experiment with textract before deployment
"""


"""
NOTES:
In the real version lambda can send s3 urls rather than the entire file, triggering textract extraction


"""

import boto3

file = 'test-receipt.jpeg'

client = boto3.client('textract')



def extract_single_file():
    if file:
        with open(file, 'rb') as f:
            file_byte_data = f.read()

            response = client.analyze_expense(
                Document = {
                    'Bytes': file_byte_data
                }
            )

            parse_extracted_text(response)


def parse_extracted_text(response):
    expenses = response['ExpenseDocuments'][0]['Blocks']
    for entry in expenses:
        print(entry)
        print()
def extract_multiple_files():
    # concurrency!
    # prolly async tbh
    pass

if __name__ == '__main__':
    extract_single_file()