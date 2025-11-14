# Backend Review & Missing Requirements

## 📋 Executive Summary

The backend has been partially completed with a solid foundation but is **MISSING critical components** for the Seller Platform, Payment Integration, and Content Moderation system that you've implemented on the mobile and planned on the web.

### Status Overview
- ✅ **Complete**: User management, social features, chat, journaling, places, tasks
- ⚠️ **Incomplete**: E-commerce (basic structure only)
- ❌ **Missing**: Seller Platform, Payment System, Financial Management, Content Moderation

---

## 🗄️ Current Backend Architecture

### Framework & Stack
- **Framework**: Next.js (App Router)
- **Database**: PostgreSQL (Supabase)
- **ORM**: Prisma
- **Authentication**: NextAuth.js
- **File Storage**: Supabase Storage
- **Existing API Routes**: 60+ endpoints

### Current Database Models (1,213 lines)

**Implemented Models**:
1. User & Profile management
2. Social Graph (Friends, Groups)
3. Posts & Comments
4. Chat & Messaging
5. Journaling & Templates
6. Task Management & Organizations
7. Goals (Essenz system)
8. Places & Routes
9. Basic E-commerce (Brand, Product, Order)

---

## ❌ MISSING DATABASE MODELS (Critical)

### 1. Seller Management
```typescript
// Missing models:
- Seller / SellerProfile
  - userId, storeName, storeSlug, email, phone
  - businessName, businessAddress, taxId
  - kyc status, verification documents
  - bankDetails, paymentInfo
  - createdAt, status (pending, approved, suspended, banned)

- Store / StoreProfile
  - sellerId, displayName, slug, description
  - logoUrl, bannerUrl, primaryColor
  - address, phone, website
  - totalRevenue, rating, followers

- SellerAnalytics / StoreAnalytics
  - sellerId, totalRevenue, totalOrders, monthlyRevenue
  - uniqueCustomers, repeatCustomers, averageRating
  - topProducts[], recentOrders[], monthlyData[]

- Commission
  - sellerId, productType, commissionPercentage
  - platformFee, paymentProcessingFee
  - minWithdrawal, maxWithdrawal

- WithdrawalRequest
  - sellerId, amount, status (pending, processing, completed, failed)
  - bankAccount, upiId, accountHolderName
  - requestDate, completedDate, processingFee
  - failureReason, notes
```

### 2. Payment System
```typescript
// Missing models:
- RazorpayOrder
  - razorpayOrderId, amount, currency, status
  - receipt, notes, attempts
  - createdAt, expiresAt

- RazorpayPayment
  - razorpayPaymentId, razorpayOrderId
  - amount, currency, method (card, upi, wallet, etc)
  - status (captured, failed, authorized)
  - cardDetails (for card payments)
  - vpaId (for UPI)
  - failureCode, failureReason

- Subscription
  - planId, customerId, subscriptionId
  - status (active, paused, cancelled)
  - currentPeriodStart, currentPeriodEnd
  - nextBillingDate, cancelledAt
  - autoRenew

- SellerTransaction
  - sellerId, type (order, refund, commission, withdrawal, adjustment)
  - amount, status, transactionId
  - relatedOrderId, description
  - createdAt

- Invoice
  - orderId, invoiceNumber, userId, sellerId
  - amount, tax, subtotal, totalAmount
  - invoiceDate, dueDate, paidDate
  - status (draft, sent, paid, overdue)
  - pdfUrl

- RefundRequest
  - orderId, reason, amount
  - requestedBy (buyer or seller), approvedBy (admin)
  - status (pending, approved, rejected, refunded)
  - rejectionReason, refundedAmount
  - refundMethod (original, wallet, bank)
```

### 3. Product Management (Enhanced)
```typescript
// Extend existing Product model:
- Add: productType (template, course, plan, exclusive_content)
- Add: sellerId (connect to Seller instead of just Brand)
- Add: moduleCount, lessonCount (for courses)
- Add: subscriptionBillingCycle (monthly, yearly)

// Missing models:
- CourseModule
  - courseId, title, description, order
  - lessons[]

- Lesson
  - moduleId, title, videoUrl, duration, resources[]
  - order, isLocked

- PlanFeature
  - planId, featureName, value (sessions, duration, etc)
```

