export const runtime = 'nodejs';
// FIX: OAuth / magic-link callback handler was missing entirely.
// Without this, Supabase email-confirmation and OAuth redirects returned 404.

import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);

  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Redirect to the 'next' param or dashboard
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Something went wrong — redirect to login with error flag
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
