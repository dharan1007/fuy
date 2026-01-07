import { NextRequest, NextResponse } from 'next/server';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

// In-memory store for rate limiting (use Redis in production)
const store: RateLimitStore = {};

/**
 * Rate limiter configuration
 */
export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyGenerator?: (req: NextRequest) => string; // Custom key generator
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

/**
 * Default key generator - uses IP address
 */
function defaultKeyGenerator(req: NextRequest): string {
  const ip = req.headers.get('x-forwarded-for') ||
    req.headers.get('x-real-ip') ||
    '127.0.0.1';
  return ip;
}

/**
 * Rate limiter middleware
 */
export function rateLimit(config: RateLimitConfig) {
  const {
    windowMs,
    maxRequests,
    keyGenerator = defaultKeyGenerator,
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
  } = config;

  return (handler: (req: NextRequest, context: any) => Promise<NextResponse>) => {
    return async (req: NextRequest, context: any) => {
      const key = keyGenerator(req);
      const now = Date.now();

      // Initialize or get the rate limit record
      if (!store[key] || store[key].resetTime < now) {
        store[key] = {
          count: 0,
          resetTime: now + windowMs,
        };
      }

      // Check if limit exceeded
      if (store[key].count >= maxRequests) {
        const retryAfter = Math.ceil((store[key].resetTime - now) / 1000);
        return NextResponse.json(
          {
            error: 'Too many requests',
            retryAfter,
          },
          {
            status: 429,
            headers: {
              'Retry-After': retryAfter.toString(),
              'X-RateLimit-Limit': maxRequests.toString(),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': new Date(store[key].resetTime).toISOString(),
            },
          }
        );
      }

      // Increment counter
      store[key].count++;

      // Call handler
      const response = await handler(req, context);

      // Skip counting based on response status
      if (skipSuccessfulRequests && response.status < 400) {
        store[key].count--;
      } else if (skipFailedRequests && response.status >= 400) {
        store[key].count--;
      }

      // Add rate limit headers to response
      const remaining = Math.max(0, maxRequests - store[key].count);
      const newResponse = new NextResponse(response.body, response);
      newResponse.headers.set('X-RateLimit-Limit', maxRequests.toString());
      newResponse.headers.set('X-RateLimit-Remaining', remaining.toString());
      newResponse.headers.set('X-RateLimit-Reset', new Date(store[key].resetTime).toISOString());

      return newResponse;
    };
  };
}

/**
 * User-based rate limiter (requires session)
 */
export function userRateLimit(config: RateLimitConfig & { getUser: (req: NextRequest) => string | null }) {
  const { getUser, ...limitConfig } = config;

  return rateLimit({
    ...limitConfig,
    keyGenerator: (req: NextRequest) => {
      const user = getUser(req);
      return user || defaultKeyGenerator(req);
    },
  });
}

/**
 * Endpoint-specific rate limiter
 */
export function endpointRateLimit(config: RateLimitConfig) {
  return rateLimit({
    ...config,
    keyGenerator: (req: NextRequest) => {
      const ip = req.headers.get('x-forwarded-for') ||
        req.headers.get('x-real-ip') ||
        '127.0.0.1';
      const endpoint = req.nextUrl.pathname;
      return `${ip}:${endpoint}`;
    },
  });
}

/**
 * Clean up expired entries (call periodically if running in long-lived process)
 * NOTE: This in-memory rate limiting has LIMITATIONS in serverless environments.
 * For production at scale, use Redis (Upstash) or Vercel KV.
 */
export function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const key in store) {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  }
}

// NOTE: setInterval removed - not effective in serverless (Vercel)
// Cleanup happens naturally when entries expire during rateLimit checks

