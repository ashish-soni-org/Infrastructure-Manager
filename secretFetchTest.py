import json
import boto3

client = boto3.client(
    "secretsmanager",
    region_name="ap-south-1"
)

secret_name = "ProductionSecrets"

response = client.get_secret_value(
    SecretId=secret_name
)

secret_string = response["SecretString"]
secrets = json.loads(secret_string)
print(secrets["database"]["host"])


# db_host = secrets["database"]["host"]
# db_user = secrets["database"]["user"]
# db_password = secrets["database"]["password"]

# mlflow_uri = secrets["mlflow"]["tracking_uri"]
# mlflow_token = secrets["mlflow"]["token"]
