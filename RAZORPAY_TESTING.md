# Razorpay Payment Integration - Testing Guide

Complete testing guide for Razorpay webhook and payment flow implementation.

## Quick Test Checklist

- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Create order endpoint works
- [ ] Payment verification works
- [ ] Webhook endpoint accessible
- [ ] Webhook events processed
- [ ] Payment status endpoint works
- [ ] Idempotency working (no duplicate processing)

## API Testing with cURL

### 1. Create Order

```bash
curl -X POST http://localhost:3000/api/payment/create-order \
  -H "Content-Type: application/json" \
  -b "your_session_cookie" \
  -d '{
    "amount": 100,
    "description": "Test payment",
    "receiptId": "test_receipt_123"
  }'
```

Expected Response:
```json
{
  "orderId": "order_1234567890",
  "amount": 100,
  "currency": "INR",
  "key": "rzp_test_XXXXXXXXX",
  "paymentId": "internal_id",
  "timestamp": "2024-11-10T10:00:00Z"
}
```

### 2. Verify Payment

```bash
curl -X POST http://localhost:3000/api/payment/verify-payment \
  -H "Content-Type: application/json" \
  -b "your_session_cookie" \
  -d '{
    "orderId": "order_1234567890",
    "paymentId": "pay_1234567890",
    "signature": "signature_from_razorpay"
  }'
```

### 3. Check Payment Status

```bash
curl -X GET "http://localhost:3000/api/payment/status?orderId=order_1234567890" \
  -H "Content-Type: application/json" \
  -b "your_session_cookie"
```

### 4. Test Webhook

```bash
# Generate signature for testing
SECRET="your_webhook_secret"
BODY='{"event":"payment.captured","id":"evt_test","entity":{"id":"pay_test","order_id":"order_test"}}'

# On macOS/Linux
SIGNATURE=$(echo -n "$BODY" | openssl dgst -sha256 -hmac "$SECRET" -hex | cut -d' ' -f2)

# Test webhook
curl -X POST http://localhost:3000/api/payment/webhook \
  -H "Content-Type: application/json" \
  -H "x-razorpay-signature: $SIGNATURE" \
  -d "$BODY"
```

## Frontend Testing

### React Component Example

```typescript
import { usePayment } from "@/hooks/usePayment";
import { useEffect, useState } from "react";

export function PaymentTest() {
  const { createOrder, verifyPayment, getStatus, loading, error } = usePayment();
  const [orderId, setOrderId] = useState<string>("");

  const handleCreateOrder = async () => {
    const result = await createOrder({
      amount: 100,
      description: "Test Payment",
    });

    if (result) {
      setOrderId(result.orderId);
      console.log("Order created:", result);

      // Initialize Razorpay checkout
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => {
        const Razorpay = (window as any).Razorpay;
        const rzp = new Razorpay({
          key: result.key,
          amount: result.amount * 100,
          order_id: result.orderId,
          handler: async (response: any) => {
            // Verify payment
            const verified = await verifyPayment({
              orderId: result.orderId,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            });

            if (verified) {
              console.log("Payment verified!");
              // Check status
              const status = await getStatus(result.orderId);
              console.log("Payment status:", status);
            }
          },
        });
        rzp.open();
      };
      document.body.appendChild(script);
    }
  };

  return (
    <div>
      <button onClick={handleCreateOrder} disabled={loading}>
        {loading ? "Processing..." : "Create Order & Pay"}
      </button>
      {error && <p style={{ color: "red" }}>{error}</p>}
      {orderId && <p>Order ID: {orderId}</p>}
    </div>
  );
}
```

## Webhook Testing with ngrok

### Step 1: Start ngrok

```bash
ngrok http 3000
```

Output:
```
Forwarding   https://xxxx.ngrok.io -> http://localhost:3000
```

### Step 2: Update Webhook URL

In your `.env`:
```env
NEXT_PUBLIC_RAZORPAY_WEBHOOK_URL=https://xxxx.ngrok.io/api/payment/webhook
```

### Step 3: Add Webhook in Razorpay Dashboard

1. Go to Settings → Webhooks
2. Add New Webhook
3. URL: `https://xxxx.ngrok.io/api/payment/webhook`
4. Events:
   - payment.authorized
   - payment.captured
   - payment.failed
   - refund.created
5. Copy the Webhook Secret to `.env` as `RAZORPAY_WEBHOOK_SECRET`

### Step 4: Test Webhook Delivery

In Razorpay Dashboard:
1. Find your webhook
2. Click "Test Delivery"
3. Check application logs

## Test Cards

### Successful Payment

- Card: `4111 1111 1111 1111`
- Name: Any name
- Email: Any email
- Expiry: Any future date (MM/YY)
- CVV: Any 3 digits

### Failed Payment

- Card: `4222 2222 2222 2222`
- Expiry: Any future date
- CVV: Any 3 digits

### 3D Secure Test

- Card: `4012 8888 8888 1881`
- OTP: 000000 (when prompted)

## Database Verification

### Check Payment Record

```sql
SELECT * FROM "Payment" WHERE "orderId" = 'order_test_id';
```

### Check Webhook Logs

