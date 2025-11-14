# Seller Platform & Payment Integration Guide

This document provides a comprehensive guide to the newly implemented seller ecosystem, payment processing, and moderation systems.

## 📋 Overview

The platform now includes:
- **Payment Processing**: Razorpay integration for payments and subscriptions
- **Seller Management**: Complete seller account and store management system
- **Product Management**: Support for templates, courses, plans, and exclusive content
- **Content Moderation**: Automated and manual content filtering with strict enforcement
- **Order Tracking**: Complete order lifecycle management
- **Analytics & Dashboards**: Professional seller dashboards with analytics
- **Admin Moderation**: Admin dashboard for content review and enforcement

---

## 🏗️ Architecture Overview

### Services Layer
The application uses a service-based architecture with dedicated services for each domain:

```
src/services/
├── razorpayService.ts      # Payment processing
├── sellerService.ts        # Seller management
├── productService.ts       # Product CRUD operations
└── moderationService.ts    # Content moderation
```

### Type Definitions
All types are centralized in the types folder:

```
src/types/
├── seller.ts       # SellerProfile, StoreAnalytics, WithdrawalRequest
├── product.ts      # Product variants, CourseModule, Lesson
├── payment.ts      # Order, Invoice, Subscription, Transaction
└── moderation.ts   # FlaggedContent, ViolationKeyword, Appeal
```

### UI Screens
Seller and admin screens are organized by role:

```
src/screens/
├── seller/
│   ├── SellerDashboardScreen.tsx      # Main dashboard
│   ├── SellerStoreProfileScreen.tsx   # Store settings
│   ├── OrdersScreen.tsx               # Order management
│   ├── WithdrawalsScreen.tsx          # Payout management
│   └── ProductManagementScreen.tsx    # Product management
└── admin/
    └── ModerationDashboardScreen.tsx  # Content moderation
```

---

## 💳 Payment Integration (Razorpay)

### Setup Instructions

1. **Get Razorpay Credentials**
   - Sign up at https://razorpay.com
   - Navigate to Settings → API Keys
   - Copy your Key ID and Key Secret

2. **Configure Environment Variables**
   ```env
   REACT_APP_RAZORPAY_KEY_ID=your_key_id
   REACT_APP_RAZORPAY_KEY_SECRET=your_key_secret
   REACT_APP_API_URL=http://localhost:3000/api
   ```

3. **Initialize Razorpay Service**
   ```typescript
   import RazorpayService from './services/razorpayService';

   const razorpayService = new RazorpayService();
   ```

### Using the Payment Hook

```typescript
import { useRazorpay } from '../hooks/useRazorpay';

export function CheckoutScreen() {
  const { createOrder, loading, error } = useRazorpay({
    onSuccess: (order) => {
      console.log('Payment successful:', order);
      // Handle success
    },
    onError: (error) => {
      console.log('Payment failed:', error.message);
      // Handle error
    },
  });

  const handlePayment = async () => {
    const order = await createOrder({
      productId: 'prod-123',
      productType: 'course',
      amount: 9999, // in rupees
      sellerId: 'seller-123',
      buyerId: 'buyer-456',
    });
  };

  return (
    <Button
      title="Pay Now"
      onPress={handlePayment}
      disabled={loading}
    />
  );
}
```

### Payment Flow

```
1. User initiates purchase → 2. Create order via RazorpayService
                              ↓
3. Display Razorpay checkout → 4. User completes payment
                                  ↓
5. Verify signature → 6. Update order status → 7. Transfer to seller
```

### Supported Payment Types

- **One-time Payments**: Templates, individual purchases
- **Subscriptions**: Courses, exclusive content (recurring)
- **Plans**: Coaching sessions, consulting hours

---

## 👨‍💼 Seller Management

### Creating a Seller Account

```typescript
import SellerService from './services/sellerService';

const sellerService = new SellerService();

// Create seller profile
const seller = await sellerService.createSellerProfile('user-123', {
  storeName: 'My Awesome Store',
  storeSlug: 'my-awesome-store',
  businessName: 'My Business LLC',
  email: 'seller@example.com',
  phone: '+91 98765 43210',
});
```

