# #!/bin/bash

# # function to convert string to array
# rebuild_array() {
#     local __out_var="$1"
#     local __input="$2"

#     eval "$__out_var=$__input"
# }

# # project config variables; converted instantly to array
# FILE_PATH=$1
# LOG_FILE_NAME=$2
# STARTUP_FILE_NAME=$3
# REGION=$4
# USERNAME=$5
# ECR=$6
# rebuild_array CONTAINERS "$7"
# rebuild_array MAPPED_PORTS "$8"

# LOG_FILE="$FILE_PATH/$LOG_FILE_NAME"
# STARTUP_FILE="$FILE_PATH/$STARTUP_FILE_NAME"
# COMMAND=""

# # commands to stop & remove old containers, pull new images and run them
# for i in "${!MAPPED_PORTS[@]}"; do

#     CONATINER_NAME="${CONTAINERS[$i]}"
#     MAPPED_PORT="${MAPPED_PORTS[$i]}"

    
#     COMMAND+=$'\n'"docker stop $CONATINER_NAME >> \$LOG_FILE 2>&1 || true"
#     COMMAND+=$'\n'"docker rm $CONATINER_NAME >> \$LOG_FILE 2>&1 || true"

#     COMMAND+=$'\n'"docker pull $ECR/${CONATINER_NAME}_images:latest >> \$LOG_FILE 2>&1"
#     COMMAND+=$'\n'"docker run -d --name $CONATINER_NAME -p $MAPPED_PORT $ECR/${CONATINER_NAME}_images:latest >> \$LOG_FILE 2>&1"
# done

# cat <<EOF > $STARTUP_FILE
# #!/bin/bash

# LOG_FILE=$LOG_FILE

# # delete older logs
# rm -f \$LOG_FILE

# echo "============ \$(date) ============" >> \$LOG_FILE
# echo "Starting stratup script..." >> \$LOG_FILE

# # login to ECR
# aws ecr get-login-password --region $REGION | \\
# docker login --username $USERNAME --password-stdin $ECR >> \$LOG_FILE 2>&1

# #stop & remove old containers, pull new images and run them
# #\$COMMAND
# EOF


# # sudo chown root "$STARTUP_FILE_NAME" 
# # sudo chmod 755 "$STARTUP_FILE_NAME"

# # sudo ./"$STARTUP_FILE_NAME"












































# Arguments passed from Ansible
FILE_PATH=$1
LOG_FILE_NAME=$2
STARTUP_FILE_NAME=$3
REGION=$4
USERNAME=$5
ECR=$6
CONTAINERS_STR=$7
PORTS_STR=$8

# Convert space-separated strings to arrays
IFS=' ' read -r -a CONTAINER_ARR <<< "$CONTAINERS_STR"
IFS=' ' read -r -a PORT_ARR <<< "$PORTS_STR"

LOG_FILE="$FILE_PATH/$LOG_FILE_NAME"
TARGET_SCRIPT="$FILE_PATH/$STARTUP_FILE_NAME"

# Build the dynamic Docker commands
DOCKER_OPS=""
for i in "${!CONTAINER_ARR[@]}"; do
    NAME="${CONTAINER_ARR[$i]}"
    PORT="${PORT_ARR[$i]}"
    
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