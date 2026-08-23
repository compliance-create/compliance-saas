#!/usr/bin/env bash
# 数据库每日备份 + 保留 7 天
# 建议加到 crontab:  0 3 * * *  /opt/compliance-saas/deploy/backup-db.sh
set -euo pipefail

APP_DIR=${APP_DIR:-/opt/compliance-saas}
BACKUP_DIR=${BACKUP_DIR:-/var/backups/compliance}
KEEP_DAYS=${KEEP_DAYS:-7}

mkdir -p "$BACKUP_DIR"
TS=$(date +%Y%m%d_%H%M%S)
FILE="$BACKUP_DIR/compliance_${TS}.sql.gz"

# 从 .env 读 DB 密码
DB_URL=$(grep -E '^DATABASE_URL=' "$APP_DIR/.env" | head -1 | cut -d= -f2-)
# 解析 user / pass / host / db
USER=$(echo "$DB_URL" | sed -nE 's|.*://([^:]+):.*|\1|p')
PASS=$(echo "$DB_URL" | sed -nE 's|.*://[^:]+:([^@]+)@.*|\1|p')
HOST=$(echo "$DB_URL" | sed -nE 's|.*@([^:/]+).*|\1|p')
DB=$(  echo "$DB_URL" | sed -nE 's|.*/([^?]+).*|\1|p')

PGPASSWORD="$PASS" pg_dump -U "$USER" -h "$HOST" -d "$DB" --no-owner --clean | gzip > "$FILE"
echo "[$(date)] backup ok: $FILE ($(du -h "$FILE" | cut -f1))"

# 清理 7 天前的
find "$BACKUP_DIR" -name "compliance_*.sql.gz" -mtime +$KEEP_DAYS -delete
echo "[$(date)] cleanup done (keep last $KEEP_DAYS days)"

# 列出当前所有备份
ls -lh "$BACKUP_DIR" | tail -10
