# JAKDATA — Production Setup Guide

## Requirements
- Ubuntu 22.04 LTS (recommended)
- Docker + Docker Compose v2
- Node.js 20+ (for local builds)
- Nginx (if not using Docker for reverse proxy)
- Domain name + SSL certificate (Let's Encrypt)
- Minimum 2GB RAM, 20GB disk

## Step-by-Step Deployment

### 1. Server Setup
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Clone project
git clone [YOUR_REPO_URL] /opt/jakdata
cd /opt/jakdata
```

### 2. Environment Setup
```bash
# Backend environment
cp backend/.env.production.example backend/.env
nano backend/.env  # Fill in real values

# Generate JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
# Copy output to JWT_SECRET in .env
```

### 3. Database Setup
```bash
# Start database only first
docker-compose -f docker-compose.production.yml up -d postgres

# Wait for postgres to be healthy
docker-compose -f docker-compose.production.yml ps

# Run migrations
cd backend
npx prisma migrate deploy
cd ..
```

### 4. Build + Deploy
```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

### 5. SSL with Let's Encrypt (Nginx on host)
```bash
sudo apt install nginx certbot python3-certbot-nginx -y

# Configure nginx (use jakdata.conf as template)
sudo cp nginx/jakdata.conf /etc/nginx/sites-available/jakdata
sudo ln -s /etc/nginx/sites-available/jakdata /etc/nginx/sites-enabled/
sudo nginx -t

# Get SSL certificate
sudo certbot --nginx -d jakdata.yourdomain.com

# Auto-renewal
sudo systemctl enable certbot.timer
```

### 6. Scheduled Backup
```bash
chmod +x scripts/backup.sh

# Add to crontab (daily at 2am)
crontab -e
# Add: 0 2 * * * /opt/jakdata/scripts/backup.sh >> /var/log/jakdata-backup.log 2>&1
```

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| DATABASE_URL | ✅ | PostgreSQL connection string |
| JWT_SECRET | ✅ | Min 64 chars random string |
| NODE_ENV | ✅ | Must be "production" |
| FRONTEND_URL | ✅ | Your domain for CORS |
| PORT | ✅ | Default 3001 |

## Security Checklist

- [ ] JWT_SECRET changed from default
- [ ] DATABASE_URL uses strong password
- [ ] .env never committed to git
- [ ] Ports 5432 (postgres) not exposed to internet
- [ ] SSL/HTTPS enabled
- [ ] Firewall configured (ufw allow 22,80,443)
- [ ] Rate limiting active (verify via API)
- [ ] Backup schedule configured
- [ ] NODE_ENV=production (hides stack traces)

## Production Test Commands

```bash
# Health check
curl https://jakdata.yourdomain.com/health

# Test API
curl -X POST https://jakdata.yourdomain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@jakdata.id","password":"YOUR_PROD_PASSWORD"}'

# Check logs
docker logs jakdata_backend --tail=50
docker logs jakdata_db --tail=20
```

## Monitoring

```bash
# Container status
docker-compose -f docker-compose.production.yml ps

# Resource usage
docker stats jakdata_backend jakdata_db

# Database size
docker exec jakdata_db psql -U jakdata -c "\l+"
```

## Rollback

```bash
# Stop services
docker-compose -f docker-compose.production.yml down

# Restore database backup
gunzip -c backup/jakdata_YYYYMMDD_HHMMSS.sql.gz | \
  docker exec -i jakdata_db psql -U jakdata jakdata_prod

# Restart
docker-compose -f docker-compose.production.yml up -d
```

## Change Default Passwords Before Production

```bash
# Generate new admin password
node -e "const bcrypt=require('bcrypt'); bcrypt.hash('NEW_STRONG_PASSWORD',10).then(console.log)"

# Update in database
docker exec jakdata_db psql -U jakdata jakdata_prod \
  -c "UPDATE users SET password_hash='HASH_HERE' WHERE email='admin@jakdata.id';"
```

## LAN Field Trial (current mode)

For field trial on local network (current setup):
```powershell
# Backend
cd backend && npm run dev

# Frontend (accessible from HP)
cd frontend && npm run dev -- --host 0.0.0.0 --port 5173

# Get LAN IP
ipconfig | Select-String "IPv4"
# Open on HP: http://[IP]:5173
```
