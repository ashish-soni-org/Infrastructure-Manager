#!/bin/bash

# Arguments
CONFIG_FILE=$1
ENDPOINT=$2
PROXY_TARGET=$3  # e.g., http://127.0.0.1:8080/

# Standard Headers needed for all mappings
PROXY_HEADERS=(
    "Host \$host"
    "X-Real-IP \$remote_addr"
)

# ------------------------------------------------------------------
# 1. DETERMINE MAPPING TYPE
# ------------------------------------------------------------------

if [ "$ENDPOINT" == "/" ]; then
    # CASE: Root / Main App
    COMMENT="# MAIN APP"
    LOCATION_PATH="/"
    REWRITE_RULE="" # No rewrite needed for root
else
    # CASE: Sub-Project (e.g., /Vehicle-Insurance)
    # Remove leading/trailing slashes for clean name
    CLEAN_NAME=$(echo "$ENDPOINT" | sed 's/^\///;s/\/$//')
    
    COMMENT="# PROJECT $CLEAN_NAME"
    LOCATION_PATH="^~ /$CLEAN_NAME/"
    # Rewrite /clean_name/xyz to /xyz
    REWRITE_RULE="^/$CLEAN_NAME/(.*)$ /\$1 break"
fi

# ------------------------------------------------------------------
# 2. BUILD HEADER STRING (Loop Logic)
# ------------------------------------------------------------------

PROXY_SET_HEADERS=""
SIZE=${#PROXY_HEADERS[@]}

for i in "${!PROXY_HEADERS[@]}"; do
    header="${PROXY_HEADERS[$i]}"
    
    # Add indentation
    PROXY_SET_HEADERS+=$'\t\t' 
    PROXY_SET_HEADERS+="proxy_set_header $header;"

    # Add newline if not the last header
    if [[ $i -lt $((SIZE - 1)) ]]; then
        PROXY_SET_HEADERS+=$'\n'
    fi
done

# ------------------------------------------------------------------
# 3. CONSTRUCT BLOCK
# ------------------------------------------------------------------

NEW_MAPPING_BLOCK="
    $COMMENT
    location $LOCATION_PATH {"

# Only add rewrite if the variable is not empty
if [[ -n "$REWRITE_RULE" ]]; then
    NEW_MAPPING_BLOCK+="
        rewrite $REWRITE_RULE;"
fi

NEW_MAPPING_BLOCK+="
        proxy_pass $PROXY_TARGET;
$PROXY_SET_HEADERS
    }"

# ------------------------------------------------------------------
# 4. INJECT INTO CONFIG FILE
# ------------------------------------------------------------------

# Remove the last line (the closing '}') to append inside the server block
head -n -1 "$CONFIG_FILE" > "$CONFIG_FILE.tmp"

# Append our new block
echo "$NEW_MAPPING_BLOCK" >> "$CONFIG_FILE.tmp"

# Re-add the closing '}'
echo "}" >> "$CONFIG_FILE.tmp"

# Replace original file
mv "$CONFIG_FILE.tmp" "$CONFIG_FILE"

echo "Success: Added mapping for $ENDPOINT -> $PROXY_TARGET"