#!/bin/sh
# Set up GitHub SSH deploy key from GITHUB_DEPLOY_KEY_B64 env var.
# Run this before any git push in a fresh environment session.
# The deploy key (public) is registered at:
#   github.com/rmg007/Questerix.Fractions → Settings → Deploy keys → Replit
# Public key: ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIM1obQlGnhFsAfid6l4Co4FLuBHP5Yqecwccl7RzaJ0B replit-deploy-key

set -e

if [ -z "$GITHUB_DEPLOY_KEY_B64" ]; then
  echo "[setup-github-ssh] GITHUB_DEPLOY_KEY_B64 not set — cannot configure SSH." >&2
  exit 1
fi

mkdir -p ~/.ssh
echo "$GITHUB_DEPLOY_KEY_B64" | base64 -d > ~/.ssh/github_deploy
chmod 600 ~/.ssh/github_deploy

cat > ~/.ssh/config << 'EOF'
Host github.com
  HostName github.com
  User git
  IdentityFile ~/.ssh/github_deploy
  StrictHostKeyChecking no
EOF
chmod 600 ~/.ssh/config

echo "[setup-github-ssh] SSH deploy key configured successfully."
