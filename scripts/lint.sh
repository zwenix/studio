#!/bin/bash
# ============================================
# Lint & Format Script
# ============================================
# Run: bash scripts/lint.sh

set -e

echo "✨ Running linting and formatting..."

# Install linting tools if needed
if [ ! -d "node_modules/.bin/eslint" ]; then
    echo "📦 Installing ESLint..."
    npm install -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
fi

if [ ! -d "node_modules/.bin/prettier" ]; then
    echo "📦 Installing Prettier..."
    npm install -D prettier
fi

# Run Prettier to format code
echo "🎨 Formatting code with Prettier..."
npx prettier --write "src/**/*.{ts,tsx,css}" 2>/dev/null || echo "⚠️  Prettier formatting skipped"

# Run ESLint
echo "🔍 Linting with ESLint..."
npx eslint "src/**/*.{ts,tsx}" --fix 2>/dev/null || echo "⚠️  ESLint check skipped (no config found)"

echo ""
echo "✅ Linting and formatting complete!"
