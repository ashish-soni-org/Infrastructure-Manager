#!/bin/bash

# basic config variables
DOMAIN=$1
CONFIG_FILE=$2

./basic_config.sh "$DOMAIN" "$CONFIG_FILE"

# project config variables
COMMENTS_ARRAY=$3
LOCATIONS_ARRAY=$4
REWRITES_ARRAY=$5
IP=$6
PORTS_ARRAY=$7
PROXY_HEADERS=$8


SIZE=${#COMMENTS_ARRAY[@]}

for i in "${!COMMENTS_ARRAY[@]}"; do

    COMMENT="${COMMENTS_ARRAY[$i]}" 
    LOCATION="${LOCATIONS_ARRAY[$i]}" 
    REWRITE="${REWRITES_ARRAY[$i]}"
    PORT="${PORTS_ARRAY[$i]}" 

    # proxy pass
    PROXY_PASS="${IP%/}${PORT}/"

    ./project_config.sh "$CONFIG_FILE" "$COMMENT" "$LOCATION" "$REWRITE" "$PROXY_PASS" "${PROXY_HEADERS[@]}"    
done