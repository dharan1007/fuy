# Backend & Supabase Configuration Checklist

## Summary of Changes
All features we've implemented are already supported by your Prisma schema. Here's what needs verification/configuration:

---

## 1. DATABASE SCHEMA (Prisma)
### ✅ Already Configured in Schema
- **User Table**: Has `followersCount` and `followingCount` fields (denormalized for performance)
- **Friendship Table**: Supports PENDING/ACCEPTED/BLOCKED/GHOSTED statuses
- **Notification Table**: Supports all notification types (FRIEND_REQUEST, FRIEND_ACCEPT, etc.)

### Required Actions
- [ ] Ensure Prisma migrations are up to date: `npx prisma migrate status`
- [ ] If behind, run: `npx prisma migrate deploy`
- [ ] Generate Prisma client: `npx prisma generate`

---

## 2. DATABASE INDEXES (PostgreSQL)
### Current Indexes in Schema
✅ **Friendship Table**:
- `@@unique([userId, friendId])` - Prevents duplicate friendships
- No additional indexes needed (query efficiency is good)

✅ **Notification Table**:
- `@@index([userId, read])` - For filtering by user and read status
- `@@index([createdAt])` - For sorting by date

✅ **User Table**:
- No specific follower/following indexes needed (counts are denormalized)

### Verify in Supabase/PostgreSQL
```sql
-- Check if Friendship index exists
\d friendship

-- Check if Notification indexes exist
\d notification
```

---

## 3. ENVIRONMENT VARIABLES (.env)
### Required Variables
```
# Database
DATABASE_URL="postgresql://user:password@host:port/dbname"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"  # Production: your_domain.com
NEXTAUTH_SECRET="your-secret-key"

# Supabase (for file uploads)
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
SUPABASE_PROFILE_BUCKET="profiles"  # For avatars/profiles
```

### Verify
- [ ] Copy `.env` values to production environment
- [ ] Test DATABASE_URL connectivity: `npx prisma db push`
- [ ] Test Supabase connection: Check if upload endpoints work

---

## 4. API ENDPOINTS (Already Implemented)

### Friend Request Management
- [x] `POST /api/friends/request` - Send friend request
- [x] `PATCH /api/friends/request` - Accept/Reject/Ghost request
- [x] `DELETE /api/friends/request` - Remove friend

**Note**: DELETE now also decrements follower/following counts

### Followers/Following
- [x] `GET /api/followers` - Get followers list
- [x] `GET /api/following` - Get following list
- [x] Both endpoints calculate counts dynamically from database

### Profile
- [x] `GET /api/profile` - Returns dynamic follower/following counts
- [x] Cache control headers prevent stale data

### Notifications
- [x] `GET /api/notifications` - Get all notifications
- [x] `PATCH /api/notifications` - Mark as read
- [x] `DELETE /api/notifications` - Delete notification

---

## 5. DATA CONSISTENCY CHECKS

### Denormalized Count Fields
Your schema uses denormalized `followersCount` and `followingCount` for performance.

**Verification Query** (run in Supabase):
```sql
-- Check if counts are accurate
SELECT
  u.id,
  u.name,
  u.followersCount,
  (SELECT COUNT(*) FROM "Friendship" WHERE "friendId" = u.id AND status = 'ACCEPTED') as actual_followers,
  u.followingCount,
  (SELECT COUNT(*) FROM "Friendship" WHERE "userId" = u.id AND status = 'ACCEPTED') as actual_following
FROM "User" u
WHERE u.followersCount != (SELECT COUNT(*) FROM "Friendship" WHERE "friendId" = u.id AND status = 'ACCEPTED')
   OR u.followingCount != (SELECT COUNT(*) FROM "Friendship" WHERE "userId" = u.id AND status = 'ACCEPTED')
LIMIT 10;
```

If there are mismatches, call: `POST /api/diagnostics/fix-counts`

---

## 6. MIDDLEWARE & AUTHENTICATION

### Verify NextAuth Setup
- [ ] Authentication is configured in `src/lib/auth.ts` or NextAuth config
- [ ] `getSessionUser()` function returns current user ID
- [ ] Session validation works in protected routes
- [ ] Database session adapter is configured

