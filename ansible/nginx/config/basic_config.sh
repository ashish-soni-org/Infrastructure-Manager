#!/bin/bash

DOMAIN=$1
CONFIG_FOLDER=$2
CONFIG_FILE="$CONFIG_FOLDER/$DOMAIN"

cat <<EOF > "$CONFIG_FILE"
server {
    server_name $DOMAIN www.$DOMAIN;
}
EOF


sudo chown root:root "$CONFIG_FILE"
sudo chmod 644 "$CONFIG_FILE"