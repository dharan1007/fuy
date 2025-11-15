/**
 * Test Authentication Endpoint
 *
 * POST /api/test/auth - Authenticates a test user and returns a JWT token
 * This endpoint is only available in development mode
 * Doesn't write to database - creates in-memory test sessions
 */

import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import {
  verifyTestCredentials,
  findTestUserByEmail,
} from '@/lib/test-credentials';

const secret = process.env.NEXTAUTH_SECRET!;
const enc = new TextEncoder();

export async function POST(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Test authentication not available in production' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { email, password, action } = body;

    // Action 1: Login with credentials
    if (action === 'login' && email && password) {
      const testUser = verifyTestCredentials(email, password);

      if (!testUser) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid email or password',
            message: 'Test credentials do not match. Check your email and password.',
          },
          { status: 401 }
        );
      }

      // Generate JWT token for test user
      const token = await new SignJWT({
        id: testUser.id,
        email: testUser.email,
        name: testUser.name,
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuer('fuy')
        .setAudience('fuy')
        .setExpirationTime('7d')
        .sign(enc.encode(secret));

      return NextResponse.json(
        {
          success: true,
          message: 'Test user authenticated successfully',
          user: {
            id: testUser.id,
            email: testUser.email,
            name: testUser.name,
            displayName: testUser.displayName,
            role: testUser.role,
          },
          token,
          sessionToken: token,
        },
        { status: 200 }
      );
    }

    // Action 2: Get user by email
    if (action === 'getUser' && email) {
      const testUser = findTestUserByEmail(email);

      if (!testUser) {
        return NextResponse.json(
          {
            success: false,
            error: 'User not found',
          },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          success: true,
          user: {
            id: testUser.id,
            email: testUser.email,
            name: testUser.name,
            displayName: testUser.displayName,
            role: testUser.role,
            hasVerifiedEmail: testUser.hasVerifiedEmail,
          },
        },
        { status: 200 }
      );
    }

    // Action 3: Quick test - verify if a test user exists
    if (action === 'verify' && email) {
      const testUser = findTestUserByEmail(email);

      return NextResponse.json(
        {
          success: !!testUser,
          exists: !!testUser,
          email: email.toLowerCase(),
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        error: 'Invalid request',
        message: 'Provide action (login/getUser/verify) and required fields',
      },
      { status: 400 }
    );
  } catch (error) {
    console.error('Test auth error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// GET endpoint to list all test users (development only)
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Not available in production' },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  if (action === 'list') {
    const { TEST_CREDENTIALS } = await import('@/lib/test-credentials');

    return NextResponse.json(
      {
        success: true,
        message: 'Available test users',
        users: Object.values(TEST_CREDENTIALS).map((user) => ({
          id: user.id,
          email: user.email,
          password: user.password,
          name: user.name,
          displayName: user.displayName,
          role: user.role,
          description: user.description,
        })),
      },
      { status: 200 }
    );
  }

  return NextResponse.json(
    {
      success: true,
      message: 'Test Auth API',
      endpoints: {
        POST: {
          'login': 'POST /api/test/auth with { action: "login", email, password }',
          'getUser': 'POST /api/test/auth with { action: "getUser", email }',
          'verify': 'POST /api/test/auth with { action: "verify", email }',
        },
        GET: {
          'list': 'GET /api/test/auth?action=list',
        },
      },
    },
    { status: 200 }
  );
}
