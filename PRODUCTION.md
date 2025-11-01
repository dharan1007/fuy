# FUY - Production Checklist

## Overview
FUY is a comprehensive goal orchestration and wellness tracking application built with Next.js, TypeScript, and Prisma.

## Application Structure

### Core Features
- **Essenz**: Goal setting and life management system with canvas-based interface
- **Awe Routes**: Travel planning with POI discovery and photo sharing
- **Wellness Tracking**: ITP plans, breathing exercises, grounding techniques, journaling
- **Chat & Collaboration**: Real-time messaging and group collaboration
- **Dashboard**: Unified view of all personal metrics and goals

### Tech Stack
- **Frontend**: React 18, Next.js 14, TypeScript, Tailwind CSS
- **Backend**: Next.js API routes, Node.js
- **Database**: PostgreSQL (production), SQLite (development)
- **Authentication**: NextAuth.js with email & WebAuthn
- **File Storage**: Supabase Storage
- **Email**: Resend API

## Production Requirements

### Servers & Services
1. **Web Server**: Node.js running Next.js application
2. **Database**: PostgreSQL 12+ instance
3. **Object Storage**: Supabase account with Storage enabled
4. **Email Service**: Resend account with verified domain
5. **Session Storage**: Database-backed (NextAuth)

### System Requirements
- Node.js 18 or higher
- 512MB RAM minimum (2GB recommended)
- 1GB free disk space minimum
- 80/443 ports available

## Critical Configuration

### Required Environment Variables
```
DATABASE_URL              # PostgreSQL connection string
NEXTAUTH_SECRET          # Authentication secret (32+ chars)
NEXTAUTH_URL             # Production URL
NEXT_PUBLIC_APP_URL      # Public application URL
RESEND_API_KEY           # Email service key
SUPABASE_URL             # File storage URL
SUPABASE_SERVICE_ROLE    # Storage authentication
NODE_ENV                 # Set to 'production'
```

### Security Hardening
- [ ] HTTPS enabled
- [ ] CORS properly configured
- [ ] Rate limiting implemented
- [ ] Database user has minimal permissions
- [ ] API keys rotated regularly
- [ ] Security headers set
- [ ] No debug/console logs in production
- [ ] Error messages don't leak sensitive data

## Deployment Verification

### Pre-Deployment Tests
```bash
# Type checking
npx tsc --noEmit

# Build validation
npm run build

# Start production server
npm start
```

### Post-Deployment Verification
1. Health check: `GET /`
2. Authentication: Login/signup flow
3. Dashboard: Data loads from database
4. File uploads: Images upload to Supabase
5. Email: Notification emails deliver
6. API: Sample API call succeeds

## Monitoring & Alerts

### Key Metrics to Monitor
- Application uptime
- Database connection pool
- Response time (p95, p99)
- Error rates
- Disk space usage
- Memory usage

### Logging Strategy
- Use `logger` utility (src/lib/logger.ts)
- Errors always logged to console/storage
- Debug logs only in development
- No sensitive data in logs
- Centralized log aggregation (e.g., Datadog, Splunk)

## Maintenance Tasks

### Weekly
- Monitor error logs
- Check performance metrics
- Verify database backups

### Monthly
- Update dependencies
- Review security advisories
- Audit access logs
- Test disaster recovery

### Quarterly
- Security assessment
- Performance optimization
- Database vacuum/analyze
- Certificate renewal check

## Rollback Procedure

1. Identify failed deployment
2. Revert to previous stable version
3. Verify application starts
4. Confirm database migrations don't break
5. Test critical user flows
6. Monitor error logs

## Key Files

| File | Purpose |
|------|---------|
| `.env.example` | Environment variables template |
| `DEPLOYMENT.md` | Detailed deployment instructions |
| `next.config.mjs` | Next.js production config |
| `src/lib/logger.ts` | Centralized logging utility |
| `prisma/schema.prisma` | Database schema |

## Common Issues & Solutions

### "Property placePhoto does not exist"
- Run `npx prisma generate` to regenerate client
- Ensure all migrations are applied

### "NEXTAUTH_SECRET not set"
- Generate new secret: `openssl rand -base64 32`
- Set in environment variables
- Restart application

### Database Connection Failed
- Verify DATABASE_URL is correct
- Check PostgreSQL is running
- Ensure network access is allowed
- Check database credentials

### High Memory Usage
- Check for memory leaks with `node --inspect`
- Review database query performance
- Implement pagination for large datasets
- Increase heap size if needed

## Performance Targets

| Metric | Target | Critical |
|--------|--------|----------|
| Page Load (p50) | < 1s | < 3s |
| API Response | < 200ms | < 500ms |
| Database Query | < 50ms | < 200ms |
| Error Rate | < 0.1% | < 1% |
| Uptime | 99.9% | 99% |

## Backup & Recovery

### Daily Backups
- Database: Automated via PostgreSQL
- Code: Version controlled in Git
- Configuration: Encrypted in secrets manager

### Recovery Process
1. Restore database from backup
2. Redeploy application code
3. Verify data integrity
4. Run database migrations if needed
5. Monitor error logs

## Support Resources

- **Documentation**: See DEPLOYMENT.md for setup
- **Issues**: Check GitHub Issues
- **Code**: Repository on GitHub
- **Community**: Discussion forums

---

**Last Updated**: 2025-11-01
**Version**: 1.0.0
**Status**: Production Ready ✓
