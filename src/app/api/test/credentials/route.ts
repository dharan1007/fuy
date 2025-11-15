/**
 * Test Credentials Endpoint
 *
 * GET /api/test/credentials - Returns all available test credentials
 * This endpoint is only available in development mode
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTestCredentialsInfo } from '@/lib/test-credentials';

export async function GET(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Test credentials not available in production' },
      { status: 403 }
    );
  }

  // Optional: Add a secret key requirement for extra security
  const authHeader = request.headers.get('authorization');
  const testSecret = process.env.TEST_SECRET_KEY;

  if (testSecret && authHeader !== `Bearer ${testSecret}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const credentialsInfo = getTestCredentialsInfo();

  return NextResponse.json(
    {
      success: true,
      message: 'Test credentials for development and testing',
      ...credentialsInfo,
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
      },
    }
  );
}
