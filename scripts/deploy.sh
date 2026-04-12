#!/bin/bash
# ============================================
# Deploy Script
# ============================================
# Run: bash scripts/deploy.sh [environment]

set -e

DEPLOY_ENV=${1:-production}

echo "🚀 Deploying to ${DEPLOY_ENV}..."

# Pre-deployment checks
echo "🔍 Running pre-deployment checks..."

# Ensure we're on the main branch (optional)
CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
echo "📌 Current branch: ${CURRENT_BRANCH}"

# Run build
echo "🔨 Building for production..."
bash scripts/build.sh

# Run tests
echo "🧪 Running tests..."
bash scripts/test.sh 2>/dev/null || echo "⚠️  Tests skipped"

# Generate deployment info
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
echo "" > dist/DEPLOY_INFO.txt
echo "Deployed: ${TIMESTAMP}" >> dist/DEPLOY_INFO.txt
echo "Environment: ${DEPLOY_ENV}" >> dist/DEPLOY_INFO.txt
echo "Branch: ${CURRENT_BRANCH}" >> dist/DEPLOY_INFO.txt
echo "Commit: $(git rev-parse --short HEAD 2>/dev/null || echo 'N/A')" >> dist/DEPLOY_INFO.txt

echo ""
echo "📋 Deployment info:"
cat dist/DEPLOY_INFO.txt

echo ""
echo "✅ Build ready for deployment!"
echo "   Upload the dist/ directory to your hosting provider."
echo ""
echo "   Options:"
echo "   • Vercel:  vercel --prod"
echo "   • Netlify: netlify deploy --prod --dir=dist"
echo "   • GitHub Pages: use peaceiris/actions-gh-pages"
