#!/bin/bash
 
# Exit immediately if a command exits with a non-zero status
set -e

# ------------------------------------------------------------------
# ARGUMENTS
# ------------------------------------------------------------------
DOMAIN_INPUT=$1
CONFIG_FOLDER=$2
CONFIG_FILE="$CONFIG_FOLDER/$DOMAIN_INPUT"

# ------------------------------------------------------------------
# 1. SERVER CONTEXT LOGIC
# ------------------------------------------------------------------

if [ "$DOMAIN_INPUT" == "default" ]; then
    # Catch-all for requests with no matching domain
    LISTEN_DIRECTIVE="listen 80 default_server;
    listen [::]:80 default_server;"
    SERVER_NAME_DIRECTIVE="server_name _;"
else
    # Specific domain configuration
    LISTEN_DIRECTIVE="listen 80;
    listen [::]:80;"
    SERVER_NAME_DIRECTIVE="server_name $DOMAIN_INPUT www.$DOMAIN_INPUT;"
fi

# ------------------------------------------------------------------
# 2. GENERATE NGINX CONFIGURATION
# ------------------------------------------------------------------

cat <<EOF > "$CONFIG_FILE"
server {
    $LISTEN_DIRECTIVE
    $SERVER_NAME_DIRECTIVE

    # ------------------------------------------------------
    # GLOBAL PROXY SETTINGS (Necessary for Docker Mapping)
    # ------------------------------------------------------
    proxy_http_version 1.1;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_cache_bypass \$http_upgrade;

    # ------------------------------------------------------
    # PROJECT MAPPINGS (Update this section as projects come)
    # ------------------------------------------------------




    
}
EOF

# ------------------------------------------------------------------
# 3. SET PERMISSIONS
# ------------------------------------------------------------------
if [ -f "$CONFIG_FILE" ]; then
    sudo chown root:root "$CONFIG_FILE"
    sudo chmod 644 "$CONFIG_FILE"
else
    echo "Error: Failed to create configuration file."
    exit 1
fi