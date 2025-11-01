# FUY Application - Production Deployment Guide

This guide provides step-by-step instructions for deploying the FUY application to a production environment.

## Prerequisites

- Node.js 18+
- PostgreSQL database
- Supabase account (for file storage)
- Resend account (for email)
- NextAuth credentials
- A production server or hosting platform (Vercel, AWS, Railway, etc.)

## Environment Setup

### 1. Create Production Environment Variables

Copy `.env.example` to your production server and update all values:

```bash
cp .env.example .env.production.local
```

**Critical variables to set:**

- `DATABASE_URL`: PostgreSQL connection string (NOT SQLite)
- `NEXTAUTH_SECRET`: Generate with `openssl rand -base64 32`
- `NEXTAUTH_URL`: Your production domain (https://yourdomain.com)
- `NEXT_PUBLIC_APP_URL`: Your production domain
- `RESEND_API_KEY`: Your Resend API key
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE`: Your Supabase service role key
- `NODE_ENV`: Set to `production`

### 2. Database Migration

Before deploying, run database migrations:

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# (Optional) Seed database with initial data
npx prisma db seed
```

## Deployment Steps

### Option A: Vercel (Recommended for Next.js)

1. Push code to GitHub/GitLab
2. Connect repository to Vercel
3. Add environment variables in Vercel dashboard
4. Set Node.js version to 18+
5. Vercel will auto-deploy on git push

### Option B: Self-Hosted (VPS, AWS EC2, etc.)

#### Build the Application

```bash
# Install dependencies
npm install --legacy-peer-deps

# Build for production
npm run build

# The `.next` and `node_modules` directories are created
```

#### Run the Application

```bash
# Set production environment
export NODE_ENV=production

# Start the application
npm start

# Or use a process manager like PM2
pm2 start npm --name "fuy" -- start
pm2 startup
pm2 save
```

#### With Docker

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3000

CMD ["npm", "start"]
```

```bash
# Build image
docker build -t fuy:latest .

# Run container
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e NEXTAUTH_SECRET="..." \
  -e NEXTAUTH_URL="https://yourdomain.com" \
  fuy:latest
```

## Post-Deployment Checklist

- [ ] All environment variables are set correctly
- [ ] Database migrations have run successfully
- [ ] Application starts without errors: `npm start`
- [ ] Health check endpoint is responding (GET /)
- [ ] Authentication works (login/signup)
- [ ] Database queries work (dashboard loads data)
- [ ] File uploads to Supabase work
- [ ] Emails are sent via Resend
- [ ] Error logging is working
- [ ] HTTPS is enabled
- [ ] CORS is configured correctly
- [ ] Rate limiting is in place

## Security Considerations

### Environment Variables
- Never commit `.env` files to version control
- Use strong, randomly generated `NEXTAUTH_SECRET`
- Rotate API keys regularly
- Use least-privilege database user accounts

### Database
- Enable SSL for database connections
- Regular backups enabled
- Database user has minimal necessary permissions
- No public database access

### Application
- Enable HTTPS only
- Set secure headers (CORS, CSP, X-Frame-Options)
- Rate limiting on API endpoints
- Regular security audits
- Keep dependencies updated

### API Routes
- All endpoints require authentication where applicable
- Validate and sanitize all inputs
- Implement proper error handling (no sensitive data in errors)
- Use logger utility for error tracking (not console.log)

## Monitoring & Maintenance

### Logging
The application uses a custom logger in `src/lib/logger.ts`:
- Errors always logged in production
- Debug/info logs only in development
- No sensitive data in logs

### Health Checks
```bash
# Check if application is running
curl https://yourdomain.com/

# Check API health
curl https://yourdomain.com/api/health
```

### Database Maintenance
```bash
# View pending migrations
npx prisma migrate status

# Check database integrity
npx prisma db execute --stdin < check_schema.sql

# Backup database
pg_dump DATABASE_URL > backup.sql
```

### Updates & Upgrades

```bash
# Update dependencies safely
npm update

# Run tests before deploying
npm test

# Build and verify
npm run build

# Deploy
git push (if using auto-deploy)
# or
npm start (if self-hosted)
```

## Troubleshooting

### Database Connection Issues
```bash
# Test database connection
npx prisma db execute --stdin < "SELECT 1"

# Check connection string
echo $DATABASE_URL
```

### Missing Prisma Models
```bash
# Regenerate Prisma client
npx prisma generate

# Check schema is valid
npx prisma validate
```

### Build Failures
```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules
npm install --legacy-peer-deps

# Rebuild
npm run build
```

### Authentication Issues
- Verify `NEXTAUTH_SECRET` is set and consistent
- Check `NEXTAUTH_URL` matches your domain
- Clear browser cookies and retry login

## Performance Optimization

- Enable caching headers for static assets
- Use CDN for image serving (Supabase supports this)
- Monitor bundle size: `npm run analyze` (if configured)
- Database query optimization with Prisma indices
- Implement pagination for large data sets

## Support & Contacts

- GitHub Issues: [Project Repository]
- Email: support@yourdomain.com
- Documentation: [Wiki/Docs Site]

---

Last Updated: 2025-11-01
Version: 1.0
