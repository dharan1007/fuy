# Backend Implementation Plan - Detailed

This document provides step-by-step instructions for implementing the missing backend components for the seller platform, payment system, and content moderation.

## 📦 Step 1: Update Prisma Schema (CRITICAL)

### File: `prisma/schema.prisma`

Add the following models to the end of the schema (before the closing):

```prisma
// ========================
// SELLER ECOSYSTEM
// ========================

model Seller {
  id                    String   @id @default(cuid())
  userId                String   @unique
  storeName             String
  storeSlug             String   @unique
  storeDescription      String?
  storeColor            String   @default("#6AA8FF")

  // Business info
  businessName          String?
  businessAddress       String?
  taxId                 String?

  // Media
  logoUrl               String?
  bannerUrl             String?

  // Contact
  email                 String
  phone                 String?
  website               String?

  // KYC & Verification
  kycStatus             String   @default("pending")  // pending, approved, rejected, suspended
  kycDocuments          String?  // JSON: { idType, idNumber, uploadedAt }

  // Bank Details
  bankAccountName       String?
  bankAccountNumber     String?
  bankIFSC              String?
  upiId                 String?

  // Status & Suspension
  status                String   @default("approved")  // pending, approved, suspended, banned
  suspendedUntil        DateTime?
  suspensionReason      String?

  // Analytics
  totalRevenue          Float    @default(0)
  totalOrders           Int      @default(0)
  totalCustomers        Int      @default(0)
  averageRating         Float    @default(0)

  // Timestamps
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  // Relations
  user                  User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  products              Product[]
  orders                Order[]
  withdrawals           WithdrawalRequest[]
  transactions          SellerTransaction[]
  violations            AccountViolation[]

  @@index([userId])
  @@index([storeSlug])
  @@index([status])
}

model Commission {
  id                        String   @id @default(cuid())
  sellerId                  String
  productType               String   // template, course, plan, exclusive_content
  platformCommissionPercent Float   @default(10)   // 10% default
  paymentProcessingPercent  Float   @default(2)    // 2% processing fee
  minWithdrawal             Float   @default(100)  // ₹100 minimum
  maxWithdrawal             Float   @default(100000) // ₹100,000 maximum per request

  createdAt                 DateTime @default(now())
  updatedAt                 DateTime @updatedAt

  @@unique([sellerId, productType])
  @@index([sellerId])
}

model WithdrawalRequest {
  id                    String   @id @default(cuid())
  sellerId              String
  amount                Float
  status                String   @default("pending")  // pending, processing, completed, failed

  // Payout details
  bankAccount           String?
  upiId                 String?
  accountHolderName     String?
  processingFee         Float   @default(0)  // 2% of amount
  actualAmount          Float?  // amount - processingFee

  // Processing info
  failureReason         String?
  requestDate           DateTime @default(now())
  processedDate         DateTime?
  completedDate         DateTime?
  notes                 String?

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  seller                Seller @relation(fields: [sellerId], references: [id], onDelete: Cascade)

  @@index([sellerId])
  @@index([status])
  @@index([requestDate])
}

model SellerTransaction {
  id                    String   @id @default(cuid())
  sellerId              String
  type                  String   // order, commission, refund, withdrawal, adjustment, bonus
  amount                Float
  status                String   @default("completed")  // pending, completed, failed

  // Reference info
  transactionId         String?  // Razorpay payment/order ID
  relatedOrderId        String?  // Link to Order
  relatedProductId      String?  // Link to Product

  // Details
  description           String?
  metadata              String?  // JSON for extra info

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  @@index([sellerId])
  @@index([type])
  @@index([status])
  @@index([createdAt])
}

// ========================
// PAYMENT SYSTEM (RAZORPAY)
// ========================

model RazorpayOrder {
  id                    String   @id @default(cuid())
  razorpayOrderId       String   @unique
  userId                String
  sellerId              String
  productId             String

  // Order details
  amount                Int      // in paise (₹100 = 10000 paise)
  currency              String   @default("INR")
  receipt               String?
  status                String   // created, paid, expired

  // Metadata
  notes                 String?  // JSON with product info
  attempts              Int      @default(0)

  // Timestamps
  createdAt             DateTime @default(now())
  expiresAt             DateTime // Usually 12 minutes from creation

  user                  User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([razorpayOrderId])
  @@index([userId])
  @@index([status])
}

model RazorpayPayment {
  id                    String   @id @default(cuid())
  razorpayPaymentId     String   @unique
  razorpayOrderId       String

  // Payer
  userId                String
  email                 String
  contact               String?

  // Payment details
  amount                Int      // in paise
  currency              String   @default("INR")
  method                String   // card, upi, netbanking, wallet, emandate, cardless_emi
  status                String   // captured, authorized, failed, refunded

  // Card details (if card payment)
  cardId                String?
  cardNetwork           String?
  cardType              String?
  cardLast4             String?

  // UPI details (if UPI payment)
  vpaId                 String?

  // Error info
  failureCode           String?
  failureReason         String?
  acquirerData          String?  // JSON

  // Verification
  signatureVerified     Boolean  @default(false)

  // Timestamps
  createdAt             DateTime @default(now())
  capturedAt            DateTime?

  user                  User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([razorpayPaymentId])
  @@index([userId])
  @@index([status])
}

model Subscription {
  id                    String   @id @default(cuid())
  razorpaySubscriptionId String  @unique
  userId                String
  planId                String

  // Subscription details
  productId             String
  status                String   // active, paused, cancelled, completed, expired
  quantity              Int      @default(1)

  // Billing info
  currentPeriodStart    DateTime
  currentPeriodEnd      DateTime
  nextBillingDate       DateTime
  totalCount            Int?     // Total number of billings
  paidCount             Int      @default(0)

  // Cancellation
  cancelledAt           DateTime?
  cancelReason          String?

  // Metadata
  metadata              String?  // JSON

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  user                  User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([status])
}

model Invoice {
  id                    String   @id @default(cuid())
  invoiceNumber         String   @unique
  orderId               String
  userId                String
  sellerId              String

  // Amount details
  subtotal              Float
  taxAmount             Float
  taxPercent            Float    @default(18)  // GST 18%
  shippingCharges       Float    @default(0)
  discount              Float    @default(0)
  totalAmount           Float

  // Status
  status                String   @default("issued")  // issued, paid, overdue, cancelled

  // Dates
  invoiceDate           DateTime @default(now())
  dueDate               DateTime
  paidDate              DateTime?

  // Details
  billingAddress        String?  // JSON
  shippingAddress       String?  // JSON
  notes                 String?

  // PDF
  pdfUrl                String?

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  @@index([invoiceNumber])
  @@index([userId])
  @@index([status])
}

model RefundRequest {
  id                    String   @id @default(cuid())
  orderId               String
  userId                String
  sellerId              String

  // Refund details
  reason                String
  amount                Float
  refundAmount          Float?   // Amount actually refunded
  refundMethod          String   // original_payment, wallet, bank_transfer

  // Status
  status                String   @default("pending")  // pending, approved, rejected, processed, failed

  // Review
  requestedAt           DateTime @default(now())
  reviewedBy            String?  // Admin who reviewed
  reviewedAt            DateTime?
  rejectionReason       String?

  // Processing
  processedAt           DateTime?
  razorpayRefundId      String?

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  @@index([orderId])
  @@index([userId])
  @@index([status])
}

// ========================
// CONTENT MODERATION
// ========================

model ViolationKeyword {
  id                    String   @id @default(cuid())
  keyword               String
  category              String   // drug_related, weapons_or_violence, human_trafficking, adult_content, etc
  severity              String   // low, medium, high, critical

  // Matching options
  regex                 String?  // Regex pattern for advanced matching
  exactMatch            Boolean  @default(true)
  caseSensitive         Boolean  @default(false)

  // Language
  language              String   @default("en")  // en, hi, multi

  // Metadata
  addedAt               DateTime @default(now())
  addedBy               String   // Admin ID
  updatedAt             DateTime @updatedAt

  @@unique([keyword, language, category])
  @@index([category])
  @@index([language])
}

model FlaggedContent {
  id                    String   @id @default(cuid())

  // Content details
  contentType           String   // product_description, product_image, product_title, user_profile, review, etc
  contentId             String
  contentOwner          String   // User/Seller ID who owns the content
  contentValue          String   // Text content or image URLs (comma separated)
  contentPreview        String?  // Preview for admin dashboard

  // Violations
  violations            String   // JSON array of violation types
  violationDetails      String   // JSON: [{ type, matchedKeywords, confidence, explanation }]
  confidence            Float    // 0-1 confidence score

  // Flagging source
  flaggedBy             String   @default("system")  // system, user, admin
  flaggedByUserId       String?  // If user reported
  userReportReason      String?
  flaggedAt             DateTime @default(now())

  // Status
  status                String   @default("pending")  // pending, under_review, approved, rejected
  severity              String   // low, medium, high, critical
  humanReviewRequired   Boolean  @default(false)
  escalated             Boolean  @default(false)
  automationScore       Float?   // ML confidence score

  // Review
  reviewedBy            String?  // Admin ID
  reviewedAt            DateTime?
  reviewNotes           String?
  decision              String?  // approved, rejected

  // Action taken
  actionTaken           String?  // warning, remove_content, suspend_account, ban_account, none
  actionDetails         String?  // JSON with action details
  removedAt             DateTime?

  // Appeal
  appealRequested       Boolean  @default(false)
  appealReason          String?
  appealedAt            DateTime?
  appealReviewedBy      String?
  appealDecision        String?  // upheld, overturned

  // Metadata
  relatedFlags          String?  // JSON: related flag IDs

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  @@index([contentOwner])
  @@index([status])
  @@index([severity])
  @@index([createdAt])
}

model AccountViolation {
  id                    String   @id @default(cuid())
  userId                String   // User/Seller who violated
  violationType         String   // drug_related, weapons, hate_speech, etc
  contentId             String?  // FlaggedContent ID

  // Violation details
  description           String
  severity              String   // warning, suspension, ban
  timeframe             Int      @default(0)  // Days (0 = permanent)

  // Action
  action                String   // warning, remove_content, suspend_account, ban_account
  actionAppliedAt       DateTime @default(now())
  removalDate           DateTime?  // When suspension/ban expires

  // Appeal
  canAppeal             Boolean  @default(true)
  appealDeadline        DateTime?
  appealSubmitted       Boolean  @default(false)
  appealReason          String?
  appealReviewedAt      DateTime?
  appealOutcome         String?  // upheld, overturned

  // Metadata
  appliedBy             String   // Admin ID
  reason                String

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  user                  User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([severity])
  @@index([createdAt])
}

model ModerationAuditLog {
  id                    String   @id @default(cuid())

  // Action
  action                String   // content_flagged, appeal_submitted, action_taken, etc
  targetId              String   // Flagged content or violation ID
  targetType            String   // flag, violation, appeal, etc

  // Actor
  actorType             String   // system, user, admin
  actorId               String?  // User/Admin ID

  // Changes
  oldValue              String?  // JSON
  newValue              String?  // JSON
  reason                String?
  metadata              String?  // JSON extra info

  // Security
  ipAddress             String?
  timestamp             DateTime @default(now())

  createdAt             DateTime @default(now())

  @@index([targetId])
  @@index([timestamp])
  @@index([actorType])
}

model ModerationRule {
  id                    String   @id @default(cuid())
  name                  String
  description           String?
  enabled               Boolean  @default(true)

  // Rule configuration
  ruleType              String   // keyword, pattern, image, link, custom
  triggerCondition      String   // Logic for triggering

  // Action
  action                String   // warning, remove_content, suspend_account, ban_account
  autoExecute           Boolean  @default(false)  // Execute without review
  requiresHumanReview   Boolean  @default(true)

  // Scope
  appliesTo             String   // JSON: [content types]
  appliesGlobally       Boolean  @default(true)
  specificProductTypes  String?  // JSON: [product types]

  // Severity
  severityLevel         String   // low, medium, high, critical
  appealable            Boolean  @default(true)

  // Metadata
  priority              Int      @default(0)  // Higher = higher priority
  createdBy             String   // Admin ID
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  @@index([enabled])
  @@index([priority])
}
```

