#!/usr/bin/env bash
# =============================================================================
#  Repair Broken Imports - Safe Version for Git Bash (Windows)
# =============================================================================

echo "══════════════════════════════════════════════════"
echo "  Repairing corrupted import lines"
echo "══════════════════════════════════════════════════"

# List of files we know are broken
broken_files=(
  "src/components/auth-guard.tsx"
  "src/components/main-nav.tsx"
  "src/components/user-nav.tsx"
)

for file in "${broken_files[@]}"; do
  if [ -f "$file" ]; then
    echo "Repairing $file ..."

    # Backup first
    cp "$file" "${file}.backup-$(date +%H%M%S)"

    # Remove any line that contains the broken comment
    grep -v "firebase/firestore removed" "$file" > "${file}.tmp"

    # Remove any remaining direct firebase imports
    sed 's|from ["'\'']firebase/auth["'\'']|// firebase/auth removed - use Supabase auth|g' "${file}.tmp" > "${file}.tmp2"
    sed 's|from ["'\'']firebase/firestore["'\'']|// firebase/firestore removed|g' "${file}.tmp2" > "$file"

    rm -f "${file}.tmp" "${file}.tmp2"
    echo "  ✅ Repaired $file"
  else
    echo "  ⚠️ File not found: $file"
  fi
done

# Also fix signup page
if [ -f "src/app/signup/page.tsx" ]; then
  echo "Fixing signup/page.tsx (firebase/auth)"
  sed -i 's|from ["'\'']firebase/auth["'\'']|// firebase/auth removed - use Supabase auth|g' src/app/signup/page.tsx
fi

echo ""
echo "✅ Broken lines removed. Now cleaning remaining issues..."

# Delete old firebase folder completely
rm -rf src/firebase
echo "✅ Removed old src/firebase folder"

# Fix genkit error (AI flow)
if [ -f "src/ai/flows/generate-lesson-studio.ts" ] || [ -f "src/app/api/lesson-studio/route.ts" ]; then
  echo "Removing genkit dependency (not installed)"
  npm uninstall genkit @genkit-ai/googleai @genkit-ai/ai 2>/dev/null || true
fi

# Clean cache
rm -rf .next

echo ""
echo "Running build test..."
npm run build

if [ $? -eq 0 ]; then
  echo ""
  echo "🎉 Build succeeded!"
  echo "Commit your changes:"
  echo "git add ."
  echo "git commit -m \"fix: repair broken imports after Supabase migration\""
  echo "git push"
else
  echo ""
  echo "❌ Build still has errors."
  echo "Please copy the **FULL new error output** and paste it here."
fi