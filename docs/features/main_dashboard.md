# Main Dashboard Feature Documentation

## 1. Feature Overview
**Feature Name:** Main Dashboard
**File Location:** `mobile/app/dashboard.tsx`
**Primary Purpose:** The personal command center for the user. Unlike the social feed, this page monitors the user's *own* ecosystem: analytics, quick actions, connections, and personal progress across the app's various modules (Store, Wrex, Hopin).

## 2. Visual Interface & Design

### A. Header Section
- **Title:** "DASHBOARD" (Bold, Uppercase).
- **Status Badge:** "ACTIVE" (Green dot + Text) indicating account status.
- **Profile:** User avatar in the top right.
- **Back Button:** Standard navigation control.
- **Quick Actions (Pills):**
  - Horizontal row of pill-shaped buttons.
  - **Items:** "My Store", "Channel", "Connections".
  - **Style:** Contrasting colors (Black, White, Red).

### B. Analytics Grid (Data Visualization)
Organized into themed sections using cards:

1.  **ANALYTICS (General)**
    - Two-column grid layout.
    - **Cards:**
        - "TASKS DONE": Count (e.g., "12").
        - "TOTAL POSTS": Count (e.g., "45").

2.  **TOP CHAT (Social Intelligence)**
    - A list of the user's top 3 most frequent contacts.
    - **Metrics:** Message count, Estimated "Time spent" chatting.
    - **Visual:** Rank number (1, 2, 3), Avatar, Progress bar or time.
    - **Empty State:** "No chats yet" with CTA.

3.  **CONNECTIONS (Network)**
    - **Followers / Following:** Standard social counts.
    - **Engagement:** "Chats Today" vs "Past 7 Days".

4.  **GROUNDING (Wrex Integration)**
    - A holistic health card.
    - **Rows:**
        - "WORKOUT DAYS": Session count.
        - "CURRENT DIET": Plan name.
        - "BODY METRICS": Weight/Height/BMI.
        - "HEALTH CONDITIONS": Alerts.

5.  **EVENTS (Hopin Integration)**
    - "INVITES" (Pending).
    - "ATTENDED" (History).

6.  **POSTS (Content Performance)**
    - **Top Performing:** Highlights specific posts that got the most:
        - "W" (Wins)
        - "L" (Losses)
        - "CAP" (Caps)
        - "SHARE" (Shares)
        - "VIEW" (Views)
    - **Post Types:** Breakdown chip list (e.g., "CLOCKS: 5", "AUDS: 12").

7.  **BEST AUDIENCE**
    - List of users who interact most with your content (Reactions).

## 3. Data Integration & Logic

### A. Data Aggregation
The dashboard performs a massive parallel fetch (`Promise.all`) to gather data from multiple Supabase tables:
- `Profile` & `Subscription`: For connections.
- `Message`: Analyzes sender/receiver patterns for "Top Chatters".
- `Task`: Counts done/pending.
- `WorkoutSession`, `BiometricLog`: For Wrex.
- `PlanMember`: For Hopin events.
- `Post`, `Reaction`, `PostShare`: For content analytics.

### B. "Top Chatter" Algorithm
Does not just count messages.
- **Logic:** `chatCounts` object aggregates message volume per `otherId`.
- **Time Estimation:** Adds ~15 seconds of "Chat Time" per message to gamify the interaction stat.
- **Sorting:** Sorts by message count descending.

### C. "Top Post" Algorithm
- Iterates through all user posts.
- Aggregates reactions (`W`, `L`, `CAP`) and shares.
- Determines the "King" of each category (e.g., `sortedByW[0]`).
- Displays the winning content snippet.

## 4. Technical Implementation

### Components
- **`StatCard`**: Reusable box for simple Label/Value pairs.
- **`SectionTitle`**: Standardized typography for headers.
- **`TopPostRow`**: Specialized list item showing the post badge (W/L) and content.

### Styling
- **Dark Mode First:** Hardcoded black (`#000`) background implies a strong preference for dark themes in the dashboard.
- **Transparency:** Extensive use of `rgba(255,255,255,0.05)` for "Glassmorphism" card backgrounds.
- **Lucide Icons:** Heavily used to represent categories (`Dumbbell`, `ShoppingBag`, `BarChart3`).

## 5. User Value
- **Quantified Self:** Gives the user a "God View" of their digital existence on Fuy.
- **Motivation:** "Tasks Done" and "Workbook Days" encourage productivity.
- **Social Insight:** "Best Audience" helps creators know who their true fans are.

## 6. Edge Cases
- **New User:** "Empty States" populate sections with "No data yet" and CTAs (e.g., "Start Chatting", "Log Workout").
- **Private Profiles:** Dashboard is private to the user; others cannot see this view.