### 4. Content Moderation
```typescript
// Missing models:
- ViolationKeyword
  - keyword, category, severity (low, medium, high, critical)
  - regex, exactMatch, caseSensitive
  - language (en, hi, multi)
  - addedAt, addedBy (admin)

- FlaggedContent
  - contentType, contentId, contentOwner, contentValue
  - violations[], violationDetails[]
  - flaggedBy (system, user, admin), flaggedByUserId
  - userReportReason, flaggedAt
  - status, severity, humanReviewRequired, escalated
  - reviewedBy, reviewedAt, reviewNotes, decision
  - actionTaken, actionDetails, removedAt
  - appealRequested, appealReason, appealedAt
  - automationScore

- ModerationRule
  - name, description, enabled
  - ruleType (keyword, pattern, image, link, custom)
  - triggerCondition, action, autoExecute
  - appliesTo[], severityLevel
  - createdBy, priority

- AccountViolation
  - userId, violationType, contentId
  - severity (warning, suspension, ban)
  - timeframe (0 = permanent)
  - action, actionAppliedAt, removalDate
  - canAppeal, appealDeadline, appealSubmitted
  - appliedBy, reason

- Appeal
  - violationId, userId, appealReason, evidence[]
  - status (submitted, under_review, approved, rejected)
  - submittedAt, reviewedAt, reviewedBy
  - decision, decisionReason

- ModerationAuditLog
  - action, targetId, targetType
  - actorType, actorId
  - oldValue, newValue, reason
  - timestamp, ipAddress
```

---

## ❌ MISSING API ROUTES (Critical)

### Seller Management Routes
```
POST   /api/sellers/register           - Create seller account
GET    /api/sellers/[id]               - Get seller profile
PUT    /api/sellers/[id]               - Update seller profile
GET    /api/sellers/[id]/analytics     - Get store analytics
POST   /api/sellers/[id]/kyc           - Submit KYC verification
GET    /api/sellers/[id]/kyc-status    - Check KYC status
POST   /api/sellers/[id]/bank-details  - Update bank info
GET    /api/sellers/[id]/logo          - Get store logo
POST   /api/sellers/[id]/logo          - Upload store logo
GET    /api/sellers/[id]/banner        - Get store banner
POST   /api/sellers/[id]/banner        - Upload store banner
GET    /api/sellers/check-slug         - Check slug availability
GET    /api/stores/[slug]              - Get public store profile
```

### Payment Routes
```
POST   /api/payments/orders            - Create Razorpay order
GET    /api/payments/orders/[id]       - Get order status
POST   /api/payments/verify            - Verify payment signature
POST   /api/payments/refund            - Refund payment
GET    /api/payments/refunds/[id]      - Get refund status
POST   /api/payments/subscriptions     - Create subscription
GET    /api/payments/subscriptions/[id] - Get subscription
PUT    /api/payments/subscriptions/[id] - Update subscription
DELETE /api/payments/subscriptions/[id] - Cancel subscription
POST   /api/payments/webhooks/razorpay - Razorpay webhook handler
POST   /api/invoices                   - Generate invoice
GET    /api/invoices/[id]              - Get invoice
GET    /api/invoices/[id]/pdf          - Download invoice PDF
```

### Financial Management Routes
```
GET    /api/sellers/[id]/earnings      - Get earnings summary
GET    /api/sellers/[id]/transactions  - Get transaction history
POST   /api/sellers/[id]/withdrawals   - Request withdrawal
GET    /api/sellers/[id]/withdrawals   - Get withdrawal history
GET    /api/sellers/[id]/commissions   - Get commission rates
POST   /api/admin/payouts              - Process payouts (admin)
```

### Product Routes (Enhanced)
```
POST   /api/products                   - Create product (seller)
GET    /api/products/[id]              - Get product details
PUT    /api/products/[id]              - Update product
DELETE /api/products/[id]              - Delete product
POST   /api/products/[id]/publish      - Publish product
POST   /api/products/[id]/unpublish    - Unpublish product
GET    /api/sellers/[id]/products      - Get seller's products
POST   /api/products/[id]/images       - Upload product image
POST   /api/products/[id]/courses/modules - Create course module
POST   /api/products/[id]/courses/lessons - Upload course video
```

