import json
import boto3
import logging
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


def lambda_handler(event, context):
    logger.info(f'Event: {event}')
    socket_id = event['requestContext']['connectionId']
    apigateway_client = boto3.client(
        'apigatewaymanagementapi', 
        endpoint_url='https://apbvj306i8.execute-api.us-west-1.amazonaws.com/dev/'
    )

    apigateway_client.post_to_connection(
            ConnectionId=socket_id,
            Data="Hello from lambda"
        )
    return {'statusCode': 200}
