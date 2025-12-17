#!/bin/bash

DOMAIN=$1
CONFIG_FILE=$2

echo $DOMAIN > logs
echo $CONFIG_FILE >> logs

# ./basic_config.sh "$DOMAIN" "$CONFIG_FILE"


# COMMENTS_ARRAY=
# LOCATIONS_ARRAY=
# REWRITES_ARRAY=
# IP=
# PORTS_ARRAY=
# PROXY_HEADERS=


# SIZE=${#COMMENTS_ARRAY[@]}

# for i in "${!COMMENTS_ARRAY[@]}"; do

#     COMMENT="${COMMENTS_ARRAY[$i]}" 
#     LOCATION="${LOCATIONS_ARRAY[$i]}" 
#     REWRITE="${REWRITES_ARRAY[$i]}"
#     PORT="${PORTS_ARRAY[$i]}" 

#     # proxy pass
#     PROXY_PASS="${IP%/}${PORT}/"

#     ./project_config.sh "$CONFIG_FILE" "$COMMENT" "$LOCATION" "$REWRITE" "$PROXY_PASS" "${PROXY_HEADERS[@]}"    
# done