#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <repo_root_in_wsl> <wsl_user>"
  echo "Example: $0 /home/sahil/justice-ai sahil"
  exit 1
fi

REPO_ROOT="$1"
WSL_USER="$2"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
NODE_TEMPLATE="$ROOT_DIR/deploy/systemd/justice-node.service.example"
CHATBOT_TEMPLATE="$ROOT_DIR/deploy/systemd/justice-chatbot.service.example"

NODE_SERVICE_TMP="/tmp/justice-node.service"
CHATBOT_SERVICE_TMP="/tmp/justice-chatbot.service"

sed "s|__REPO_ROOT__|$REPO_ROOT|g; s|YOUR_WSL_USER|$WSL_USER|g" "$NODE_TEMPLATE" > "$NODE_SERVICE_TMP"
sed "s|__REPO_ROOT__|$REPO_ROOT|g; s|YOUR_WSL_USER|$WSL_USER|g" "$CHATBOT_TEMPLATE" > "$CHATBOT_SERVICE_TMP"

sudo cp "$NODE_SERVICE_TMP" /etc/systemd/system/justice-node.service
sudo cp "$CHATBOT_SERVICE_TMP" /etc/systemd/system/justice-chatbot.service

sudo systemctl daemon-reload
sudo systemctl enable justice-node.service
sudo systemctl enable justice-chatbot.service
sudo systemctl restart justice-node.service
sudo systemctl restart justice-chatbot.service

echo "Services installed and restarted."
echo "Check status:"
echo "  sudo systemctl status justice-node.service"
echo "  sudo systemctl status justice-chatbot.service"
