#!/usr/bin/env bash
# =============================================================================
#  Final Firebase → Supabase Import Fix (v6) - Git Bash Friendly
# =============================================================================

echo "══════════════════════════════════════════════════"
echo "  Final cleanup of firebase/firestore imports"
echo "══════════════════════════════════════════════════"

# 1. Create Supabase folder + files (again, to be sure)
mkdir -p src/lib/supabase

cat > src/lib/supabase/client.ts << 'EOC'
import { createBrowserClient } from '@supabase/ssr'

export const createClient = () => createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
EOC

cat > src/lib/supabase/index.ts << 'EOC'
export { createClient } from './client'
EOC

echo "✅ Supabase client created"

# 2. Fix all remaining firebase/firestore imports
echo "Fixing all files with firebase/firestore imports..."

find src -name "*.tsx" -o -name "*.ts" | while read -r file; do
  if grep -q "firebase/firestore" "$file" 2>/dev/null; then
    echo "  Fixing → $file"
    cp "$file" "${file}.bak"

    # Replace the import line
    sed 's|from ["'\'']firebase/firestore["'\'']|// firebase/firestore removed - migrated to Supabase|g' "${file}.bak" > "$file"

    # Also replace any @/firebase remaining
    sed -i 's|from ["'\'']@/firebase[^"'\'' ]*["'\'']|from "@/lib/supabase"|g' "$file"
  fi
done

echo "✅ All direct firebase/firestore imports replaced"

# 3. Delete old firebase folder (safe now)
if [ -d "src/firebase" ]; then
  echo "Removing old src/firebase folder..."
  rm -rf src/firebase
fi

# 4. Clean and reinstall packages
echo "Cleaning packages..."
npm uninstall firebase firebase-admin 2>/dev/null || true
npm install @supabase/supabase-js @supabase/ssr

# 5. Fix Next.js lockfile issue (common on Windows)
echo "Deleting next.js cache and lockfile patch..."
rm -rf .next
rm -f package-lock.json
npm install

echo ""
echo "Running build test..."
npm run build

if [ $? -eq 0 ]; then
  echo ""
  echo "🎉 BUILD SUCCEEDED!"
  echo "You can now commit and push to Vercel."
else
  echo ""
  echo "❌ Build still failing."
  echo "Please copy the FULL new error and paste it here."
fi
