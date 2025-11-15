# Test Credentials & Development Testing Guide

## Overview

The FUY application includes a comprehensive test credentials system for development and testing. These test accounts:

- ✅ Do not persist to the database
- ✅ Can access all application features
- ✅ Are only available in development/staging environments
- ✅ Are ideal for Razorpay payment integration testing
- ✅ Support quick feature validation without creating DB records

---

## Available Test Users

### 1. Basic Test User
```
Email: test@fuy.local
Password: Test@123456
ID: test-user-001
Role: USER
Description: Basic test user with full feature access
```

### 2. Premium Test User (Recommended for Payment Testing)
```
Email: premium@fuy.local
Password: Premium@123456
ID: test-user-002
Role: USER
Description: Premium test user for Razorpay payment testing
```

### 3. Admin Test User
```
Email: admin@fuy.local
Password: Admin@123456
ID: test-admin-001
Role: ADMIN
Description: Admin test user with elevated privileges
```

### 4. Razorpay Payment Test User
```
Email: razorpay-test@fuy.local
Password: Razorpay@123456
ID: test-razorpay-001
Role: USER
Description: Dedicated user for Razorpay integration testing
```

### 5. Features Test User
```
Email: features@fuy.local
Password: Features@123456
ID: test-features-001
Role: USER
Description: Test user for accessing all application features
```

---

## API Endpoints

### 1. Get Test Credentials List
```bash
GET /api/test/credentials
```

**Response:**
```json
{
  "success": true,
  "message": "Test credentials for development and testing",
  "environment": "DEVELOPMENT/TESTING",
  "users": [
    {
      "key": "USER_BASIC",
      "email": "test@fuy.local",
      "password": "Test@123456",
      "name": "Test User",
      "displayName": "Test",
      "role": "USER",
      "description": "Basic test user with full feature access"
    }
    // ... more users
  ]
}
```

### 2. Test Authentication - Login
```bash
POST /api/test/auth
Content-Type: application/json

{
  "action": "login",
  "email": "test@fuy.local",
  "password": "Test@123456"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Test user authenticated successfully",
  "user": {
    "id": "test-user-001",
    "email": "test@fuy.local",
    "name": "Test User",
    "displayName": "Test",
    "role": "USER"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "sessionToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Response (401):**
```json
{
  "success": false,
  "error": "Invalid email or password"
}
```

### 3. Get Test User Info
```bash
POST /api/test/auth
Content-Type: application/json

{
  "action": "getUser",
  "email": "test@fuy.local"
}
```

### 4. Verify Test User Exists
```bash
POST /api/test/auth
Content-Type: application/json

{
  "action": "verify",
  "email": "test@fuy.local"
}
```

### 5. List All Test Users
```bash
GET /api/test/auth?action=list
```

---

## Razorpay Payment Testing

### Test Payment Endpoints

#### Create Mock Order
```bash
POST /api/test/razorpay
Content-Type: application/json

{
  "action": "createOrder",
  "amount": 100,
  "currency": "INR",
  "userId": "test-user-001",
  "receipt": "receipt_1",
  "description": "Test Product Purchase"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Mock Razorpay order created",
  "order": {
    "id": "order_1234567890_test",
    "entity": "order",
    "amount": 10000,
    "amount_paid": 0,
    "amount_due": 10000,
    "currency": "INR",
    "receipt": "receipt_1",
    "status": "created",
    "attempts": 0,
    "created_at": 1234567890
  },
  "testMode": true
}
```

#### Simulate Successful Payment
```bash
POST /api/test/razorpay
Content-Type: application/json

{
  "action": "simulateSuccess",
  "orderId": "order_1234567890_test"
}
```

#### Simulate Failed Payment
```bash
POST /api/test/razorpay
Content-Type: application/json

{
  "action": "simulateFailure",
  "orderId": "order_1234567890_test"
}
```

### Test Payment Methods

**Successful Payments:**
- Card: `4111111111111111`
- CVV: `123`
- Expiry: Any future date

**Failed Payments:**
- Card: `4000000000000002`
- CVV: `123`
- Expiry: Any future date

---

## Usage Examples

### Example 1: Quick Login and Test Payment Flow

```javascript
// Step 1: Login with test user
const loginResponse = await fetch('/api/test/auth', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'login',
    email: 'razorpay-test@fuy.local',
    password: 'Razorpay@123456'
  })
});

