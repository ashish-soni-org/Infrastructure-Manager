import sys
import json
import boto3

client = boto3.client(
    "secretsmanager",
    region_name="ap-south-1"
)



secret_name = "ProductionSecrets"
self_hosted_runner = sys.argv[1]
repo = []

secret_value = {
    "runner": self_hosted_runner,
    "repos": {}
}


def upsert_repo(secret, repo_name, services: dict):
    repos = secret.setdefault("repos", {})

    repo = repos.setdefault(repo_name, {"services": {}})

    repo["services"].update(services)

upsert_repo(
    secret_value,
    "repo1",
    {}
)
upsert_repo(
    secret_value,
    "repo2",
    {
        "S3": "abc",
        "ECR": "xyz"
    }
)

upsert_repo(
    secret_value,
    "repo3",
    {
        "Route53": "domain-mapping"
    }
)


response = client.put_secret_value(
    SecretId=secret_name,
    SecretString=json.dumps(secret_value)
)

print(f"Secret updated. {secret_value}")
