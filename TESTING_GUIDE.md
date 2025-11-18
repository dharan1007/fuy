# Backend Testing & Deployment Guide

## ✅ Verification Summary

Your backend setup is complete and ready for testing:

- ✅ **Prisma Database Schema**: Synced with database
- ✅ **Environment Variables**: All configured (DATABASE_URL, NEXTAUTH, Supabase)
- ✅ **Application Build**: Successful (npm run build passes)
- ✅ **Supabase Connection**: Active and authenticated
- ✅ **All API Endpoints**: Implemented and ready

---

## 1. LOCAL TESTING (Development)

### Start Development Server
```bash
npm run dev
```
Opens application at: http://localhost:3000

### Test Follower/Following System

#### Test Case 1: Send Friend Request
1. Open browser → http://localhost:3000
2. Sign in with a test account (create 2 test accounts if needed)
3. Navigate to search or another user's profile
4. Click "Add Friend" or equivalent button
5. **Expected**: Friend request sent successfully (no error message)

#### Test Case 2: Accept Friend Request & Verify Counts
1. Sign out from first account
2. Sign in with second account (recipient)
3. Check notifications page
4. Click "Accept" on the friend request notification
5. **Expected**:
   - Notification disappears after accept
   - Follower count increases by 1 for recipient
   - Following count increases by 1 for sender

#### Test Case 3: Verify Counts on Both Users
1. User A (sender): Check profile → Should show "X Following" (increased by 1)
2. User B (recipient): Check profile → Should show "X Followers" (increased by 1)
3. **Expected**: Counts match on both profiles

#### Test Case 4: Remove Friend
1. From follower/following modal, click remove button
2. **Expected**:
   - Counts decrement on both users
   - Modal updates immediately

### Test Notification System

#### Test Case 5: Notification Lifecycle
1. Send friend request → Notification appears on recipient
2. Accept request → Notification deletes automatically
3. Reject request → Notification deletes automatically
4. Ghost request → Notification deletes automatically
5. **Expected**: All actions delete notification after completion

### Test Count Accuracy

#### Test Case 6: Verify Count Synchronization
1. Open browser DevTools → Console
2. Run manual count check:
```javascript
// Check if counts are accurate
const profile = await fetch('/api/profile').then(r => r.json());
console.log('Followers:', profile.followersCount, 'Following:', profile.followingCount);
```
3. **Expected**: Counts match actual friendships in database

---

## 2. MANUAL DATABASE VERIFICATION

### View Database in Supabase Dashboard

1. Go to https://supabase.com/dashboard
2. Select your project
3. Navigate to **SQL Editor**

#### Check User Counts
```sql
SELECT id, name, followersCount, followingCount
FROM "User"
LIMIT 5;
```

#### Check Friendships
```sql
SELECT
  f.id,
  f.userId,
  f.friendId,
  f.status,
  u1.name as "user_name",
  u2.name as "friend_name"
FROM "Friendship" f
LEFT JOIN "User" u1 ON f.userId = u1.id
LEFT JOIN "User" u2 ON f.friendId = u2.id
LIMIT 10;
```

#### Check Notification Log
```sql
SELECT
  id,
  userId,
  type,
  message,
  read,
  createdAt
FROM "Notification"
ORDER BY createdAt DESC
LIMIT 10;
```

#### Verify Count Accuracy
```sql
-- Find any mismatches between stored counts and actual friendships
SELECT
  u.id,
  u.name,
  u.followersCount as stored_followers,
  (SELECT COUNT(*) FROM "Friendship" WHERE friendId = u.id AND status = 'ACCEPTED') as actual_followers,
  u.followingCount as stored_following,
  (SELECT COUNT(*) FROM "Friendship" WHERE userId = u.id AND status = 'ACCEPTED') as actual_following
FROM "User" u
WHERE u.followersCount != (SELECT COUNT(*) FROM "Friendship" WHERE friendId = u.id AND status = 'ACCEPTED')
   OR u.followingCount != (SELECT COUNT(*) FROM "Friendship" WHERE userId = u.id AND status = 'ACCEPTED')
LIMIT 10;
```

**If mismatches found**: Call `POST /api/diagnostics/fix-counts` to auto-correct

---

## 3. API ENDPOINT TESTING

### Using cURL or Postman

#### Get Current User Profile
```bash
curl -X GET http://localhost:3000/api/profile \
  -H "Cookie: [your_session_cookie]"
```
**Response** should include:
- `name`: User's name
- `followersCount`: Number of followers
- `followingCount`: Number of following
- `stats`: Object with friends, posts, followers, following counts

#### Get Followers List
```bash
curl -X GET http://localhost:3000/api/followers \
  -H "Cookie: [your_session_cookie]"
```
**Response** should include array of follower objects

