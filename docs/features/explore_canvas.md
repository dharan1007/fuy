# Explore Canvas Feature Documentation

## 1. Feature Overview
**Feature Name:** Explore (Infinite Canvas)
**File Location:** `mobile/app/(tabs)/explore.tsx`
**Primary Purpose:** A radically different discovery experience. Instead of a list, the Explore page is a 2D "Infinite Canvas" where content nodes (Posts, Channels, Communities) drift and scatter. It encourages serendipitous discovery over algorithmic linearity.

## 2. Visual Interface & Design

### A. The Infinite Canvas
- **Background:** Deep space/void aesthetic, potentially with animated particle stars or floating geometry.
- **Navigation:**
    - **Pan:** User drags a finger to move the viewport (Camera) around the 2D plane.
    - **Zoom:** Pinch-to-zoom (implied capability for 2D maps).
- **Physics:** Nodes aren't static; they might have slight floating animations ("breath" effect) to make the world feel alive.

### B. Content Nodes ( The Floating Items)
Content is rendered as "Cards" positioned absolutely (`top`, `left`) on the canvas.

1.  **Post Nodes:**
    - Small preview cards.
    - Thumbnail image.
    - Title/Header.
2.  **Chan Nodes (Channels):**
    - Circular or Hexagonal shapes? (Distinguishable from posts).
    - Represents a group chat or community.
3.  **Special Types (Filters):**
    - `Auds` (Audio)
    - `Chapters` (Text)
    - `Puds`
    - `Sixts`
    - `Slashes`

### C. HUD (Heads Up Display)
Overlaying the canvas are fixed UI elements:
- **Search Bar:** Top constrained. "Search the void..."
- **Filter Tabs:**
    - "Posts", "Chans", "Auds", "Chapters".
    - Tapping one filters the visible nodes on the canvas (or snaps the camera to a cluster of that type).
- **Compass / Reset:** A button to return to specific coordinates (0,0) if lost.

## 3. Technical Implementation Details

### A. 2D Rendering
- **Coordinates:** Each content item needs `x` and `y` properties.
- **Movement:**
    - Likely uses `react-native-reanimated` and `react-native-gesture-handler`.
    - `translationX` and `translationY` shared values drive the view's transform.
    - **Performance:** Accessing `transform` on the UI thread ensures 60fps panning.

### B. "Slashes" Modal
- **Concept:** A command palette or shortcuts menu triggered from Explore.
- **UI:** Modal overlay.
- **Purpose:** Quick access to deep features (e.g., "/create-chan", "/trending").

### C. Data Fetching
- **Batched Loading:** As the user pans to the edge of the loaded area, new "Chunks" of the map must load.
- **Supabase:**
    - Queries `Post` and `Chan` tables.
    - Likely randomizes coordinates if not pre-assigned, or uses a spatial index if the world is persistent.

### D. Image Handling
- **Thumbnails:** Small, low-res images loaded first.
- **Preloading:** Images entering the viewport are prioritized.

## 4. User Interactions
- **Tapping a Node:**
    - Opens the full detail view (Post Detail or Chat Room).
    - *Transition:* Shared Element Transition (Hero animation) expanding the small floating card into the full screen.
- **Flinging:** Fast swipe adds momentum to the canvas movement.

## 5. Logic & Algorithms
- **Despawn/Respawn:** Nodes far outside the viewport are unmounted (culling) to maintain React render performance.
- **Collision Detection:** (Ideal) Logic ensures nodes don't overlap each other, using a packing algorithm or force-directed graph logic.

## 6. The "Tab" Ecosystem
The Explore page isn't just one view; it allows toggling modes:
- **Posts Mode:** Shows the visual scatter of media.
- **Chans Mode:** Shows a galaxy of communities.
- **Auds Mode:** Highlights audio content.
This separation helps users who are specifically looking for conversation vs. consumption.

## 7. Edge Cases
- **Empty Space:** If a user pans too far into the void, a "Return to Center" arrow appears.
- **Data Heavy:** Loading dozens of images on a canvas can crash low-end devices. Logic likely limits active nodes to ~20-30.

## 8. Unique Vocabulary
- **"XRAY":** A mode or filter referenced in code (possibly to "see through" content or detailed inspection).
- **"Puds":** Unknown specific content type, likely "Podcasts" or "Puddles" (small collections).
