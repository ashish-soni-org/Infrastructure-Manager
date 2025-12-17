#!/bin/bash

# function to convert string to array
rebuild_array() {
    local __out_var="$1"
    local __input="$2"

    eval "$__out_var=$__input"
}

# project config variables; converted instantly to array
FILE_PATH=$1
LOG_FILE_NAME=$2
STARTUP_FILE_NAME=$3
REGION=$4
USERNAME=$5
ECR=$6
rebuild_array CONTAINERS "$7"
rebuild_array MAPPED_PORTS "$8"

LOG_FILE="$FILE_PATH/$LOG_FILE_NAME"
STARTUP_FILE="$FILE_PATH/$STARTUP_FILE_NAME"
COMMAND=""

# commands to stop & remove old containers, pull new images and run them
for i in "${!MAPPED_PORTS[@]}"; do

    CONATINER_NAME="${CONTAINERS[$i]}"
    MAPPED_PORT="${MAPPED_PORTS[$i]}"

    
    COMMAND+=$'\n'"docker stop $CONATINER_NAME >> \$LOG_FILE 2>&1 || true"
    COMMAND+=$'\n'"docker rm $CONATINER_NAME >> \$LOG_FILE 2>&1 || true"

    COMMAND+=$'\n'"docker pull $ECR/${CONATINER_NAME}_images:latest >> \$LOG_FILE 2>&1"
    COMMAND+=$'\n'"docker run -d --name $CONATINER_NAME -p $MAPPED_PORT $ECR/${CONATINER_NAME}_images:latest >> \$LOG_FILE 2>&1"
done

cat <<EOF > $STARTUP_FILE
#!/bin/bash

LOG_FILE=$LOG_FILE

# delete older logs
rm -f \$LOG_FILE

echo "============ \$(date) ============" >> \$LOG_FILE
echo "Starting stratup script..." >> \$LOG_FILE

# login to ECR
aws ecr get-login-password --region $REGION | \\
docker login --username $USERNAME --password-stdin $ECR >> \$LOG_FILE 2>&1

#stop & remove old containers, pull new images and run them
$COMMAND

EOF

sudo chown root "$STARTUP_FILE_NAME" && sudo chmod 744 "$STARTUP_FILE_NAME" && sudo ./"$STARTUP_FILE_NAME"