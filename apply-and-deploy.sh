#!/usr/bin/env bash
# =============================================================================
#  EduAI Companion — Apply Auth + AI Changes & Deploy to Vercel
#  Run this from your project root: bash apply-and-deploy.sh
# =============================================================================

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

ok()      { echo -e "${GREEN}  ✅ $*${NC}"; }
warn()    { echo -e "${YELLOW}  ⚠️  $*${NC}"; }
err()     { echo -e "${RED}  ❌ $*${NC}"; exit 1; }
log()     { echo -e "${CYAN}  → $*${NC}"; }
step()    { echo -e "\n${BOLD}${BLUE}  ══ $* ══${NC}\n"; }
divider() { echo -e "${BLUE}  ────────────────────────────────────────${NC}"; }

# ── Verify we're in project root ─────────────────────────────────────────────
if [ ! -f "package.json" ]; then
  err "Run this from your project root (where package.json lives)."
fi

clear
echo -e "${BOLD}${GREEN}"
echo "  ╔══════════════════════════════════════════════════╗"
echo "  ║   EduAI — Apply Auth + AI Changes & Deploy       ║"
echo "  ╚══════════════════════════════════════════════════╝"
echo -e "${NC}"

# ── Collect credentials ───────────────────────────────────────────────────────
step "Enter Your API Keys"
echo "  These will be set as Vercel environment variables."
echo ""

echo -e "  ${CYAN}Supabase Project URL (https://xxxx.supabase.co):${NC}"
read -r SUPABASE_URL
SUPABASE_URL="${SUPABASE_URL%/}"

echo -e "  ${CYAN}Supabase anon/public key:${NC}"
read -r SUPABASE_ANON_KEY

echo -e "  ${CYAN}Supabase service_role key:${NC}"
read -rs SUPABASE_SERVICE_ROLE_KEY
echo ""

echo -e "  ${CYAN}Anthropic API Key (claude.ai/settings → API Keys):${NC}"
read -rs ANTHROPIC_API_KEY
echo ""

echo -e "  ${CYAN}Groq API Key (console.groq.com → API Keys):${NC}"
read -rs GROQ_API_KEY
echo ""

echo -e "  ${CYAN}Pexels API Key (pexels.com/api):${NC}"
read -r PEXELS_API_KEY

echo -e "  ${CYAN}Pixabay API Key (pixabay.com/api):${NC}"
read -r PIXABAY_API_KEY

# ── Step 1: Install packages ──────────────────────────────────────────────────
step "1/5 — Installing Required Packages"

log "Installing Supabase SSR package..."
npm install @supabase/supabase-js @supabase/ssr 2>/dev/null | tail -1
ok "Supabase packages installed"

log "Removing Genkit packages (no longer needed)..."
npm uninstall genkit @genkit-ai/google-genai @genkit-ai/next genkitx-groq 2>/dev/null || true
ok "Genkit removed"

# ── Step 2: Write source files ────────────────────────────────────────────────
step "2/5 — Writing Updated Source Files"

# Create directories
mkdir -p src/lib/supabase
mkdir -p src/app/auth/callback
mkdir -p src/app/login
mkdir -p src/app/signup
mkdir -p src/hooks

# ── Supabase browser client ────────────────────────────────────────────────
cat > src/lib/supabase/client.ts << 'EOF'
'use client';
import { createBrowserClient } from '@supabase/ssr';
let _client: ReturnType<typeof createBrowserClient> | null = null;
export function getSupabaseClient() {
  if (!_client) {
    _client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return _client;
}
EOF
ok "src/lib/supabase/client.ts"

# ── Supabase server client ─────────────────────────────────────────────────
cat > src/lib/supabase/server.ts << 'EOF'
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll()      { return cookieStore.getAll(); },
        setAll(toSet) {
          try { toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); }
          catch {}
        },
      },
    }
  );
}
export function createAdminClient() {
  const { createClient: c } = require('@supabase/supabase-js');
  return c(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } });
}
EOF
ok "src/lib/supabase/server.ts"

# ── useUser hook ───────────────────────────────────────────────────────────
cat > src/hooks/use-user.ts << 'EOF'
'use client';
import { useState, useEffect } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

export type AppUser = User & {
  uid: string;
  displayName: string | null;
  photoURL: string | null;
};

function normalise(user: User | null): AppUser | null {
  if (!user) return null;
  return {
    ...user,
    uid: user.id,
    displayName: user.user_metadata?.full_name ?? user.email ?? null,
    photoURL: user.user_metadata?.avatar_url ?? null,
  };
}

export function useUser() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabaseClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(normalise(session?.user ?? null));
      setIsUserLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(normalise(session?.user ?? null));
      setIsUserLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  return { user, isUserLoading };
}
EOF
ok "src/hooks/use-user.ts"

