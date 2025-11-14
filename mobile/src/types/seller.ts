/**
 * Seller/Vendor Types
 * For managing seller accounts, stores, and seller-specific features
 */

export type SellerStatus = 'pending_approval' | 'approved' | 'suspended' | 'banned';
export type SellerVerification = 'unverified' | 'pending' | 'verified';

export interface SellerProfile {
  id: string;
  userId: string;
  storeName: string;
  storeDescription: string;
  storeSlug: string; // Custom URL: example.com/store/{storeSlug}

  // Branding
  storeLogo?: string; // URL to logo image
  storeBanner?: string; // URL to banner image
  primaryColor?: string; // Brand color

  // Contact & Info
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  businessCategory: 'templates' | 'courses' | 'coaching' | 'exclusive_content' | 'mixed';

  // Verification
  status: SellerStatus;
  verificationStatus: SellerVerification;
  aadharVerified?: boolean;
  bankAccountVerified?: boolean;

  // Banking for Payouts
  bankAccountHolder: string;
  bankAccountNumber: string;
  bankIFSC: string;
  accountType: 'savings' | 'current';

  // Statistics
  totalSales: number;
  totalEarnings: number;
  totalProducts: number;
  averageRating: number;
  totalRatings: number;

  // Dates
  createdAt: string;
  updatedAt: string;
  suspendedAt?: string;
  bannedAt?: string;

  // Settings
  autoApproveOrders?: boolean;
  allowReviews?: boolean;
  termsAccepted: boolean;
  privacyAccepted: boolean;
}

export interface StoreAnalytics {
  sellerId: string;
  monthlyRevenue: number;
  monthlyOrders: number;
  monthlyVisits: number;
  topProducts: {
    productId: string;
    productName: string;
    sales: number;
    revenue: number;
  }[];
  recentOrders: {
    orderId: string;
    amount: number;
    date: string;
  }[];
  conversionRate: number; // visits to sales
  averageOrderValue: number;
}

export interface WithdrawalRequest {
  id: string;
  sellerId: string;
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  bankAccount: {
    accountHolder: string;
    accountNumber: string;
    ifscCode: string;
  };
  transactionId?: string; // Razorpay transfer ID
  requestedAt: string;
  processedAt?: string;
  failureReason?: string;
  minWithdrawalAmount: number;
  processingFee: number; // percentage or fixed amount
}

export interface Commission {
  id: string;
  sellerId: string;
  productType: 'template' | 'course' | 'plan' | 'content';
  commissionPercentage: number; // Platform takes this percentage
  minAmount?: number;
  maxAmount?: number;
  appliesFrom: string;
}
