# RLS Testing & Monitoring Plan

## 1. RLS Coverage Review

### Tables with Row Level Security Enabled (60 total)

**User Management & Profile:**
- ✅ User (3 policies)
- ✅ Profile (3 policies)
- ✅ Account (1 policy)
- ✅ Session (1 policy)
- ✅ VerificationToken (1 policy)

**Social Features:**
- ✅ Post (4 policies)
- ✅ PostComment (4 policies)
- ✅ PostLike (3 policies)
- ✅ PostShare (2 policies)
- ✅ Friendship (2 policies)

**Communications:**
- ✅ Notification (3 policies)
- ✅ Conversation (2 policies)
- ✅ Message (2 policies)
- ✅ ChatSessionLog (2 policies)
- ✅ ChatAnalytics (1 policy)

**Content & Wellness:**
- ✅ JournalEntry (4 policies)
- ✅ JournalTemplate (1 policy - public)
- ✅ Task (4 policies)
- ✅ TaskAssignee (2 policies - collaborative)
- ✅ TaskComment (2 policies)
- ✅ TaskChecklistItem (2 policies)
- ✅ TaskTag (2 policies)
- ✅ TaskVolunteer (2 policies)

**User Data & Preferences:**
- ✅ Value (1 policy - public)
- ✅ UserValue (3 policies)
- ✅ Reminder (3 policies)
- ✅ Metric (2 policies with nullable userId)
- ✅ HappinessScore (2 policies)
- ✅ ConflictDrill (2 policies)
- ✅ BondBlueprint (2 policies)
- ✅ SerendipityLog (2 policies)

**Community & Groups:**
- ✅ Group (2 policies)
- ✅ GroupMember (2 policies - open collaborative)
- ✅ Organization (1 policy - public)
- ✅ OrgMember (1 policy - open)
- ✅ Invite (2 policies)

**Commerce:**
- ✅ Brand (2 policies - public + insert)
- ✅ Product (1 policy - public)
- ✅ ProductReview (2 policies - open)
- ✅ BrandReview (2 policies - open)
- ✅ Order (1 policy)
- ✅ OrderItem (1 policy - public)
- ✅ OrderReturn (1 policy)
- ✅ Payment (1 policy)
- ✅ Deal (1 policy - public)
- ✅ ProductAnalytics (1 policy - open)
- ✅ BrandAnalytics (1 policy - open)

**Features & Analytics:**
- ✅ FeatureSession (1 policy - open)
- ✅ FeatureSessionParticipant (1 policy - open)
- ✅ Media (2 policies)
- ✅ WebhookLog (1 policy - insert only)
- ✅ PasskeyCredential (2 policies)

**Places & Routes:**
- ✅ WaypointPhoto (1 policy - open)
- ✅ PlaceReview (1 policy - open)
- ✅ PlacePhoto (1 policy - open)
- ✅ PlacePhotoShare (1 policy - open)
- ✅ PhotoShare (1 policy - open)
- ✅ RouteWaypoint (1 policy - open)

---

## 2. Testing Strategy

### Category A: User-Owned Data (Should Restrict)
```
Test that users can ONLY access their own:
- JournalEntry (userId)
- Task (createdById)
- Reminder (userId)
- ChatSessionLog (userId)
- HappinessScore (userId)
- ConflictDrill (userId)
- BondBlueprint (userId)
- SerendipityLog (userId)
- UserValue (userId)
- ChatAnalytics (userId)
```

**Test Case A1:** User A tries to view User B's journal entries → Should DENY
**Test Case A2:** User A creates a journal entry → Should ALLOW
**Test Case A3:** User A updates own journal entry → Should ALLOW
**Test Case A4:** User A deletes own journal entry → Should ALLOW

### Category B: Shared/Collaborative Data (Open Access)
```
Test that ANYONE can access:
- GroupMember (SELECT/INSERT)
- TaskAssignee (SELECT/INSERT)
- Friendship (SELECT/INSERT)
- OrgMember (SELECT)
- ProductReview (SELECT/INSERT)
```

**Test Case B1:** Unauthenticated user reads GroupMember → Should ALLOW for SELECT
**Test Case B2:** User A inserts into TaskAssignee → Should ALLOW
**Test Case B3:** User A reads TaskAssignee data → Should ALLOW