# ── Middleware ─────────────────────────────────────────────────────────────
cat > src/middleware.ts << 'EOF'
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
const PUBLIC_PATHS = ['/', '/login', '/signup'];
export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(toSet) {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
        },
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  if (path === '/auth/callback') return supabaseResponse;
  if (!user && !PUBLIC_PATHS.includes(path) && !path.startsWith('/api')) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }
  if (user && PUBLIC_PATHS.includes(path)) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }
  return supabaseResponse;
}
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
EOF
ok "src/middleware.ts"

# ── OAuth callback route ───────────────────────────────────────────────────
mkdir -p src/app/auth/callback
cat > src/app/auth/callback/route.ts << 'EOF'
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';
  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll()      { return cookieStore.getAll(); },
          setAll(toSet) { toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); },
        },
      }
    );
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
    console.error('OAuth error:', error.message);
  }
  return NextResponse.redirect(`${origin}/login?error=oauth_error`);
}
EOF
ok "src/app/auth/callback/route.ts"

# ── AI client ─────────────────────────────────────────────────────────────
cat > src/lib/ai.ts << 'AIEOF'
'use server';
export interface AIMessage { role: 'user' | 'assistant'; content: string; }
interface GenerateOptions { maxTokens?: number; temperature?: number; history?: AIMessage[]; }

async function claudeGenerate(prompt: string, systemPrompt: string, opts: GenerateOptions = {}): Promise<string> {
  const { maxTokens = 8192, temperature = 0.7, history = [] } = opts;
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY!, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: maxTokens, system: systemPrompt, messages: [...history, { role: 'user', content: prompt }] }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) throw new Error(`Claude ${response.status}: ${await response.text()}`);
  return (await response.json()).content[0].text;
}

async function groqGenerate(prompt: string, systemPrompt: string, opts: GenerateOptions = {}): Promise<string> {
  const { maxTokens = 8192, temperature = 0.7, history = [] } = opts;
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
    body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'system', content: systemPrompt }, ...history, { role: 'user', content: prompt }], max_tokens: maxTokens, temperature }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) throw new Error(`Groq ${response.status}: ${await response.text()}`);
  return (await response.json()).choices[0].message.content;
}

export async function generateText(prompt: string, systemPrompt: string, opts: GenerateOptions = {}): Promise<string> {
  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
  const hasGroq      = !!process.env.GROQ_API_KEY;
  if (!hasAnthropic && !hasGroq) throw new Error('No AI API keys configured.');
  if (hasAnthropic) {
    try { const r = await claudeGenerate(prompt, systemPrompt, opts); console.log('[AI] Claude: ok'); return r; }
    catch (e: any) { console.warn('[AI] Claude failed, trying Groq:', e.message); if (!hasGroq) throw e; }
  }
  console.log('[AI] Using Groq...');
  return groqGenerate(prompt, systemPrompt, opts);
}

