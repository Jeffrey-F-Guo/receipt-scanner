
from typing import Dict, Any, List, Set, Optional, Tuple
import logging
# from dotenv import load_dotenv
import os
import json
from uuid import uuid4
from dataclasses import dataclass

import boto3

from botocore.config import Config
from botocore.exceptions import ClientError

# load_dotenv()

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

MAX_FILE_SIZE = 10 * 1024 * 1024 # 10MB
ALLOWED_TYPES = {'image/jpeg', 'image/jpg', 'image/png', 'application/pdf'}
UPLOAD_DIR_NAME = 'uploads/'

@dataclass
class FileObj:
    filename: str
    filetype: str
    filesize: int

# ==================
# S3 client Handling
# ==================
_s3_client: Optional[Any] = None
_gateway_client: Optional[Any] = None

# Singleton pattern!
def get_s3_client():
    global _s3_client
    if not _s3_client:
        try:
            _s3_client = boto3.client(
                's3',
                # Use lambda's local environment for prod
                # region_name=os.getenv('AWS_REGION'),
                # aws_access_key_id=os.getenv('ACCESS_KEY'),
                # aws_secret_access_key=os.getenv('SECRET_KEY'),
                config=Config(signature_version="s3v4")
            )
        except ClientError:
            logger.error('Failed to create s3 client')
        
    return _s3_client

def get_gateway_client():
    global _gateway_client
    if not _gateway_client:
        _gateway_client = boto3.client(
            'apigatewaymanagementapi', 
            endpoint_url='https://bdoyue9pj6.execute-api.us-west-1.amazonaws.com/dev/'
        )
    return _gateway_client
# ==================
# Validation
# ==================
# Pydantic would be better....future refactor?
def validate_file(allowed_types: Set, file_obj: FileObj) -> Tuple[bool, str]:
    # smaller than max size
    if file_obj.filesize > MAX_FILE_SIZE:
        return (
            False,
            f'Error: {file_obj.filename} is over the 10MB limit'
        )
    # one of the valid formats
    elif file_obj.filetype not in allowed_types:
        return (
            False,
            f'Error: {file_obj.filename} is not a jpg, png, or pdf'
        )
    return (
        True,
        'Success'
    )

# ============================
# Helper functions for url gen
# ============================
def validate_file_obj(file_entry: Dict[str, Any]) -> bool:
    if 'name' not in file_entry:
        return False
    if 'type' not in file_entry:
        return False
    if 'size' not in file_entry:
        return False
    return True


def get_file_extension(filename: str) -> str:
    file_extension = filename.split('.')[-1]
    return file_extension if file_extension else ""



# ==============
# Url generation
# ==============

def create_object_key(filename: str) -> str:
    file_extension = get_file_extension(filename)
    if file_extension == "":
        return ""
    uuid = str(uuid4())
    object_key = f'{UPLOAD_DIR_NAME}receipt_{uuid}.{file_extension}'
    return object_key


def generate_presigned_put_url(s3_client, bucket: str, object_key: str, connectionId:str, content_type: str, expires_in: int) -> Optional[str]:
    try:
        url = s3_client.generate_presigned_url(
            ClientMethod='put_object',
            Params={
                'Bucket': bucket,
                'Key': object_key,
                'Metadata': {'connectionId': connectionId},
                'ContentType': content_type,
            },
            ExpiresIn=expires_in
        )
        return url
    except ClientError as e:
        logger.error(f'Failed to generate presigned url: {e}')
        return None



def lambda_handler(event: Dict[str, Any], context) -> Dict[str, Any]:
    logger.info(f'Event: {event}')
    bucket = os.getenv('BUCKET_NAME')
    if not bucket:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': 'BUCKET_NAME not configured'})
        }
    

    body = json.loads(event['body'])
    if 'files' not in body:
        return {
            'statusCode': 400,
            'body': json.dumps({'error': 'Missing files array'})
        }
    
    files = body['files']
    connectionId = event['requestContext']['connectionId']

    s3_client = get_s3_client()
    gateway_client = get_gateway_client()
    if not s3_client:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': 'Failed to initialize S3 client'})
        }
    if not gateway_client:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': 'Failed to initialize gateway client'})
        }

    presigned_urls: Dict[str, str] = {}
    for file_data in files:
        if not validate_file_obj(file_data):
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'Error: incoming data is incorrect format'})
            }

        # file_obj must have the expected fields
        filename = file_data['name']
        filetype = file_data['type']
        filesize = file_data['size']

        logger.info(f'filename: {filename}, filetype: {filetype}, filesize: {filesize}')
        file_obj = FileObj(
            filename=filename,
            filetype=filetype,
            filesize=filesize
        )

        is_valid_file, error_msg = validate_file(ALLOWED_TYPES, file_obj)

        if not is_valid_file:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': error_msg})
            }

        object_key = create_object_key(filename)
        if object_key == "":
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'Could not create object key'})
            }

        url = generate_presigned_put_url(
            s3_client=s3_client, 
            bucket=bucket, 
            object_key=object_key, 
            connectionId=connectionId,
            content_type=filetype,
            expires_in=3600
        )

        if url:
            presigned_urls[filename] = url
        
    gateway_client.post_to_connection(
        ConnectionId = connectionId,
        Data = json.dumps(
            {
                'file_urls': presigned_urls,
                'type': 'presignedUrls',
                'connectionId': connectionId
            }
        )
    )

    return {
        'statusCode': 200,
    }