### Store Customization

```typescript
// Update store profile
await sellerService.updateSellerProfile('seller-123', {
  storeDescription: 'Selling amazing templates and courses',
  storeColor: '#6AA8FF',
  logoUrl: 'https://...',
  bannerUrl: 'https://...',
});

// Upload logo
const logoUrl = await sellerService.uploadStoreLogo(
  'seller-123',
  imageFile
);

// Upload banner
const bannerUrl = await sellerService.uploadStoreBanner(
  'seller-123',
  imageFile
);
```

### Seller Dashboard Features

The `SellerDashboardScreen` provides:
- **Revenue Metrics**: Total revenue, monthly trends
- **Order Statistics**: Total orders, order status breakdown
- **Customer Analytics**: Unique customers, repeat customer rate
- **Rating & Reviews**: Average rating, total review count
- **Top Products**: Best-selling products with revenue
- **Recent Orders**: Latest transactions
- **Store Status**: Active status and moderation status

### Accessing Seller Analytics

```typescript
// Get store analytics
const analytics = await sellerService.getStoreAnalytics(
  'seller-123',
  'monthly' // 'monthly' or 'yearly'
);

console.log(analytics);
// {
//   totalRevenue: 50000,
//   totalOrders: 125,
//   uniqueCustomers: 87,
//   monthlyData: [...],
//   topProducts: [...],
//   recentOrders: [...]
// }
```

---

## 📦 Product Management

### Product Types Supported

1. **Templates** (Canvas templates)
   ```typescript
   {
     productType: 'template',
     price: 299,
     category: 'design',
     tags: ['minimalist', 'modern'],
   }
   ```

2. **Courses**
   ```typescript
   {
     productType: 'course',
     price: 2999,
     modules: [
       {
         title: 'Module 1',
         lessons: [
           { title: 'Lesson 1', videoUrl: '...' },
         ]
       }
     ]
   }
   ```

3. **Plans** (Coaching/Consulting)
   ```typescript
   {
     productType: 'plan',
     price: 4999,
     duration: 30, // days
     sessionsIncluded: 4,
     features: ['1-on-1 coaching', 'Email support']
   }
   ```

4. **Exclusive Content** (Subscription)
   ```typescript
   {
     productType: 'exclusive_content',
     price: 399, // monthly
     billingCycle: 'monthly',
     description: 'Members-only content',
   }
   ```

### Creating Products

```typescript
import ProductService from './services/productService';

const productService = new ProductService();

// Create a course
const course = await productService.createProduct('seller-123', {
  title: 'Advanced Design',
  description: 'Master advanced design techniques',
  productType: 'course',
  price: 2999,
  modules: [
    {
      title: 'Fundamentals',
      lessons: [
        {
          title: 'Getting Started',
          videoUrl: 'https://...',
          duration: 45,
        }
      ]
    }
  ]
});
```

### Publishing Products

```typescript
// Publish to make visible
await productService.publishProduct('product-123');

// Unpublish to hide
await productService.unpublishProduct('product-123');

// Delete product
await productService.deleteProduct('product-123');
```

### Product Management Screen

The `ProductManagementScreen` provides:
- List all products with filters (published/draft/all)
- View product details and sales metrics
- Edit product information
- Publish/unpublish products
- Delete products
- Upload product images and videos

---

## 🔍 Content Moderation System

### Moderation Architecture

The system uses a multi-layered approach:

```
1. Automated Filtering (Keyword-based)
   ↓
2. Confidence Scoring (0-1 scale)
   ↓
3. Auto-action or Human Review
   ↓
4. Admin Decision (Approve/Reject)
   ↓
5. Appeal Workflow
```

### Prohibited Content Categories