#### Get Following List
```bash
curl -X GET http://localhost:3000/api/following \
  -H "Cookie: [your_session_cookie]"
```
**Response** should include array of following objects

#### Send Friend Request
```bash
curl -X POST http://localhost:3000/api/friends/request \
  -H "Content-Type: application/json" \
  -H "Cookie: [your_session_cookie]" \
  -d '{"friendId": "USER_ID_HERE"}'
```

#### Accept Friend Request
```bash
curl -X PATCH http://localhost:3000/api/friends/request \
  -H "Content-Type: application/json" \
  -H "Cookie: [your_session_cookie]" \
  -d '{"friendshipId": "FRIENDSHIP_ID", "action": "ACCEPT"}'
```

#### Get Notifications
```bash
curl -X GET http://localhost:3000/api/notifications \
  -H "Cookie: [your_session_cookie]"
```

---

## 4. COMMON ISSUES & SOLUTIONS

### Issue: Counts Still Show Incorrect Numbers
**Solution**:
1. Hard refresh browser: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
2. Clear browser cache/cookies
3. Call `POST /api/diagnostics/fix-counts` to sync database
4. Refresh page

### Issue: Notifications Don't Appear
**Solution**:
1. Check if notifications are being created in database (Supabase SQL editor)
2. Verify API endpoint `/api/notifications` returns data
3. Check browser console for errors
4. Verify you're on the receiving end of a FRIEND_REQUEST notification type

### Issue: Notification Doesn't Delete After Action
**Solution**:
1. Check browser console for errors
2. Verify API response is successful (Status 200)
3. Hard refresh page
4. Check Supabase database - notification should be deleted

### Issue: Counts Don't Update After Accept
**Solution**:
1. Check if friendship status changed to ACCEPTED (Supabase SQL)
2. Verify user's followersCount/followingCount incremented in database
3. Hard refresh browser (cache issue)
4. Check `/api/profile` response includes updated counts

---

## 5. PERFORMANCE MONITORING

### Database Query Performance

Check if queries are slow:
```bash
# Monitor Prisma logs
DEBUG=prisma:* npm run dev
```

Optimize if needed:
```sql
-- Add index for faster friendship queries by status
CREATE INDEX idx_friendship_status_userId ON "Friendship"(userId, status);
CREATE INDEX idx_friendship_status_friendId ON "Friendship"(friendId, status);
```

---

## 6. DEPLOYMENT CHECKLIST

Before deploying to production:

- [ ] All environment variables set in production
  ```
  DATABASE_URL=
  NEXTAUTH_SECRET=
  NEXTAUTH_URL=https://yourdomain.com
  SUPABASE_URL=
  SUPABASE_SERVICE_ROLE=
  SUPABASE_PROFILE_BUCKET=profiles
  ```

- [ ] Database backups configured in Supabase
  - Go to Supabase Dashboard → Settings → Backups
  - Enable automated daily backups

- [ ] Supabase storage bucket "profiles" exists and is public
  - Supabase Dashboard → Storage → Buckets
  - Create "profiles" bucket if missing
  - Set to public for avatar display

- [ ] Run complete test flow:
  1. Send friend request between accounts
  2. Accept request
  3. Verify counts update
  4. Remove friend
  5. Verify counts decrement
  6. Hard refresh page - counts still correct

- [ ] Verify API rate limiting (optional)
  - Consider adding rate limiting for `/api/friends/*` endpoints
  - Prevent spam friend requests

- [ ] Set up error monitoring (optional)
  - Sentry, LogRocket, or similar service
  - Configure in production environment

- [ ] Run build test
  ```bash
  npm run build
  ```
  Should complete with exit code 0

- [ ] Test in staging environment first
  - Deploy to staging URL
  - Run all test cases
  - Verify performance

---

## 7. PRODUCTION DEPLOYMENT

### Deploy to Vercel (Recommended)

```bash
# Push code to GitHub
git push origin main

# Vercel automatically deploys from main branch
# Set environment variables in Vercel Dashboard:
# Settings → Environment Variables
```

### Deploy to Other Platforms

1. Set all environment variables
2. Run migrations: `npx prisma migrate deploy`
3. Build application: `npm run build`
4. Start server: `npm start`

---

## 8. POST-DEPLOYMENT TESTING

After deploying to production:

1. Test sign-up and authentication
2. Send friend request between accounts
3. Accept request and verify counts update
4. Remove friend and verify counts decrement
5. Check notifications appear and delete correctly
6. Monitor error logs for any issues

---

## Summary

Your backend is fully configured and ready for:
- ✅ Local testing
- ✅ Staging deployment
- ✅ Production deployment

Follow the test cases above to verify everything works before deploying to users.
