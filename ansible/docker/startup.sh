#!/bin/bash

LOG_FILE=/home/ashish-ubuntu/Desktop/config_file_test/docker_startup_config/startup.log

# delete older logs
rm -f $LOG_FILE

echo "============ $(date) ============" >> $LOG_FILE
echo "Starting stratup script..." >> $LOG_FILE

# login to ECR
aws ecr get-login-password --region ap-south-1 | \
docker login --username AWS --password-stdin 278571754197.dkr.ecr.ap-south-1.amazonaws.com >> $LOG_FILE 2>&1

#stop & remove old containers, pull new images and run them

docker stop portfolio >> $LOG_FILE 2>&1 || true
docker rm portfolio >> $LOG_FILE 2>&1 || true
docker pull 278571754197.dkr.ecr.ap-south-1.amazonaws.com/portfolio_images:latest >> $LOG_FILE 2>&1
docker run -d --name portfolio -p 8080:5000 278571754197.dkr.ecr.ap-south-1.amazonaws.com/portfolio_images:latest >> $LOG_FILE 2>&1
docker stop project1 >> $LOG_FILE 2>&1 || true
docker rm project1 >> $LOG_FILE 2>&1 || true
docker pull 278571754197.dkr.ecr.ap-south-1.amazonaws.com/project1_images:latest >> $LOG_FILE 2>&1
docker run -d --name project1 -p 8101:5000 278571754197.dkr.ecr.ap-south-1.amazonaws.com/project1_images:latest >> $LOG_FILE 2>&1
docker stop project2 >> $LOG_FILE 2>&1 || true
docker rm project2 >> $LOG_FILE 2>&1 || true
docker pull 278571754197.dkr.ecr.ap-south-1.amazonaws.com/project2_images:latest >> $LOG_FILE 2>&1
docker run -d --name project2 -p 8102:5000 278571754197.dkr.ecr.ap-south-1.amazonaws.com/project2_images:latest >> $LOG_FILE 2>&1
docker stop project3 >> $LOG_FILE 2>&1 || true
docker rm project3 >> $LOG_FILE 2>&1 || true
docker pull 278571754197.dkr.ecr.ap-south-1.amazonaws.com/project3_images:latest >> $LOG_FILE 2>&1
docker run -d --name project3 -p 8103:5000 278571754197.dkr.ecr.ap-south-1.amazonaws.com/project3_images:latest >> $LOG_FILE 2>&1
docker stop vishal_website >> $LOG_FILE 2>&1 || true
docker rm vishal_website >> $LOG_FILE 2>&1 || true
docker pull 278571754197.dkr.ecr.ap-south-1.amazonaws.com/vishal_website_images:latest >> $LOG_FILE 2>&1
docker run -d --name vishal_website -p 7000:5000 278571754197.dkr.ecr.ap-south-1.amazonaws.com/vishal_website_images:latest >> $LOG_FILE 2>&1