```sql
SELECT * FROM "WebhookLog" WHERE "eventType" = 'payment.captured' ORDER BY "createdAt" DESC;
```

### Verify Idempotency

```sql
-- Should only have one record per webhook event
SELECT "razorpayEventId", COUNT(*) as count FROM "WebhookLog" GROUP BY "razorpayEventId" HAVING COUNT(*) > 1;
```

## Test Scenarios

### Scenario 1: Complete Payment Flow

1. ✅ Create order (POST /api/payment/create-order)
2. ✅ User pays with test card
3. ✅ Receive payment.authorized webhook
4. ✅ Receive payment.captured webhook
5. ✅ Verify payment (POST /api/payment/verify-payment)
6. ✅ Check status (GET /api/payment/status)

**Expected Result:** Payment status = CAPTURED

### Scenario 2: Failed Payment

1. ✅ Create order
2. ✅ User uses failed payment card (4222...)
3. ✅ Receive payment.failed webhook
4. ✅ Check status

**Expected Result:** Payment status = FAILED, failureReason populated

### Scenario 3: Refund

1. ✅ Capture payment successfully
2. ✅ Process refund in Razorpay Dashboard
3. ✅ Receive refund.created webhook
4. ✅ Check status

**Expected Result:** Payment status = REFUNDED, refundData populated

### Scenario 4: Webhook Idempotency

1. ✅ Receive webhook event
2. ✅ Webhook processed successfully
3. ✅ Re-deliver same webhook (test delivery in dashboard)

**Expected Result:** Event processed only once, no duplicate processing

## Performance Testing

### Load Testing Webhook

```bash
# Install artillery
npm install -g artillery

# Create load test file: webhook-test.yml
```

```yaml
config:
  target: "http://localhost:3000"
  phases:
    - duration: 60
      arrivalRate: 10

scenarios:
  - name: "Webhook Stress Test"
    flow:
      - post:
          url: "/api/payment/webhook"
          headers:
            x-razorpay-signature: "test_signature"
          json:
            event: "payment.captured"
            id: "{{ $randomNumber(1, 1000000) }}"
            entity:
              id: "pay_{{ $randomNumber(1, 1000000) }}"
              order_id: "order_{{ $randomNumber(1, 1000000) }}"
```

```bash
artillery run webhook-test.yml
```

## Debugging

### Enable Logging

Add debug logs in webhook handler:

```typescript
console.log(`[Webhook] Received: ${event}`);
console.log(`[Webhook] Payload:`, JSON.stringify(payload, null, 2));
```

### Check Application Logs

```bash
# Monitor logs while testing
tail -f your_app_logs.txt | grep "\[Webhook\]"
```

### Database Query Logs

```sql
-- Check recent payment records
SELECT * FROM "Payment" ORDER BY "createdAt" DESC LIMIT 10;

-- Check webhook processing
SELECT * FROM "WebhookLog" ORDER BY "createdAt" DESC LIMIT 10;
```

## Common Issues & Solutions

### Issue: Webhook not being received

**Solutions:**
1. Verify webhook URL is correct in Razorpay Dashboard
2. Check ngrok tunnel is still active
3. Test webhook delivery in Razorpay Dashboard
4. Check application error logs
5. Verify firewall allows incoming connections

### Issue: Signature verification failing

**Solutions:**
1. Verify `RAZORPAY_WEBHOOK_SECRET` matches dashboard
2. Ensure webhook body is not modified before verification
3. Check signature calculation using same algorithm (HMAC SHA256)
4. Log both expected and actual signatures for debugging

### Issue: Duplicate webhook processing

**Solutions:**
1. Verify unique constraint on `razorpayEventId`
2. Check database for duplicate webhook logs
3. Ensure transaction isolation level is correct
4. Add explicit `UNIQUE` constraint if missing

### Issue: Payment not updating in database

**Solutions:**
1. Verify database connection
2. Check user ID exists in database
3. Verify foreign key constraints
4. Check transaction logs

## Integration Checklist

- [ ] All API endpoints created
- [ ] Database schema updated
- [ ] Migrations applied
- [ ] Environment variables configured
- [ ] Razorpay account created
- [ ] API keys obtained
- [ ] Webhook configured in Razorpay Dashboard
- [ ] Webhook URL accessible (ngrok/deployed)
- [ ] Test payment successful
- [ ] Webhook received and processed
- [ ] Payment status correctly updated
- [ ] Idempotency working
- [ ] Frontend integration complete
- [ ] Error handling implemented
- [ ] Logging configured
- [ ] Security review completed

## Support & Resources

- Razorpay API Docs: https://razorpay.com/docs/
- Webhooks Guide: https://razorpay.com/docs/webhooks/
- Test Cards: https://razorpay.com/docs/payments/test-cards/
- Signature Verification: https://razorpay.com/docs/webhooks/payloads/
- Error Codes: https://razorpay.com/docs/payments/payments/error-codes/

## Success Criteria

✅ All API endpoints return correct responses
✅ Database records created for payments and webhooks
✅ Webhook signature verified successfully
✅ Events processed without errors
✅ Idempotency ensures single processing per event
✅ Payment status updated correctly
✅ No data loss or corruption
✅ Proper error handling and logging
✅ Security measures implemented
