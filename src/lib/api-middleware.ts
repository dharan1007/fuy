import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import {
  verifyRequestSignature,
  isValidTimestamp,
  isTrustedOrigin,
  generateSecureToken,
} from './security';

/**
 * Middleware to verify authentication
 * Ensures user is logged in before accessing protected routes
 */
export async function withAuth(handler: (req: NextRequest, context: any) => Promise<NextResponse>) {
  return async (req: NextRequest, context: any) => {
    try {
      const session = await getServerSession();

      if (!session || !session.user) {
        return NextResponse.json(
          { error: 'Unauthorized: Authentication required' },
          { status: 401 }
        );
      }

      // Attach user to request context
      (req as any).user = session.user;
      return handler(req, context);
    } catch (error) {
      console.error('Auth middleware error:', error);
      return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
    }
  };
}

/**
 * Middleware to verify request signature
 * Prevents request tampering and ensures integrity
 */
export function withSignatureVerification(
  handler: (req: NextRequest, context: any) => Promise<NextResponse>,
  secret: string
) {
  return async (req: NextRequest, context: any) => {
    try {
      const signature = req.headers.get('x-signature');
      const timestamp = req.headers.get('x-timestamp');

      if (!signature || !timestamp) {
        return NextResponse.json(
          { error: 'Missing signature or timestamp' },
          { status: 400 }
        );
      }

      // Verify timestamp is recent (within 5 minutes)
      if (!isValidTimestamp(timestamp)) {
        return NextResponse.json(
          { error: 'Request timestamp expired' },
          { status: 400 }
        );
      }

      // Get request body
      const body = await req.text();

      // Verify signature
      if (!verifyRequestSignature(req.method, req.nextUrl.pathname, timestamp, body, signature, secret)) {
        return NextResponse.json(
          { error: 'Invalid request signature' },
          { status: 401 }
        );
      }

      // Create new request with body (since we already consumed it)
      const newReq = new NextRequest(req, { body });
      return handler(newReq, context);
    } catch (error) {
      console.error('Signature verification error:', error);
      return NextResponse.json({ error: 'Signature verification failed' }, { status: 401 });
    }
  };
}

/**
 * Middleware to check CORS
 */
export function withCORSCheck(handler: (req: NextRequest, context: any) => Promise<NextResponse>) {
  return async (req: NextRequest, context: any) => {
    const origin = req.headers.get('origin') || undefined;

    if (!isTrustedOrigin(origin)) {
      return NextResponse.json(
        { error: 'CORS: Origin not allowed' },
        { status: 403 }
      );
    }

    const response = handler(req, context);
    return response;
  };
}

/**
 * Middleware to validate content type
 */
export function withContentTypeCheck(allowedTypes: string[] = ['application/json']) {
  return (handler: (req: NextRequest, context: any) => Promise<NextResponse>) => {
    return async (req: NextRequest, context: any) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        const contentType = req.headers.get('content-type');
        if (!contentType || !allowedTypes.some(type => contentType.includes(type))) {
          return NextResponse.json(
            { error: 'Invalid content type' },
            { status: 415 }
          );
        }
      }

      return handler(req, context);
    };
  };
}

/**
 * Middleware to check user permissions
 */
export function withPermissions(requiredRoles: string[]) {
  return (handler: (req: NextRequest, context: any) => Promise<NextResponse>) => {
    return async (req: NextRequest, context: any) => {
      const session = await getServerSession();

      if (!session || !session.user) {
        return NextResponse.json(
          { error: 'Unauthorized: Authentication required' },
          { status: 401 }
        );
      }

      const userRole = (session.user as any).role || 'user';
      if (!requiredRoles.includes(userRole)) {
        return NextResponse.json(
          { error: 'Forbidden: Insufficient permissions' },
          { status: 403 }
        );
      }

      (req as any).user = session.user;
      return handler(req, context);
    };
  };
}

/**
 * Middleware to log API access
 */
export function withAuditLogging(handler: (req: NextRequest, context: any) => Promise<NextResponse>) {
  return async (req: NextRequest, context: any) => {
    const startTime = Date.now();
    const session = await getServerSession();
    const userId = (session?.user as any)?.id || 'anonymous';

    // Log request
    console.log('[AUDIT LOG]', {
      timestamp: new Date().toISOString(),
      userId,
      method: req.method,
      path: req.nextUrl.pathname,
      ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
      userAgent: req.headers.get('user-agent'),
    });

    const response = await handler(req, context);

    // Log response
    const duration = Date.now() - startTime;
    console.log('[AUDIT LOG - RESPONSE]', {
      timestamp: new Date().toISOString(),
      userId,
      path: req.nextUrl.pathname,
      status: response.status,
      duration: `${duration}ms`,
    });

    return response;
  };
}

/**
 * Middleware composition helper
 */
export function compose(
  ...middlewares: Array<(handler: any) => any>
) {
  return (handler: any) => middlewares.reduceRight((h, m) => m(h), handler);
}
