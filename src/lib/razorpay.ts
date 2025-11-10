// src/lib/razorpay.ts
/**
 * Razorpay utility functions for payment operations
 */

import crypto from "crypto";

export interface RazorpayOrderOptions {
  amount: number; // in rupees
  currency?: string;
  receipt?: string;
  description?: string;
  notes?: Record<string, any>;
  customerId?: string;
}

export interface RazorpayOrderResponse {
  id: string;
  entity: string;
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string;
  offer_id?: string;
  status: string;
  attempts: number;
  notes: Record<string, any>;
  created_at: number;
}

/**
 * Create a Razorpay order
 */
export async function createRazorpayOrder(
  options: RazorpayOrderOptions
): Promise<RazorpayOrderResponse> {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error("Razorpay credentials not configured");
  }

  const requestBody = {
    amount: Math.round(options.amount * 100), // Convert to paise
    currency: options.currency || "INR",
    receipt: options.receipt || `receipt_${Date.now()}`,
    description: options.description || "Order Payment",
    notes: options.notes || {},
  };

  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString(
        "base64"
      )}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Razorpay API error: ${error}`);
  }

  return response.json();
}

/**
 * Fetch payment details from Razorpay
 */
export async function getRazorpayPayment(paymentId: string) {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error("Razorpay credentials not configured");
  }

  const response = await fetch(
    `https://api.razorpay.com/v1/payments/${paymentId}`,
    {
      headers: {
        Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString(
          "base64"
        )}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch payment: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Verify Razorpay webhook signature
 */
export function verifyWebhookSignature(
  body: string,
  signature: string
): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!secret) {
    console.error("Razorpay webhook secret not configured");
    return false;
  }

  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(body);
  const digest = hmac.digest("hex");

  return digest === signature;
}

/**
 * Verify payment signature from client
 * Used when verifying payment on the client side
 */
export function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET;

  if (!secret) {
    console.error("Razorpay key secret not configured");
    return false;
  }

  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(`${orderId}|${paymentId}`);
  const digest = hmac.digest("hex");

  return digest === signature;
}

/**
 * Get Razorpay key ID for frontend
 */
export function getRazorpayKeyId(): string {
  const keyId = process.env.RAZORPAY_KEY_ID;
  if (!keyId) {
    throw new Error("Razorpay key ID not configured");
  }
  return keyId;
}

/**
 * Format amount for Razorpay (paise)
 */
export function formatAmountForRazorpay(rupees: number): number {
  return Math.round(rupees * 100);
}

/**
 * Format amount from Razorpay (convert paise to rupees)
 */
export function formatAmountFromRazorpay(paise: number): number {
  return Math.round(paise / 100);
}
