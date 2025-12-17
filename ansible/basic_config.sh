#!/bin/bash

# DOMAIN=$1
CONFIG_FILE=$1
DOMAIN=$2

cat <<EOF > $CONFIG_FILE
server {
    server_name $DOMAIN;
}
EOF