### After adding to schema.prisma:

```bash
# Generate Prisma client
npx prisma generate

# Create migration
npx prisma migrate dev --name "add-seller-payment-moderation-models"

# Update database
npx prisma db push
```

---

## 📝 Step 2: Create API Routes

### Create seller management routes:

**File**: `src/app/api/sellers/register/route.ts`

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Check if already a seller
    const existingSeller = await prisma.seller.findUnique({
      where: { userId: user.id },
    });

    if (existingSeller) {
      return NextResponse.json(
        { error: "User is already a seller" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { storeName, storeSlug, email, phone, businessName, businessAddress } = body;

    if (!storeName || !storeSlug) {
      return NextResponse.json(
        { error: "storeName and storeSlug are required" },
        { status: 400 }
      );
    }

    // Check slug availability
    const existingSlug = await prisma.seller.findUnique({
      where: { storeSlug },
    });

    if (existingSlug) {
      return NextResponse.json(
        { error: "Store slug is already taken" },
        { status: 400 }
      );
    }

    // Create seller profile
    const seller = await prisma.seller.create({
      data: {
        userId: user.id,
        storeName,
        storeSlug: storeSlug.toLowerCase(),
        email: email || user.email || "",
        phone: phone || null,
        businessName: businessName || null,
        businessAddress: businessAddress || null,
        status: "pending",
      },
    });

    // Create default commission rates
    const productTypes = ["template", "course", "plan", "exclusive_content"];
    await Promise.all(
      productTypes.map((type) =>
        prisma.commission.create({
          data: {
            sellerId: seller.id,
            productType: type,
          },
        })
      )
    );

    return NextResponse.json({ seller }, { status: 201 });
  } catch (error: any) {
    console.error("Seller registration error:", error);
    return NextResponse.json(
      { error: "Failed to register seller" },
      { status: 500 }
    );
  }
}
```

**File**: `src/app/api/sellers/[id]/route.ts`

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const seller = await prisma.seller.findUnique({
      where: { id: params.id },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    if (!seller) {
      return NextResponse.json({ error: "Seller not found" }, { status: 404 });
    }

    return NextResponse.json({ seller });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to fetch seller" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser();
    if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Verify ownership
    const seller = await prisma.seller.findUnique({
      where: { id: params.id },
    });

    if (!seller || seller.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { storeName, storeDescription, storeColor, logoUrl, bannerUrl, phone, businessName } = body;

    const updated = await prisma.seller.update({
      where: { id: params.id },
      data: {
        ...(storeName && { storeName }),
        ...(storeDescription && { storeDescription }),
        ...(storeColor && { storeColor }),
        ...(logoUrl && { logoUrl }),
        ...(bannerUrl && { bannerUrl }),
        ...(phone && { phone }),
        ...(businessName && { businessName }),
      },
    });

    return NextResponse.json({ seller: updated });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to update seller" },
      { status: 500 }
    );
  }
}
```

### Continue with similar route files for:
- `src/app/api/sellers/[id]/analytics/route.ts`
- `src/app/api/sellers/[id]/earnings/route.ts`
- `src/app/api/sellers/[id]/withdrawals/route.ts`
- `src/app/api/payments/orders/route.ts`
- `src/app/api/payments/verify/route.ts`
- `src/app/api/moderation/flag-content/route.ts`
- `src/app/api/moderation/queue/route.ts`

---

## 🚀 Step 3: Setup Environment Variables

Update `.env`:

```env
# Razorpay
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_xxxxx
RAZORPAY_KEY_SECRET=xxxxx
RAZORPAY_WEBHOOK_SECRET=xxxxx

# Email (for notifications)
RESEND_API_KEY=re_xxxxx
EMAIL_FROM="FUY <noreply@fuymedia.org>"

# Supabase (for file uploads)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE=xxxxx
SUPABASE_PROFILE_BUCKET=profiles
SUPABASE_PRODUCT_BUCKET=products
SUPABASE_MODERATION_BUCKET=moderation
```

---

## 📋 Implementation Checklist

### Phase 1: Database & Schema
- [ ] Add all new models to Prisma schema
- [ ] Run `npx prisma migrate dev`
- [ ] Verify database updated successfully

### Phase 2: Seller Management APIs
- [ ] Create seller registration endpoint
- [ ] Create seller profile GET/PUT endpoints
- [ ] Create KYC verification endpoint
- [ ] Create slug availability check
- [ ] Create public store profile endpoint
- [ ] Create seller analytics endpoint

### Phase 3: Payment APIs
- [ ] Create Razorpay order creation
- [ ] Create payment verification
- [ ] Create refund endpoint
- [ ] Create subscription management
- [ ] Create invoice generation
- [ ] Setup Razorpay webhooks

### Phase 4: Moderation APIs
- [ ] Create content flagging endpoint
- [ ] Create moderation queue endpoint
- [ ] Create approve/reject endpoints
- [ ] Create appeal submission endpoint
- [ ] Create audit logging

### Phase 5: Financial Management
- [ ] Create earnings summary endpoint
- [ ] Create transaction history endpoint
- [ ] Create withdrawal request endpoint
- [ ] Create payout processing job
- [ ] Create commission calculation

### Phase 6: Testing & Deployment
- [ ] Test all endpoints with Postman/Insomnia
- [ ] Setup error handling & logging
- [ ] Configure webhooks on Razorpay
- [ ] Setup monitoring & alerts
- [ ] Deploy to production

---

## ⏰ Estimated Timeline

- **Phase 1-2**: 3-4 days (Schema & seller APIs)
- **Phase 3**: 3-4 days (Payment integration)
- **Phase 4**: 2-3 days (Moderation)
- **Phase 5**: 2-3 days (Financial)
- **Phase 6**: 2-3 days (Testing & deployment)

**Total**: 2-3 weeks for complete implementation

---

## 📚 Additional Resources

- [Prisma Schema Documentation](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)
- [Razorpay API Documentation](https://razorpay.com/docs/api/)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Supabase File Storage](https://supabase.com/docs/guides/storage)