```typescript
// Violations detected include:
'drug_related'              // Drugs, cannabis, cocaine, heroin, etc.
'weapons_or_violence'       // Guns, explosives, violence content
'human_trafficking'         // Trafficking, slavery, child labor
'adult_content'            // NSFW, sexual content
'illegal_activity'         // Counterfeiting, fraud, hacking
'hate_speech'              // Slurs, discrimination
'misinformation'           // False health claims, conspiracy theories
'spam'                     // Repetitive, unsolicited content
'copyright_violation'      // Intellectual property issues
'trademark_violation'      // Brand misuse
```

### Using the Moderation Service

```typescript
import ModerationService from './services/moderationService';

const moderationService = new ModerationService();

// Scan product for violations
const result = await moderationService.scanProduct({
  title: 'Premium Course',
  description: 'Learn everything...',
  tags: ['education', 'online'],
});

// Result includes:
// {
//   violations: ['drug_related'],
//   confidence: 0.92,
//   flagged: true,
//   details: {...}
// }
```

### Moderation Levels

- **Confidence > 0.8**: Auto-remove content
- **Confidence 0.5-0.8**: Manual review required
- **Confidence < 0.5**: Approved automatically

### Admin Moderation Dashboard

The `ModerationDashboardScreen` provides:
- **Overview Stats**: Total flagged, pending review, suspensions, bans
- **Content Queue**: Prioritized list of flagged content
- **Filtering**: By status (pending, critical, under review)
- **Review Actions**:
  - Approve (reinstate content)
  - Reject (remove content permanently)
  - Suspend account (7-day suspension)
  - Ban account (permanent ban)
- **Violation Details**: Specific violations detected with confidence scores
- **Metadata**: When flagged, by whom, and appeal options

### Language Support

The moderation system supports both English and Hindi keywords:
- English terms like: "cocaine", "gun", "trafficking"
- Hindi terms like: "भांग" (cannabis), "बंदूक" (gun), "हथियार" (weapon)

---

## 💰 Earnings & Withdrawals

### Seller Earnings Breakdown

```
Total Order Amount
├── Platform Commission (10%)
├── Payment Processing Fee (2%)
└── Seller Earnings (88%)
```

### Withdrawal System

```typescript
// Request withdrawal
const withdrawal = await sellerService.requestWithdrawal(
  'seller-123',
  5000 // amount in rupees
);

// Track withdrawal status
const withdrawals = await sellerService.getWithdrawalHistory('seller-123');

// withdrawals contain:
// {
//   id: '...',
//   amount: 5000,
//   status: 'processing', // pending, processing, completed, failed
//   requestDate: '2024-01-15',
//   completedDate: '2024-01-17',
//   processingFee: 100
// }
```

### Withdrawal Screen Features

- Display available balance
- Request withdrawal form with amount input
- Real-time processing fee calculation
- Withdrawal history with status tracking
- Minimum withdrawal: ₹100
- Processing time: 2-3 business days

---

## 📊 Analytics Components

### Available Analytics Components

#### 1. AnalyticsCard
```typescript
import { AnalyticsCard } from './components/analytics';

<AnalyticsCard
  title="Total Revenue"
  value="₹50,000"
  icon="💰"
  trend={{ value: 25, label: 'this month', positive: true }}
  color="#6AA8FF"
  size="medium"
/>
```

#### 2. SimpleChart
```typescript
import { SimpleChart } from './components/analytics';

<SimpleChart
  title="Monthly Sales"
  data={[
    { label: 'Jan', value: 5000, color: '#6AA8FF' },
    { label: 'Feb', value: 7500, color: '#6AA8FF' },
    { label: 'Mar', value: 6200, color: '#6AA8FF' },
  ]}
  height={200}
  type="bar"
  showValues={true}
/>
```

#### 3. GrowthStats
```typescript
import { GrowthStats } from './components/analytics';

<GrowthStats
  title="Performance Metrics"
  stats={[
    {
      label: 'Total Revenue',
      value: '₹50K',
      change: 25,
      positive: true,
      icon: '💰',
    },
    {
      label: 'Orders',
      value: '125',
      change: 15,
      positive: true,
      icon: '📦',
    },
  ]}
  columns={2}
/>
```

