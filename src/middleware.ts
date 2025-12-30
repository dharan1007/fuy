// src/middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Create an unmodified response object to ensure we don't accidentally
  // strip cookies if the middleware logic gets complex.
  // We will copy cookies to this response.

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
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // This refreshes the session if expired - required for Server Components
  // https://supabase.com/docs/guides/auth/server-side/nextjs
  const { data: { user } } = await supabase.auth.getUser()

  // If the user is signed in and the current path is / or /login or /signup,
  // we might want to redirect them to /dashboard or similar?
  // But for now, let's just focus on session persistence.

  // ===== SECURITY HEADERS =====
  // Content Security Policy - Prevent XSS attacks
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://unpkg.com; style-src 'self' 'unsafe-inline' https://unpkg.com; img-src 'self' data: https: blob:; font-src 'self' data: https:; connect-src 'self' https: wss:; media-src 'self' blob: data: mediastream:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; worker-src 'self' blob:;"
  );

  // X-Content-Type-Options - Prevent MIME sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');

  // X-Frame-Options - Prevent clickjacking (deny framing)
  response.headers.set('X-Frame-Options', 'DENY');

  // X-XSS-Protection - Enable browser XSS protection
  response.headers.set('X-XSS-Protection', '1; mode=block');

  // Strict-Transport-Security - Force HTTPS (only in production)
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }

  // Referrer-Policy - Control referrer information
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions-Policy - Disable dangerous browser features
  response.headers.set(
    'Permissions-Policy',
    'geolocation=(), microphone=*, camera=*, usb=(), magnetometer=(), gyroscope=(), accelerometer=(), payment=()'
  );

  // Remove X-Powered-By header to hide server technology
  response.headers.delete('X-Powered-By');

  // Add custom headers
  response.headers.set('X-App-Version', process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0');
  response.headers.set('X-Security-Enabled', 'true');

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|auth/callback|auth/verify|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
