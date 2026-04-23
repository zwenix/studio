/**
 * Middleware — EduAI Companion
 *
 * Auth is handled client-side by AuthGuard (src/components/auth-guard.tsx)
 * which reads Supabase session state via the client SDK.
 *
 * This middleware is a clean passthrough that does NOT try to read Supabase
 * credentials, so it won't crash when env vars are absent.
 */
import { NextRequest, NextResponse } from 'next/server';

export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  /*
   * Match all request paths except static files, images, and favicons.
   * Keeps the matcher lean so Next.js doesn't invoke middleware on every asset.
   */
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
