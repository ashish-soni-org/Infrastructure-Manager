import json
import boto3

client = boto3.client(
    "secretsmanager",
    region_name="ap-south-1"
)

secret_name = "ProductionSecrets"
self_hosted_runner = "runner_name"
repo = []

secret_value = {
    "runner": self_hosted_runner,
    "repos": [
        "repo1": {
            "services": {
                "S3": "hgfg",
                "ECR": "jhvjh"
            }
        },
        "repo2": {
            "services": {
                "S3": "hgfg",
                "ECR": "jhvjh"
            }
        },
    ]
}

response = client.put_secret_value(
    SecretId=secret_name,
    SecretString=json.dumps(secret_value)
)

print("Secret updated. Version:", response["VersionId"])
