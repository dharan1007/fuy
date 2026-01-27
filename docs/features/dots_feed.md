# Dots Feed Feature Documentation

## 1. Feature Overview
**Feature Name:** Dots Feed
**File Location:** `mobile/app/(tabs)/dots.tsx`
**Primary Purpose:** The core social consumption engine of Fuy. "Dots" represents the unification of scattered content types into a coherent, linear experience. It is the "TikTok" or "Reels" equivalent but supports mixed media types (Video, Audio, Image) in a single vertically scrolling feed.

## 2. Content Architecture (The "Dots")

The feed is not monolithic; it serves distinct content flavored "dots":

### A. BLOOM (Standard Posts)
- **Concept:** Traditional social posts (Images/Text).
- **Visuals:** Full-screen imagery.
- **Interaction:** Standard like/comment.

### B. LILLS (Short Video)
- **Concept:** Short-form vertical video (Loops).
- **Behavior:** Auto-play when in view, pause when scrolled away.
- **UI:** Progress bar at bottom, mute toggle.

### C. AUDS (Audio Posts)
- **Concept:** A unique "Fuy" format. Voice memos, music snippets, or podcast clips.
- **Visuals:**
    - Large "Cassette" or "Waveform" visualization.
    - Album art background (blurred).
- **Controls:** Play/Pause button, scrubbing.
- **Value:** Allows for "screen-off" consumption or passive listening.

### D. FILLS (Curated/interactive)
- **Concept:** Referenced in code as a specific variation, possibly for rich media or interactive polls. Also has a dedicated player interface.

## 3. Visual Interface & Design

### A. The "Monochrome" Aesthetic
- **Background:** Strictly Black (`#000` or `MONO.black`).
- **Overlay:** UI elements (Buttons, Text) float on top with high concern for contrast.
- **Typography:** Uses the custom `fontCondensed` for counters (Like counts) to give a utilitarian, cyber-industrial vibe.

### B. Action Bar (Right Side Vertical Stack)
Unlike Instagram's bottom row, Fuy uses the right edge:
1.  **Avatar:** Top circle. Tapping goes to Profile.
2.  **Like (W):** "W" stands for "Win". It's a positive upvote.
    - *Animation:* Explodes or glows Green.
3.  **Dislike (L):** "L" stands for "Loss". It's a downvote.
    - *Animation:* Glows Red.
4.  **Cap:** A Blue cap icon. "Cap" means "Lie" or "Exaggeration" in slang.
    - *Function:* Community moderation/fact-checking mechanism.
5.  **Refuy:** The "Share/Retweet" icon.
6.  **Comments:** Bubble icon with count.

### C. Bottom Info Layer
- **Username:** `@username` with a "Follow" button if not connected.
- **Description:** Text overlay.
    - *Truncation:* "More" button expands long captions.
- **Tags:** Hashtags highlighted.
- **Music/Audio Source:** Scrolling marquee text "Original Audio - User X".

## 4. Technical Implementation Details

### A. Feed Logic (`dots.tsx`)
- **FlatList:** Uses `pagingEnabled` to snap to each full-screen item.
- **ViewabilityConfig:** Critical for media playback.
    ```typescript
    const viewabilityConfig = { itemVisiblePercentThreshold: 50 };
    const onViewableItemsChanged = ({ viewableItems }) => {
        if (viewableItems.length > 0) {
            setActiveIndex(viewableItems[0].index); // Triggers Play on new item, Pause on old
        }
    };
    ```
- **Virtualization:** `windowSize` and `initialNumToRender` are tuned to prevent memory leaks with heavy video content.

### B. Media Handling
- **Video:** Uses `expo-av` `Video` component.
    - `resizeMode="cover"` fills the screen.
    - `isLooping` is true by default.
- **Audio:** Uses `Sound` object from `expo-av`.
    - Requires tracking playback status (`isPlaying`, `positionMillis`).

### C. Data Integration
- **Supabase Query:**
    - Fetches `Post` table.
    - Joins `User`, `Music` (if exists).
    - Filters by blocked users (Safety).
- **Optimistic Updates:**
    - Reacting (W/L) updates the local number immediately while sending the API request.

## 5. Safety & "The Void"
- **Blocking:** The feed respects the user's block list.
- **Report:** Long-press or Menu action allows reporting content.
- **The Void:** Code nuances suggest "The Void" is the empty state or the loading skeleton—a conceptual name fitting the app's lore.

## 6. User Interactions
- **Double Tap:** Triggers a "W" (Like) at the finger position.
- **Long Press:** Opens "More Options" (Report, Not Interested, Save).
- **Swipe Left:** Might navigate to the creator's profile (common pattern, details inferred).

## 7. Edge Cases
- **Slow Network:** Video shows poster image/thumbnail while buffering.
- **Audio Focus:** If user leaves app, audio stops.
- **No Content:** "You've seen it all" message or "Refresh" prompt.

## 8. State Management
- **`activeIndex`:** The single source of truth for which video plays.
- **`isMuted`:** Global toggle for the feed.
- **`posts`:** Array of Post objects.

## 9. Future / Code comments
- References to "Live" streaming capabilities in `dots.tsx` comments suggest future "Live Dots".
- "Bloom" might evolve into a carousel format.
