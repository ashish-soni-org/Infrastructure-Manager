import os
import json
import boto3
from botocore.exceptions import ClientError

# Configuration from Environment Variables
REGION = os.getenv("AWS_REGION")
ACTION = os.getenv("ACTION_TYPE")
SECRET_NAME = os.getenv("SECRET_FILE_NAME")
RUNNER_NAME = os.getenv("SELF_HOSTED_RUNNER")

# Constants
CREATE_ACTION = "CREATE_NEW_RUNNER"

def get_client():
    return boto3.client("secretsmanager", region_name=REGION)

def handle_secret():
    client = get_client()
    
    secret_payload = {
        "runner": RUNNER_NAME,
        "repos": {}
    }
    secret_string = json.dumps(secret_payload)

    try:
        if ACTION == CREATE_ACTION:
            try:
                client.create_secret(
                    Name=SECRET_NAME,
                    SecretString=secret_string,
                    Description="GitHub Self-Hosted Runner Metadata"
                )
                print(f"Successfully created new secret: {SECRET_NAME}")
            except ClientError as e:
                if e.response['Error']['Code'] == 'ResourceExistsException':
                    client.put_secret_value(
                        SecretId=SECRET_NAME,
                        SecretString=secret_string
                    )
                    print(f"Secret {SECRET_NAME} already exists. Updated value instead.")
                else:
                    raise e
    except Exception as e:
        print(f"Error managing secret: {str(e)}")
        exit(1)

def upsert_repo(secret_dict, repo_name, services: dict):
    """Utility to modify the dictionary structure locally"""
    repos = secret_dict.setdefault("repos", {})
    repo = repos.setdefault(repo_name, {"services": {}})
    repo["services"].update(services)
    return secret_dict

if __name__ == '__main__':
    if not all([REGION, SECRET_NAME, ACTION]):
        print("Missing required environment variables (AWS_REGION, SECRET_FILE_NAME, ACTION_TYPE)")
        exit(1)
        
    handle_secret()