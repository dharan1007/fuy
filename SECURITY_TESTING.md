# Security Testing Guide

This document outlines the security tests you should perform to verify the security hardening measures.

## Authentication Security Tests

### 1. Test Password Strength Validation

**Test Case:** Weak password should be rejected
```bash
# Request
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "weak",
    "name": "Test User"
  }'

# Expected: 400 Bad Request with password feedback
```

**Test Case:** Strong password should be accepted
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test2@example.com",
    "password": "StrongP@ss123",
    "name": "Test User"
  }'

# Expected: 201 Created
```

### 2. Test Input Sanitization

**Test Case:** XSS attempt in name field
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "xss@example.com",
    "password": "StrongP@ss123",
    "name": "<script>alert(1)</script>"
  }'

# Expected: 201 Created, but name should be sanitized in database
 ```

### 3. Test Rate Limiting

**Test Case:** Make rapid requests to trigger rate limit
```bash
# Make 11+ requests in quick succession
for i in {1..15}; do
  curl -X POST http://localhost:3000/api/auth/signup \
    -H "Content-Type: application/json" \
    -d '{
      "email": "test'$i'@example.com",
      "password": "StrongP@ss123"
    }'
  sleep 0.5
done

# Expected: First ~10 requests succeed, then 429 Too Many Requests
```

## Authorization Tests

### 4. Test Unauthorized Access

**Test Case:** Access protected route without authentication
```bash
curl -X GET http://localhost:3000/api/user/purchases

# Expected: 401 Unauthorized
```

**Test Case:** Access protected route with valid session
```bash
# First login, then use session cookie
curl -X GET http://localhost:3000/api/user/purchases \
  -H "Cookie: session-cookie-here"

# Expected: 200 OK with data
```

## SQL Injection Tests

### 5. Test SQL Injection Prevention

**Test Case:** SQL injection in email field
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com'\'' OR 1=1--",
    "password": "StrongP@ss123"
  }'

# Expected: 400 Bad Request (invalid email format)
```

## XSS Tests

### 6. Test XSS Prevention

**Test Case:** Script injection in various fields
```bash
# Test in profile update or post creation
curl -X POST http://localhost:3000/api/posts \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{
    "content": "<img src=x onerror=alert(1)>",
    "title": "<script>alert(1)</script>"
  }'

# Expected: Content should be sanitized or escaped
```

## CSRF Tests

### 7. Test CSRF Protection

**Test Case:** Submit form without CSRF token
```html
<!-- Create this HTML file and open in browser -->
<form action="http://localhost:3000/api/auth/change-password" method="POST">
  <input type="hidden" name="currentPassword" value="old">
  <input type="hidden" name="newPassword" value="new">
  <input type="submit" value="Submit">
</form>
<script>document.forms[0].submit();</script>
```

**Expected:** Request should be rejected due to missing/invalid CSRF token

## Mobile App Security Tests

### 8. Test Secure Storage (Mobile)

**Test:** Check if tokens are encrypted in storage
- Install app on test device
- Login
- Use ADB (Android) or device explorer (iOS) to inspect storage
- Verify auth tokens are encrypted, not plain text

### 9. Test Request Signing (Mobile)

**Test:** API requests from mobile should include signatures
- Monitor network traffic from mobile app
- Verify all requests include `x-signature` and `x-timestamp` headers

### 10. Test Device Security Checks (Mobile)

**Test:** Run app on rooted/jailbroken device
- Install app on rooted Android or jailbroken iOS
- Launch app
- Verify security warning is displayed (if you chose to block)

## Security Headers Tests

### 11. Test Security Headers

**Test Case:** Verify all security headers are present
```bash
curl -I http://localhost:3000

# Expected headers:
# - Content-Security-Policy
# - X-Content-Type-Options: nosniff
# - X-Frame-Options: DENY
# - X-XSS-Protection
# - Strict-Transport-Security (in production)
# - Referrer-Policy
```

## Audit Logging Tests

### 12. Test Security Event Logging

**Test Case:** Failed login should be logged
```bash
# Attempt to login with wrong password
curl -X POST http://localhost:3000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "wrongpassword"
  }'

# Check server logs for security event
# Expected: [SECURITY] AUTH_FAILURE event logged
```

## Automated Security Testing

### Run Security Audit
```bash
# Check for dependency vulnerabilities
npm audit

# Fix automatically (where possible)
npm audit fix
```

### Run TypeScript Type Checks
```bash
npm run build

# Expected: No type errors
```

## Penetration Testing Checklist

- [ ] SQL Injection attempts blocked
- [ ] XSS attempts sanitized
- [ ] CSRF protection working
- [ ] Rate limiting enforced
- [ ] Authentication required on protected routes
- [ ] Authorization checks working
- [ ] Input validation working
- [ ] Password strength enforced
- [ ] Security headers present
- [ ] Audit logging working
- [ ] Mobile app secure storage working
- [ ] Mobile app request signing working
- [ ] Device security checks working (optional)

## Security Incident Simulation

### Test Account Lockout

**Test Case:** Multiple failed login attempts should trigger lockout
```bash
# Make 5+ failed login attempts
for i in {1..6}; do
  curl -X POST http://localhost:3000/api/auth/signin \
    -H "Content-Type: application/json" \
    -d '{
      "email": "test@example.com",
      "password": "wrongpassword"
    }'
done

# Expected: Account should be locked after 5 attempts
```

## Production Verification

Before deploying to production:

1. ✅ All tests pass
2. ✅ No hardcoded secrets in code
3. ✅ Environment variables configured
4. ✅ HTTPS enabled
5. ✅ Rate limiting tuned for production traffic
6. ✅ Security headers confirmed
7. ✅ Audit logging configured
8. ✅ Monitoring/alerting set up
9. ✅ Backup and recovery tested
10. ✅ SSL certificates valid

## Reporting Security Issues

If you find a security vulnerability:
1. Do NOT create a public GitHub issue
2. Email: security@yourapp.com
3. Include:
   - Description of vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if known)
