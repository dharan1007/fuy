/**
 * Test Razorpay Integration Endpoint
 *
 * Provides test payment flows and mock Razorpay responses
 * for testing without making real payments
 *
 * Endpoints:
 * - POST /api/test/razorpay - Create mock order
 * - GET /api/test/razorpay - Get test payment scenarios
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Mock Razorpay credentials for testing
const MOCK_RAZORPAY_KEY_ID = 'rzp_test_1Aa00000000001'; // Test key ID
const MOCK_RAZORPAY_KEY_SECRET = 'test_secret_key'; // Test secret

interface MockOrder {
  id: string;
  entity: string;
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string;
  status: string;
  attempts: number;
  notes?: Record<string, string>;
  created_at: number;
}

export async function POST(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Test Razorpay endpoint not available in production' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const {
      amount,
      currency = 'INR',
      receipt,
      description,
      userId,
      action = 'createOrder',
    } = body;

    // Action 1: Create mock Razorpay order
    if (action === 'createOrder') {
      if (!amount || !userId) {
        return NextResponse.json(
          {
            error: 'Missing required fields',
            required: ['amount', 'userId'],
          },
          { status: 400 }
        );
      }

      const orderId = `order_${Date.now()}_test`;

      // Save to database for tracking (optional)
      try {
        await prisma.payment.create({
          data: {
            userId,
            orderId,
            amount,
            currency,
            description: description || 'Test Payment',
            status: 'CREATED',
          },
        });
      } catch (dbError) {
        console.warn('Could not save test payment to database:', dbError);
        // Continue anyway - this is a test endpoint
      }

      const mockOrder: MockOrder = {
        id: orderId,
        entity: 'order',
        amount: Math.round(amount * 100), // Convert to paise
        amount_paid: 0,
        amount_due: Math.round(amount * 100),
        currency,
        receipt: receipt || `receipt_${Date.now()}`,
        status: 'created',
        attempts: 0,
        notes: {
          description: description || 'Test Payment',
          userId,
          testMode: 'true',
        },
        created_at: Math.floor(Date.now() / 1000),
      };

      return NextResponse.json(
        {
          success: true,
          message: 'Mock Razorpay order created',
          order: mockOrder,
          testMode: true,
          note: 'This is a test order. Use test payment methods.',
        },
        { status: 200 }
      );
    }

    // Action 2: Simulate payment success
    if (action === 'simulateSuccess') {
      const { orderId } = body;
      if (!orderId) {
        return NextResponse.json(
          { error: 'Missing orderId' },
          { status: 400 }
        );
      }

      const paymentId = `pay_${Date.now()}_success`;

      try {
        await prisma.payment.update({
          where: { orderId },
          data: {
            paymentId,
            status: 'CAPTURED',
            paymentMethod: 'card',
          },
        });
      } catch {
        console.warn('Could not update payment status');
      }

      return NextResponse.json(
        {
          success: true,
          message: 'Mock payment successful',
          payment: {
            id: paymentId,
            orderId,
            status: 'captured',
            method: 'card',
            timestamp: new Date().toISOString(),
          },
          testMode: true,
        },
        { status: 200 }
      );
    }

    // Action 3: Simulate payment failure
    if (action === 'simulateFailure') {
      const { orderId } = body;
      if (!orderId) {
        return NextResponse.json(
          { error: 'Missing orderId' },
          { status: 400 }
        );
      }

      try {
        await prisma.payment.update({
          where: { orderId },
          data: {
            status: 'FAILED',
            failureReason: 'Test: Card declined by test gateway',
          },
        });
      } catch {
        console.warn('Could not update payment status');
      }

      return NextResponse.json(
        {
          success: false,
          message: 'Mock payment failed',
          error: {
            code: 'BAD_REQUEST_ERROR',
            description: 'Card declined by test gateway',
          },
          testMode: true,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'Invalid action',
        message: 'Provide action: createOrder, simulateSuccess, or simulateFailure',
      },
      { status: 400 }
    );
  } catch (error) {
    console.error('Test Razorpay error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Not available in production' },
      { status: 403 }
    );
  }

  return NextResponse.json(
    {
      success: true,
      message: 'Test Razorpay API Endpoints',
      testMode: true,
      mockKeyId: MOCK_RAZORPAY_KEY_ID,
      endpoints: {
        POST: [
          {
            action: 'createOrder',
            description: 'Create a mock Razorpay order',
            body: {
              action: 'createOrder',
              amount: 100,
              currency: 'INR',
              userId: 'user-id',
              receipt: 'receipt_1',
              description: 'Product description',
            },
          },
          {
            action: 'simulateSuccess',
            description: 'Simulate successful payment',
            body: {
              action: 'simulateSuccess',
              orderId: 'order_id',
            },
          },
          {
            action: 'simulateFailure',
            description: 'Simulate failed payment',
            body: {
              action: 'simulateFailure',
              orderId: 'order_id',
            },
          },
        ],
      },
      testPaymentMethods: {
        success: {
          card: '4111111111111111',
          cvv: '123',
          expiry: 'Any future date',
          description: 'Use this to simulate successful payments',
        },
        failure: {
          card: '4000000000000002',
          cvv: '123',
          expiry: 'Any future date',
          description: 'Use this to simulate failed payments',
        },
      },
    },
    { status: 200 }
  );
}
