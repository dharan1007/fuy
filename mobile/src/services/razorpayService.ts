/**
 * Razorpay Payment Service
 * Handles all payment-related operations with Razorpay
 */

import { RazorpayOrder, RazorpayPayment, Order, PaymentStatus } from '../types/payment';

interface RazorpayConfig {
  keyId: string;
  keySecret: string;
  baseUrl: string;
}

interface CreateOrderParams {
  amount: number; // in rupees
  customerId: string;
  customerEmail: string;
  customerPhone: string;
  productName: string;
  productId: string;
  description: string;
  notes?: Record<string, string>;
  receipt?: string;
}

interface PaymentVerificationParams {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

class RazorpayService {
  private config: RazorpayConfig;
  private apiUrl = 'https://api.razorpay.com/v1';

  constructor(keyId: string, keySecret: string) {
    this.config = {
      keyId,
      keySecret,
      baseUrl: 'https://api.razorpay.com/v1',
    };
  }

  /**
   * Create a Razorpay Order
   */
  async createOrder(params: CreateOrderParams): Promise<RazorpayOrder> {
    try {
      const response = await fetch(`${this.apiUrl}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${this.encodeAuth()}`,
        },
        body: JSON.stringify({
          amount: Math.round(params.amount * 100), // Convert to paise
          currency: 'INR',
          receipt: params.receipt || `receipt_${Date.now()}`,
          customer_notify: 1,
          description: params.description,
          notes: {
            productId: params.productId,
            productName: params.productName,
            ...params.notes,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Razorpay API Error: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        id: data.id,
        amount: data.amount,
        currency: data.currency,
        receipt: data.receipt,
        status: data.status,
        attempts: data.attempts || 0,
        customerId: params.customerId,
        customerEmail: params.customerEmail,
        customerPhone: params.customerPhone,
        metadata: params.notes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error creating Razorpay order:', error);
      throw error;
    }
  }

  /**
   * Get Order Details
   */
  async getOrder(orderId: string): Promise<any> {
    try {
      const response = await fetch(`${this.apiUrl}/orders/${orderId}`, {
        method: 'GET',
        headers: {
          Authorization: `Basic ${this.encodeAuth()}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Razorpay API Error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching order details:', error);
      throw error;
    }
  }

  /**
   * Get Payment Details
   */
  async getPayment(paymentId: string): Promise<RazorpayPayment> {
    try {
      const response = await fetch(`${this.apiUrl}/payments/${paymentId}`, {
        method: 'GET',
        headers: {
          Authorization: `Basic ${this.encodeAuth()}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Razorpay API Error: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        id: data.id,
        orderId: data.order_id,
        amount: data.amount,
        currency: data.currency,
        status: data.status,
        method: data.method,
        bankCode: data.bank,
        wallet: data.wallet,
        cardId: data.card_id,
        cardNetwork: data.card_network,
        cardLast4: data.card?.last4,
        vpa: data.vpa,
        createdAt: new Date(data.created_at * 1000).toISOString(),
        capturedAt: data.captured_at ? new Date(data.captured_at * 1000).toISOString() : undefined,
      };
    } catch (error) {
      console.error('Error fetching payment details:', error);
      throw error;
    }
  }

  /**
   * Verify Payment Signature (most important for security)
   * This should be called on the server-side
   */
  verifyPaymentSignature(params: PaymentVerificationParams): boolean {
    try {
      const crypto = require('crypto');

      const message = `${params.razorpayOrderId}|${params.razorpayPaymentId}`;
      const expectedSignature = crypto
        .createHmac('sha256', this.config.keySecret)
        .update(message)
        .digest('hex');

      return expectedSignature === params.razorpaySignature;
    } catch (error) {
      console.error('Error verifying payment signature:', error);
      return false;
    }
  }

  /**
   * Capture Payment (if authorized but not captured)
   */
  async capturePayment(paymentId: string, amount: number): Promise<any> {
    try {
      const response = await fetch(`${this.apiUrl}/payments/${paymentId}/capture`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${this.encodeAuth()}`,
        },
        body: JSON.stringify({
          amount: Math.round(amount * 100), // Convert to paise
        }),
      });

      if (!response.ok) {
        throw new Error(`Razorpay API Error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error capturing payment:', error);
      throw error;
    }
  }

  /**
   * Refund Payment
   */
  async refundPayment(paymentId: string, amount?: number, notes?: string): Promise<any> {
    try {
      const body: any = {};
      if (amount) {
        body.amount = Math.round(amount * 100); // Convert to paise
      }
      if (notes) {
        body.notes = { reason: notes };
      }

      const response = await fetch(`${this.apiUrl}/payments/${paymentId}/refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${this.encodeAuth()}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`Razorpay API Error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error refunding payment:', error);
      throw error;
    }
  }

  /**
   * Create Subscription Plan
   */
  async createPlan(
    period: 'daily' | 'weekly' | 'monthly' | 'yearly',
    interval: number,
    amount: number,
    description: string
  ): Promise<any> {
    try {
      const response = await fetch(`${this.apiUrl}/plans`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${this.encodeAuth()}`,
        },
        body: JSON.stringify({
          period,
          interval,
          amount: Math.round(amount * 100),
          currency: 'INR',
          description,
        }),
      });

      if (!response.ok) {
        throw new Error(`Razorpay API Error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating plan:', error);
      throw error;
    }
  }

  /**
   * Create Subscription
   */
  async createSubscription(
    planId: string,
    customerId: string,
    quantity?: number,
    totalCount?: number,
    startAt?: number
  ): Promise<any> {
    try {
      const body: any = {
        plan_id: planId,
        customer_notify: 1,
      };

      if (quantity) body.quantity = quantity;
      if (totalCount) body.total_count = totalCount;
      if (startAt) body.start_at = startAt;

      const response = await fetch(`${this.apiUrl}/subscriptions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${this.encodeAuth()}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`Razorpay API Error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating subscription:', error);
      throw error;
    }
  }

  /**
   * Get Subscription Details
   */
  async getSubscription(subscriptionId: string): Promise<any> {
    try {
      const response = await fetch(`${this.apiUrl}/subscriptions/${subscriptionId}`, {
        method: 'GET',
        headers: {
          Authorization: `Basic ${this.encodeAuth()}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Razorpay API Error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching subscription details:', error);
      throw error;
    }
  }

  /**
   * Cancel Subscription
   */
  async cancelSubscription(subscriptionId: string, cancelAtCycleEnd: boolean = false): Promise<any> {
    try {
      const response = await fetch(`${this.apiUrl}/subscriptions/${subscriptionId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${this.encodeAuth()}`,
        },
        body: JSON.stringify({
          cancel_at_cycle_end: cancelAtCycleEnd ? 1 : 0,
        }),
      });

      if (!response.ok) {
        throw new Error(`Razorpay API Error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      throw error;
    }
  }

  /**
   * Transfer to Seller (Payout)
   */
  async transferToSeller(sellerId: string, amount: number, account: 'bank_account' | 'vpa' = 'bank_account'): Promise<any> {
    try {
      const response = await fetch(`${this.apiUrl}/transfers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${this.encodeAuth()}`,
        },
        body: JSON.stringify({
          account,
          amount: Math.round(amount * 100),
          currency: 'INR',
          receipt: `transfer_${sellerId}_${Date.now()}`,
        }),
      });

      if (!response.ok) {
        throw new Error(`Razorpay API Error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating transfer:', error);
      throw error;
    }
  }

  /**
   * Validate VPA (UPI Address)
   */
  async validateVPA(vpa: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiUrl}/fund_accounts/validations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${this.encodeAuth()}`,
        },
        body: JSON.stringify({
          account_number: vpa,
          fund_account: {
            account_type: 'vpa',
            vpa: {
              address: vpa,
            },
          },
          receipt_email: 'noreply@platform.com',
        }),
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      return data.status === 'active';
    } catch (error) {
      console.error('Error validating VPA:', error);
      return false;
    }
  }

  /**
   * Helper: Encode credentials for Basic Auth
   */
  private encodeAuth(): string {
    return Buffer.from(`${this.config.keyId}:${this.config.keySecret}`).toString('base64');
  }
}

export default RazorpayService;
