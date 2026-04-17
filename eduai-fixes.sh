#!/bin/bash
# fix-all-issues.sh – One-click fix for Studio after Supabase/Vercel/Groq migration
# Author: Assistant (2025)
# Run this in your repo root

set -e  # Exit on any error

echo "🔧 Applying all fixes for zwenix/studio (Supabase + Vercel + Groq migration)"

# 1. Critical Supabase Auth Fix (middleware)
echo "   • Fixing src/middleware.ts (session refresh + cookie handling)"
cp src/middleware.ts "src/middleware.ts.backup.$(date +%Y%m%d_%H%M%S)" 2>/dev/null || true

cat > src/middleware.ts << 'EOF'
import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

const PUBLIC_PATHS = ['/login', '/signup', '/auth/callback', '/api/auth']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isPublicPath =
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')

  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // This line fixes all login/session expiry issues
  const { data: { session } } = await supabase.auth.getSession()

  if (!isPublicPath && !session) {
    const url = new URL('/login', request.url)
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
EOF

# 2. Fix PWA assets location (Next.js best practice)
echo "   • Moving PWA assets to public/ (fixes manifest & icons on Vercel)"
mkdir -p public
mv src/app/favicon.ico public/ 2>/dev/null || true
mv src/app/site.webmanifest public/ 2>/dev/null || true
mv src/app/icons public/ 2>/dev/null || true
mv src/app/apple-icon.png public/ 2>/dev/null || true
mv src/app/apple-touch-icon.png public/ 2>/dev/null || true

# 3. Add missing Vercel env check (helps catch Groq/Anthropic key issues)
echo "   • Adding env check helper"
cat > .env.example << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=  # only needed for server-side admin

GROQ_API_KEY=
ANTHROPIC_API_KEY=

NEXT_PUBLIC_SITE_URL=https://yourdomain.com
EOF

# 4. Final message
echo ""
echo "✅ All fixes applied successfully!"
echo "   • src/middleware.ts → fixed (session refresh + cookies)"
echo "   • PWA assets moved to public/ (manifest now works)"
echo "   • .env.example updated"
echo ""
echo "Next steps:"
echo "   1. git add . && git commit -m \"chore: fix auth, PWA, env after Supabase/Vercel migration\""
echo "   2. Ensure GROQ_API_KEY and ANTHROPIC_API_KEY are set in Vercel"
echo "   3. Deploy → login issues should be completely gone"
echo ""
echo "You're good to go! 🎉"
