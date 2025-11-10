// src/app/api/payment/create-order/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

interface CreateOrderRequest {
  amount: number;
  description?: string;
  receiptId?: string;
  notes?: Record<string, string>;
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

    const body: CreateOrderRequest = await req.json();

    // Validate request
    if (!body.amount || body.amount <= 0) {
      return NextResponse.json(
        { error: "Invalid amount" },
        { status: 400 }
      );
    }

    // Verify Razorpay credentials
    const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
    const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      console.error("Razorpay credentials not configured");
      return NextResponse.json(
        { error: "Payment service not configured" },
        { status: 500 }
      );
    }

    // Create order via Razorpay API
    const orderData = {
      amount: Math.round(body.amount * 100), // Amount in paise
      currency: "INR",
      receipt: body.receiptId || `receipt_${Date.now()}`,
      description: body.description || "Order Payment",
      notes: {
        userId: user.id,
        ...body.notes,
      },
    };

    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(
          `${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`
        ).toString("base64")}`,
      },
      body: JSON.stringify(orderData),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Razorpay API error:", error);
      return NextResponse.json(
        { error: "Failed to create order" },
        { status: response.status }
      );
    }

    const razorpayOrder = await response.json();

    // Save order to database
    const payment = await prisma.payment.create({
      data: {
        userId: user.id,
        orderId: razorpayOrder.id,
        amount: body.amount,
        currency: "INR",
        description: body.description || "Order Payment",
        receiptId: orderData.receipt,
        status: "CREATED",
      },
    });

    return NextResponse.json({
      orderId: razorpayOrder.id,
      amount: body.amount,
      currency: "INR",
      key: RAZORPAY_KEY_ID,
      paymentId: payment.id,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Create order error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
