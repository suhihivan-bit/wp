#!/bin/bash
#
# PostgreSQL Automated Backup Script
# Performs daily backups with compression and rotation
#

set -e  # Exit on error

# Load environment variables
if [ -f /var/www/consultation-booking/server/.env ]; then
    export $(grep -v '^#' /var/www/consultation-booking/server/.env | xargs)
fi

# Configuration
BACKUP_DIR="/var/backups/postgresql/consultation-booking"
BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/backup_${BACKUP_DATE}.sql.gz"
LOG_FILE="${BACKUP_DIR}/backup.log"
RETENTION_DAYS=30

# Database credentials from .env
DB_NAME="${DB_NAME:-consultation_booking}"
DB_USER="${DB_USER:-consultation_user}"
DB_PASSWORD="${DB_PASSWORD:-secure_password_2026}"

# Create backup directory if it doesn't exist
mkdir -p "${BACKUP_DIR}"

# Log function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "${LOG_FILE}"
}

log "Starting PostgreSQL backup..."

# Perform backup with compression
export PGPASSWORD="${DB_PASSWORD}"
if pg_dump -h localhost -U "${DB_USER}" -d "${DB_NAME}" | gzip > "${BACKUP_FILE}"; then
    BACKUP_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
    log "✅ Backup successful: ${BACKUP_FILE} (${BACKUP_SIZE})"
else
    log "❌ Backup failed!"
    exit 1
fi

# Remove old backups (older than RETENTION_DAYS)
log "Cleaning up old backups (older than ${RETENTION_DAYS} days)..."
find "${BACKUP_DIR}" -name "backup_*.sql.gz" -type f -mtime +${RETENTION_DAYS} -delete
REMAINING=$(find "${BACKUP_DIR}" -name "backup_*.sql.gz" -type f | wc -l)
log "Retained backups: ${REMAINING}"

# Calculate total backup size
TOTAL_SIZE=$(du -sh "${BACKUP_DIR}" | cut -f1)
log "Total backup size: ${TOTAL_SIZE}"

log "Backup completed successfully!"

# Optional: Upload to cloud storage (uncomment if needed)
# log "Uploading to cloud storage..."
# rclone copy "${BACKUP_FILE}" remote:backups/consultation-booking/

exit 0
