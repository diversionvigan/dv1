# Hostinger VPS Docker Deployment Guide
### Diversion Vigan Transient & Villa Booking System (Project: dv1git)

This guide explains how to set up automated deployment to your **Hostinger VPS** using **GitHub Actions with SSH**.

---

## 1. Initial One-Time Setup on your Hostinger VPS

1. Connect to your Hostinger VPS via SSH:
   ```bash
   ssh root@YOUR_VPS_IP
   ```

2. Clone your repository into `/var/www/dv1git` (or `/opt/dv1git`):
   ```bash
   cd /var/www
   git clone <YOUR_GITHUB_REPO_URL> dv1git
   cd dv1git
   ```

3. Ensure Docker and Docker Compose are installed:
   ```bash
   curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh
   apt-get install -y docker-compose-plugin
   ```

4. Create persistent folders and configure environment:
   ```bash
   mkdir -p data public/uploads
   chmod 775 data public/uploads
   cp .env.example .env
   ```

5. Initial build and launch:
   ```bash
   docker compose up -d --build
   ```

---

## 2. GitHub Actions Automated Deployment Setup

In your GitHub repository, go to:
**Settings → Secrets and variables → Actions**

Add the following **Repository Secrets**:

| Secret Name | Description | Example Value |
|---|---|---|
| `SSH_HOST` | Your Hostinger VPS Public IP Address | `123.45.67.89` |
| `SSH_USER` | SSH Username (typically `root`) | `root` |
| `SSH_PRIVATE_KEY` | *(Recommended)* Your VPS private key (`id_rsa` / `id_ed25519`) | `-----BEGIN OPENSSH PRIVATE KEY...` |
| `SSH_PASSWORD` | *(Alternative)* Your VPS root password if not using SSH key | `your_vps_root_password` |
| `SSH_PORT` | *(Optional)* SSH Port (defaults to 22) | `22` |

> **Note on SSH Key Setup (Recommended over password):**
> On your VPS, run:
> ```bash
> ssh-keygen -t ed25519 -C "github-actions-deploy"
> cat ~/.ssh/id_ed25519.pub >> ~/.ssh/authorized_keys
> chmod 600 ~/.ssh/authorized_keys
> cat ~/.ssh/id_ed25519
> ```
> Copy the entire output of `cat ~/.ssh/id_ed25519` into the `SSH_PRIVATE_KEY` secret in GitHub.

---

## 3. How It Works

Whenever you push commits to the `main` branch:
1. GitHub Actions automatically connects to your Hostinger VPS over SSH.
2. It runs `git pull origin main` in `/var/www/dv1git`.
3. It rebuilds the Docker container (`docker compose up -d --build`).
4. Your website at `http://YOUR_VPS_IP:3000` (and `www.viganbooking.com` via your existing proxy) updates with zero manual intervention.

---

## 4. Useful VPS Commands

- **Check status**: `docker compose ps`
- **View logs**: `docker compose logs -f`
- **Manual restart**: `docker compose restart`
