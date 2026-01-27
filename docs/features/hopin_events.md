# Hopin Events Feature Documentation

## 1. Feature Overview
**Feature Name:** Hopin (Events & Plans)
**File Location:** `mobile/app/hopin/index.tsx` (and related in `hopin/`)
**Primary Purpose:** A social event management and discovery platform. It allows users to "Hop in" to plans, create their own events, and verify attendance. It integrates a Map view, an Explore feed, and a Dashboard for tickets.

## 2. Visual Interface & Design

### A. Navigation Architecture
- **Tab Bar (Bottom Overlay):**
    1.  `MAP`: Geospatial view.
    2.  `EXPLORE`: Feed of events.
    3.  `DASHBOARD`: Personal management.
- **Header:**
    - "DISCOVER Hopin" (Changes style based on tab).
    - Back button.

### B. View 1: Map View (`react-native-maps`)
- **Map:** Full screen Google/Apple map.
- **Custom Style:** Dark mode keys (`darkMapStyle`) for aesthetic consistency.
- **Markers:**
    - **Events:** Pins showing event locations.
    - **Interaction:** Tapping a pin opens a "Selected Plan Card" overlay at bottom.
- **Creation:** Long-pressing the map drops a temporary pin -> "Create Event Here" card appears.

### C. View 2: Explore Feed
- **Search:** Search bar with filter icon.
- **Sections:**
    1.  **Invitations:** Horizontal scroll of "Invite Tickets" (if any).
    2.  **Popular:** Large "Featured Cards" with high attendance.
    3.  **Discover:** Grid of "Grid Cards" for browsing.
    4.  **Results:** List of "Compact Cards" when searching.
- **Card Design:**
    - **Featured:** Large image, gradient overlay, massive date typography (Day/Month), Title.
    - **Grid:** Square aspect ratio, smaller details.

### D. View 3: Dashboard
- **Sub-Tabs:** `HOSTING` | `JOINED` | `TICKETS`.
- **Hosting:** List of events created by user.
    - Actions: Edit, Delete, Manage Requests (Accept/Reject).
    - **Verify Button:** Opens camera/modal to verify attendee codes.
- **Joined:** Events the user is attending.
    - Shows Status: "PENDING" or "ACCEPTED".
    - **My Code:** Displays the unique 7-digit code for the user to show the host.

## 3. Key Functionalities

### A. Verification System (The "Ticket" Logic)
- **Concept:** Digital ticketing.
- **Attendee:** Gets a unique code (e.g., "1234567") upon acceptance.
- **Host:** Has a "Verify" interface. enters the code.
- **Result:** System marks member as `VERIFIED`.

### B. Event Creation
- **File:** `mobile/app/hopin/create.tsx` (referenced).
- **Inputs:** Title, Date, Location (lat/lng), Media, Description.
- **Logic:** Calls `HopinService.createPlan()`.

### C. Search & Discovery
- **Local Search:** `performSearch` filters plans (likely via API query).
- **Categories:** "Popular" (sorted by `attendeeCount`), "Upcoming" (sorted by `date`).

## 4. Data Structure
**Interface:** `Plan`
```typescript
interface Plan {
    id: string;
    title: string;
    description?: string;
    date: string; // ISO
    location?: string;
    latitude?: number;
    longitude?: number;
    mediaUrls?: string; // JSON Array
    creator_id: string;
    members?: PlanMember[];
    type?: string; // e.g. 'PARTY', 'MEETUP'
}
```

## 5. Technical Implementation code Highlights

### Map Interaction
```typescript
const handleMapLongPress = (e) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setPinnedLocation({ latitude, longitude });
    // Shows "Create Event" card
};
```

### Verification Logic
```typescript
const handleVerify = async () => {
    const result = await HopinService.verifyAttendee(planId, code);
    if (result.success) {
        showToast(`Verified: ${result.user.name}`);
    }
};
```

### Images
- Uses `JSON.parse(plan.mediaUrls)` to handle array of images.
- Fallback: `picsum.photos` seed based on ID.

## 6. User Flows
1.  **Finding an Event:**
    - User checks "Explore".
    - Sees "Beach Party".
    - Taps -> Detail Screen -> "Request to Join".
2.  **Hosting:**
    - User goes to Map -> Long Press -> "Create".
    - Fills details.
    - Dashboard -> Hosting -> Sees new event.
3.  **The Event Night:**
    - User (Guest) opens Dashboard -> Ticket -> Shows Code "998877".
    - Host opens Dashboard -> Hosting -> Verify -> Types "998877".
    - Success -> Guest marked present.

## 7. Integration
- **Social:** Events show "User Name" and Avatar of host.
- **Notifications:** "Request Accepted" would alert the user (via `notifications.tsx`).