### Category C: Public Data (Anyone Can Read)
```
Test that public data is readable:
- Post (anyone can view)
- Profile (anyone can view)
- Organization (anyone can view)
- Brand (anyone can view)
- Product (anyone can view)
- Deal (anyone can view)
```

**Test Case C1:** Unauthenticated request to GET /api/posts → Should return public posts
**Test Case C2:** User A views User B's profile → Should ALLOW

### Category D: Ownership-Based Restrictions
```
Test proper ownership checks:
- Post (userId must match for UPDATE/DELETE)
- Task (createdById must match for UPDATE/DELETE)
- Group (ownerId must match for UPDATE)
- Conversation (participantA OR participantB for INSERT)
- Message (senderId must match for INSERT)
```

**Test Case D1:** User A tries to UPDATE User B's post → Should DENY
**Test Case D2:** User A likes own post → Should DENY notification (logic check)
**Test Case D3:** User A comments on own post → Should DENY notification (logic check)

### Category E: Authenticated-Only Data
```
Test that unauthenticated requests are blocked:
- Notification (requires auth)
- Media (requires auth for INSERT)
- JournalEntry (requires auth)
```

**Test Case E1:** Unauthenticated GET /api/notifications → Should DENY
**Test Case E2:** Unauthenticated POST to upload media → Should DENY

---

## 3. API Endpoints to Test

### High Priority
- `GET /api/journal` - User's journal entries only
- `GET /api/journal/:id` - Specific journal entry (owned only)
- `POST /api/journal` - Create journal entry
- `PATCH /api/journal/:id` - Update own journal
- `DELETE /api/journal/:id` - Delete own journal
- `GET /api/posts` - Public posts (anyone)
- `POST /api/posts` - Create post (authenticated)
- `GET /api/tasks` - User's tasks only
- `GET /api/profile/:userId` - Public profile (anyone)

### Medium Priority
- `POST /api/posts/:id/comments` - Create comment (ownership check)
- `POST /api/posts/:id/like` - Like post (ownership check)
- `GET /api/chat/conversations` - User's conversations only
- `GET /api/notifications` - User's notifications only
- `POST /api/friends/request` - Friendship invite (auth check)

### Low Priority
- Reference tables (Value, JournalTemplate, Organization)
- Open collaborative tables (GroupMember, TaskAssignee)
- Analytics endpoints

---

## 4. Monitoring Setup

### Error Patterns to Monitor
```
1. RLS Policy Violations:
   - ERROR: new row violates row-level security policy
   - ERROR: permission denied for schema public

2. Type Casting Issues:
   - ERROR: operator does not exist: text = uuid
   - ERROR: invalid input syntax for type uuid

3. Null/Missing Auth:
   - NULL auth.uid() values causing unexpected denials
   - Missing user context in requests
```

### Key Metrics to Track
1. **RLS Denial Rate** - Ratio of denied queries to total queries
2. **Authentication Context Loss** - Requests missing auth.uid()
3. **Policy Performance** - Query execution time with RLS enabled
4. **False Positives** - Legitimate requests being denied

### Logging Points
```sql
-- Add to API routes:
1. Log auth.uid() value when policy denies access
2. Log user_id when policy allows access
3. Log table name and operation (SELECT/INSERT/UPDATE/DELETE)
4. Log timestamp and duration
```

---

## 5. Implementation Checklist

- [ ] Run Category A tests (User-owned data)
- [ ] Run Category B tests (Shared data)
- [ ] Run Category C tests (Public data)
- [ ] Run Category D tests (Ownership restrictions)
- [ ] Run Category E tests (Authentication)
- [ ] Monitor error logs for RLS violations
- [ ] Check query performance impact
- [ ] Verify notification logic respects RLS
- [ ] Test edge cases (deleted users, null IDs)
- [ ] Document any failures or gaps

---

## 6. Testing Tools

### Option 1: API Testing (Postman/Insomnia)
- Create test collections per category
- Use environment variables for auth tokens
- Test with/without authentication

### Option 2: Direct Database Testing
```sql
-- Test as different users:
SET LOCAL role authenticated;
SET LOCAL request.jwt.claims.sub = 'user-uuid-here';

SELECT * FROM "public"."JournalEntry";
-- Should return only user's entries
```

### Option 3: Application Integration Tests
- Write Jest/Vitest tests for API routes
- Mock Supabase auth context
- Test RLS behavior through application layer

