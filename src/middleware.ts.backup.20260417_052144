import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
// Routes that don't require authentication
const PUBLIC_PATHS = [
  '/login',
  '/signup',
  '/auth/callback',
  '/api/auth',
]
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  // Allow public paths, static files, and Next.js internals
  if (
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.') // static files (images, fonts, etc.)
  ) {
    return NextResponse.next()
  }
  // Build response early so we can attach refreshed cookies
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
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )
  // Refresh the session — this will set cookies via setAll if needed
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    // Not authenticated — redirect to login
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    response = NextResponse.redirect(loginUrl)
  }
  return response
}
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimisation)
     * - favicon.ico
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
