#!/bin/bash
# ============================================
# Environment Check Script
# ============================================
# Run: bash scripts/env-check.sh

echo "🔍 Checking environment..."
echo "================================"

# Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo "✅ Node.js: ${NODE_VERSION}"
else
    echo "❌ Node.js: NOT FOUND"
fi

# npm
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm -v)
    echo "✅ npm: ${NPM_VERSION}"
else
    echo "❌ npm: NOT FOUND"
fi

# Git
if command -v git &> /dev/null; then
    GIT_VERSION=$(git --version)
    echo "✅ Git: ${GIT_VERSION}"
else
    echo "⚠️  Git: NOT FOUND (optional)"
fi

# Check disk space
echo ""
echo "💾 Disk space:"
df -h . 2>/dev/null | tail -1 || echo "   Unable to check disk space"

# Check .env file
echo ""
echo "📋 Environment variables:"
if [ -f .env ]; then
    echo "✅ .env file exists"
    VAR_COUNT=$(grep -v '^#' .env | grep -v '^$' | wc -l)
    echo "   Variables defined: ${VAR_COUNT}"
else
    echo "⚠️  .env file not found"
fi

# Check node_modules
echo ""
if [ -d "node_modules" ]; then
    PKG_COUNT=$(ls -1 node_modules | wc -l)
    echo "📦 node_modules: ${PKG_COUNT} packages"
else
    echo "⚠️  node_modules not found (run 'npm install')"
fi

echo ""
echo "================================"
echo "✅ Environment check complete!"
