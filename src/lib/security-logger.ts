/**
 * Security event logger
 * Logs security-related events for monitoring and incident response
 */

export enum SecurityEventType {
    AUTH_SUCCESS = 'AUTH_SUCCESS',
    AUTH_FAILURE = 'AUTH_FAILURE',
    RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
    INVALID_SIGNATURE = 'INVALID_SIGNATURE',
    CSRF_VIOLATION = 'CSRF_VIOLATION',
    SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
    UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
    SQL_INJECTION_ATTEMPT = 'SQL_INJECTION_ATTEMPT',
    XSS_ATTEMPT = 'XSS_ATTEMPT',
    ACCOUNT_LOCKOUT = 'ACCOUNT_LOCKOUT',
    PASSWORD_CHANGED = 'PASSWORD_CHANGED',
    SESSION_EXPIRED = 'SESSION_EXPIRED',
}

export interface SecurityEvent {
    type: SecurityEventType;
    userId?: string;
    ip?: string;
    userAgent?: string;
    path: string;
    details?: Record<string, any>;
    timestamp: Date;
    severity: 'low' | 'medium' | 'high' | 'critical';
}

class SecurityLogger {
    private static instance: SecurityLogger;
    private events: SecurityEvent[] = [];
    private maxEvents = 10000;

    private constructor() {
        // Clean up old events every hour
        setInterval(() => this.cleanup(), 60 * 60 * 1000);
    }

    static getInstance(): SecurityLogger {
        if (!SecurityLogger.instance) {
            SecurityLogger.instance = new SecurityLogger();
        }
        return SecurityLogger.instance;
    }

    /**
     * Log a security event
     */
    log(event: Omit<SecurityEvent, 'timestamp'>): void {
        const fullEvent: SecurityEvent = {
            ...event,
            timestamp: new Date(),
        };

        this.events.push(fullEvent);

        // Console log for immediate visibility
        const logLevel = this.getLogLevel(event.severity);
        console[logLevel]('[SECURITY]', {
            type: event.type,
            severity: event.severity,
            userId: event.userId || 'anonymous',
            path: event.path,
            ip: event.ip,
            details: event.details,
        });

        // Alert on critical events
        if (event.severity === 'critical') {
            this.alertCritical(fullEvent);
        }

        // Trim old events if needed
        if (this.events.length > this.maxEvents) {
            this.events = this.events.slice(-this.maxEvents);
        }
    }

    /**
     * Get recent security events
     */
    getRecentEvents(limit: number = 100): SecurityEvent[] {
        return this.events.slice(-limit);
    }

    /**
     * Get events by type
     */
    getEventsByType(type: SecurityEventType, limit: number = 100): SecurityEvent[] {
        return this.events
            .filter(e => e.type === type)
            .slice(-limit);
    }

    /**
     * Get events by user
     */
    getEventsByUser(userId: string, limit: number = 100): SecurityEvent[] {
        return this.events
            .filter(e => e.userId === userId)
            .slice(-limit);
    }

    /**
     * Check for suspicious patterns
     */
    detectSuspiciousActivity(userId?: string, ip?: string): boolean {
        const recentEvents = this.events.slice(-100);
        const timeWindow = 5 * 60 * 1000; // 5 minutes
        const now = Date.now();

        // Failed login attempts
        const failedLogins = recentEvents.filter(
            e => e.type === SecurityEventType.AUTH_FAILURE &&
                (userId ? e.userId === userId : e.ip === ip) &&
                now - e.timestamp.getTime() < timeWindow
        );

        if (failedLogins.length >= 5) {
            return true;
        }

        // Rate limit violations
        const rateLimitViolations = recentEvents.filter(
            e => e.type === SecurityEventType.RATE_LIMIT_EXCEEDED &&
                (userId ? e.userId === userId : e.ip === ip) &&
                now - e.timestamp.getTime() < timeWindow
        );

        if (rateLimitViolations.length >= 3) {
            return true;
        }

        // Multiple security violations
        const securityViolations = recentEvents.filter(
            e => ['high', 'critical'].includes(e.severity) &&
                (userId ? e.userId === userId : e.ip === ip) &&
                now - e.timestamp.getTime() < timeWindow
        );

        if (securityViolations.length >= 3) {
            return true;
        }

        return false;
    }

    private getLogLevel(severity: string): 'log' | 'warn' | 'error' {
        switch (severity) {
            case 'critical':
            case 'high':
                return 'error';
            case 'medium':
                return 'warn';
            default:
                return 'log';
        }
    }

    private alertCritical(event: SecurityEvent): void {
        // In production, this would send alerts via email, SMS, Slack, etc.
        console.error('🚨 CRITICAL SECURITY EVENT 🚨', {
            type: event.type,
            userId: event.userId,
            ip: event.ip,
            path: event.path,
            details: event.details,
            timestamp: event.timestamp.toISOString(),
        });

        // TODO: Integrate with alerting service (e.g., Sentry, PagerDuty)
    }

    private cleanup(): void {
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        this.events = this.events.filter(
            e => e.timestamp.getTime() > oneDayAgo
        );
    }
}

export const securityLogger = SecurityLogger.getInstance();
