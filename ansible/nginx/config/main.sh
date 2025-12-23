#!/bin/bash

# basic config variables
DOMAIN=$1
CONFIG_FILE=$2

./basic_config.sh "$DOMAIN" "$CONFIG_FILE"

# ============================================================================

# # function to convert string to array
# rebuild_array() {
#     local __out_var="$1"
#     local __input="$2"

#     eval "$__out_var=$__input"
# }

# # project config variables; converted instantly to array
# rebuild_array COMMENTS_ARRAY "$3"
# rebuild_array LOCATIONS_ARRAY "$4"
# rebuild_array REWRITES_ARRAY "$5"
# IP=$6
# rebuild_array PORTS_ARRAY "$7"
# rebuild_array PROXY_HEADERS "$8"

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