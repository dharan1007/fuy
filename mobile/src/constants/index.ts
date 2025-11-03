// src/constants/index.ts

// ---- API Configuration ----
// Normalize and log the baseURL so we can see what the app is using.
const rawBase =
  (process.env.EXPO_PUBLIC_API_URL ?? '').toString().trim() ||
  'http://localhost:3000';

// strip trailing slashes
const normalizedBase = rawBase.replace(/\/+$/, '');

export const API_CONFIG = {
  BASE_URL: normalizedBase,
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
};

// On boot, print what we’ll use (shows up in Metro logs)
console.log('[API baseURL]', API_CONFIG.BASE_URL);

// ---- Storage Keys ----
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
  USER: 'user',
  THEME: 'theme',
  LANGUAGE: 'language',
  SYNC_QUEUE: 'sync_queue',
  CACHE_EXPIRY: 'cache_expiry',
};

// ---- Tab Navigation ----
export const TAB_SCREENS = {
  DASHBOARD: 'Dashboard',
  JOURNAL: 'Journal',
  ESSENZ: 'Essenz',
  SOCIAL: 'Social',
  MESSAGES: 'Messages',
  PROFILE: 'Profile',
};

// ---- Stack Navigation ----
export const STACK_SCREENS = {
  AUTH: 'Auth',
  LOGIN: 'Login',
  SIGNUP: 'Signup',
  MAIN: 'Main',
  JOURNAL_DETAIL: 'JournalDetail',
  POST_DETAIL: 'PostDetail',
  CHAT: 'Chat',
  PRODUCT_DETAIL: 'ProductDetail',
  CHECKOUT: 'Checkout',
  MAP: 'Map',
  SETTINGS: 'Settings',
  PROFILE_EDIT: 'ProfileEdit',
};

// ---- Theme / UI constants ----
export const COLORS = {
  primary: '#6366f1',
  secondary: '#8b5cf6',
  accent: '#ec4899',
  success: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
  light: '#f3f4f6',
  dark: '#1f2937',
  white: '#ffffff',
  black: '#000000',
  gray100: '#f9fafb',
  gray200: '#f3f4f6',
  gray300: '#e5e7eb',
  gray400: '#d1d5db',
  gray500: '#9ca3af',
  gray600: '#6b7280',
  gray700: '#4b5563',
  gray800: '#1f2937',
  gray900: '#111827',
};

export const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const BORDER_RADIUS = { sm: 4, md: 8, lg: 12, xl: 16, full: 999 };
export const FONT_SIZES = { xs: 12, sm: 14, base: 16, lg: 18, xl: 20, '2xl': 24, '3xl': 30 };

export const FEATURE_TYPES = [
  { id: 'JOURNAL', label: 'Journal', color: '#3b82f6' },
  { id: 'JOY', label: 'Joy', color: '#10b981' },
  { id: 'AWE', label: 'Awe', color: '#f59e0b' },
  { id: 'BONDS', label: 'Bonds', color: '#ec4899' },
  { id: 'SERENDIPITY', label: 'Serendipity', color: '#8b5cf6' },
  { id: 'CHECKIN', label: 'Check-in', color: '#6366f1' },
  { id: 'PROGRESS', label: 'Progress', color: '#06b6d4' },
];

export const VISIBILITY_OPTIONS = [
  { id: 'PUBLIC', label: 'Public', icon: 'globe' },
  { id: 'FRIENDS', label: 'Friends Only', icon: 'users' },
  { id: 'PRIVATE', label: 'Private', icon: 'lock' },
];

export const ESSENZ_STATUS = [
  { id: 'ACTIVE', label: 'Active', color: '#10b981' },
  { id: 'COMPLETED', label: 'Completed', color: '#06b6d4' },
  { id: 'PAUSED', label: 'Paused', color: '#f59e0b' },
];

export const ORDER_STATUS = [
  { id: 'PENDING', label: 'Pending', color: '#f59e0b' },
  { id: 'CONFIRMED', label: 'Confirmed', color: '#3b82f6' },
  { id: 'SHIPPED', label: 'Shipped', color: '#06b6d4' },
  { id: 'DELIVERED', label: 'Delivered', color: '#10b981' },
  { id: 'CANCELLED', label: 'Cancelled', color: '#ef4444' },
];

export const PAGINATION = { DEFAULT_PAGE_SIZE: 10, MAX_PAGE_SIZE: 100 };
export const DEBOUNCE_DELAYS = { SEARCH: 300, INPUT: 500, SCROLL: 200 };
export const CACHE_EXPIRY = {
  SHORT: 5 * 60 * 1000,
  MEDIUM: 15 * 60 * 1000,
  LONG: 60 * 60 * 1000,
  VERY_LONG: 24 * 60 * 60 * 1000,
};

export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network connection failed. Please check your internet connection.',
  TIMEOUT: 'Request timeout. Please try again.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  NOT_FOUND: 'The requested resource was not found.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  SERVER_ERROR: 'An unexpected error occurred. Please try again later.',
  UNKNOWN_ERROR: 'Something went wrong. Please try again.',
};

export const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: 'Successfully logged in.',
  SIGNUP_SUCCESS: 'Account created successfully.',
  LOGOUT_SUCCESS: 'Successfully logged out.',
  PROFILE_UPDATE: 'Profile updated successfully.',
  ITEM_CREATED: 'Item created successfully.',
  ITEM_UPDATED: 'Item updated successfully.',
  ITEM_DELETED: 'Item deleted successfully.',
};
