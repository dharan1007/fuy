/**
 * RLS Monitoring & Error Tracking Utility
 * Helps identify and log Row Level Security policy violations
 */

export interface RLSError {
  timestamp: string;
  userId?: string;
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  message: string;
  error: Error;
  context?: Record<string, any>;
}

export interface RLSLog {
  timestamp: string;
  userId?: string;
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  rowsAffected?: number;
  duration: number; // milliseconds
  status: 'allowed' | 'denied';
  context?: Record<string, any>;
}

class RLSMonitor {
  private errors: RLSError[] = [];
  private logs: RLSLog[] = [];
  private maxLogs = 1000;

  /**
   * Log successful RLS-protected operations
   */
  logOperation(log: Omit<RLSLog, 'timestamp'>) {
    const entry: RLSLog = {
      timestamp: new Date().toISOString(),
      ...log,
    };

    this.logs.push(entry);

    // Keep logs bounded
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Log denied operations to console in development
    if (process.env.NODE_ENV === 'development' && log.status === 'denied') {
      console.warn('[RLS Denial]', {
        user: log.userId,
        table: log.table,
        operation: log.operation,
        duration: log.duration,
        context: log.context,
      });
    }
  }

  /**
   * Log RLS policy violations
   */
  logError(error: Omit<RLSError, 'timestamp'>) {
    const entry: RLSError = {
      timestamp: new Date().toISOString(),
      ...error,
    };

    this.errors.push(entry);

    // Keep errors bounded
    if (this.errors.length > this.maxLogs) {
      this.errors = this.errors.slice(-this.maxLogs);
    }

    // Log to console always for errors
    console.error('[RLS Error]', {
      user: error.userId,
      table: error.table,
      operation: error.operation,
      message: error.message,
      context: error.context,
    });
  }

  /**
   * Check if error is RLS-related
   */
  isRLSError(error: Error): boolean {
    const message = error.message || '';
    return (
      message.includes('row-level security') ||
      message.includes('permission denied') ||
      message.includes('new row violates') ||
      message.includes('RLS')
    );
  }

  /**
   * Get RLS error statistics
   */
  getErrorStats() {
    return {
      total: this.errors.length,
      byTable: this.errors.reduce(
        (acc, err) => {
          acc[err.table] = (acc[err.table] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      ),
      byOperation: this.errors.reduce(
        (acc, err) => {
          acc[err.operation] = (acc[err.operation] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      ),
      recent: this.errors.slice(-10),
    };
  }

  /**
   * Get operation statistics
   */
  getOperationStats() {
    const total = this.logs.length;
    const denied = this.logs.filter((l) => l.status === 'denied').length;
    const allowed = this.logs.filter((l) => l.status === 'allowed').length;

    return {
      total,
      allowed,
      denied,
      denialRate: total > 0 ? (denied / total) * 100 : 0,
      byTable: this.logs.reduce(
        (acc, log) => {
          if (!acc[log.table]) {
            acc[log.table] = { allowed: 0, denied: 0 };
          }
          if (log.status === 'allowed') {
            acc[log.table].allowed++;
          } else {
            acc[log.table].denied++;
          }
          return acc;
        },
        {} as Record<string, { allowed: number; denied: number }>
      ),
      avgDuration: this.logs.reduce((sum, log) => sum + log.duration, 0) / total,
    };
  }

  /**
   * Clear all logs
   */
  clear() {
    this.errors = [];
    this.logs = [];
  }

  /**
   * Export logs for analysis
   */
  exportLogs() {
    return {
      errors: this.errors,
      operations: this.logs,
      stats: {
        errors: this.getErrorStats(),
        operations: this.getOperationStats(),
      },
    };
  }
}

// Export singleton instance
export const rlsMonitor = new RLSMonitor();

/**
 * Middleware helper for Next.js API routes
 * Tracks RLS operations and errors
 */
export function withRLSMonitoring(
  handler: (req: any, context: any) => Promise<Response>
) {
  return async (req: any, context: any) => {
    const startTime = performance.now();
    const userId = req.headers.get('x-user-id') || 'anonymous';

    try {
      const response = await handler(req, context);

      // Log successful operation
      const duration = performance.now() - startTime;
      rlsMonitor.logOperation({
        userId,
        operation: (req.method as any) || 'SELECT',
        table: context.table || 'unknown',
        duration,
        status: 'allowed',
        rowsAffected: parseInt(
          response.headers.get('x-rows-affected') || '0'
        ),
      });

      return response;
    } catch (error) {
      const duration = performance.now() - startTime;

      if (error instanceof Error && rlsMonitor.isRLSError(error)) {
        rlsMonitor.logError({
          userId,
          operation: (req.method as any) || 'SELECT',
          table: context.table || 'unknown',
          message: error.message,
          error,
          context: {
            path: req.nextUrl?.pathname,
            duration,
          },
        });
      }

      throw error;
    }
  };
}

/**
 * Helper to check if user can access resource
 */
export async function checkUserAccess(
  userId: string,
  table: string,
  recordOwnerId: string | null | undefined
): Promise<boolean> {
  // If no owner specified, assume it's a public resource
  if (!recordOwnerId) {
    return true;
  }

  // Check if user owns the record
  const hasAccess = userId === recordOwnerId;

  if (!hasAccess) {
    rlsMonitor.logOperation({
      userId,
      operation: 'SELECT',
      table,
      duration: 0,
      status: 'denied',
      context: {
        recordOwnerId,
        reason: 'User does not own record',
      },
    });
  }

  return hasAccess;
}

/**
 * Helper to validate RLS context
 */
export function validateRLSContext(userId: string | null | undefined) {
  if (!userId) {
    return {
      valid: false,
      error: 'No authenticated user context',
    };
  }

  if (typeof userId !== 'string') {
    return {
      valid: false,
      error: 'Invalid user ID type',
    };
  }

  return {
    valid: true,
  };
}

/**
 * API endpoint to get RLS statistics (development only)
 */
export async function handleRLSStats(req: any) {
  if (process.env.NODE_ENV !== 'development') {
    return new Response('Not available in production', { status: 403 });
  }

  if (req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }

  const stats = rlsMonitor.exportLogs();
  return new Response(JSON.stringify(stats), {
    headers: { 'Content-Type': 'application/json' },
  });
}
