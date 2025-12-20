import json
import boto3

client = boto3.client(
    "secretsmanager",
    region_name="ap-south-1"
)

secret_name = "ProductionSecrets"

secret_value = {
    "database": {
        "host": "db.prod.internal",
        "user": "admin",
        "password": "supersecret",
        "port": 5432
    },
    "mlflow": {
        "tracking_uri": "https://dagshub.com/xxx.mlflow",
        "token": "abc123"
    }
}

response = client.put_secret_value(
    SecretId=secret_name,
    SecretString=json.dumps(secret_value)
)

print("Secret updated. Version:", response["VersionId"])