### Content Moderation Routes
```
POST   /api/moderation/flag-content    - Flag content
GET    /api/moderation/queue           - Get moderation queue
POST   /api/moderation/[id]/approve    - Approve flagged content
POST   /api/moderation/[id]/reject     - Reject flagged content
POST   /api/moderation/[id]/escalate   - Escalate to admin
POST   /api/moderation/violations      - Get violation details
GET    /api/moderation/stats           - Get moderation statistics
POST   /api/moderation/appeals         - Submit appeal
GET    /api/moderation/appeals/[id]    - Get appeal status
POST   /api/moderation/rules           - Create/update rules (admin)
GET    /api/moderation/keywords        - Get keyword list (admin)
POST   /api/moderation/keywords        - Add/update keywords (admin)
GET    /api/moderation/audit-logs      - Get audit trail (admin)
```

### Order & Customer Routes
```
GET    /api/sellers/[id]/orders        - Get seller's orders
GET    /api/sellers/[id]/orders/[orderId] - Get order details
POST   /api/sellers/[id]/orders/[orderId]/status - Update order status
GET    /api/sellers/[id]/customers     - Get customer list
GET    /api/sellers/[id]/customers/[customerId] - Get customer details
POST   /api/orders/[id]/refund-request - Request refund (customer)
```

---

## ⚠️ REQUIRED SCHEMA ADDITIONS

### Add to Prisma Schema

```prisma
// 1. Seller & Store
model Seller {
  id String @id @default(cuid())
  userId String @unique
  storeName String
  storeSlug String @unique
  storeDescription String?
  storeColor String @default("#6AA8FF")

  businessName String?
  businessAddress String?
  taxId String?

  logoUrl String?
  bannerUrl String?

  email String
  phone String?
  website String?

  kycStatus String @default("pending") // pending, approved, rejected
  kycDocuments String? // JSON

  bankAccountName String?
  bankAccountNumber String?
  bankIFSC String?
  upiId String?

  status String @default("pending") // pending, approved, suspended, banned
  suspendedUntil DateTime?

  totalRevenue Float @default(0)
  totalOrders Int @default(0)
  averageRating Float @default(0)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  products Product[]
  orders Order[]
  withdrawals WithdrawalRequest[]
  transactions SellerTransaction[]
  violations AccountViolation[]

  @@index([storeSlug])
  @@index([status])
}

// 2. Payment Models
model RazorpayOrder {
  id String @id @default(cuid())
  razorpayOrderId String @unique
  sellerId String
  amount Int // in paise
  currency String @default("INR")
  receipt String?
  status String
  notes String? // JSON
  attempts Int @default(0)
  createdAt DateTime @default(now())
  expiresAt DateTime

  @@index([razorpayOrderId])
  @@index([createdAt])
}

model RazorpayPayment {
  id String @id @default(cuid())
  razorpayPaymentId String @unique
  razorpayOrderId String
  userId String
  amount Int
  currency String
  method String
  status String
  cardId String?
  vpaId String?
  failureCode String?
  failureReason String?
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([status])
}

model WithdrawalRequest {
  id String @id @default(cuid())
  sellerId String
  amount Float
  status String @default("pending") // pending, processing, completed, failed
  bankAccount String?
  upiId String?
  accountHolderName String?
  processingFee Float @default(0)
  failureReason String?
  requestDate DateTime @default(now())
  completedDate DateTime?
  notes String?
  createdAt DateTime @default(now())

  seller Seller @relation(fields: [sellerId], references: [id], onDelete: Cascade)

  @@index([sellerId])
  @@index([status])
}

model SellerTransaction {
  id String @id @default(cuid())
  sellerId String
  type String // order, refund, commission, withdrawal, adjustment
  amount Float
  status String @default("pending")
  transactionId String?
  relatedOrderId String?
  description String?
  metadata String? // JSON
  createdAt DateTime @default(now())

  @@index([sellerId])
  @@index([type])
}

// 3. Moderation Models
model FlaggedContent {
  id String @id @default(cuid())
  contentType String // product_description, product_image, product_title, user_profile, review
  contentId String
  contentOwner String
  contentValue String // Text or image URLs

  violations String[] // array of violation types
  violationDetails String // JSON detailed violations
  confidence Float // 0-1

  flaggedBy String @default("system") // system, user, admin
  flaggedByUserId String?
  userReportReason String?
  flaggedAt DateTime @default(now())

  status String @default("pending") // pending, under_review, approved, rejected
  severity String // low, medium, high, critical

  reviewedBy String?
  reviewedAt DateTime?
  reviewNotes String?
  decision String? // approved, rejected

  actionTaken String? // warning, remove_content, suspend_account, ban_account
  actionDetails String?
  removedAt DateTime?

  appealRequested Boolean @default(false)
  appealReason String?
  appealedAt DateTime?
  appealReviewedBy String?
  appealDecision String? // upheld, overturned

  humanReviewRequired Boolean @default(false)
  escalated Boolean @default(false)
  automationScore Float?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([contentOwner])
  @@index([status])
  @@index([severity])
}

model ModerationAuditLog {
  id String @id @default(cuid())
  action String
  targetId String
  targetType String
  actorType String // system, user, admin
  actorId String?
  oldValue String? // JSON
  newValue String? // JSON
  reason String?
  metadata String? // JSON
  timestamp DateTime @default(now())
  ipAddress String?

  @@index([targetId])
  @@index([timestamp])
}

// 4. Extend Product model
// Add to Product:
// productType String @default("template") // template, course, plan, exclusive_content
// sellerId String (optional, for seller products)
// subscriptionBillingCycle String? // monthly, yearly
// isPublished Boolean @default(false)
// seller Seller? @relation(fields: [sellerId], references: [id])
```

