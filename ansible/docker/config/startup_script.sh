#!/bin/bash

# Arguments passed from Ansible
FILE_PATH=$1
LOG_FILE_NAME=$2
STARTUP_FILE_NAME=$3
REGION=$4
USERNAME=$5
ECR=$6

LOG_FILE="$FILE_PATH/$LOG_FILE_NAME"
TARGET_SCRIPT="$FILE_PATH/$STARTUP_FILE_NAME"

# Create the startup.sh file with just basic ECR Login structure
cat <<EOF > "$TARGET_SCRIPT"
#!/bin/bash

LOG_FILE=$LOG_FILE

# Clear old logs
rm -f \$LOG_FILE
touch \$LOG_FILE

echo "============ Startup Script: \$(date) ============" >> \$LOG_FILE

# Login to ECR
echo "Logging into ECR..." >> \$LOG_FILE
aws ecr get-login-password --region $REGION | \\
docker login --username $USERNAME --password-stdin $ECR >> \$LOG_FILE 2>&1

# Execute Docker Operations

echo "============ Startup Complete: \$(date) ============" >> \$LOG_FILE
EOF

# Make the generated script executable
chmod +x "$TARGET_SCRIPT"