import crypto from 'crypto';
import validator from 'validator';

// In-memory nonce store for replay attack prevention (use Redis in production)
const nonceStore = new Map<string, number>();

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
  try {
    return crypto.timingSafeEqual(
      new Uint8Array(Buffer.from(token)),
      new Uint8Array(Buffer.from(storedToken))
    );
  } catch {
    return false;
  }
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
  try {
    const expectedSignature = generateRequestSignature(method, path, timestamp, body, secret);
    return crypto.timingSafeEqual(
      new Uint8Array(Buffer.from(signature)),
      new Uint8Array(Buffer.from(expectedSignature))
    );
  } catch {
    return false;
  }
}

/**
 * Encrypt sensitive data using AES-256-GCM
 */
export function encryptData(data: string, key?: string): string {
  const encryptionKey = key || process.env.ENCRYPTION_KEY;
  if (!encryptionKey) {
    throw new Error('ENCRYPTION_KEY environment variable is required for encryption');
  }

  // Ensure key is 32 bytes
  const keyBuffer = crypto.scryptSync(encryptionKey, 'salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', new Uint8Array(keyBuffer), new Uint8Array(iv));

  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Return: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt sensitive data
 */
export function decryptData(encryptedData: string, key?: string): string | null {
  try {
    const encryptionKey = key || process.env.ENCRYPTION_KEY;
    if (!encryptionKey) {
      throw new Error('ENCRYPTION_KEY environment variable is required for decryption');
    }
    const keyBuffer = crypto.scryptSync(encryptionKey, 'salt', 32);

    const [ivHex, authTagHex, encrypted] = encryptedData.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv('aes-256-gcm', new Uint8Array(keyBuffer), new Uint8Array(iv));
    decipher.setAuthTag(new Uint8Array(authTag));

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error);
    return null;
  }
}

/**
 * Validate API key format and authenticity
 */
export function validateApiKey(apiKey: string, expectedPrefix: string = 'fuy_'): boolean {
  if (!apiKey || !apiKey.startsWith(expectedPrefix)) {
    return false;
  }

  // Check minimum length (prefix + 32 chars)
  return apiKey.length >= expectedPrefix.length + 32;
}

/**
 * Generate nonce for replay attack prevention
 */
export function generateNonce(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Verify and consume nonce (prevents replay attacks)
 */
export function verifyAndConsumeNonce(nonce: string, maxAgeSeconds: number = 300): boolean {
  const now = Date.now();

  // Clean up old nonces (older than 10 minutes)
  for (const [key, timestamp] of nonceStore.entries()) {
    if (now - timestamp > 600000) {
      nonceStore.delete(key);
    }
  }

  // Check if nonce already used
  if (nonceStore.has(nonce)) {
    return false;
  }

  // Mark nonce as used
  nonceStore.set(nonce, now);
  return true;
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

/**
 * Check password strength
 */
export function checkPasswordStrength(password: string): {
  score: number;
  feedback: string[];
} {
  const feedback: string[] = [];
  let score = 0;

  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  // Check for common patterns
  if (/^[0-9]+$/.test(password)) {
    score -= 2;
    feedback.push('Avoid using only numbers');
  }
  if (/^[a-zA-Z]+$/.test(password)) {
    score -= 1;
    feedback.push('Add numbers or special characters');
  }
  if (/(password|123456|qwerty)/i.test(password)) {
    score -= 3;
    feedback.push('Avoid common passwords');
  }

  if (score < 3) feedback.push('Consider using a longer password with mixed characters');
  if (password.length < 8) feedback.push('Password must be at least 8 characters');

  return { score: Math.max(0, Math.min(score, 5)), feedback };
}

/**
 * Sanitize filename to prevent directory traversal attacks
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/\.\./g, '')
    .replace(/[/\\]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .substring(0, 255);
}
