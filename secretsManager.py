import os
import json
import boto3

# variables
region = "AWS_REGION"
action = "ACTION_TYPE"
update_repo = "UPDATE_REPO"
create_new_runner = "CREATE_NEW_RUNNER"
secret_file_name = "SECRET_FILE_NAME"
runner = "SELF_HOSTED_RUNNER"

# getting AWS client service
client = boto3.client(
    "secretsmanager",
    region_name=os.getenv(region)
)


secret_file = os.getenv(secret_file_name)
self_hosted_runner = os.getenv(runner)
repo = []


# new file
secret_value = {
    "runner": self_hosted_runner,
    "repos": {}
}


def upsert_repo(secret, repo_name, services: dict):
    repos = secret.setdefault("repos", {})

    repo = repos.setdefault(repo_name, {"services": {}})

    repo["services"].update(services)



if __name__ == '__main__':
    if action == create_new_runner:
        client.put_secret_value(SecretId = secret_file, SecretString = json.dumps(secret_value))

# upsert_repo(
#     secret_value,
#     "repo1",
#     {}
# )
# upsert_repo(
#     secret_value,
#     "repo2",
#     {
#         "S3": "abc",
#         "ECR": "xyz"
#     }
# )

# upsert_repo(
#     secret_value,
#     "repo3",
#     {
#         "Route53": "domain-mapping"
#     }
# )

# updating secrets
def updateSecrets(file_name, secret_value):
    client.put_secret_value(
        SecretId = file_name,
        SecretString = json.dumps(secret_value)
    )