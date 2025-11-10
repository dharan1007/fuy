# Razorpay Payment Integration Setup Guide

Complete setup guide for Razorpay payment gateway integration in the FUY application.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Step 1: Razorpay Account Setup](#step-1-razorpay-account-setup)
3. [Step 2: Get API Keys](#step-2-get-api-keys)
4. [Step 3: Configure Environment Variables](#step-3-configure-environment-variables)
5. [Step 4: Setup Webhook](#step-4-setup-webhook)
6. [Step 5: Test Integration](#step-5-test-integration)
7. [API Endpoints](#api-endpoints)
8. [Webhook Events](#webhook-events)
9. [Local Development Setup](#local-development-setup)
10. [Payment Flow](#payment-flow)

## Prerequisites

- Razorpay Business Account (sign up at https://razorpay.com)
- Node.js and npm installed
- PostgreSQL database configured
- Deployed application or ngrok for local testing

## Step 1: Razorpay Account Setup

1. Go to [Razorpay Dashboard](https://dashboard.razorpay.com)
2. Sign up or log in with your business account
3. Complete KYC verification (required for live payments)
4. Navigate to Settings → General Settings
5. Note your Business Name and Email

## Step 2: Get API Keys

### For Live/Test Credentials:

1. Go to [Razorpay Dashboard](https://dashboard.razorpay.com)
2. Navigate to **Settings** → **API Keys**
3. You'll see both **Test** and **Live** keys
4. Copy:
   - **Key ID** (starts with `rzp_test_` or `rzp_live_`)
   - **Key Secret** (long secret string)

### Test vs Live:

- **Test Keys**: For development and testing (no real charges)
- **Live Keys**: For production (real charges will be made)

## Step 3: Configure Environment Variables

Update your `.env` file with Razorpay credentials:

```env
# --- Razorpay Payment Gateway ---
# Get these from: https://dashboard.razorpay.com/app/settings/api-keys
RAZORPAY_KEY_ID=rzp_test_XXXXXXXXXXXXXXXXXX
RAZORPAY_KEY_SECRET=YOUR_KEY_SECRET_HERE

# Webhook secret for validating Razorpay webhook requests
# Get this from: https://dashboard.razorpay.com/app/settings/webhooks
RAZORPAY_WEBHOOK_SECRET=YOUR_WEBHOOK_SECRET_HERE

# Webhook URL for Razorpay to call
# Production
NEXT_PUBLIC_RAZORPAY_WEBHOOK_URL=https://yourdomain.com/api/payment/webhook

# For local development with ngrok:
# NEXT_PUBLIC_RAZORPAY_WEBHOOK_URL=https://xxxx.ngrok.io/api/payment/webhook
```

## Step 4: Setup Webhook

### In Razorpay Dashboard:

1. Navigate to **Settings** → **Webhooks**
2. Click **Add New Webhook**
3. Enter the following details:

   **Webhook URL:** `https://yourdomain.com/api/payment/webhook`

   **Events to listen to:**
   - `payment.authorized`
   - `payment.captured`
   - `payment.failed`
   - `refund.created`
   - `payment.method_recurring_expire`

4. Click **Create Webhook**
5. Copy the **Webhook Secret** and add to `.env` as `RAZORPAY_WEBHOOK_SECRET`

### Webhook Details:

- **Endpoint:** `POST /api/payment/webhook`
- **Header:** `x-razorpay-signature` contains the HMAC SHA256 signature
- **Payload:** JSON with event details and payment/refund entity

## Step 5: Test Integration

### Using Test Credentials:

Razorpay provides test cards for different scenarios:

**Success Cards:**
- Card: `4111 1111 1111 1111`
- Expiry: Any future date (e.g., 12/25)
- CVV: Any 3 digits (e.g., 123)

**Failed Payment Cards:**
- Card: `4222 2222 2222 2222`
- Expiry: Any future date
- CVV: Any 3 digits

### Test Flow:

1. Create an order: `POST /api/payment/create-order`
2. Open Razorpay checkout (from frontend)
3. Enter test card details
4. Complete payment
5. Verify webhook is received (check webhook logs in dashboard)
6. Check payment status: `GET /api/payment/status?orderId=xxx`

## API Endpoints

### 1. Create Order

**Endpoint:** `POST /api/payment/create-order`

**Authentication:** Required (NextAuth session)

**Request Body:**
```json
{
  "amount": 100,
  "description": "Product purchase",
  "receiptId": "receipt_123",
  "notes": {
    "custom_key": "custom_value"
  }
}
```

**Response:**
```json
{
  "orderId": "order_1234567890",
  "amount": 100,
  "currency": "INR",
  "key": "rzp_test_XXXXXXXXX",
  "paymentId": "internal_db_id",
  "timestamp": "2024-11-10T10:00:00Z"
}
```

### 2. Verify Payment

**Endpoint:** `POST /api/payment/verify-payment`

**Authentication:** Required (NextAuth session)

**Request Body:**
```json
{
  "orderId": "order_1234567890",
  "paymentId": "pay_1234567890",
  "signature": "HMAC_SHA256_SIGNATURE"
}
```

**Response:**
```json
{
  "success": true,
  "payment": {
    "id": "internal_db_id",
    "orderId": "order_1234567890",
    "paymentId": "pay_1234567890",
    "amount": 100,
    "status": "CAPTURED",
    "paymentMethod": "card"
  }
}
```

### 3. Check Payment Status

**Endpoint:** `GET /api/payment/status?orderId=xxx` or `?paymentId=xxx`

**Authentication:** Required (NextAuth session)

**Response:**
```json
{
  "payment": {
    "id": "internal_db_id",
    "orderId": "order_1234567890",
    "paymentId": "pay_1234567890",
    "amount": 100,
    "currency": "INR",
    "status": "CAPTURED",
    "paymentMethod": "card",
    "description": "Product purchase",
    "failureReason": null,
    "createdAt": "2024-11-10T10:00:00Z",
    "updatedAt": "2024-11-10T10:01:00Z"
  },
  "webhookLogs": [
    {
      "id": "log_id",
      "eventType": "payment.authorized",
      "status": "PROCESSED",
      "signatureValid": true,
      "createdAt": "2024-11-10T10:00:30Z"
    }
  ]
}
```

### 4. Webhook Handler

**Endpoint:** `POST /api/payment/webhook`

**Authentication:** None (but signature verified)

**Header:** `x-razorpay-signature: HMAC_SIGNATURE`

**Automatic Event Processing:**
- `payment.authorized` → Updates status to AUTHORIZED
- `payment.captured` → Updates status to CAPTURED (main success event)
- `payment.failed` → Updates status to FAILED with reason
- `refund.created` → Updates status to REFUNDED with refund details

## Webhook Events

### 1. Payment Authorized

Triggered when payment is authorized but not yet captured.

```json
{
  "event": "payment.authorized",
  "id": "event_id",
  "entity": {
    "id": "pay_1234567890",
    "order_id": "order_1234567890",
    "amount": 10000,
    "method": "card",
    "status": "authorized"
  }
}
```

### 2. Payment Captured

Triggered when payment is successfully captured. **Most important event - implement business logic here.**

```json
{
  "event": "payment.captured",
  "id": "event_id",
  "entity": {
    "id": "pay_1234567890",
    "order_id": "order_1234567890",
    "amount": 10000,
    "method": "card",
    "status": "captured",
    "receipt": "receipt_123"
  }
}
```

### 3. Payment Failed

Triggered when payment fails.

```json
{
  "event": "payment.failed",
  "id": "event_id",
  "entity": {
    "id": "pay_1234567890",
    "order_id": "order_1234567890",
    "amount": 10000,
    "error_code": "BAD_REQUEST_ERROR",
    "error_description": "Card declined by bank"
  }
}
```

### 4. Refund Created

Triggered when a refund is initiated.

```json
{
  "event": "refund.created",
  "id": "event_id",
  "entity": {
    "id": "rfnd_1234567890",
    "payment_id": "pay_1234567890",
    "amount": 10000,
    "status": "processed"
  }
}
```

## Local Development Setup

### Using ngrok for Webhook Testing:

1. **Install ngrok:**
   ```bash
   npm install -g ngrok
   ```

2. **Start ngrok tunnel:**
   ```bash
   ngrok http 3000
   ```
   This gives you a public URL like: `https://xxxx.ngrok.io`

3. **Update .env:**
   ```env
   NEXT_PUBLIC_RAZORPAY_WEBHOOK_URL=https://xxxx.ngrok.io/api/payment/webhook
   ```

4. **Add webhook in Razorpay Dashboard:**
   - URL: `https://xxxx.ngrok.io/api/payment/webhook`
   - Events: payment.captured, payment.failed, refund.created
   - Secret: Copy from webhook creation form

5. **Test webhook delivery:**
   - Go to Razorpay Dashboard → Settings → Webhooks
   - Find your webhook and click "Test Delivery"
   - Check your application logs to see the webhook

## Payment Flow

### Frontend Implementation (React):

```typescript
// 1. Create order
const response = await fetch('/api/payment/create-order', {
  method: 'POST',
  body: JSON.stringify({
    amount: 100,
    description: 'Product purchase'
  })
});

const { orderId, key, paymentId } = await response.json();

// 2. Initialize Razorpay checkout
const options = {
  key: key,
  amount: 100 * 100, // in paise
  order_id: orderId,
  handler: async (response) => {
    // 3. Verify payment on backend
    const verifyResponse = await fetch('/api/payment/verify-payment', {
      method: 'POST',
      body: JSON.stringify({
        orderId: orderId,
        paymentId: response.razorpay_payment_id,
        signature: response.razorpay_signature
      })
    });

    const result = await verifyResponse.json();
    if (result.success) {
      // Payment successful
      console.log('Payment successful');
    }
  }
};

const rzp = new (window as any).Razorpay(options);
rzp.open();
```

### Database Schema:

**Payment Record:**
- `id`: Internal payment ID
- `userId`: User making payment
- `orderId`: Razorpay order ID
- `paymentId`: Razorpay payment ID
- `amount`: Amount in rupees
- `status`: CREATED | AUTHORIZED | CAPTURED | FAILED | REFUNDED
- `webhookLogs`: Associated webhook events

**WebhookLog Record:**
- `id`: Log ID
- `paymentId`: Associated payment
- `razorpayEventId`: Razorpay event ID (for idempotency)
- `eventType`: Event type
- `status`: PENDING | PROCESSED | FAILED
- `retryCount`: Number of retry attempts

## Security Considerations

1. **Always verify webhook signatures** - Implemented in webhook handler
2. **Store credentials securely** - Use environment variables only
3. **Use HTTPS** - Required for webhook callbacks
4. **Implement idempotency** - Webhook handler uses razorpayEventId as unique constraint
5. **Rate limiting** - Consider adding rate limits to payment endpoints
6. **Audit logging** - All webhook events are logged to database

## Troubleshooting

### Webhook not being received:

1. Check webhook URL in Razorpay Dashboard
2. Ensure ngrok tunnel is running (for local development)
3. Check webhook logs in Razorpay Dashboard
4. Verify signature secret is correct

### Payment verification failing:

1. Check that orderId and paymentId are correct
2. Verify signature is being sent correctly from frontend
3. Ensure RAZORPAY_KEY_SECRET is correct in .env

### Database errors:

1. Run database migrations: `npm run prisma:migrate`
2. Check DATABASE_URL is correct
3. Verify Payment and WebhookLog tables exist

## Support

- Razorpay Docs: https://razorpay.com/docs/
- Razorpay API Reference: https://razorpay.com/docs/api/orders/
- Webhook Events: https://razorpay.com/docs/webhooks/
- Test Cards: https://razorpay.com/docs/payments/test-cards/

## Next Steps

1. Replace test credentials with live credentials when ready
2. Implement business logic in webhook handlers (send emails, update orders, etc.)
3. Add frontend integration for payment UI
4. Test complete payment flow
5. Monitor webhook delivery and payment status
6. Implement payment retry logic for failed payments