const { user, token } = await loginResponse.json();

// Step 2: Create a mock order
const orderResponse = await fetch('/api/test/razorpay', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    action: 'createOrder',
    amount: 500,
    currency: 'INR',
    userId: user.id,
    description: 'Test Product'
  })
});

const { order } = await orderResponse.json();

// Step 3: Simulate payment success
const successResponse = await fetch('/api/test/razorpay', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'simulateSuccess',
    orderId: order.id
  })
});
```

### Example 2: Testing Feature Access

```bash
# Get test credentials
curl http://localhost:3000/api/test/credentials

# Login
curl -X POST http://localhost:3000/api/test/auth \
  -H "Content-Type: application/json" \
  -d '{
    "action": "login",
    "email": "features@fuy.local",
    "password": "Features@123456"
  }'

# Now use the token to access protected endpoints
curl http://localhost:3000/api/essenz \
  -H "Authorization: Bearer <token>"
```

---

## Security Notes

⚠️ **Important:**

1. **Development Only**: Test credentials are only available in development/staging
2. **No Database Persistence**: Test users don't write to production database
3. **No Real Payments**: All Razorpay endpoints are mocked
4. **Secret Key Optional**: Add `TEST_SECRET_KEY` env var for additional security
5. **Production Disabled**: Endpoints return 403 in production environment

### Securing Test Endpoints (Optional)

Add to `.env.local`:
```
TEST_SECRET_KEY=your-secret-test-key
```

Then use auth header:
```bash
curl http://localhost:3000/api/test/credentials \
  -H "Authorization: Bearer your-secret-test-key"
```

---

## Environment Variables

Add these to `.env.local` for testing:

```env
# Optional: Add secret key for test endpoints
TEST_SECRET_KEY=dev-test-secret-key

# Existing variables needed
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=http://localhost:3000
NODE_ENV=development
```

---

## Troubleshooting

### Test User Login Fails
- Ensure you're using exact credentials (case-sensitive for email)
- Check if running in development mode (`NODE_ENV=development`)
- Verify API endpoint is correct: `/api/test/auth`

### Payment Endpoints Return 403
- Check `NODE_ENV` - must be development/staging, not production
- Verify endpoint path: `/api/test/razorpay`

### Can't Access Protected Features
- Ensure you have valid JWT token from test auth
- Include token in Authorization header: `Bearer <token>`

### Database Errors
- Test endpoints create minimal DB records for tracking (optional)
- Errors don't prevent test flow - continue testing
- Check database connection if needed

---

## API Availability

| Endpoint | GET | POST | Production | Development |
|----------|-----|------|------------|-------------|
| `/api/test/credentials` | ✅ | ❌ | ❌ | ✅ |
| `/api/test/auth` | ✅ | ✅ | ❌ | ✅ |
| `/api/test/razorpay` | ✅ | ✅ | ❌ | ✅ |

---

## Source Code

- **Test Credentials**: `src/lib/test-credentials.ts`
- **Auth API**: `src/app/api/test/auth/route.ts`
- **Credentials API**: `src/app/api/test/credentials/route.ts`
- **Razorpay Test**: `src/app/api/test/razorpay/route.ts`

---

## Quick Reference

```bash
# View all test users
curl http://localhost:3000/api/test/auth?action=list

# View Razorpay test endpoints
curl http://localhost:3000/api/test/razorpay

# Get credentials documentation
curl http://localhost:3000/api/test/credentials
```

---

## Support

For issues or questions about test credentials:
1. Check logs: `npm run dev`
2. Verify endpoints are accessible: `http://localhost:3000/api/test/auth`
3. Check `.env.local` for required variables
4. Ensure `NODE_ENV=development`

---

**Last Updated**: November 2025
**Version**: 1.0
**Status**: Production Ready
