import crypto from 'crypto';
import validator from 'validator';

/**
 * Generate CSRF token
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Verify CSRF token
 */
export function verifyCsrfToken(token: string, storedToken: string): boolean {
  return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(storedToken));
}

/**
 * Generate API request signature
 * Signs request with secret key to prevent tampering
 */
export function generateRequestSignature(
  method: string,
  path: string,
  timestamp: string,
  body: string,
  secret: string
): string {
  const message = `${method}${path}${timestamp}${body}`;
  return crypto
    .createHmac('sha256', secret)
    .update(message)
    .digest('hex');
}

/**
 * Verify API request signature
 */
export function verifyRequestSignature(
  method: string,
  path: string,
  timestamp: string,
  body: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = generateRequestSignature(method, path, timestamp, body, secret);
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
}

/**
 * Sanitize user input to prevent XSS
 */
export function sanitizeInput(input: string): string {
  return validator.escape(input);
}

/**
 * Validate email
 */
export function isValidEmail(email: string): boolean {
  return validator.isEmail(email);
}

/**
 * Validate URL
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Hash sensitive data
 */
export function hashData(data: string, salt: string = ''): string {
  const secret = salt || process.env.HASH_SECRET || 'default-secret';
  return crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('hex');
}

/**
 * Check if request is from trusted origin
 */
export function isTrustedOrigin(origin: string | undefined): boolean {
  if (!origin) return false;

  const trustedOrigins = (process.env.TRUSTED_ORIGINS || 'http://localhost:3000').split(',');
  return trustedOrigins.includes(origin);
}

/**
 * Check if timestamp is within acceptable range (5 minutes)
 */
export function isValidTimestamp(timestamp: string, maxAgeSeconds: number = 300): boolean {
  const requestTime = parseInt(timestamp, 10);
  const currentTime = Math.floor(Date.now() / 1000);
  const timeDiff = Math.abs(currentTime - requestTime);
  return timeDiff <= maxAgeSeconds;
}

/**
 * Generate secure random token
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Rate limit key builder
 */
export function getRateLimitKey(identifier: string, endpoint: string): string {
  return `${identifier}:${endpoint}`;
}

/**
 * Validate request payload size
 */
export function isValidPayloadSize(payload: any, maxSizeBytes: number = 1024 * 1024): boolean {
  const size = JSON.stringify(payload).length;
  return size <= maxSizeBytes;
}
