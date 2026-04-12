#!/bin/bash
# ============================================
# Cleanup & Reset Script
# ============================================
# Run: bash scripts/cleanup.sh

set -e

echo "🧹 Starting cleanup..."

# Remove build output
if [ -d "dist" ]; then
    echo "🗑️  Removing dist/..."
    rm -rf dist/
fi

# Clear Vite cache
if [ -d "node_modules/.vite" ]; then
    echo "🗑️  Clearing Vite cache..."
    rm -rf node_modules/.vite/
fi

# Remove TypeScript build info
if [ -f "tsconfig.tsbuildinfo" ]; then
    echo "🗑️  Removing tsconfig.tsbuildinfo..."
    rm -f tsconfig.tsbuildinfo
fi

# Remove coverage reports
if [ -d "coverage" ]; then
    echo "🗑️  Removing coverage/..."
    rm -rf coverage/
fi

# Remove .DS_Store files
find . -name ".DS_Store" -delete 2>/dev/null || true

# Remove log files
find . -name "*.log" -delete 2>/dev/null || true

echo ""
echo "✅ Cleanup complete!"
echo "   Run 'npm install' to reinstall dependencies if needed."
