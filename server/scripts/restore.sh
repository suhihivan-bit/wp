#!/bin/bash
#
# PostgreSQL Backup Restore Script
# Restores database from a backup file
#

set -e

# Load environment variables
if [ -f /var/www/consultation-booking/server/.env ]; then
    export $(grep -v '^#' /var/www/consultation-booking/server/.env | xargs)
fi

# Configuration
BACKUP_DIR="/var/backups/postgresql/consultation-booking"
DB_NAME="${DB_NAME:-consultation_booking}"
DB_USER="${DB_USER:-consultation_user}"
DB_PASSWORD="${DB_PASSWORD:-secure_password_2026}"

# Check if backup file is provided
if [ -z "$1" ]; then
    echo "Usage: $0 <backup_file>"
    echo ""
    echo "Available backups:"
    ls -lh "${BACKUP_DIR}"/backup_*.sql.gz 2>/dev/null || echo "No backups found"
    exit 1
fi

BACKUP_FILE="$1"

# Check if file exists
if [ ! -f "${BACKUP_FILE}" ]; then
    echo "❌ Backup file not found: ${BACKUP_FILE}"
    exit 1
fi

echo "⚠️  WARNING: This will OVERWRITE the current database!"
echo "Database: ${DB_NAME}"
echo "Backup: ${BACKUP_FILE}"
echo ""
read -p "Are you sure? (type 'yes' to continue): " CONFIRM

if [ "${CONFIRM}" != "yes" ]; then
    echo "Restore cancelled."
    exit 0
fi

echo ""
echo "Starting restore..."

# Drop existing connections
export PGPASSWORD="${DB_PASSWORD}"
psql -h localhost -U postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${DB_NAME}' AND pid <> pg_backend_pid();" 2>/dev/null || true

# Drop and recreate database
echo "Recreating database..."
psql -h localhost -U postgres -c "DROP DATABASE IF EXISTS ${DB_NAME};"
psql -h localhost -U postgres -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"

# Restore from backup
echo "Restoring data..."
gunzip -c "${BACKUP_FILE}" | psql -h localhost -U "${DB_USER}" -d "${DB_NAME}"

if [ $? -eq 0 ]; then
    echo "✅ Restore completed successfully!"
    echo ""
    echo "Verifying data..."
    psql -h localhost -U "${DB_USER}" -d "${DB_NAME}" -c "SELECT COUNT(*) as bookings FROM bookings;"
    psql -h localhost -U "${DB_USER}" -d "${DB_NAME}" -c "SELECT COUNT(*) as admin_users FROM admin_users;"
else
    echo "❌ Restore failed!"
    exit 1
fi

exit 0
