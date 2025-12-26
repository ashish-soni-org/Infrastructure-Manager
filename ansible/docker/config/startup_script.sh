#!/bin/bash

# Arguments passed from Ansible
FILE_PATH=$1
LOG_FILE_NAME=$2
STARTUP_FILE_NAME=$3
REGION=$4
USERNAME=$5
ECR=$6
RAW_CONTAINERS=$7
RAW_PORTS=$8

# 1. Sanitize Inputs: Remove '(', ')', and '"' to get clean space-separated strings
#    Input: ("portfolio" "project1") -> Output: portfolio project1
CONTAINERS_STR=$(echo "$RAW_CONTAINERS" | tr -d '()"')
PORTS_STR=$(echo "$RAW_PORTS" | tr -d '()"')

# 2. Convert to Arrays (Standard Bash Syntax)
CONTAINER_ARR=($CONTAINERS_STR)
PORT_ARR=($PORTS_STR)

LOG_FILE="$FILE_PATH/$LOG_FILE_NAME"
TARGET_SCRIPT="$FILE_PATH/$STARTUP_FILE_NAME"

# Build the dynamic Docker commands
DOCKER_OPS=""
for i in "${!CONTAINER_ARR[@]}"; do
    NAME="${CONTAINER_ARR[$i]}"
    PORT="${PORT_ARR[$i]}"
    
    # Validation to prevent empty loops
    if [ -z "$NAME" ]; then continue; fi

    # 1. Stop and Remove (ignore errors if not running)
    DOCKER_OPS+=$'\n'"echo 'Restarting $NAME...' >> \$LOG_FILE"
    DOCKER_OPS+=$'\n'"docker stop $NAME >> \$LOG_FILE 2>&1 || true"
    DOCKER_OPS+=$'\n'"docker rm $NAME >> \$LOG_FILE 2>&1 || true"

    # 2. Pull and Run
    DOCKER_OPS+=$'\n'"docker pull $ECR/${NAME}_images:latest >> \$LOG_FILE 2>&1"
    DOCKER_OPS+=$'\n'"docker run -d --name $NAME -p $PORT $ECR/${NAME}_images:latest >> \$LOG_FILE 2>&1"
    DOCKER_OPS+=$'\n'"echo '--------------------------------' >> \$LOG_FILE"
done

# Create the startup.sh file
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
$DOCKER_OPS

echo "============ Startup Complete: \$(date) ============" >> \$LOG_FILE
EOF

# Make the generated script executable
chmod +x "$TARGET_SCRIPT"