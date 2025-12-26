#!/bin/bash

# Arguments
CONFIG_FILE=$1
ENDPOINT=$2
PROXY_TARGET=$3  # e.g., http://127.0.0.1:8000/
REPO_NAME=$4     # New: For Docker Container Name
IMAGE_URI=$5     # New: For Docker Image
STARTUP_SCRIPT=$6 # New: Path to startup.sh

# Extract Port from Proxy Target (e.g., http://127.0.0.1:8000/ -> 8000)
HOST_PORT=$(echo "$PROXY_TARGET" | sed -e 's/.*:\([0-9]*\)\/.*/\1/')

# Standard Headers needed for all mappings
PROXY_HEADERS=(
    "Host \$host"
    "X-Real-IP \$remote_addr"
)

# ==================================================================
# PART 1: NGINX CONFIGURATION
# ==================================================================

# 1. Determine Mapping Type
if [ "$ENDPOINT" == "/" ]; then
    COMMENT="# MAIN APP"
    LOCATION_PATH="/"
    SED_MATCH="location \/ {"
    REWRITE_RULE="" 
else
    CLEAN_NAME=$(echo "$ENDPOINT" | sed 's/^\///;s/\/$//')
    COMMENT="# PROJECT $CLEAN_NAME"
    LOCATION_PATH="^~ /$CLEAN_NAME/"
    SED_MATCH="location \^~ \/$CLEAN_NAME\/ {"
    REWRITE_RULE="^/$CLEAN_NAME/(.*)$ /\$1 break"
fi

# 2. Cleanup Existing Nginx Block (Idempotency)
if grep -q "$SED_MATCH" "$CONFIG_FILE"; then
    sed "/$SED_MATCH/,/}/d" "$CONFIG_FILE" > "$CONFIG_FILE.tmp"
    mv "$CONFIG_FILE.tmp" "$CONFIG_FILE"
fi

# 3. Build Header String
PROXY_SET_HEADERS=""
SIZE=${#PROXY_HEADERS[@]}
for i in "${!PROXY_HEADERS[@]}"; do
    header="${PROXY_HEADERS[$i]}"
    PROXY_SET_HEADERS+=$'\t\t' 
    PROXY_SET_HEADERS+="proxy_set_header $header;"
    if [[ $i -lt $((SIZE - 1)) ]]; then PROXY_SET_HEADERS+=$'\n'; fi
done

# 4. Construct Nginx Block
NEW_MAPPING_BLOCK="
    $COMMENT
    location $LOCATION_PATH {"
if [[ -n "$REWRITE_RULE" ]]; then
    NEW_MAPPING_BLOCK+="
        rewrite $REWRITE_RULE;"
fi
NEW_MAPPING_BLOCK+="
        proxy_pass $PROXY_TARGET;
$PROXY_SET_HEADERS
    }"

# 5. Inject into Nginx File
head -n -1 "$CONFIG_FILE" > "$CONFIG_FILE.tmp"
echo "$NEW_MAPPING_BLOCK" >> "$CONFIG_FILE.tmp"
echo "}" >> "$CONFIG_FILE.tmp"
mv "$CONFIG_FILE.tmp" "$CONFIG_FILE"

echo "Success: Nginx mapping added for $ENDPOINT"

# ==================================================================
# PART 2: STARTUP SCRIPT UPDATE (PERSISTENCE)
# ==================================================================

if [ -f "$STARTUP_SCRIPT" ]; then
    # Check if this container is already in the startup script
    if grep -q "name $REPO_NAME " "$STARTUP_SCRIPT"; then
        echo "Startup Script: Container $REPO_NAME already exists. Skipping."
    else
        echo "Startup Script: Adding persistence for $REPO_NAME..."
        
        # Define the Docker block to insert
        # We use a temp file to handle special characters cleanly
        cat <<EOF > docker_block.tmp

# --- Added by Deployment Pipeline ---
echo "Starting $REPO_NAME..." >> \$LOG_FILE
docker stop $REPO_NAME >> \$LOG_FILE 2>&1 || true
docker rm $REPO_NAME >> \$LOG_FILE 2>&1 || true
docker pull $IMAGE_URI >> \$LOG_FILE 2>&1
docker run -d --name $REPO_NAME -p $HOST_PORT:5000 $IMAGE_URI >> \$LOG_FILE 2>&1
EOF
        
        # Insert the block immediately after the marker "# Execute Docker Operations"
        # We use sed to append the contents of docker_block.tmp after the match
        sed -i "/# Execute Docker Operations/r docker_block.tmp" "$STARTUP_SCRIPT"
        
        rm docker_block.tmp
        echo "Success: Added $REPO_NAME to startup.sh"
    fi
else
    echo "Warning: Startup script not found at $STARTUP_SCRIPT"
fi