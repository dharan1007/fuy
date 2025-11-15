// src/middleware.ts
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
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
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: () => true, // Allow all requests through, client-side will handle auth
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
  ],
};
