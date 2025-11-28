# Quick Security Setup Guide

## 🚀 Quick Start (5 Minutes)

### 1. Generate Secrets

```powershell
# Run in PowerShell to generate secure secrets
$secret1 = [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
$secret2 = [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
$secret3 = [Convert]::ToBase64String((1..24 | ForEach-Object { Get-Random -Maximum 256 })) + "12345678"

Write-Host "API_REQUEST_SECRET=$secret1"
Write-Host "HASH_SECRET=$secret2" 
Write-Host "ENCRYPTION_KEY=$secret3"
```

### 2. Update .env File

Add these lines to your `.env` file:

```env
# Security Variables (replace with secrets from step 1)
API_REQUEST_SECRET=<your-generated-secret-1>
HASH_SECRET=<your-generated-secret-2>
ENCRYPTION_KEY=<your-generated-secret-3>

# CORS
TRUSTED_ORIGINS=http://localhost:3000,http://localhost:8081

# Rate Limiting
RATE_LIMIT_REQUESTS=100
AUTH_RATE_LIMIT_REQUESTS=10
```

### 3. Mobile App Environment

Create `mobile/.env`:

```env
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_API_SECRET=<same-as-API_REQUEST_SECRET-from-step-1>
```

### 4. Test It Works

```bash
# Run the web app
npm run dev

# In another terminal, test signup security
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"weak"}'

# Should return 400 with password feedback ✅
```

### 5. Run Mobile App

```bash
cd mobile
npm start
```

## ✅ You're Done!

Your app now has:
- ✅ Password strength validation
- ✅ Input sanitization (XSS protection)
- ✅ Rate limiting
- ✅ CSRF protection
- ✅ Encrypted mobile storage
- ✅ Security event logging

## 📚 Learn More

- Full security features: [walkthrough.md](file:///C:/Users/dhara/.gemini/antigravity/brain/dac9eb7f-8db9-4e3e-9618-d4b33818efe2/walkthrough.md)
- Testing guide: [SECURITY_TESTING.md](file:///c:/Users/dhara/fuy/SECURITY_TESTING.md)
- Complete documentation: [SECURITY.md](file:///c:/Users/dhara/fuy/SECURITY.md)
