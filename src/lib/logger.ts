/**
 * Production-safe logging utility
 * Only logs errors in production, all logs in development
 */

const isDevelopment = process.env.NODE_ENV === "development";

export const logger = {
  error: (message: string, error?: unknown) => {
    console.error(`[ERROR] ${message}`, error);
  },

  warn: (message: string, data?: unknown) => {
    if (isDevelopment) {
      console.warn(`[WARN] ${message}`, data);
    }
  },

  info: (message: string, data?: unknown) => {
    if (isDevelopment) {
      console.info(`[INFO] ${message}`, data);
    }
  },

  debug: (message: string, data?: unknown) => {
    if (isDevelopment) {
      console.debug(`[DEBUG] ${message}`, data);
    }
  },
};

export default logger;
