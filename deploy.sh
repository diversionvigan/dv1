#!/bin/bash
set -e

# ========================================================
# Hostinger VPS Quick Docker Deployment Script
# Diversion Vigan Transient & Villa Booking System
# ========================================================

echo "=== Diversion Vigan: Starting Hostinger VPS Deployment ==="

# 1. Check if Docker and Docker Compose are installed
if ! command -v docker &> /dev/null; then
  echo "[!] Docker not found. Installing Docker..."
  curl -fsSL https://get.docker.com -o get-docker.sh
  sh get-docker.sh
  rm -f get-docker.sh
  systemctl enable --now docker
  echo "[✓] Docker installed successfully."
fi

# 2. Ensure directories exist on host for persistent volumes
mkdir -p data public/uploads
chmod 775 data public/uploads

# 3. Create .env from .env.example if missing
if [ ! -f .env ]; then
  echo "[*] Creating .env from .env.example..."
  cp .env.example .env
fi

# 4. Build and start the container
echo "[*] Building and starting Docker container..."
if docker compose version &> /dev/null; then
  docker compose down --remove-orphans || true
  docker compose build --no-cache
  docker compose up -d
else
  docker-compose down --remove-orphans || true
  docker-compose build --no-cache
  docker-compose up -d
fi

echo ""
echo "=== [✓] Deployment Complete! ==="
echo "Application running at: http://localhost:3000 (or your VPS IP / Domain:3000)"
echo "Check logs anytime with: docker compose logs -f"
