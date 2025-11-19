# Security Hardening Guide - FUY Media

This document outlines all security measures implemented to protect the application from unauthorized modifications, hacking, and tampering.

## Table of Contents

1. [Security Headers](#security-headers)
2. [API Authentication & Authorization](#api-authentication--authorization)
3. [Request Signing & Verification](#request-signing--verification)
4. [Input Validation & Sanitization](#input-validation--sanitization)
5. [Rate Limiting](#rate-limiting)
6. [CORS Protection](#cors-protection)
7. [Environment Variable Security](#environment-variable-security)
8. [Audit Logging](#audit-logging)
9. [Best Practices](#best-practices)
10. [Deployment Checklist](#deployment-checklist)

---

## Security Headers

All responses include security headers to prevent common web vulnerabilities:

### Content Security Policy (CSP)
- **Purpose**: Prevents XSS (Cross-Site Scripting) attacks
- **Header**: `Content-Security-Policy`
- **Policy**: Restrictive by default, allows only trusted sources
- **Enforcement**: All inline scripts and styles require nonce or CSP override

### X-Content-Type-Options
- **Value**: `nosniff`
- **Purpose**: Prevents MIME type sniffing attacks
- **Effect**: Browsers strictly follow the declared content type

### X-Frame-Options
- **Value**: `DENY`
- **Purpose**: Prevents clickjacking attacks
- **Effect**: Page cannot be embedded in iframes

### X-XSS-Protection
- **Value**: `1; mode=block`
- **Purpose**: Enables browser XSS protection
- **Effect**: Browser blocks page if XSS attack is detected

### Strict-Transport-Security (HSTS)
- **Value**: `max-age=31536000; includeSubDomains; preload`
- **Purpose**: Forces HTTPS connections
- **Duration**: 1 year
- **Preload**: Eligible for browser HSTS preload lists

### Referrer-Policy
- **Value**: `strict-origin-when-cross-origin`
- **Purpose**: Controls referrer information leakage
- **Effect**: Only sends referrer to same-origin requests

### Permissions-Policy
- **Disabled Features**: Geolocation, microphone, camera, USB, payment, etc.
- **Purpose**: Disables dangerous browser APIs

---

## API Authentication & Authorization

### User Session Authentication
```typescript
// Automatically checks NextAuth session
import { getServerSession } from 'next-auth';

const session = await getServerSession();
if (!session) {
  return Response.json({ error: 'Unauthorized' }, { status: 401 });
}
```

### Role-Based Access Control
```typescript
import { withPermissions } from '@/lib/api-middleware';

// Only allow 'admin' and 'moderator' roles
const handler = withPermissions(['admin', 'moderator'])(
  async (req, context) => {
    // Your protected route logic
  }
);
```

### Protected API Routes
All API routes that modify data require:
1. Valid authentication session
2. Proper request signature
3. Recent timestamp
4. Correct content type

---

## Request Signing & Verification

Prevents request tampering and ensures data integrity.

### Signing a Request (Client-Side)
```typescript
import { generateRequestSignature } from '@/lib/security';

const timestamp = Math.floor(Date.now() / 1000).toString();
const signature = generateRequestSignature(
  'POST',
  '/api/posts',
  timestamp,
  JSON.stringify(body),
  process.env.NEXT_PUBLIC_API_SECRET
);

fetch('/api/posts', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-signature': signature,
    'x-timestamp': timestamp,
  },
  body: JSON.stringify(body),
});
```

### Verifying Request Signature (Server-Side)
```typescript
import { withSignatureVerification } from '@/lib/api-middleware';

const handler = withSignatureVerification(
  async (req) => {
    // Your protected route logic
  },
  process.env.API_REQUEST_SECRET
);
```

### Security Features
- **HMAC-SHA256**: Industry-standard hashing algorithm
- **Timestamp Validation**: Rejects requests older than 5 minutes
- **Timing-Safe Comparison**: Prevents timing-based attacks

---

## Input Validation & Sanitization

### Validation Schemas
```typescript
import { z } from 'zod';
import { validateRequest, schemas } from '@/lib/validation';

const postSchema = z.object({
  title: schemas.text.max(200),
  content: z.string().min(1).max(2000),
  email: schemas.email,
  website: schemas.url.optional(),
});

export async function POST(req: NextRequest) {
  const { success, data, errors } = await validateRequest(req, postSchema);

  if (!success) {
    return Response.json({ errors }, { status: 400 });
  }

  // Use validated data safely
}
```

### Available Validators
- `schemas.email`: Email format validation
- `schemas.password`: Strong password requirements
- `schemas.username`: Username format validation
- `schemas.url`: URL validation
- `schemas.phone`: Phone number validation
- `schemas.id`: UUID validation

### Sanitization Functions
```typescript
import { sanitize } from '@/lib/validation';

// Remove HTML and dangerous characters
const safeName = sanitize.html(userInput);

// Remove SQL injection attempts
const safeSql = sanitize.sql(userQuery);

// Remove XSS attempts
const safeHtml = sanitize.xss(userContent);

// Sanitize file paths
const safePath = sanitize.filepath(userFilename);
```

---

## Rate Limiting

### Configuration
```typescript
import { rateLimit } from '@/lib/rate-limit';

const limitHandler = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100,          // 100 requests per window
})(async (req) => {
  // Your handler
});
```

### Features
- **Per-IP Limiting**: Tracks requests by IP address
- **Per-User Limiting**: Tracks requests by authenticated user
- **Per-Endpoint Limiting**: Separate limits for different endpoints
- **Retry-After Header**: Tells clients when they can retry
- **Automatic Cleanup**: Removes expired entries periodically

### Rate Limit Headers
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 42
X-RateLimit-Reset: 2024-11-19T12:00:00Z
Retry-After: 300
```

---

## CORS Protection

### Trusted Origins Configuration
```env
# .env.security
TRUSTED_ORIGINS=http://localhost:3000,https://yourapp.com,https://www.yourapp.com
```

### Origin Validation
```typescript
import { isTrustedOrigin } from '@/lib/security';

const isAllowed = isTrustedOrigin(req.headers.get('origin'));
```

### Features
- **Whitelist Only**: Only explicitly listed origins are allowed
- **Production-Only Enforcement**: Can be disabled in development
- **Configurable Origins**: Easy to add/remove trusted sources

---

## Environment Variable Security

### Setup
1. Copy `.env.security.example` to `.env.security`
2. Fill in all required values
3. Never commit `.env.security` to version control
4. Use different secrets for each environment

### Required Secrets
- `API_REQUEST_SECRET`: For request signing
- `HASH_SECRET`: For hashing sensitive data
- `NEXTAUTH_SECRET`: For NextAuth.js sessions
- `ENCRYPTION_KEY`: For encrypting sensitive data

### Validation
```typescript
import { z } from 'zod';

const envSchema = z.object({
  API_REQUEST_SECRET: z.string().min(32),
  HASH_SECRET: z.string().min(32),
  NEXTAUTH_SECRET: z.string().min(32),
});

const env = envSchema.parse(process.env);
```

---

## Audit Logging

All API accesses are logged with:
- Timestamp
- User ID
- Request method and path
- IP address
- User agent
- Response status
- Request duration

### Log Entry Example
```
[AUDIT LOG] {
  timestamp: "2024-11-19T12:34:56.789Z",
  userId: "user-123",
  method: "POST",
  path: "/api/posts",
  ip: "192.168.1.1",
  userAgent: "Mozilla/5.0...",
  status: 201,
  duration: "45ms"
}
```

### Accessing Logs
- Application logs: `STDOUT` / server logs
- Database logs: Query audit trail
- Access logs: Request/response logs

---

## Best Practices

### 1. **Always Validate Input**
```typescript
// ❌ Bad
const user = await db.user.findUnique({
  where: { email: req.body.email }
});

// ✅ Good
const { success, data } = await validateRequest(req, z.object({
  email: schemas.email
}));
if (!success) return error;
const user = await db.user.findUnique({
  where: { email: data.email }
});
```

### 2. **Use Parameterized Queries**
```typescript
// ❌ Bad
await db.post.findMany({
  where: db.sql`title LIKE %${userInput}%`
});

// ✅ Good
await db.post.findMany({
  where: {
    title: { contains: userInput } // Parameterized
  }
});
```

### 3. **Escape Output**
```typescript
import { encode } from '@/lib/validation';

// ❌ Bad
<div>{userComment}</div>

// ✅ Good
<div>{encode.html(userComment)}</div>
```

### 4. **Use HTTPS Only**
```typescript
// Enabled automatically in production via HSTS header
// All requests to http:// are redirected to https://
```

### 5. **Keep Dependencies Updated**
```bash
npm audit        # Check vulnerabilities
npm update       # Update packages
npm audit fix    # Auto-fix vulnerabilities
```

### 6. **Secure Password Hashing**
```typescript
import bcrypt from 'bcrypt';

// Hash on signup
const hashedPassword = await bcrypt.hash(password, 12);

// Verify on login
const isValid = await bcrypt.compare(password, hashedPassword);
```

### 7. **Secure Session Management**
- Sessions expire after 30 days (configurable)
- Secure HTTP-only cookies
- CSRF token validation
- Session regeneration on login

---

## Deployment Checklist

Before deploying to production:

### Environment Setup
- [ ] Create `.env.security` with strong secrets
- [ ] Set `NODE_ENV=production`
- [ ] Enable HSTS header
- [ ] Configure `TRUSTED_ORIGINS` for your domain
- [ ] Set up HTTPS certificate

### Security Headers
- [ ] Verify all security headers are present
- [ ] Test CSP policy doesn't break legitimate content
- [ ] Verify X-Frame-Options blocks framing
- [ ] Enable HSTS preload registration

### API Security
- [ ] Enable request signature verification
- [ ] Configure rate limiting thresholds
- [ ] Enable audit logging
- [ ] Set up log aggregation/monitoring

### Database & Storage
- [ ] Enable database encryption
- [ ] Configure backup encryption
- [ ] Set up database access logs
- [ ] Enable row-level security (if applicable)

### Secrets Management
- [ ] Never commit `.env.security`
- [ ] Use environment variables or secret manager
- [ ] Rotate secrets regularly
- [ ] Monitor for accidental secret commits

### Monitoring & Alerting
- [ ] Set up error tracking (Sentry, etc.)
- [ ] Configure security event alerts
- [ ] Monitor rate limit triggers
- [ ] Track failed authentication attempts
- [ ] Monitor unusual access patterns

### Code Review
- [ ] Security audit of custom code
- [ ] Dependency vulnerability check
- [ ] OWASP Top 10 compliance review
- [ ] Penetration testing (optional)

### Testing
- [ ] Test all authentication flows
- [ ] Test rate limiting
- [ ] Test CORS restrictions
- [ ] Test input validation
- [ ] Test XSS protection
- [ ] Test CSRF protection

---

## Security Policies

### Password Policy
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- At least 1 special character (!@#$%^&*)
- Cannot reuse last 5 passwords
- Must change every 90 days

### Account Lockout Policy
- Lock after 5 failed login attempts
- Lockout duration: 15 minutes
- Progressive delays: 1s, 2s, 4s, 8s, 16s

### Session Policy
- Maximum session age: 30 days
- Idle timeout: 1 hour
- Requires re-authentication for sensitive operations

### Data Retention Policy
- User data: Retained while account is active
- Deleted accounts: Data purged after 30 days
- Audit logs: Retained for 90 days
- Backups: Retained for 30 days

---

## Incident Response

### Security Breach
1. Immediately revoke affected session tokens
2. Force password reset for affected users
3. Review audit logs for unauthorized access
4. Notify affected users
5. Post-incident analysis and fixes

### Suspicious Activity
1. Trigger automated alerts
2. Review rate limit violations
3. Check for pattern-based attacks
4. Block malicious IPs (if applicable)
5. Escalate to security team

---

## Support & Reporting

For security issues or concerns:
- Create a private GitHub security advisory
- Contact: security@yourapp.com
- Do not publicly disclose security vulnerabilities
- Allow 90 days for response before public disclosure

---

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [Next.js Security](https://nextjs.org/docs/advanced-features/security-headers)
- [MDN Web Security](https://developer.mozilla.org/en-US/docs/Web/Security)

---

**Last Updated**: 2024-11-19
**Version**: 1.0.0
