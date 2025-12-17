#!/bin/bash

FILE_PATH="/home/ashish-ubuntu/Desktop/config_file_test/docker_startup_config"
LOG_FILE_NAME="startup.log"
STARTUP_FILE_NAME="startup.sh"
REGION="ap-south-1"
USERNAME="AWS"
ECR="278571754197.dkr.ecr.ap-south-1.amazonaws.com"
CONTAINERS=("portfolio" "project1" "project2" "project3" "vishal_website")
MAPPED_PORTS=("8080:5000" "8101:5000" "8102:5000" "8103:5000" "7000:5000")

./startup_script.sh "$FILE_PATH" "$LOG_FILE_NAME" "$STARTUP_FILE_NAME" "$REGION" "$USERNAME" "$ECR" "${CONTAINERS[@]}" "${MAPPED_PORTS[@]}"