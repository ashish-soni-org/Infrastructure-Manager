#!/bin/bash

DOMAIN=$1
CONFIG_FILE=$2

echo DOMAIN: $DOMAIN > logs1
echo CONFIG_FILE: $CONFIG_FILE >> logs1

# cat <<EOF > $CONFIG_FILE
# server {
#     server_name $DOMAIN;
# }
# EOF