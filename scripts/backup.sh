#!/bin/bash
# ============================================
# Backup Script
# ============================================
# Run: bash scripts/backup.sh

set -e

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="backups"
BACKUP_NAME="project_backup_${TIMESTAMP}"

echo "💾 Creating project backup..."

# Create backups directory
mkdir -p ${BACKUP_DIR}

# Create tar archive (excluding node_modules, dist, and backups)
echo "📦 Archiving project files..."
tar -czf "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" \
    --exclude=node_modules \
    --exclude=dist \
    --exclude=backups \
    --exclude=.git \
    --exclude=.DS_Store \
    .

# Report size
BACKUP_SIZE=$(du -sh "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" | cut -f1)
echo ""
echo "✅ Backup created!"
echo "   File: ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
echo "   Size: ${BACKUP_SIZE}"

# Keep only last 5 backups
BACKUP_COUNT=$(ls -1 ${BACKUP_DIR}/*.tar.gz 2>/dev/null | wc -l)
if [ ${BACKUP_COUNT} -gt 5 ]; then
    echo "🗑️  Removing old backups (keeping last 5)..."
    ls -1t ${BACKUP_DIR}/*.tar.gz | tail -n +6 | xargs rm -f
fi

echo "   Total backups: $(ls -1 ${BACKUP_DIR}/*.tar.gz 2>/dev/null | wc -l)"
