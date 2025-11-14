/**
 * Payment & Order Types
 * For managing Razorpay payments and orders
 */

export type PaymentStatus = 'initiated' | 'processing' | 'completed' | 'failed' | 'refunded';
export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'delivered' | 'completed' | 'cancelled' | 'refunded';
export type RefundStatus = 'requested' | 'processing' | 'completed' | 'rejected' | 'disputed';

/**
 * Razorpay Order
 */
export interface RazorpayOrder {
  id: string; // Razorpay Order ID (order_xxx)
  amount: number; // in paise (amount * 100)
  currency: string;
  receipt: string; // Custom receipt ID
  status: PaymentStatus;
  attempts: number;

  // Customer details
  customerId: string; // User ID
  customerEmail: string;
  customerPhone: string;

  // Metadata
  metadata?: Record<string, any>;
  notes?: Record<string, string>;

  // Dates
  createdAt: string;
  updatedAt: string;
  paidAt?: string;
}

/**
 * Razorpay Payment
 */
export interface RazorpayPayment {
  id: string; // Razorpay Payment ID (pay_xxx)
  orderId: string; // Associated Razorpay Order ID
  amount: number; // in paise
  currency: string;
  status: PaymentStatus;

  // Payment method
  method: 'card' | 'netbanking' | 'wallet' | 'upi' | 'emi';
  bankCode?: string;
  wallet?: string;

  // Card details (if payment method is card)
  cardId?: string;
  cardNetwork?: string;
  cardLast4?: string;

  // Verification
  vpa?: string; // For UPI
  acquirerData?: Record<string, any>;

  // Dates
  createdAt: string;
  capturedAt?: string;
  failedAt?: string;
  failureReason?: string;
  failureDescription?: string;
}

/**
 * Order
 */
export interface Order {
  id: string; // Internal Order ID
  razorpayOrderId: string; // Link to Razorpay Order
  razorpayPaymentId?: string; // Link to Razorpay Payment

  // Parties
  buyerId: string;
  buyerEmail: string;
  buyerName: string;
  sellerId: string;

  // Product details
  productType: 'template' | 'course' | 'plan' | 'exclusive_content';
  productId: string;
  productName: string;
  productPrice: number;

  // Financial
  amount: number;
  platformCommission: number; // Commission deducted
  sellerEarnings: number; // Amount seller gets
  currency: string;

  // Status
  status: OrderStatus;
  paymentStatus: PaymentStatus;

  // Delivery
  deliveryUrl?: string; // Download link or access link
  accessGrantedAt?: string;
  expiresAt?: string; // For time-limited access

  // Refund
  refundStatus?: RefundStatus;
  refundAmount?: number;
  refundReason?: string;
  refundedAt?: string;

  // Dates
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  cancelledAt?: string;
}

/**
 * Invoice
 */
export interface Invoice {
  id: string;
  orderId: string;
  invoiceNumber: string; // e.g., "INV-2024-001"

  // Parties
  buyerName: string;
  buyerEmail: string;
  sellerName: string;
  sellerGSTIN?: string;

  // Items
  items: {
    productName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    gst?: number;
  }[];

  // Summary
  subtotal: number;
  tax?: number;
  discount?: number;
  total: number;

  // Dates
  issuedAt: string;
  dueDate?: string;
  paidAt?: string;
  pdfUrl?: string;
}

/**
 * Subscription (for courses and exclusive content)
 */
export interface Subscription {
  id: string;
  buyerId: string;
  productId: string;
  productType: 'course' | 'exclusive_content';

  // Razorpay
  razorpaySubscriptionId?: string; // For recurring payments
  planId?: string;

  // Status
  status: 'active' | 'paused' | 'cancelled' | 'expired';
  autoRenew: boolean;

  // Duration
  startDate: string;
  endDate: string;
  renewalDate?: string;

  // Financial
  amount: number;
  billingCycle: 'monthly' | 'quarterly' | 'yearly';
  nextChargeDate?: string;

  // Dates
  createdAt: string;
  updatedAt: string;
  cancelledAt?: string;
}

/**
 * Transaction (for seller earnings)
 */
export interface SellerTransaction {
  id: string;
  sellerId: string;
  type: 'order_earnings' | 'commission' | 'refund' | 'withdrawal' | 'adjustment';
  amount: number;
  currency: string;

  // Reference
  orderId?: string;
  relatedTransactionId?: string;

  // Description
  description: string;
  metadata?: Record<string, any>;

  // Status
  status: 'completed' | 'pending' | 'failed';

  // Dates
  createdAt: string;
  processedAt?: string;
}

/**
 * Refund Request
 */
export interface RefundRequest {
  id: string;
  orderId: string;
  buyerId: string;
  sellerId: string;
  razorpayPaymentId: string;

  // Details
  reason: string;
  reasonCategory: 'not_as_described' | 'quality_issue' | 'unwanted' | 'other';
  attachments?: string[]; // URLs to evidence

  // Financial
  amount: number;
  refundAmount?: number;

  // Status
  status: RefundStatus;
  requestedAt: string;
  resolvedAt?: string;
  resolvedBy?: string; // Admin/seller ID
  resolution?: string;

  // Razorpay
  razorpayRefundId?: string;
}

/**
 * Coupon/Discount
 */
export interface Coupon {
  id: string;
  code: string;
  sellerId?: string; // If specific to a seller

  // Discount details
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  maxDiscount?: number; // For percentage discounts
  minPurchaseAmount?: number;

  // Validity
  validFrom: string;
  validUntil: string;
  maxUses?: number;
  usedCount: number;

  // Restrictions
  applicableProductIds?: string[]; // If only for specific products
  applicableTo: 'all' | 'new_users' | 'returning_users';

  // Status
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