---

## 🔗 Navigation Setup

### Adding to Main Navigator

```typescript
import { SellerNavigator, AdminNavigator } from './navigation/SellerNavigator';

export function AppNavigator({ userRole, userId }: any) {
  if (userRole === 'seller') {
    return <SellerNavigator sellerId={userId} />;
  }

  if (userRole === 'admin') {
    return <AdminNavigator adminId={userId} />;
  }

  // Regular buyer navigation
  return <BuyerNavigator />;
}
```

### Screen Navigation

```typescript
// Navigate to seller dashboard
navigation.navigate('Dashboard', { sellerId: 'seller-123' });

// Navigate to orders
navigation.navigate('Orders', { sellerId: 'seller-123' });

// Navigate to withdrawals
navigation.navigate('Withdrawals', { sellerId: 'seller-123' });

// Navigate to product management
navigation.navigate('ProductManagement', { sellerId: 'seller-123' });

// Navigate to store settings
navigation.navigate('StoreProfile', { sellerId: 'seller-123' });
```

---

## 🛡️ Security Best Practices

### Payment Security
- ✅ Always verify payment signatures server-side
- ✅ Never expose API secret in frontend
- ✅ Use HTTPS for all API calls
- ✅ Implement rate limiting for payment endpoints

### Content Moderation
- ✅ Log all moderation actions for audit
- ✅ Require human review for critical violations
- ✅ Implement appeal workflow for false positives
- ✅ Regular review of moderation rules

### Seller Accounts
- ✅ Implement KYC verification for payouts
- ✅ Monitor unusual withdrawal patterns
- ✅ Validate bank account details
- ✅ Implement account suspension workflow

---

## 🧪 Testing

### Testing Payment Flow

```typescript
// Mock payment
const mockPaymentParams = {
  productId: 'test-product',
  productType: 'course' as const,
  amount: 2999,
  sellerId: 'test-seller',
  buyerId: 'test-buyer',
};

const { createOrder } = useRazorpay();
const order = await createOrder(mockPaymentParams);
console.log(order); // Should have orderId, status: 'pending'
```

### Testing Moderation

```typescript
// Test content scanning
const moderationService = new ModerationService();

const result = await moderationService.scanText(
  'This course includes prohibited content',
  'product_description'
);

console.log(result.violations); // Should detect violations
```

---

## 📱 Screen Hierarchy

```
Seller App Root
├── Dashboard
│   ├── View Analytics
│   └── Quick Actions
├── Products
│   ├── List Products
│   ├── Create Product
│   ├── Edit Product
│   └── Publish/Unpublish
├── Orders
│   ├── View Orders
│   ├── Filter by Status
│   └── View Order Details
├── Withdrawals
│   ├── Request Withdrawal
│   ├── View History
│   └── Check Status
└── Store Settings
    ├── Edit Profile
    ├── Upload Logo/Banner
    ├── Manage Colors
    └── Update Contact Info

Admin App Root
└── Moderation Dashboard
    ├── View Flagged Content
    ├── Review Violations
    ├── Take Action
    │   ├── Approve
    │   ├── Reject
    │   ├── Suspend Account
    │   └── Ban Account
    └── View Statistics
```

---

## 🚀 Next Steps

1. **Backend Integration**: Connect services to actual API endpoints
2. **Webhook Setup**: Implement Razorpay webhooks for payment status updates
3. **KYC Integration**: Add ID verification for seller onboarding
4. **Email Notifications**: Send order and moderation notifications
5. **Analytics Tracking**: Integrate with analytics service for user behavior
6. **Automated Payouts**: Set up automated weekly/monthly payouts

---

## 📞 Support

For issues or questions:
- Check service implementations in `src/services/`
- Review type definitions in `src/types/`
- Test using the custom hooks in `src/hooks/`
- Refer to individual screen documentation

---

**Last Updated**: January 2024
