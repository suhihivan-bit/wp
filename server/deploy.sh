#!/bin/bash

# Deployment Script for Self-Hosted Server
# This script automates the deployment process

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}╔═══════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   Consultation Booking Deployment    ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════╝${NC}"

# Configuration
PROJECT_DIR="/var/www/consultation-booking"
SERVER_DIR="$PROJECT_DIR/server"
REPO_URL="https://github.com/suhihivan-bit/wp.git"
SITE_NAME="consultation-booking-site1"

echo -e "\n${YELLOW}Step 1:${NC} Checking prerequisites..."

# Check if running as root/sudo
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}This script must be run as root or with sudo${NC}"
   exit 1
fi

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js is not installed. Please install Node.js first.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js installed:${NC} $(node --version)"

# Check PM2
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}Installing PM2...${NC}"
    npm install -g pm2
fi
echo -e "${GREEN}✓ PM2 installed:${NC} $(pm2 --version)"

# Check Nginx
if ! command -v nginx &> /dev/null; then
    echo -e "${RED}Nginx is not installed. Please install Nginx first.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Nginx installed${NC}"

echo -e "\n${YELLOW}Step 2:${NC} Deploying code..."

# Create project directory if it doesn't exist
if [ ! -d "$PROJECT_DIR" ]; then
    echo "Creating project directory..."
    mkdir -p "$PROJECT_DIR"
    cd "$PROJECT_DIR/../"
    git clone "$REPO_URL" consultation-booking
else
    echo "Updating existing repository..."
    cd "$PROJECT_DIR"
    git pull origin main
fi

# Navigate to server directory
cd "$SERVER_DIR"

echo -e "\n${YELLOW}Step 3:${NC} Installing dependencies..."
npm install --production

# Check for .env file
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}Warning: .env file not found!${NC}"
    echo "Copying .env.example to .env..."
    cp .env.example .env
    echo -e "${RED}⚠️  IMPORTANT: Edit .env file with your actual credentials!${NC}"
    echo "   nano .env"
    read -p "Press Enter to continue after editing .env..."
fi

echo -e "\n${YELLOW}Step 4:${NC} Setting up PM2..."

# Stop existing process if running
pm2 stop "$SITE_NAME" 2>/dev/null || true
pm2 delete "$SITE_NAME" 2>/dev/null || true

# Start new process
pm2 start server.js --name "$SITE_NAME"
pm2 save

# Setup PM2 startup script
pm2 startup systemd -u root --hp /root

echo -e "\n${YELLOW}Step 5:${NC} Configuring Nginx..."

NGINX_CONF="/etc/nginx/sites-available/consultation-booking"
NGINX_ENABLED="/etc/nginx/sites-enabled/consultation-booking"

if [ ! -f "$NGINX_CONF" ]; then
    echo "Copying Nginx configuration..."
    cp config/nginx.conf "$NGINX_CONF"
    
    echo -e "${RED}⚠️  IMPORTANT: Edit Nginx config with your domain!${NC}"
    echo "   nano $NGINX_CONF"
    echo "   Replace 'your-domain.ru' with your actual domain"
    read -p "Press Enter to continue after editing..."
    
    # Enable site
    ln -sf "$NGINX_CONF" "$NGINX_ENABLED"
    
    # Test Nginx config
    nginx -t
    
    # Reload Nginx
    systemctl reload nginx
else
    echo "Nginx config already exists, skipping..."
fi

echo -e "\n${YELLOW}Step 6:${NC} Setting up SSL (optional)..."
read -p "Do you want to set up SSL certificate with Let's Encrypt? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if ! command -v certbot  &> /dev/null; then
        echo "Installing Certbot..."
        apt install certbot python3-certbot-nginx -y
    fi
    
    read -p "Enter your domain name: " DOMAIN
    certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN"
fi

echo -e "\n${YELLOW}Step 7:${NC} Verifying deployment..."

# Check if PM2 process is running
if pm2 list | grep -q "$SITE_NAME.*online"; then
    echo -e "${GREEN}✓ PM2 process is running${NC}"
else
    echo -e "${RED}✗ PM2 process failed to start${NC}"
    pm2 logs "$SITE_NAME" --lines 20
    exit 1
fi

# Check if server is responding
sleep 2
if curl -f http://localhost:3001/health &> /dev/null; then
    echo -e "${GREEN}✓ Server health check passed${NC}"
else
    echo -e "${RED}✗ Server health check failed${NC}"
    exit 1
fi

echo -e "\n${GREEN}╔═══════════════════════════════════════╗${NC}"
echo -e "${GREEN}║        Deployment Successful!         ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════╝${NC}"

echo -e "\n${GREEN}Server is running on:${NC}"
echo -e "  Local: http://localhost:3001"
echo -e "  Health: http://localhost:3001/health"
echo
echo -e "${YELLOW}Useful commands:${NC}"
echo -e "  View logs:    pm2 logs $SITE_NAME"
echo -e "  Restart:      pm2 restart $SITE_NAME"
echo -e "  Stop:         pm2 stop $SITE_NAME"
echo -e "  Monitor:      pm2 monit"
echo
echo -e "${YELLOW}Next steps:${NC}"
echo -e "  1. Test webhook: curl -X POST http://localhost:3001/api/webhook/booking -d '{}'"
echo -e "  2. Update frontend to call: https://your-domain.ru/api/webhook/booking"
echo -e "  3. Monitor logs: pm2 logs $SITE_NAME"
echo
