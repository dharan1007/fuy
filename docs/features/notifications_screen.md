# Notifications Feature Documentation

## 1. Feature Overview
**Feature Name:** Activity / Notifications
**File Location:** `mobile/app/notifications.tsx` (and `mobile/app/activity.tsx` legacy)
**Primary Purpose:** Aggregates all social signals: friend requests, follows, likes, comments, and system alerts. It serves as the inbox for user interactions.

## 2. Visual Interface & Design

### A. List Layout
- **Container:** Full screen, black background.
- **Filter Tabs:**
    - "ALL": Shows everything.
    - "UNREAD": Filters for `read: false`.
- **Refresh Control:** Standard pull-to-refresh.

### B. Notification Item Design
- **New/Read State:** Unread items have a slightly lighter background (`rgba(255,255,255,0.03)`) or border highlight to differentiate from transparent read items.
- **Iconography:**
    - **Follow:** `UserPlus` / `Users`.
    - **Like:** `Heart`.
    - **Comment:** `MessageCircle`.
    - **Warning/System:** `Bell`.
- **Avatar:** The sender's profile picture or a fallback icon in a circle.
- **Text:**
    - **Actor:** Name (Bold).
    - **Action:** "wants to follow you", "liked your post".
    - **Timestamp:** "2h ago" (uppercase).

### C. Interactive Elements
For "Friend Requests" (or Follow Requests depending on nomenclature):
- **Action Row:** Three distinct buttons.
    1.  **ACCEPT** (Check): Confirms request.
    2.  **REJECT** (X): Denies request.
    3.  **GHOST** (EyeOff): Hides the request explicitly without notifying sender (Stealth rejection).

## 3. Data Logic & Aggregation

### A. Multi-Source Fetching
The screen aggregates data from two distinct tables (Supabase):
1.  **`Friendship` Table:**
    - Handles requests (`status: 'PENDING'`).
    - Maps to "User X wants to follow you".
2.  **`Notification` Table:**
    - Handles generic events (Likes, Comments).
    - `type`: 'POST_LIKE', 'COMMENT', 'FOLLOW'.

### B. "Ghosting" Logic
- Unique feature of Fuy.
- Instead of just blocking, you can "Ghost" a request using `isGhosted: true`.
- The request disappears for you but might look pending to them (inferred).

### C. Optimistic UI
- `handleFriendAction` immediately updates the local state:
    ```typescript
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, status: 'ACCEPTED' } : n));
    ```
- Then performs the `supabase.update()` in background.
- Reverts on error.

## 4. User Interactions
1.  **Accepting a Friend:**
    - Tap "Accept".
    - UI updates to show "ACCEPTED" badge.
    - Subscription created in backend.
2.  **Following Back:**
    - If someone follows you, a "Follow Back" button appears.
    - Tapping it creates a reciprocal `Subscription`.
3.  **Marking Read:**
    - Opening the screen typically triggers a "Mark all as read" API call for the viewed batch (or explicit tap logic).
4.  **Navigation:**
    - Tapping the notification body navigates to the relevant Profile or Post.

## 5. Technical Implementation Details
- **Filtering:** done mostly in memory or simple query parameters (`.eq('read', false)`).
- **Sender Resolution:**
    - The `Notification` table often stores a `postId` or `actorId`.
    - The code fetches the list of related `Users` (Senders) in a batch `in('id', senderIds)` to resolve names/avatars efficiently, minimizing N+1 query problems.

## 6. Edge Cases
- **Ghosted Requests:** Logic explicitly excludes `isGhosted` items unless the user ghosted them (history view).
- **Duplicate Actions:** Prevents clicking "Accept" twice by swapping the button with a static badge.
- **Empty State:** "NO NOTIFICATIONS" with a large Bell icon.
