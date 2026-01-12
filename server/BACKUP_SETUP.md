# Automated PostgreSQL Backup Setup Guide

## 📋 Overview

This setup provides:

- **Daily automated backups** at 3 AM
- **30-day retention** policy
- **Compressed backups** (gzip)
- **Easy restore** process
- **Backup monitoring** via logs

---

## 🚀 Installation

### On Server (run as root)

```bash
# 1. Connect to server
ssh root@94.103.88.179

# 2. Navigate to project
cd /var/www/consultation-booking

# 3. Pull latest code
git pull origin main

# 4. Create backup directory
sudo mkdir -p /var/backups/postgresql/consultation-booking
sudo chmod 755 /var/backups/postgresql/consultation-booking

# 5. Make scripts executable
chmod +x server/scripts/backup.sh
chmod +x server/scripts/restore.sh

# 6. Test backup manually
./server/scripts/backup.sh
```

**Expected Output:**

```
Starting PostgreSQL backup...
✅ Backup successful: /var/backups/postgresql/consultation-booking/backup_20260112_150000.sql.gz (45K)
Retained backups: 1
Total backup size: 45K
Backup completed successfully!
```

---

## ⏰ Schedule Automatic Backups

### Setup Cron Job

```bash
# Edit crontab
crontab -e
```

Add this line (backups at 3 AM daily):

```cron
0 3 * * * /var/www/consultation-booking/server/scripts/backup.sh >> /var/backups/postgresql/consultation-booking/backup.log 2>&1
```

Save and exit (`Ctrl+O`, `Enter`, `Ctrl+X`)

**Verify cron job:**

```bash
crontab -l
```

---

## 🔄 Restore from Backup

### List Available Backups

```bash
ls -lh /var/backups/postgresql/consultation-booking/
```

### Restore Database

```bash
# Choose a backup file
./server/scripts/restore.sh /var/backups/postgresql/consultation-booking/backup_20260112_150000.sql.gz
```

**Follow prompts:**

1. Review database and backup file
2. Type `yes` to confirm
3. Wait for restore to complete
4. Verify data counts

---

## 📊 Monitoring

### View Backup Logs

```bash
tail -f /var/backups/postgresql/consultation-booking/backup.log
```

### Check Backup Status

```bash
# List all backups with sizes
ls -lh /var/backups/postgresql/consultation-booking/backup_*.sql.gz

# Count backups
ls /var/backups/postgresql/consultation-booking/backup_*.sql.gz | wc -l

# Total size
du -sh /var/backups/postgresql/consultation-booking/
```

### Verify Latest Backup

```bash
# Get latest backup
LATEST=$(ls -t /var/backups/postgresql/consultation-booking/backup_*.sql.gz | head -1)

# Check if it's recent (less than 48 hours old)
find /var/backups/postgresql/consultation-booking/ -name "backup_*.sql.gz" -mtime -2 -ls
```

---

## ⚙️ Configuration

### Backup Retention

Edit `server/scripts/backup.sh`:

```bash
RETENTION_DAYS=30  # Change to desired days
```

### Backup Schedule

Edit crontab:

```cron
# Daily at 3 AM
0 3 * * * /var/www/consultation-booking/server/scripts/backup.sh

# Every 6 hours
0 */6 * * * /var/www/consultation-booking/server/scripts/backup.sh

# Weekly (Sunday at 2 AM)
0 2 * * 0 /var/www/consultation-booking/server/scripts/backup.sh
```

---

## 💾 Backup to Cloud (Optional)

### Using Rclone

```bash
# Install rclone
curl https://rclone.org/install.sh | sudo bash

# Configure remote
rclone config

# Uncomment in backup.sh:
rclone copy "${BACKUP_FILE}" remote:backups/consultation-booking/
```

### Using SCP to Another Server

Add to `backup.sh`:

```bash
scp "${BACKUP_FILE}" user@backup-server:/backups/
```

---

## 🧪 Testing

### Test Backup

```bash
./server/scripts/backup.sh
echo $?  # Should be 0 (success)
```

### Test Restore (on test database)

```bash
# Create test database
sudo -u postgres psql -c "CREATE DATABASE test_restore;"

# Modify restore.sh temporarily for test
# Then restore
./server/scripts/restore.sh <backup-file>
```

---

## 🚨 Troubleshooting

### Backup Fails

**Check PostgreSQL password:**

```bash
grep DB_PASSWORD /var/www/consultation-booking/server/.env
```

**Test manual backup:**

```bash
pg_dump -h localhost -U consultation_user consultation_booking > test.sql
```

### Permission Denied

```bash
sudo chown -R root:root /var/backups/postgresql/
sudo chmod 755 /var/backups/postgresql/consultation-booking
```

### Cron Not Running

```bash
# Check cron service
systemctl status cron

# Check cron logs
grep CRON /var/log/syslog
```

---

## 📈 Best Practices

1. **Monitor backups weekly** - Check logs for failures
2. **Test restore monthly** - Verify backups are usable
3. **Keep 30 days** minimum retention
4. **Store offsite** - Upload to cloud storage
5. **Alert on failures** - Setup email notifications

---

## 🔒 Security

- Backups stored in `/var/backups/` (root only)
- Database password in `.env` (not in backup script)
- Compressed backups save disk space
- Old backups automatically deleted

---

## 📊 Estimated Sizes

- **Per backup:** ~50KB compressed (small dataset)
- **30 days:** ~1.5MB total
- **Growth:** ~2KB per booking

Current database is small, backups are tiny!

---

## ✅ Setup Checklist

- [ ] Scripts created and executable
- [ ] Backup directory created
- [ ] Manual backup tested
- [ ] Cron job configured
- [ ] Logs monitored for 24 hours
- [ ] Restore tested successfully
- [ ] Documentation reviewed

---

**Ready to deploy!** 🚀
