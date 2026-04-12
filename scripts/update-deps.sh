#!/bin/bash
# ============================================
# Update Dependencies Script
# ============================================
# Run: bash scripts/update-deps.sh

set -e

echo "📦 Checking for dependency updates..."

# Show outdated packages
echo ""
echo "📋 Outdated packages:"
npm outdated 2>/dev/null || echo "   All packages are up to date!"

echo ""
echo "🔄 Updating dependencies..."
npm update

echo ""
echo "🔨 Rebuilding..."
npm run build

echo ""
echo "✅ Dependencies updated!"
