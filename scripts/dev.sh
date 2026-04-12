#!/bin/bash
# ============================================
# Dev Server Script
# ============================================
# Run: bash scripts/dev.sh [port]

set -e

PORT=${1:-5173}

echo "🖥️  Starting development server..."
echo "   Port: ${PORT}"
echo "   URL: http://localhost:${PORT}"
echo ""

# Check dependencies
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies first..."
    npm install
fi

# Start dev server
echo "⚡ Launching Vite dev server..."
npm run dev -- --port ${PORT}