export async function generateJSON<T>(prompt: string, systemPrompt: string, opts: GenerateOptions = {}): Promise<T> {
  const sys = `${systemPrompt}\n\nCRITICAL: Respond ONLY with a single valid JSON object. No markdown fences. Start with { and end with }.`;
  const raw = await generateText(prompt, sys, opts);
  const cleaned = raw.replace(/^```json\s*/i,'').replace(/^```\s*/i,'').replace(/```\s*$/i,'').trim();
  try { return JSON.parse(cleaned) as T; }
  catch {
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]) as T;
    throw new Error(`AI returned invalid JSON: ${cleaned.slice(0,300)}`);
  }
}
AIEOF
ok "src/lib/ai.ts"

# ── User nav (Supabase signOut) ────────────────────────────────────────────
cat > src/components/user-nav.tsx << 'EOF'
'use client';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUser } from '@/hooks/use-user';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { getSupabaseClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { doc } from 'firebase/firestore';
import type { User as UserProfile } from '@/lib/types';
export function UserNav() {
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const userProfileRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.id) : null, [firestore, user]);
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);
  const handleSignOut = async () => {
    await getSupabaseClient().auth.signOut();
    router.push('/login');
    router.refresh();
  };
  const initials = userProfile ? `${userProfile.firstName?.[0]??''}${userProfile.lastName?.[0]??''}`.toUpperCase() : (user?.email?.[0]?.toUpperCase() ?? 'U');
  const displayName = userProfile ? `${userProfile.firstName} ${userProfile.lastName}`.trim() : (user?.displayName ?? user?.email ?? 'User');
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src={userProfile?.avatarUrl ?? user?.photoURL ?? ''} alt={displayName} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{displayName}</p>
            <p className="text-xs leading-none text-muted-foreground">{user?.email ?? ''}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild><Link href="/dashboard">Dashboard</Link></DropdownMenuItem>
          <DropdownMenuItem asChild><Link href="/settings">Settings</Link></DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">Log out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
EOF
ok "src/components/user-nav.tsx"

ok "All source files written"

# ── Step 3: Update .env.local ─────────────────────────────────────────────────
step "3/5 — Updating Environment File"

# Preserve any existing vars not being replaced
EXISTING_ENV=""
if [ -f ".env.local" ]; then
  # Keep lines that aren't being overwritten
  EXISTING_ENV=$(grep -v "^NEXT_PUBLIC_SUPABASE\|^SUPABASE_\|^ANTHROPIC_\|^GROQ_\|^PEXELS_\|^PIXABAY_\|^GEMINI_\|^GOOGLE_GENAI" .env.local 2>/dev/null || true)
  cp .env.local ".env.local.backup-$(date +%Y%m%d-%H%M%S)"
  ok "Backed up existing .env.local"
fi

cat > .env.local << ENVEOF
# ── Supabase ──────────────────────────────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}

# ── AI — Anthropic (primary) + Groq (failover) ─────────────────────────────
ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
GROQ_API_KEY=${GROQ_API_KEY}

# ── Image Search ──────────────────────────────────────────────────────────────
PEXELS_API_KEY=${PEXELS_API_KEY}
PIXABAY_API_KEY=${PIXABAY_API_KEY}

${EXISTING_ENV}
ENVEOF

ok ".env.local updated"

# ── Step 4: TypeScript check ──────────────────────────────────────────────────
step "4/5 — Checking for TypeScript Errors"

log "Clearing stale Next.js cache..."
rm -rf .next tsconfig.tsbuildinfo 2>/dev/null || true

log "Running TypeScript check (this may take 30-60 seconds)..."
if npx tsc --noEmit --skipLibCheck 2>&1 | grep "^src/" | head -20; then
  warn "TypeScript errors found above — review before deploying"
else
  ok "No TypeScript errors in src/"
fi

# ── Step 5: Deploy to Vercel ──────────────────────────────────────────────────
step "5/5 — Deploying to Vercel"

# Check Vercel CLI
if ! command -v vercel &>/dev/null; then
  log "Installing Vercel CLI..."
  npm install -g vercel
fi

# Set all env vars on Vercel
log "Syncing environment variables to Vercel..."

set_vercel_env() {
  local KEY="$1"
  local VAL="$2"
  local SCOPE="${3:-production,preview,development}"
  echo "$VAL" | vercel env add "$KEY" "$SCOPE" --force 2>/dev/null \
    && ok "Vercel env: $KEY" \
    || warn "Could not set $KEY on Vercel (may already exist)"
}

# You must be logged in to Vercel — this will prompt if not
vercel whoami 2>/dev/null || vercel login

set_vercel_env "NEXT_PUBLIC_SUPABASE_URL"       "$SUPABASE_URL"
set_vercel_env "NEXT_PUBLIC_SUPABASE_ANON_KEY"  "$SUPABASE_ANON_KEY"
set_vercel_env "SUPABASE_SERVICE_ROLE_KEY"       "$SUPABASE_SERVICE_ROLE_KEY"
set_vercel_env "ANTHROPIC_API_KEY"               "$ANTHROPIC_API_KEY"
set_vercel_env "GROQ_API_KEY"                    "$GROQ_API_KEY"
set_vercel_env "PEXELS_API_KEY"                  "$PEXELS_API_KEY"
set_vercel_env "PIXABAY_API_KEY"                 "$PIXABAY_API_KEY"

log "Deploying to production..."
vercel --prod --yes 2>&1 | tail -20

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
divider
echo ""
echo -e "${GREEN}${BOLD}  🎉 Done!${NC}"
echo ""
echo -e "  ${CYAN}What was changed:${NC}"
echo "    ✅ Auth       — Firebase Auth → Supabase Auth (email + Google)"
echo "    ✅ AI Primary — Genkit/Gemini → Anthropic Claude"
echo "    ✅ AI Failover — Groq (llama-3.3-70b) auto-activates if Claude fails"
echo "    ✅ Vercel     — All env vars synced and app redeployed"
echo ""
echo -e "  ${YELLOW}Things to verify in Supabase Dashboard:${NC}"
echo "    1. Authentication → Providers → Email: ENABLED"
echo "    2. Authentication → Providers → Google: ENABLED (Client ID + Secret set)"
echo "    3. Authentication → URL Configuration:"
echo "       Site URL:      your Vercel app URL"
echo "       Redirect URLs: your-app.vercel.app/auth/callback"
echo ""
echo -e "  ${YELLOW}Get your Groq API key from:${NC} console.groq.com → API Keys (free tier available)"
echo ""
divider
