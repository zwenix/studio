#!/bin/bash
# ============================================
# Build & Optimize Script
# ============================================
# Run: bash scripts/build.sh

set -e

echo "🔨 Starting production build..."

# Clean previous build
echo "🧹 Cleaning previous build..."
rm -rf dist/

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Run TypeScript check
echo "🔍 Running TypeScript checks..."
npx tsc --noEmit

# Build the project
echo "⚡ Building with Vite..."
npm run build

# Report build size
echo ""
echo "📊 Build output:"
if command -v du &> /dev/null; then
    du -sh dist/
fi

echo ""
echo "✅ Build complete! Files are in the dist/ directory."
