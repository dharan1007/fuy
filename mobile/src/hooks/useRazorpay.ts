import { useState, useCallback } from 'react';
import RazorpayService from '../services/razorpayService';
import { RazorpayOrder, Order } from '../types/payment';

interface UseRazorpayParams {
  onSuccess?: (order: Order) => void;
  onError?: (error: Error) => void;
  onPaymentInitiated?: () => void;
}

interface PaymentParams {
  productId: string;
  productType: 'template' | 'course' | 'plan' | 'exclusive_content';
  amount: number;
  sellerId: string;
  buyerId: string;
}

export function useRazorpay(params?: UseRazorpayParams) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [order, setOrder] = useState<RazorpayOrder | null>(null);

  const razorpayService = new RazorpayService();

  const createOrder = useCallback(
    async (paymentParams: PaymentParams) => {
      try {
        setLoading(true);
        setError(null);

        params?.onPaymentInitiated?.();

        // Create order on backend
        const orderData = await razorpayService.createOrder({
          amount: paymentParams.amount,
          currency: 'INR',
          receipt: `${paymentParams.productType}-${paymentParams.productId}-${Date.now()}`,
          notes: {
            productId: paymentParams.productId,
            productType: paymentParams.productType,
            sellerId: paymentParams.sellerId,
            buyerId: paymentParams.buyerId,
          },
        });

        setOrder(orderData);

        // In a real app, you would open Razorpay checkout here
        // For now, we'll return the order for further processing
        const internalOrder: Order = {
          id: `order-${Date.now()}`,
          razorpayOrderId: orderData.id,
          buyerId: paymentParams.buyerId,
          sellerId: paymentParams.sellerId,
          productType: paymentParams.productType,
          amount: paymentParams.amount,
          platformCommission: Math.round(paymentParams.amount * 0.1), // 10% platform fee
          sellerEarnings: paymentParams.amount - Math.round(paymentParams.amount * 0.1),
          status: 'pending',
          paymentStatus: 'pending',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        params?.onSuccess?.(internalOrder);
        return internalOrder;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Payment failed');
        setError(error);
        params?.onError?.(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [razorpayService, params]
  );

  const verifyPayment = useCallback(
    async (
      razorpayPaymentId: string,
      razorpayOrderId: string,
      razorpaySignature: string
    ) => {
      try {
        setLoading(true);
        setError(null);

        const isValid = razorpayService.verifyPaymentSignature({
          orderId: razorpayOrderId,
          paymentId: razorpayPaymentId,
          signature: razorpaySignature,
        });

        if (!isValid) {
          throw new Error('Payment verification failed');
        }

        // Get payment details
        const payment = await razorpayService.getPayment(razorpayPaymentId);
        return payment;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Verification failed');
        setError(error);
        params?.onError?.(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [razorpayService, params]
  );

  const refundPayment = useCallback(
    async (razorpayPaymentId: string, amount?: number) => {
      try {
        setLoading(true);
        setError(null);

        const refund = await razorpayService.refundPayment(
          razorpayPaymentId,
          amount,
          'User requested refund'
        );

        return refund;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Refund failed');
        setError(error);
        params?.onError?.(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [razorpayService, params]
  );

  const createSubscription = useCallback(
    async (planId: string, customerId: string, quantity: number = 1) => {
      try {
        setLoading(true);
        setError(null);

        const subscription = await razorpayService.createSubscription(
          planId,
          customerId,
          quantity
        );

        return subscription;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Subscription creation failed');
        setError(error);
        params?.onError?.(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [razorpayService, params]
  );

  const transferToSeller = useCallback(
    async (sellerId: string, amount: number) => {
      try {
        setLoading(true);
        setError(null);

        const transfer = await razorpayService.transferToSeller(
          sellerId,
          amount
        );

        return transfer;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Transfer failed');
        setError(error);
        params?.onError?.(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [razorpayService, params]
  );

  const resetState = useCallback(() => {
    setOrder(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    loading,
    error,
    order,
    createOrder,
    verifyPayment,
    refundPayment,
    createSubscription,
    transferToSeller,
    resetState,
  };
}
