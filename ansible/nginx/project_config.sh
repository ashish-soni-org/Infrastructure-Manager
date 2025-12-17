#!/bin/bash

CONFIG_FILE=$1
COMMENT=$2
LOCATION=$3
REWRITE=$4
PROXY_PASS=$5
PROXY_HEADERS=("${@:6}")

# create proxy header lines
PROXY_SET_HEADERS=""

SIZE=${#PROXY_HEADERS[@]}

for i in "${!PROXY_HEADERS[@]}"; do

    header="${PROXY_HEADERS[$i]}"
    PROXY_SET_HEADERS+=$'\t'
    PROXY_SET_HEADERS+="proxy_set_header $header;"

    # if it's not last value in array, add required spaces
    if [[ $i -lt $((SIZE - 1)) ]]; then
        PROXY_SET_HEADERS+=$'\n'
    fi
done

# create new mapping block
NEW_MAPPING_BLOCK="
    $COMMENT
    location $LOCATION {"

if [[ -n "$REWRITE" ]]; then
    NEW_MAPPING_BLOCK+="
        rewrite $REWRITE;"
fi

NEW_MAPPING_BLOCK+="
        proxy_pass $PROXY_PASS;
$PROXY_SET_HEADERS
    }"

# add new mapping block to last second line
head -n -1 "$CONFIG_FILE" > "$CONFIG_FILE.tmp"
echo "$NEW_MAPPING_BLOCK" >> "$CONFIG_FILE.tmp"
echo "}" >> "$CONFIG_FILE.tmp"
mv "$CONFIG_FILE.tmp" "$CONFIG_FILE"