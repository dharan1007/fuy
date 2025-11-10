// src/app/api/payment/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

/**
 * Webhook handler for Razorpay payment events
 *
 * Handles events like:
 * - payment.authorized
 * - payment.captured
 * - payment.failed
 * - refund.created
 */
export async function POST(req: NextRequest) {
  try {
    // Get request body
    const body = await req.text();
    const webhookSignature = req.headers.get("x-razorpay-signature");

    if (!webhookSignature) {
      return NextResponse.json(
        { error: "Missing signature" },
        { status: 400 }
      );
    }

    // Verify webhook signature
    const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!RAZORPAY_WEBHOOK_SECRET) {
      console.error("Razorpay webhook secret not configured");
      return NextResponse.json(
        { error: "Webhook not configured" },
        { status: 500 }
      );
    }

    const shasum = crypto.createHmac("sha256", RAZORPAY_WEBHOOK_SECRET);
    shasum.update(body);
    const digest = shasum.digest("hex");

    if (digest !== webhookSignature) {
      console.error("Webhook signature verification failed");
      return NextResponse.json(
        { error: "Signature verification failed" },
        { status: 400 }
      );
    }

    // Parse webhook payload
    const payload = JSON.parse(body);
    const { event, created_at, contains = [] } = payload;

    console.log(`[Webhook] Event: ${event}, ID: ${payload.id}`);

    // Check for idempotency - ensure we don't process the same webhook twice
    const existingLog = await prisma.webhookLog.findUnique({
      where: { razorpayEventId: payload.id },
    });

    if (existingLog && existingLog.status === "PROCESSED") {
      console.log(`[Webhook] Event already processed: ${payload.id}`);
      return NextResponse.json({ success: true, cached: true });
    }

    // Create webhook log entry
    let webhookLog = await prisma.webhookLog.create({
      data: {
        razorpayEventId: payload.id,
        eventType: event,
        payload: body,
        signatureValid: true,
        status: "PENDING",
      },
    });

    try {
      // Process webhook based on event type
      switch (event) {
        case "payment.authorized":
          await handlePaymentAuthorized(payload);
          break;

        case "payment.captured":
          await handlePaymentCaptured(payload);
          break;

        case "payment.failed":
          await handlePaymentFailed(payload);
          break;

        case "refund.created":
          await handleRefundCreated(payload);
          break;

        default:
          console.log(`[Webhook] Unknown event type: ${event}`);
      }

      // Mark webhook as processed
      webhookLog = await prisma.webhookLog.update({
        where: { id: webhookLog.id },
        data: {
          status: "PROCESSED",
        },
      });

      console.log(`[Webhook] Event processed successfully: ${payload.id}`);
      return NextResponse.json({ success: true, eventId: payload.id });
    } catch (error) {
      console.error(`[Webhook] Error processing event:`, error);

      // Update webhook log with error
      await prisma.webhookLog.update({
        where: { id: webhookLog.id },
        data: {
          status: "FAILED",
          errorMessage: error instanceof Error ? error.message : "Unknown error",
          retryCount: { increment: 1 },
          nextRetryAt: new Date(Date.now() + 5 * 60 * 1000), // Retry in 5 minutes
        },
      });

      // Return 500 so Razorpay knows to retry
      return NextResponse.json(
        { error: "Processing error", eventId: payload.id },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[Webhook] Fatal error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Handle payment.authorized event
 * This means the payment has been authorized but not yet captured
 */
async function handlePaymentAuthorized(payload: any) {
  const { entity } = payload;
  const { id: paymentId, order_id: orderId, amount, method } = entity;

  console.log(`[Webhook] Processing payment.authorized: ${paymentId}`);

  // Find payment by orderId
  const payment = await prisma.payment.findUnique({
    where: { orderId },
  });

  if (!payment) {
    console.warn(
      `[Webhook] Payment not found for order: ${orderId}`
    );
    return;
  }

  // Update payment status
  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      paymentId,
      status: "AUTHORIZED",
      paymentMethod: method,
    },
  });

  console.log(
    `[Webhook] Payment authorized: ${paymentId} for order ${orderId}`
  );
}

/**
 * Handle payment.captured event
 * This means the payment has been successfully captured
 */
async function handlePaymentCaptured(payload: any) {
  const { entity } = payload;
  const { id: paymentId, order_id: orderId, amount, method, receipt } = entity;

  console.log(`[Webhook] Processing payment.captured: ${paymentId}`);

  // Find payment by orderId
  const payment = await prisma.payment.findUnique({
    where: { orderId },
  });

  if (!payment) {
    console.warn(
      `[Webhook] Payment not found for order: ${orderId}`
    );
    return;
  }

  // Update payment status to CAPTURED
  const updatedPayment = await prisma.payment.update({
    where: { id: payment.id },
    data: {
      paymentId,
      status: "CAPTURED",
      paymentMethod: method,
    },
  });

  console.log(
    `[Webhook] Payment captured: ${paymentId} for order ${orderId}, amount: ${amount / 100} INR`
  );

  // TODO: Add custom business logic here
  // For example:
  // - Create order/subscription record
  // - Send confirmation email
  // - Trigger fulfillment process
  // - Update user account status
}

/**
 * Handle payment.failed event
 * This means the payment attempt failed
 */
async function handlePaymentFailed(payload: any) {
  const { entity } = payload;
  const { id: paymentId, order_id: orderId, error_code, error_description, acquirer_data } =
    entity;

  console.log(`[Webhook] Processing payment.failed: ${paymentId}`);

  // Find payment by orderId
  const payment = await prisma.payment.findUnique({
    where: { orderId },
  });

  if (!payment) {
    console.warn(
      `[Webhook] Payment not found for order: ${orderId}`
    );
    return;
  }

  // Update payment status
  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      paymentId,
      status: "FAILED",
      failureReason: `${error_code}: ${error_description}`,
    },
  });

  console.log(
    `[Webhook] Payment failed: ${paymentId} - ${error_code}: ${error_description}`
  );

  // TODO: Add custom business logic here
  // For example:
  // - Send failure notification email
  // - Update user about failed payment
  // - Suggest retry options
}

/**
 * Handle refund.created event
 * This means a refund has been initiated
 */
async function handleRefundCreated(payload: any) {
  const { entity } = payload;
  const { id: refundId, payment_id: paymentId, amount, receipt, notes } = entity;

  console.log(`[Webhook] Processing refund.created: ${refundId}`);

  // Find payment by paymentId
  const payment = await prisma.payment.findFirst({
    where: { paymentId },
  });

  if (!payment) {
    console.warn(
      `[Webhook] Payment not found for payment ID: ${paymentId}`
    );
    return;
  }

  // Update payment with refund data
  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: "REFUNDED",
      refundData: JSON.stringify({
        refundId,
        amount: amount / 100,
        refundedAt: new Date(),
        notes,
      }),
    },
  });

  console.log(
    `[Webhook] Refund created: ${refundId} for payment ${paymentId}, amount: ${amount / 100} INR`
  );

  // TODO: Add custom business logic here
  // For example:
  // - Send refund confirmation email
  // - Update order status to refunded
  // - Handle any subscription cancellations
  // - Update analytics/reporting
}
