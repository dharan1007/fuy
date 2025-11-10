// src/app/api/payment/verify-payment/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

interface VerifyPaymentRequest {
  orderId: string;
  paymentId: string;
  signature: string;
}

export async function POST(req: NextRequest) {
  try {
    // Verify user is authenticated
    const user = await getSessionUser();
    if (!user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body: VerifyPaymentRequest = await req.json();

    // Validate request
    if (!body.orderId || !body.paymentId || !body.signature) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
    if (!RAZORPAY_KEY_SECRET) {
      return NextResponse.json(
        { error: "Payment service not configured" },
        { status: 500 }
      );
    }

    // Verify signature
    const shasum = crypto.createHmac("sha256", RAZORPAY_KEY_SECRET);
    shasum.update(`${body.orderId}|${body.paymentId}`);
    const digest = shasum.digest("hex");

    if (digest !== body.signature) {
      return NextResponse.json(
        { error: "Signature verification failed" },
        { status: 400 }
      );
    }

    // Find the payment record
    const payment = await prisma.payment.findUnique({
      where: { orderId: body.orderId },
    });

    if (!payment) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      );
    }

    // Verify payment belongs to current user
    if (payment.userId !== user.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    // Fetch payment details from Razorpay
    const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
    if (!RAZORPAY_KEY_ID) {
      return NextResponse.json(
        { error: "Payment service not configured" },
        { status: 500 }
      );
    }

    const response = await fetch(
      `https://api.razorpay.com/v1/payments/${body.paymentId}`,
      {
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`
          ).toString("base64")}`,
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch payment details" },
        { status: response.status }
      );
    }

    const razorpayPayment = await response.json();

    // Update payment in database
    const updatedPayment = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        paymentId: body.paymentId,
        signatureId: body.signature,
        signatureData: JSON.stringify({
          orderId: body.orderId,
          paymentId: body.paymentId,
          verifiedAt: new Date(),
        }),
        status: razorpayPayment.status === "captured" ? "CAPTURED" : "AUTHORIZED",
        paymentMethod: razorpayPayment.method,
      },
    });

    return NextResponse.json({
      success: true,
      payment: {
        id: updatedPayment.id,
        orderId: updatedPayment.orderId,
        paymentId: updatedPayment.paymentId,
        amount: updatedPayment.amount,
        status: updatedPayment.status,
        paymentMethod: updatedPayment.paymentMethod,
      },
    });
  } catch (error) {
    console.error("Verify payment error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
