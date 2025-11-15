/**
 * Test Credentials System
 *
 * Provides in-memory test users for development/testing without database persistence.
 * These users can access all features and are useful for testing Razorpay integration
 * and other payment flows.
 */

export interface TestUser {
  id: string;
  email: string;
  password: string;
  name: string;
  displayName: string;
  role: 'USER' | 'ADMIN' | 'TESTER';
  hasVerifiedEmail: boolean;
  description: string;
}

/**
 * Available test users for development and testing
 */
export const TEST_CREDENTIALS: Record<string, TestUser> = {
  // Basic test user - full feature access
  USER_BASIC: {
    id: 'test-user-001',
    email: 'test@fuy.local',
    password: 'Test@123456',
    name: 'Test User',
    displayName: 'Test',
    role: 'USER',
    hasVerifiedEmail: true,
    description: 'Basic test user with full feature access',
  },

  // Premium test user - for shop/payment testing
  USER_PREMIUM: {
    id: 'test-user-002',
    email: 'premium@fuy.local',
    password: 'Premium@123456',
    name: 'Premium Tester',
    displayName: 'Premium',
    role: 'USER',
    hasVerifiedEmail: true,
    description: 'Premium test user for Razorpay payment testing',
  },

  // Admin test user
  USER_ADMIN: {
    id: 'test-admin-001',
    email: 'admin@fuy.local',
    password: 'Admin@123456',
    name: 'Admin Tester',
    displayName: 'Admin',
    role: 'ADMIN',
    hasVerifiedEmail: true,
    description: 'Admin test user with elevated privileges',
  },

  // Razorpay payment testing
  USER_RAZORPAY: {
    id: 'test-razorpay-001',
    email: 'razorpay-test@fuy.local',
    password: 'Razorpay@123456',
    name: 'Razorpay Tester',
    displayName: 'RazorpayTest',
    role: 'USER',
    hasVerifiedEmail: true,
    description: 'Dedicated test user for Razorpay integration testing',
  },

  // Feature testing - all modules enabled
  USER_FEATURES: {
    id: 'test-features-001',
    email: 'features@fuy.local',
    password: 'Features@123456',
    name: 'Features Tester',
    displayName: 'Features',
    role: 'USER',
    hasVerifiedEmail: true,
    description: 'Test user for accessing all application features',
  },
};

/**
 * Get all available test credentials
 */
export function getTestCredentials() {
  return Object.values(TEST_CREDENTIALS);
}

/**
 * Get a specific test user by key
 */
export function getTestUser(key: keyof typeof TEST_CREDENTIALS): TestUser | null {
  return TEST_CREDENTIALS[key] || null;
}

/**
 * Find test user by email
 */
export function findTestUserByEmail(email: string): TestUser | null {
  return Object.values(TEST_CREDENTIALS).find(
    (user) => user.email.toLowerCase() === email.toLowerCase()
  ) || null;
}

/**
 * Verify test user credentials
 */
export function verifyTestCredentials(
  email: string,
  password: string
): TestUser | null {
  const user = findTestUserByEmail(email);

  if (!user) return null;

  // Simple password verification (in production, use bcrypt)
  if (user.password !== password) return null;

  return user;
}

/**
 * Check if an email is a test account
 */
export function isTestAccount(email: string): boolean {
  return findTestUserByEmail(email) !== null;
}

/**
 * Get test user info for display/documentation
 */
export function getTestCredentialsInfo() {
  return {
    environment: 'DEVELOPMENT/TESTING',
    note: 'These credentials do not persist to the database',
    users: Object.entries(TEST_CREDENTIALS).map(([key, user]) => ({
      key,
      email: user.email,
      password: user.password,
      name: user.name,
      displayName: user.displayName,
      role: user.role,
      description: user.description,
    })),
  };
}
