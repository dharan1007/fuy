// src/hooks/usePayment.ts
/**
 * Hook for handling Razorpay payment flow
 * Usage: const { createOrder, verifyPayment, getStatus, loading, error } = usePayment();
 */

import { useState } from "react";

interface CreateOrderOptions {
  amount: number;
  description?: string;
  receiptId?: string;
  notes?: Record<string, string>;
}

interface CreateOrderResponse {
  orderId: string;
  amount: number;
  currency: string;
  key: string;
  paymentId: string;
  timestamp: string;
}

interface VerifyPaymentRequest {
  orderId: string;
  paymentId: string;
  signature: string;
}

interface PaymentStatus {
  id: string;
  orderId: string;
  paymentId: string;
  amount: number;
  currency: string;
  status: "CREATED" | "AUTHORIZED" | "CAPTURED" | "FAILED" | "REFUNDED";
  paymentMethod?: string;
  description?: string;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
}

interface WebhookLog {
  id: string;
  eventType: string;
  status: string;
  signatureValid: boolean;
  createdAt: string;
}

interface PaymentStatusResponse {
  payment: PaymentStatus;
  webhookLogs: WebhookLog[];
}

export function usePayment() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Create a new Razorpay order
   */
  const createOrder = async (
    options: CreateOrderOptions
  ): Promise<CreateOrderResponse | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/payment/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(options),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create order");
      }

      const data: CreateOrderResponse = await response.json();
      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      setError(errorMsg);
      console.error("Create order error:", err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Verify payment signature with backend
   */
  const verifyPayment = async (
    request: VerifyPaymentRequest
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/payment/verify-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Payment verification failed");
      }

      const data = await response.json();
      return data.success === true;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      setError(errorMsg);
      console.error("Verify payment error:", err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get payment status
   */
  const getStatus = async (
    orderId?: string,
    paymentId?: string
  ): Promise<PaymentStatusResponse | null> => {
    setLoading(true);
    setError(null);

    try {
      let url = "/api/payment/status";
      const params = new URLSearchParams();

      if (orderId) params.append("orderId", orderId);
      if (paymentId) params.append("paymentId", paymentId);

      if (params.toString()) {
        url += "?" + params.toString();
      }

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to get payment status");
      }

      const data: PaymentStatusResponse = await response.json();
      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      setError(errorMsg);
      console.error("Get status error:", err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Check payment status via POST (useful for polling)
   */
  const checkStatus = async (
    orderId?: string,
    paymentId?: string
  ): Promise<PaymentStatusResponse | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/payment/status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ orderId, paymentId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to check payment status");
      }

      const data: PaymentStatusResponse = await response.json();
      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      setError(errorMsg);
      console.error("Check status error:", err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    createOrder,
    verifyPayment,
    getStatus,
    checkStatus,
    loading,
    error,
  };
}