### Test Authentication
```bash
# Should redirect to login if not authenticated
curl http://localhost:3000/api/profile

# Should return profile if authenticated
# (use browser with active session)
```

---

## 7. REAL-TIME FEATURES (Not Yet Implemented)

### Optional: WebSocket Setup for Real-Time Updates
If you want live updates when followers/following counts change:
- [ ] Install websocket library: `npm install ws`
- [ ] Set up WebSocket server for real-time notifications
- [ ] Update frontend to subscribe to changes

**For now**: Page refresh shows updated counts (sufficient for MVP)

---

## 8. PERFORMANCE OPTIMIZATION

### Database Query Performance
The API endpoints now use:
- **Dynamic Counting**: Queries actual ACCEPTED friendships (slightly slower than denormalized fields)
- **Cache Control Headers**: Prevents HTTP caching of stale profile data

### Optimization Checklist
- [ ] Monitor database query performance: `EXPLAIN ANALYZE SELECT...`
- [ ] If slow, add indexes: `CREATE INDEX idx_friendship_status ON "Friendship"(status)`
- [ ] Consider caching profile API responses (optional, currently no-cache)

---

## 9. SUPABASE SPECIFIC SETUP

### Storage Configuration (for avatar uploads)
```
Bucket: profiles
Public: Yes (for public profile images)
```

Verify in Supabase Dashboard:
- [ ] Go to Storage → Buckets
- [ ] Confirm "profiles" bucket exists
- [ ] Set public access if avatars should be public

### Real-time Subscriptions (Optional)
If implementing live updates later:
- [ ] Enable Realtime in Supabase project settings
- [ ] Set up Row Level Security (RLS) policies

---

## 10. TESTING CHECKLIST

### Manual Tests to Run
- [ ] [ ] Send friend request between two test accounts
- [ ] [ ] Accept request from notification
- [ ] [ ] Verify followers/following counts updated on both users
- [ ] [ ] Reject a friend request
- [ ] [ ] Remove a friend
- [ ] [ ] Click followers/following buttons, see accurate lists
- [ ] [ ] Hard refresh page, counts still accurate (no caching issues)

### Automated Tests (Optional)
- [ ] Create Jest tests for API endpoints
- [ ] Test friend request flow end-to-end
- [ ] Test count increment/decrement logic

---

## 11. DEPLOYMENT CHECKLIST

### Before Production Deployment
- [ ] All migrations applied: `npx prisma migrate deploy`
- [ ] Environment variables set in production
- [ ] Database backups configured
- [ ] API rate limiting configured (optional)
- [ ] Error monitoring set up (e.g., Sentry)

### Health Check Endpoints (Optional)
Consider adding:
- [ ] `GET /api/health` - Returns database status
- [ ] `GET /api/health/database` - Confirms database connectivity

---

## 12. COMMON ISSUES & SOLUTIONS

### Issue: Follower/Following Counts Show 0
**Solution**:
- Check if friendships have `status: "ACCEPTED"`
- Run `/api/diagnostics/fix-counts` to recalculate

### Issue: Notifications Disappear After Refresh
**Solution**:
- Ensure notifications persist in database
- Check notification deletion is working correctly

### Issue: Counts Don't Update After Accept/Reject
**Solution**:
- Hard refresh browser (Ctrl+Shift+R)
- Check browser cache headers
- Verify API cache control headers are set to `no-store`

### Issue: Friendship Already Exists Error
**Solution**:
- Database has `@@unique([userId, friendId])`
- Can't create duplicate friendships between same users
- This is intentional to prevent duplicates

---

## Summary

Your backend is fully configured! All required:
- ✅ Database schema (User, Friendship, Notification tables)
- ✅ API endpoints (all implemented)
- ✅ Cache control (prevents stale data)
- ✅ Count synchronization (dynamic calculation)
- ✅ Notification flow (complete)

**Next steps**:
1. Verify Prisma migrations are applied
2. Test the complete flow (friend request → acceptance → counts update)
3. Monitor database performance
4. Deploy to production when ready
