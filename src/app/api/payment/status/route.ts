// src/app/api/payment/status/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

interface PaymentStatusRequest {
  paymentId?: string;
  orderId?: string;
}

export async function GET(req: NextRequest) {
  try {
    // Verify user is authenticated
    const user = await getSessionUser();
    if (!user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get query parameters
    const searchParams = req.nextUrl.searchParams;
    const paymentId = searchParams.get("paymentId");
    const orderId = searchParams.get("orderId");

    if (!paymentId && !orderId) {
      return NextResponse.json(
        { error: "Missing paymentId or orderId" },
        { status: 400 }
      );
    }

    // Find payment
    let payment = await prisma.payment.findFirst({
      where: {
        userId: user.id,
        ...(paymentId ? { id: paymentId } : { orderId: orderId || "" }),
      },
      include: {
        webhookLogs: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    });

    if (!payment) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      );
    }

    // Fetch latest status from Razorpay if payment ID exists
    if (payment.paymentId) {
      const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
      const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

      if (RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET) {
        try {
          const response = await fetch(
            `https://api.razorpay.com/v1/payments/${payment.paymentId}`,
            {
              headers: {
                Authorization: `Basic ${Buffer.from(
                  `${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`
                ).toString("base64")}`,
              },
            }
          );

          if (response.ok) {
            const razorpayPayment = await response.json();

            // Update local database with latest status
            payment = await prisma.payment.update({
              where: { id: payment.id },
              data: {
                status:
                  razorpayPayment.status === "captured"
                    ? "CAPTURED"
                    : razorpayPayment.status === "authorized"
                    ? "AUTHORIZED"
                    : razorpayPayment.status === "failed"
                    ? "FAILED"
                    : payment.status,
              },
              include: {
                webhookLogs: {
                  orderBy: { createdAt: "desc" },
                  take: 5,
                },
              },
            });
          }
        } catch (error) {
          console.error("Error fetching payment from Razorpay:", error);
          // Continue with local data if Razorpay API fails
        }
      }
    }

    return NextResponse.json({
      payment: {
        id: payment.id,
        orderId: payment.orderId,
        paymentId: payment.paymentId,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        paymentMethod: payment.paymentMethod,
        description: payment.description,
        failureReason: payment.failureReason,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt,
      },
      webhookLogs: payment.webhookLogs.map((log) => ({
        id: log.id,
        eventType: log.eventType,
        status: log.status,
        signatureValid: log.signatureValid,
        createdAt: log.createdAt,
      })),
    });
  } catch (error) {
    console.error("Payment status error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST endpoint to manually check payment status
 * Useful for polling or checking status after redirect
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body: PaymentStatusRequest = await req.json();

    if (!body.paymentId && !body.orderId) {
      return NextResponse.json(
        { error: "Missing paymentId or orderId" },
        { status: 400 }
      );
    }

    // Find payment
    const payment = await prisma.payment.findFirst({
      where: {
        userId: user.id,
        ...(body.paymentId
          ? { id: body.paymentId }
          : { orderId: body.orderId || "" }),
      },
      include: {
        webhookLogs: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    });

    if (!payment) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      payment: {
        id: payment.id,
        orderId: payment.orderId,
        paymentId: payment.paymentId,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        paymentMethod: payment.paymentMethod,
        description: payment.description,
        failureReason: payment.failureReason,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt,
      },
      webhookLogs: payment.webhookLogs.map((log) => ({
        id: log.id,
        eventType: log.eventType,
        status: log.status,
        signatureValid: log.signatureValid,
        createdAt: log.createdAt,
      })),
    });
  } catch (error) {
    console.error("Payment status error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
