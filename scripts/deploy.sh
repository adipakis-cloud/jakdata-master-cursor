#!/bin/bash
set -e

echo "========================================"
echo "  JAKDATA DEPLOYMENT SCRIPT"
echo "  $(date)"
echo "========================================"

# Check required env
if [ ! -f ./backend/.env ]; then
  echo "ERROR: backend/.env not found"
  echo "Copy backend/.env.production.example to backend/.env and fill in values"
  exit 1
fi

# Pull latest (if git)
if [ -d .git ]; then
  echo "[1/6] Pulling latest code..."
  git pull origin main
fi

# Build frontend
echo "[2/6] Building frontend..."
cd frontend
npm ci
npm run build
cd ..

# Backend deps
echo "[3/6] Installing backend dependencies..."
cd backend
npm ci --only=production
npx prisma generate
cd ..

# Run migrations (safe)
echo "[4/6] Running database migrations..."
cd backend
npx prisma migrate deploy
cd ..

# Restart services
echo "[5/6] Restarting services..."
docker-compose -f docker-compose.production.yml up -d --build

# Health check
echo "[6/6] Verifying health..."
sleep 5
curl -f http://localhost:3001/api/health && echo " Backend OK" || echo " Backend FAILED"
curl -f http://localhost:8080/health && echo " Frontend OK" || echo " Frontend FAILED"

echo ""
echo "========================================"
echo "  DEPLOYMENT COMPLETE"
echo "========================================"
