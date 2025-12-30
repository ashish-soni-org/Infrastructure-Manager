#!/bin/bash

# Arguments
CONFIG_FILE=$(readlink -f "$1")
ENDPOINT=$2
PROXY_TARGET=$3  # e.g., http://127.0.0.1:8000/
REPO_NAME=$4     # For Docker Container Name
IMAGE_URI=$5     # For Docker Image
STARTUP_SCRIPT=$6 # Path to startup.sh

# 1. Extract Port from Proxy Target 
# Handles both http://ip:port/ and http://ip:port formats
HOST_PORT=$(echo "$PROXY_TARGET" | sed -e 's/.*:\([0-9]*\).*/\1/' | cut -d'/' -f1)

# Standard Headers
PROXY_HEADERS=(
    "Host \$host"
    "X-Real-IP \$remote_addr"
    "X-Forwarded-For \$proxy_add_x_forwarded_for"
    "X-Forwarded-Proto \$scheme"
)

# ==================================================================
# PART 1: NGINX CONFIGURATION (WITH IDEMPOTENCY)
# ==================================================================

# Define the anchor marker for injection
MARKER="# PROJECT MAPPINGS (Update this section as projects come)"

if ! grep -qF "$MARKER" "$CONFIG_FILE"; then
    echo "Error: Marker not found in $CONFIG_FILE"
    echo "Please ensure the file contains: $MARKER"
    exit 1
fi

# 1. Determine Mapping Type and Cleanup Target
if [ "$ENDPOINT" == "/" ]; then
    COMMENT="# MAIN APP"
    LOCATION_PATH="/"
    REWRITE_RULE="" 
    DELETE_MATCH="location \/ {"
else
    CLEAN_NAME=$(echo "$ENDPOINT" | sed 's/^\///;s/\/$//')
    COMMENT="# PROJECT $CLEAN_NAME"
    LOCATION_PATH="^~ /$CLEAN_NAME/"
    REWRITE_RULE="^/$CLEAN_NAME/(.*)$ /\$1 break"
    DELETE_MATCH="location \^~ \/$CLEAN_NAME\/ {"
fi

# 2. CRITICAL: Remove existing block before adding new one
# This ensures that re-running the script updates the configuration instead of duplicating it
if grep -qE "$DELETE_MATCH" "$CONFIG_FILE"; then
    echo "Cleaning up existing Nginx block for $ENDPOINT..."
    # Deletes from the match line until the first closing brace '}'
    sed -i "/$DELETE_MATCH/,/}/d" "$CONFIG_FILE"
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

# 5. Inject into Nginx File (Targeted Injection)
# We create a temporary file for the block to handle multi-line insertion cleanly via sed
echo "$NEW_MAPPING_BLOCK" > mapping_block.tmp

# This sed command finds the marker and appends the content of mapping_block.tmp 
# two lines below it (after the decorative dashed line)
sed -i "/$MARKER/{n;r mapping_block.tmp" -e "}" "$CONFIG_FILE"

rm mapping_block.tmp
echo "Success: Nginx mapping updated for $ENDPOINT"

# ==================================================================
# PART 2: STARTUP SCRIPT UPDATE (PERSISTENCE)
# ==================================================================

if [ -f "$STARTUP_SCRIPT" ]; then
    # Check if this container is already in the startup script
    if grep -q "name $REPO_NAME " "$STARTUP_SCRIPT"; then
        echo "Startup Script: $REPO_NAME already exists. Updating image URI..."
        # Update the image URI if the container already exists (optional but professional)
        sed -i "s|docker run .* --name $REPO_NAME .*|docker run -d --name $REPO_NAME -p $HOST_PORT:5000 $IMAGE_URI >> \$LOG_FILE 2>&1|g" "$STARTUP_SCRIPT"
    else
        echo "Startup Script: Adding persistence for $REPO_NAME..."
        
        cat <<EOF > docker_block.tmp

# --- Added by Deployment Pipeline ---
echo "Starting $REPO_NAME..." >> \$LOG_FILE
docker stop $REPO_NAME >> \$LOG_FILE 2>&1 || true
docker rm $REPO_NAME >> \$LOG_FILE 2>&1 || true
docker pull $IMAGE_URI >> \$LOG_FILE 2>&1
docker run -d --name $REPO_NAME -p $HOST_PORT:5000 $IMAGE_URI >> \$LOG_FILE 2>&1
EOF
        
        # Insert after the marker
        if grep -q "# Execute Docker Operations" "$STARTUP_SCRIPT"; then
            sed -i "/# Execute Docker Operations/r docker_block.tmp" "$STARTUP_SCRIPT"
        else
            cat docker_block.tmp >> "$STARTUP_SCRIPT"
        fi
        rm docker_block.tmp
        echo "Success: Added $REPO_NAME to startup.sh"
    fi
else
    echo "Warning: Startup script not found at $STARTUP_SCRIPT"
fi