---

## 🚀 Implementation Priority

### Phase 1 (Critical - Week 1)
1. ✅ Add Seller, WithdrawalRequest, SellerTransaction to schema
2. ✅ Add RazorpayOrder, RazorpayPayment models
3. ✅ Add FlaggedContent, ModerationAuditLog models
4. ✅ Extend Product model with seller support
5. ✅ Run `prisma migrate dev` to update database
6. ✅ Create seller management API routes
7. ✅ Create payment API routes (Razorpay integration)

### Phase 2 (Important - Week 2)
1. Implement withdrawal processing
2. Create financial dashboard API
3. Implement moderation API routes
4. Add content scanning endpoints
5. Create admin moderation dashboard backend

### Phase 3 (Enhancement - Week 3)
1. Add subscription management
2. Implement invoice generation
3. Create analytics aggregation jobs
4. Add webhook handlers for Razorpay
5. Implement email notifications

---

## 🔗 Integration Checklist

- [ ] Update Prisma schema with seller models
- [ ] Run database migration
- [ ] Create seller registration endpoint
- [ ] Implement KYC verification flow
- [ ] Create Razorpay order API
- [ ] Implement payment verification
- [ ] Create withdrawal request endpoint
- [ ] Implement moderation flag endpoint
- [ ] Create admin moderation dashboard API
- [ ] Setup Razorpay webhooks
- [ ] Create email service for notifications
- [ ] Implement analytics aggregation
- [ ] Add transaction logging
- [ ] Setup cron jobs for payout processing

---

## 📊 What's Working

✅ **Authentication** - NextAuth.js configured
✅ **File Storage** - Supabase storage setup
✅ **User Management** - Complete
✅ **Social Features** - Friends, groups, posts
✅ **Chat System** - Messaging implemented
✅ **Task Management** - Organizations and tasks
✅ **Basic E-commerce** - Products, brands, basic orders

---

## ⚠️ Critical Missing Pieces

❌ **Seller Ecosystem** - No seller profiles or management
❌ **Payment Processing** - No Razorpay integration
❌ **Content Moderation** - No flagging or enforcement system
❌ **Financial Management** - No earnings tracking or withdrawals
❌ **Order Management** - Only basic order structure

---

## 💡 Recommendations

1. **Immediate**: Add all missing models to Prisma schema
2. **Week 1**: Build seller management and payment API routes
3. **Week 2**: Implement moderation system backend
4. **Week 3**: Setup webhooks and async jobs
5. **Week 4**: Testing and production deployment

---

**Status**: Backend is 40% complete. Requires 3-4 weeks for full implementation of seller platform, payments, and moderation.
