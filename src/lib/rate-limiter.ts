import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { securityLogger, SecurityEventType } from '@/lib/security-logger';

// In-memory store for rate limiting (use Redis in production)
interface RateLimitEntry {
    count: number;
    resetTime: number;
    blocked: boolean;
    blockUntil?: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up old entries every minute
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
        if (now > entry.resetTime && (!entry.blocked || (entry.blockUntil && now > entry.blockUntil))) {
            rateLimitStore.delete(key);
        }
    }
}, 60000);

export interface RateLimitConfig {
    windowMs?: number;        // Time window in milliseconds
    maxRequests?: number;     // Max requests per window
    blockDuration?: number;   // How long to block after exceeding limit (ms)
    keyPrefix?: string;       // Prefix for rate limit keys
}

const defaultConfig: Required<RateLimitConfig> = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
    blockDuration: 15 * 60 * 1000, // 15 minutes
    keyPrefix: 'rl',
};

/**
 * Rate limiting middleware
 */
export function withRateLimit(
    handler: (req: NextRequest, context: any) => Promise<NextResponse>,
    config: RateLimitConfig = {}
) {
    const cfg = { ...defaultConfig, ...config };

    return async (req: NextRequest, context: any) => {
        // Get identifier (IP address or user ID)
        const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
        const path = req.nextUrl.pathname;
        const key = `${cfg.keyPrefix}:${ip}:${path}`;

        const now = Date.now();
        let entry = rateLimitStore.get(key);

        // Initialize entry if doesn't exist
        if (!entry) {
            entry = {
                count: 0,
                resetTime: now + cfg.windowMs,
                blocked: false,
            };
            rateLimitStore.set(key, entry);
        }

        // Check if IP is currently blocked
        if (entry.blocked && entry.blockUntil && now < entry.blockUntil) {
            const retryAfter = Math.ceil((entry.blockUntil - now) / 1000);

            securityLogger.log({
                type: SecurityEventType.RATE_LIMIT_EXCEEDED,
                severity: 'medium',
                path,
                ip,
                details: { blocked: true, retryAfter },
            });

            return NextResponse.json(
                { error: 'Too many requests. You have been temporarily blocked.' },
                {
                    status: 429,
                    headers: {
                        'Retry-After': retryAfter.toString(),
                        'X-RateLimit-Limit': cfg.maxRequests.toString(),
                        'X-RateLimit-Remaining': '0',
                        'X-RateLimit-Reset': new Date(entry.blockUntil).toISOString(),
                    },
                }
            );
        }

        // Reset counter if window expired
        if (now > entry.resetTime) {
            entry.count = 0;
            entry.resetTime = now + cfg.windowMs;
            entry.blocked = false;
            entry.blockUntil = undefined;
        }

        // Increment counter
        entry.count++;

        // Check if limit exceeded
        if (entry.count > cfg.maxRequests) {
            entry.blocked = true;
            entry.blockUntil = now + cfg.blockDuration;

            const retryAfter = Math.ceil(cfg.blockDuration / 1000);

            securityLogger.log({
                type: SecurityEventType.RATE_LIMIT_EXCEEDED,
                severity: 'high',
                path,
                ip,
                details: {
                    count: entry.count,
                    limit: cfg.maxRequests,
                    blocked: true,
                    blockDuration: cfg.blockDuration,
                },
            });

            return NextResponse.json(
                {
                    error: 'Rate limit exceeded. Too many requests.',
                    retryAfter,
                },
                {
                    status: 429,
                    headers: {
                        'Retry-After': retryAfter.toString(),
                        'X-RateLimit-Limit': cfg.maxRequests.toString(),
                        'X-RateLimit-Remaining': '0',
                        'X-RateLimit-Reset': new Date(entry.blockUntil).toISOString(),
                    },
                }
            );
        }

        // Add rate limit headers
        const response = await handler(req, context);

        response.headers.set(
            'X-RateLimit-Limit',
            cfg.maxRequests.toString()
        );
        response.headers.set(
            'X-RateLimit-Remaining',
            Math.max(0, cfg.maxRequests - entry.count).toString()
        );
        response.headers.set(
            'X-RateLimit-Reset',
            new Date(entry.resetTime).toISOString()
        );

        return response;
    };
}

/**
 * Strict rate limit for sensitive endpoints (auth, payment, etc.)
 */
export function withStrictRateLimit(
    handler: (req: NextRequest, context: any) => Promise<NextResponse>
) {
    return withRateLimit(handler, {
        windowMs: 15 * 60 * 1000,    // 15 minutes
        maxRequests: 10,              // Only 10 requests
        blockDuration: 60 * 60 * 1000, // Block for 1 hour
        keyPrefix: 'strict_rl',
    });
}

/**
 * Very strict rate limit for high-risk endpoints
 */
export function withVeryStrictRateLimit(
    handler: (req: NextRequest, context: any) => Promise<NextResponse>
) {
    return withRateLimit(handler, {
        windowMs: 60 * 60 * 1000,     // 1 hour
        maxRequests: 5,                // Only 5 requests per hour
        blockDuration: 24 * 60 * 60 * 1000, // Block for 24 hours
        keyPrefix: 'very_strict_rl',
    });
}
