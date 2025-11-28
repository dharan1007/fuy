import { cookies } from 'next/headers';
import { generateCsrfToken, verifyCsrfToken } from './security';

const CSRF_COOKIE_NAME = 'csrf-token';
const CSRF_HEADER_NAME = 'x-csrf-token';

/**
 * Generate and set CSRF token in cookie
 */
export async function generateCsrfCookie(): Promise<string> {
    const token = generateCsrfToken();

    (await cookies()).set(CSRF_COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24, // 24 hours
    });

    return token;
}

/**
 * Verify CSRF token from request
 */
export async function verifyCsrfFromRequest(token: string): Promise<boolean> {
    const cookieStore = await cookies();
    const storedToken = cookieStore.get(CSRF_COOKIE_NAME)?.value;

    if (!storedToken || !token) {
        return false;
    }

    return verifyCsrfToken(token, storedToken);
}

/**
 * Middleware to validate CSRF token
 */
export async function withCsrfProtection(
    handler: (...args: any[]) => Promise<Response>
) {
    return async (...args: any[]) => {
        const req = args[0] as Request;

        // Skip CSRF check for GET, HEAD, OPTIONS
        if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
            return handler(...args);
        }

        // Get CSRF token from header
        const token = req.headers.get(CSRF_HEADER_NAME);

        if (!token || !(await verifyCsrfFromRequest(token))) {
            return Response.json(
                { error: 'Invalid or missing CSRF token' },
                { status: 403 }
            );
        }

        return handler(...args);
    };
}

/**
 * Get CSRF token for client use
 */
export async function getCsrfToken(): Promise<string> {
    const cookieStore = await cookies();
    const existingToken = cookieStore.get(CSRF_COOKIE_NAME)?.value;

    if (existingToken) {
        return existingToken;
    }

    return generateCsrfCookie();
}
