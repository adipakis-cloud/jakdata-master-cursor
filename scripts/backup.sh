#!/bin/bash
set -e

BACKUP_DIR="./backup"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/jakdata_${DATE}.sql.gz"

mkdir -p $BACKUP_DIR

echo "Creating backup: $BACKUP_FILE"

# Dump from Docker container
docker exec jakdata_db pg_dump \
  -U ${DB_USER:-jakdata} \
  jakdata_prod | gzip > $BACKUP_FILE

echo "Backup complete: $(du -sh $BACKUP_FILE | cut -f1)"

# Keep only last 7 days of backups
find $BACKUP_DIR -name "jakdata_*.sql.gz" -mtime +7 -delete
echo "Old backups cleaned up"

# List current backups
echo "Current backups:"
ls -lh $BACKUP_DIR/jakdata_*.sql.gz 2>/dev/null || echo "No backups found"
