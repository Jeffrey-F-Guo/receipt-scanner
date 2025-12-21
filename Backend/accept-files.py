"""
Lambda function to give permission to frontend to upload files to s3.
"""

import logging
import boto3
from botocore.exceptions import ClientError
from botocore.config import Config
import os
from dotenv import load_dotenv
import json

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def lambda_handler(event, context):
    # file data is received from the event
    bucket_name = os.getenv('BUCKET_NAME')
    s3_client = boto3.client(
        "s3",
        region_name='us-west-1',
        aws_access_key_id=os.getenv('ACCESS_KEY'),
        aws_secret_access_key=os.getenv('SECRET_KEY'),
        config=Config(signature_version="s3v4")
    )


    presigned_urls = {}
    files = event['files']
    # for file in files:
    #     hash = gen_hash(file)
    #     cached = check_cache(hash)
    #     if not cached:
    #         url = generate_s3_urls(file)
    #         s3_urls.append(url)
    #     else:
    #         # retreive from dynamo
    #         x=0
    valid_content_types = {'image/jpeg', 'image/png', 'application/pdf'}
    for file in files:
        file_type = file['contenttype'] 
        if file_type not in valid_content_types:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': f'File {file['filename']} is not an image or pdf'})
            }
        if file['size'] > 10485760: # 10MB
            return {
                'statusCode': 400,
                'body': json.dumps({'error': f'File {file['filename']} is over the 10MB limit'})
            }
        
        s3_object_key = f"receipt_{file['uuid']}"
        url = generate_presigned_put(s3_client, bucket_name, s3_object_key, file_type, 3600)
        presigned_urls[file['uuid']] = url
    return {
        'statusCode': 200,
        'body': json.dumps({'urls': presigned_urls})
    }



# later. need for cacheing
def gen_hash():
    # generate hash of the file based on it's name, size, data, and metadata
    pass

def check_cache(hash):
    # check dynamodb to see if the current file has been processed within the last 24 hours
    # return a json: {True, data} or {False, blah blah}
    pass



def generate_presigned_put(s3_client, bucket, key, contenttype, expires_in):
    """
    Generate a presigned Amazon S3 URL that can be used to perform an action.
    
    :param s3_client: A Boto3 Amazon S3 client.
    :param client_method: The name of the client method that the URL performs.
    :param method_parameters: The parameters of the specified client method.
    :param expires_in: The number of seconds the presigned URL is valid for.
    :return: The presigned URL.
    """
    try:
        url = s3_client.generate_presigned_url(
            ClientMethod='put_object',
            Params={
                'Bucket': bucket,
                'Key': key,
                'ContentType': contenttype
            }, 
            ExpiresIn=expires_in,
        )
    except ClientError:
        print(f"Couldn't get a presigned POST URL '.")
        raise
    return url

def main():
    bucket_name = os.getenv('BUCKET_NAME')
    s3_object_key = "finalpythontest.txt"
    s3_client = boto3.client(
        "s3",
        region_name='us-west-1',
        aws_access_key_id=os.getenv('ACCESS_KEY'),
        aws_secret_access_key=os.getenv('SECRET_KEY'),
        config=Config(signature_version="s3v4")
    )
    
    # The presigned URL is specified to expire in 1000 seconds
    url = generate_presigned_put(
        s3_client,
        bucket_name,
        s3_object_key,
        3600
    )


if __name__ == "__main__":
    main()
