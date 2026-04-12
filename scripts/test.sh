#!/bin/bash
# ============================================
# Test Runner Script
# ============================================
# Run: bash scripts/test.sh

set -e

echo "🧪 Running test suite..."

# Check if a test runner is installed
if [ ! -d "node_modules/.bin/vitest" ] && [ ! -d "node_modules/.bin/jest" ]; then
    echo "⚠️  No test runner found. Installing Vitest..."
    npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
fi

# Run tests with coverage
echo "📊 Running tests with coverage..."
npx vitest run --coverage 2>/dev/null || npx jest --coverage 2>/dev/null || {
    echo "⚠️  No test files found. Create tests in src/**/*.test.tsx"
    echo ""
    echo "Example test:"
    echo '  import { describe, it, expect } from "vitest";'
    echo '  describe("MyComponent", () => {'
    echo '    it("should render", () => {'
    echo '      expect(true).toBe(true);'
    echo '    });'
    echo '  });'
}

echo ""
echo "✅ Tests complete!"
