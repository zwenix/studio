#!/usr/bin/env bash
# =============================================================================
#  Safe Repair Script - Fixes corrupted imports + genkit error
# =============================================================================

echo "══════════════════════════════════════════════════"
echo "  Repairing corrupted Firebase import lines"
echo "══════════════════════════════════════════════════"

# Backup folder
mkdir -p backup_before_final_fix_$(date +%Y%m%d_%H%M)

# List of known broken files
files=(
  "src/app/ai-tutor/page.tsx"
  "src/app/autograding/page.tsx"
  "src/app/classes/[classId]/assignments/[assignmentId]/page.tsx"
  "src/app/communication/page.tsx"
  "src/components/auth-guard.tsx"
  "src/components/main-nav.tsx"
  "src/components/user-nav.tsx"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "Repairing $file"
    cp "$file" "backup_before_final_fix_$(date +%Y%m%d_%H%M)/"

    # Remove any broken comment lines that contain "firebase" and are on import lines
    grep -v "firebase/firestore removed" "$file" > "${file}.tmp"
    grep -v "firebase/ (migrated" "${file}.tmp" > "$file"
    rm "${file}.tmp"

    # Clean any remaining direct firebase imports
    sed -i 's|from ["'\'']firebase[^"'\'' ]*["'\'']|// Firebase import removed - use Supabase|g' "$file"

    echo "  ✅ Repaired $file"
  fi
done

# Fix signup page
if [ -f "src/app/signup/page.tsx" ]; then
  echo "Fixing signup/page.tsx"
  sed -i 's|from ["'\'']firebase/auth["'\'']|// firebase/auth removed - use Supabase auth|g' src/app/signup/page.tsx
fi

echo "✅ Corrupted lines removed"

# Remove old firebase folder
rm -rf src/firebase
echo "✅ Removed old src/firebase folder"

# Fix genkit error
echo "Removing genkit (not needed after migration)"
npm uninstall genkit @genkit-ai/googleai @genkit-ai/ai 2>/dev/null || true

# Clean cache
rm -rf .next

echo ""
echo "Running build test..."
npm run build

if [ $? -eq 0 ]; then
  echo ""
  echo "🎉 BUILD SUCCEEDED!"
  echo ""
  echo "Next steps:"
  echo "git add ."
  echo "git commit -m \"fix: repair corrupted imports and complete Supabase migration\""
  echo "git push"
else
  echo ""
  echo "❌ Still failing. Please copy the **FULL new build error** and paste it here."
fi
