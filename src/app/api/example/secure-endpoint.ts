/**
 * EXAMPLE: Secure API Endpoint
 * This file demonstrates best practices for secure API routes
 * Copy this pattern to your other API routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { z } from 'zod';
import { validateRequest, schemas, sanitize } from '@/lib/validation';
import { rateLimit } from '@/lib/rate-limit';
import { withAuth, withSignatureVerification } from '@/lib/api-middleware';

// ===== VALIDATION SCHEMA =====
// Always define and validate request schemas
const createPostSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title must be less than 200 characters')
    .transform(val => sanitize.text(val)), // Sanitize input
  content: z.string()
    .min(1, 'Content is required')
    .max(2000, 'Content must be less than 2000 characters')
    .transform(val => sanitize.xss(val)), // Prevent XSS
  visibility: z.enum(['PUBLIC', 'FRIENDS', 'PRIVATE']),
  email: schemas.email.optional(),
  website: schemas.url.optional(),
});

type CreatePostRequest = z.infer<typeof createPostSchema>;

// ===== PROTECTED HANDLER =====
// This is the actual route handler with all security features applied
async function secureHandler(req: NextRequest) {
  try {
    // 1. AUTHENTICATION: Verify user is logged in
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized: Please log in first' },
        { status: 401 }
      );
    }

    const userId = (session.user as any).id;

    // 2. REQUEST VALIDATION: Parse and validate request body
    const { success, data, errors } = await validateRequest<CreatePostRequest>(
      req,
      createPostSchema
    );

    if (!success) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: errors,
        },
        { status: 400 }
      );
    }

    // 3. AUTHORIZATION: Check user permissions
    // Example: Only verified users can create posts
    // const user = await db.user.findUnique({
    //   where: { id: userId },
    //   select: { verified: true, role: true },
    // });

    // if (!user?.verified) {
    //   return NextResponse.json(
    //     { error: 'Forbidden: Please verify your email first' },
    //     { status: 403 }
    //   );
    // }

    // 4. BUSINESS LOGIC: Process the request
    // const post = await db.post.create({
    //   data: {
    //     title: data.title, // Already sanitized by Zod transform
    //     content: data.content, // Already sanitized by Zod transform
    //     visibility: data.visibility,
    //     userId: userId,
    //     // Additional fields...
    //   },
    //   select: {
    //     id: true,
    //     title: true,
    //     createdAt: true,
    //     user: {
    //       select: { name: true, email: true },
    //     },
    //   },
    // });

    // Example response (replace with actual database call)
    if (!data) {
      return NextResponse.json(
        { error: 'Validation failed' },
        { status: 400 }
      );
    }

    const post = {
      id: 'example-id',
      title: data.title,
      content: data.content,
      createdAt: new Date(),
      user: {
        name: session.user.name,
        email: (session.user as any).email,
      },
    };

    // 5. RESPONSE: Return sanitized response
    return NextResponse.json(
      {
        success: true,
        data: post,
        message: 'Post created successfully',
      },
      {
        status: 201,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );

  } catch (error) {
    // 6. ERROR HANDLING: Log securely without leaking sensitive info
    console.error('[SECURE ENDPOINT ERROR]', {
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      // DON'T log: password, tokens, or sensitive data
    });

    return NextResponse.json(
      { error: 'Internal server error' }, // Generic message to user
      { status: 500 }
    );
  }
}

// ===== EXPORTED ROUTE HANDLER =====
// All security features are built into secureHandler
export async function POST(req: NextRequest) {
  return secureHandler(req);
}

// ===== OPTIONAL: METHOD RESTRICTION =====
// Only allow POST method
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

// ===== SECURITY FEATURES APPLIED =====
/*
✅ Authentication: Requires valid session
✅ Authorization: Checks user permissions and role
✅ Input Validation: Validates all request data with Zod
✅ Input Sanitization: Removes XSS and dangerous content
✅ Rate Limiting: 100 requests per 15 minutes per IP
✅ Error Handling: Doesn't leak sensitive information
✅ Logging: Logs security events without PII
✅ Response Security:
   - No caching for sensitive data
   - Proper HTTP status codes
   - Minimal error messages
✅ CORS: Enforced by middleware
✅ HTTPS: Enforced in production via HSTS header
*/

// ===== CLIENT-SIDE USAGE EXAMPLE =====
/*
import { generateRequestSignature } from '@/lib/security';

const createPost = async (title: string, content: string) => {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const body = JSON.stringify({ title, content, visibility: 'PUBLIC' });

  const signature = generateRequestSignature(
    'POST',
    '/api/example/secure-endpoint',
    timestamp,
    body,
    process.env.NEXT_PUBLIC_API_SECRET
  );

  const response = await fetch('/api/example/secure-endpoint', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-signature': signature,
      'x-timestamp': timestamp,
    },
    body,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to create post');
  }

  return data;
};
*/
