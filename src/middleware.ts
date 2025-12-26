// src/middleware.ts
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const response = NextResponse.next();

    // ===== SECURITY HEADERS =====

    // Content Security Policy - Prevent XSS attacks
    // Allows: Leaflet maps, Stadia Maps, OpenStreetMap tiles, Overpass API
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

    // ===== AUTH LOGIC =====
    const token = req.nextauth.token;
    const isAuth = !!token;
    const isAuthPage =
      req.nextUrl.pathname.startsWith("/login") ||
      req.nextUrl.pathname.startsWith("/signup") ||
      req.nextUrl.pathname.startsWith("/join") ||
      req.nextUrl.pathname.startsWith("/passkeys");

    // If user is on auth page and already logged in, redirect to home
    if (isAuthPage && isAuth) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // Allow all requests through - let client-side useSession() handle authentication
    // This prevents premature redirects before the session is fully established
    return response;
  },
  {
    callbacks: {
      authorized: ({ req, token }) => {
        const path = req.nextUrl.pathname;

        // Define public paths that don't require authentication
        if (
          path === "/" ||
          path.startsWith("/login") ||
          path.startsWith("/signup") ||
          path.startsWith("/join") ||
          path.startsWith("/passkeys") ||
          path.startsWith("/api") || // Let API routes handle their own auth or be public
          path.startsWith("/_next") ||
          path.includes("favicon.ico")
        ) {
          return true;
        }

        // For all other paths, require a token
        return !!token;
      },
    },
    pages: {
      signIn: '/', // Redirect unauthenticated users to Landing Page
    },
  }
);

// Only match auth pages to redirect logged-in users away from login/signup
export const config = {
  matcher: [
    "/login",
    "/signup",
    "/join",
    "/passkeys",
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
