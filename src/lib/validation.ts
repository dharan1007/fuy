import { z, ZodSchema } from 'zod';
import validator from 'validator';

/**
 * Validate and parse request body against schema
 */
export async function validateRequest<T>(
  req: Request,
  schema: ZodSchema
): Promise<{ success: boolean; data?: T; errors?: any }> {
  try {
    const body = await req.json();
    const result = schema.safeParse(body);

    if (!result.success) {
      return {
        success: false,
        errors: result.error.flatten(),
      };
    }

    return {
      success: true,
      data: result.data as T,
    };
  } catch (error) {
    return {
      success: false,
      errors: { _form: ['Invalid JSON in request body'] },
    };
  }
}

/**
 * Common validation schemas
 */
export const schemas = {
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[!@#$%^&*]/, 'Password must contain at least one special character'),
  url: z.string().url('Invalid URL'),
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be at most 20 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'),
  id: z.string().uuid('Invalid ID format'),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number'),
  postalCode: z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid postal code'),
};

/**
 * String sanitization functions
 */
export const sanitize = {
  /**
   * Remove HTML and dangerous characters
   */
  html(input: string): string {
    return validator.escape(input);
  },

  /**
   * Remove SQL injection attempts
   */
  sql(input: string): string {
    return input
      .replace(/['";\\]/g, '\\$&')
      .replace(/--/g, '')
      .replace(/\/\*/g, '')
      .replace(/\*\//g, '');
  },

  /**
   * Remove potential XSS attacks
   */
  xss(input: string): string {
    return input
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '');
  },

  /**
   * Sanitize file paths
   */
  filepath(input: string): string {
    return input
      .replace(/\.\./g, '')
      .replace(/[<>:"|?*]/g, '')
      .trim();
  },

  /**
   * Sanitize email
   */
  email(input: string): string {
    return validator.normalizeEmail(input) || '';
  },

  /**
   * Sanitize URL
   */
  url(input: string): string {
    try {
      const url = new URL(input);
      return url.href;
    } catch {
      return '';
    }
  },

  /**
   * Generic sanitization
   */
  text(input: string, options = {}): string {
    let result = input.trim();
    result = validator.escape(result);
    return result;
  },
};

/**
 * Input validation functions
 */
export const validate = {
  /**
   * Validate email format
   */
  email(input: string): boolean {
    return validator.isEmail(input);
  },

  /**
   * Validate URL
   */
  url(input: string): boolean {
    return validator.isURL(input);
  },

  /**
   * Validate strong password
   */
  strongPassword(input: string): {
    isValid: boolean;
    feedback: string[];
  } {
    const feedback: string[] = [];

    if (input.length < 8) feedback.push('At least 8 characters');
    if (!/[A-Z]/.test(input)) feedback.push('At least one uppercase letter');
    if (!/[a-z]/.test(input)) feedback.push('At least one lowercase letter');
    if (!/[0-9]/.test(input)) feedback.push('At least one number');
    if (!/[!@#$%^&*]/.test(input)) feedback.push('At least one special character');

    return {
      isValid: feedback.length === 0,
      feedback,
    };
  },

  /**
   * Validate username
   */
  username(input: string): boolean {
    return /^[a-zA-Z0-9_-]{3,20}$/.test(input);
  },

  /**
   * Validate phone number
   */
  phone(input: string): boolean {
    return validator.isMobilePhone(input);
  },

  /**
   * Validate credit card
   */
  creditCard(input: string): boolean {
    return validator.isCreditCard(input);
  },

  /**
   * Validate IP address
   */
  ipAddress(input: string): boolean {
    return validator.isIP(input);
  },

  /**
   * Validate UUID
   */
  uuid(input: string): boolean {
    return validator.isUUID(input);
  },

  /**
   * Validate JSON
   */
  json(input: string): boolean {
    try {
      JSON.parse(input);
      return true;
    } catch {
      return false;
    }
  },
};

/**
 * Output encoding functions to prevent XSS
 */
export const encode = {
  /**
   * HTML encode
   */
  html(input: string): string {
    const map: { [key: string]: string } = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return input.replace(/[&<>"']/g, (char) => map[char]);
  },

  /**
   * URL encode
   */
  url(input: string): string {
    return encodeURIComponent(input);
  },

  /**
   * JavaScript encode
   */
  js(input: string): string {
    return JSON.stringify(input);
  },

  /**
   * Base64 encode
   */
  base64(input: string): string {
    return Buffer.from(input).toString('base64');
  },

  /**
   * Base64 decode
   */
  base64Decode(input: string): string {
    try {
      return Buffer.from(input, 'base64').toString('utf-8');
    } catch {
      return '';
    }
  },
};

/**
 * Request body size validation
 */
export function validatePayloadSize(
  payload: unknown,
  maxSizeBytes: number = 1024 * 1024 // 1MB default
): { valid: boolean; size: number } {
  const size = JSON.stringify(payload).length;
  return {
    valid: size <= maxSizeBytes,
    size,
  };
}

/**
 * Batch validation
 */
export async function validateBatch<T>(
  items: unknown[],
  schema: ZodSchema
): Promise<{ valid: T[]; invalid: Array<{ item: unknown; errors: any }> }> {
  const valid: T[] = [];
  const invalid: Array<{ item: unknown; errors: any }> = [];

  for (const item of items) {
    const result = schema.safeParse(item);
    if (result.success) {
      valid.push(result.data as T);
    } else {
      invalid.push({ item, errors: result.error.flatten() });
    }
  }

  return { valid, invalid };
}
