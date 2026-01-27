# Bonding Feature Documentation

## 1. Feature Overview
**Feature Name:** Bonds (Connections)
**File Location:** `mobile/app/bonds.tsx`
**Primary Purpose:** Manages the user's social connections, organizing them by relationship depth rather than just a binary "following" status. It emphasizes the "Connection Score" and mutual interests to foster deeper social interaction.

## 2. Visual Interface & Design

### A. Screen Layout
- **Container:** Full-screen view with `LinearGradient` background (Light: White to gray, Dark: Black to dark gray).
- **Header:**
  - Back Button (Chevron Left).
  - Feature Icon (Heart).
  - Title: "Bonds".
- **Filter Bar (Horizontal Scroll):**
  - Pill-shaped buttons: "All Bonds", "Close Friends", "New Connections".
  - Active state: Filled background (inverse text color).
  - Inactive state: Bordered/Card background.
- **Bonds List:** Vertical scrollable list of connection cards.

### B. The Bond Card UI
Each item in the list represents a user connection (`Bond`).
- **Avatar Section:**
  - Large circular avatar (`56x56`).
  - **Border Coding:** Border color indicates bond type:
    - Red (`#ef4444`): Close Friend.
    - Blue (`#3b82f6`): New Connection.
    - Amber (`#f59e0b`): Regular/Standard.
  - **Badge:** Small Heart icon badge on the bottom-right of the avatar.
- **Info Section:**
  - **Name:** Large, bold text (`fontWeight: '700'`).
  - **"Close" Tag:** Conditional badge for close friends (Red tint background).
  - **Last Interaction:** Clock icon + Relative time text (e.g., "2h ago").
  - **Mutual Interests:** Row of small chips showing shared tags (e.g., "Music", "Coding").
- **Action Section (Right Side):**
  - **Connection Score:** Boxed number displaying the strength of the bond (0-100).
  - **Message Button:** Direct link to open a chat with this user.

## 3. Data Structure
**Interface:** `Bond`
```typescript
interface Bond {
    id: string;
    user: {
        name: string;
        avatarUrl: string;
    };
    bondType: 'close' | 'regular' | 'new';
    lastInteraction: string; // ISO Date or relative string
    mutualInterests: string[];
    connectionScore: number; // Integer 0-100
}
```
**Demo Data Generation:**
The file currently uses `DEMO_BONDS` to populate the UI.
- Generates 12 user objects.
- Assigns random names (Emma, Liam, etc.).
- Randomizes bond types and connection scores.

## 4. Interaction Logic

### A. Filtering
- **State:** `activeTab` ('all' | 'close' | 'new').
- **Logic:** `filteredBonds` array is derived from `bonds.filter(...)`.
- **User Action:** Tapping a tab updates `activeTab` and immediately re-renders the list.

### B. Navigation
- **Back:** Returns to the previous screen (Dashboard implies this is a sub-screen).
- **Message:** Taping the message icon should navigate to the Chat screen, creating or opening a conversation with that specific `bond.id`.
- **Profile:** Tapping the card body (excluding specific buttons) navigates to the user's profile.

### C. Visual Cues
- **Color Coding:** Critical for quick scanning.
  - Users can instantly identify their "Inner Circle" by the red borders.
  - New connections are highlighted in blue to encourage welcome messages.
- **Score:** Gamifies the relationship, encouraging users to interact more to increase the number.

## 5. Technical Implementation Details

### Dependencies
- `lucide-react-native`: Icons (`Heart`, `ChevronLeft`, `Users`, `MessageCircle`, `Clock`).
- `expo-linear-gradient`: Background aesthetics.
- `useRouter`: Navigation.
- `useTheme`: Dark/Light mode support.

### Styling Strategy
- Inline styles are heavily used in the current implementation for rapid prototyping.
- Dynamic color calculation function: `getBondColor(type)`
  ```typescript
  const getBondColor = (type: string) => {
      if (type === 'close') return '#ef4444';
      if (type === 'new') return '#3b82f6';
      return '#f59e0b';
  };
  ```

## 6. Edge Cases
- **No Bonds:** If the list is empty, an Empty State component should be shown (currently not explicitly implemented in standard code but good practice).
- **Long Names:** Text truncation (`numberOfLines={1}`) should be applied to prevent layout break.
- **Missing Avatar:** Fallback to initial or placeholder image.

## 7. Integration Points
- **Chat System:** The "Last Interaction" time and "Connection Score" likely derive from chat frequency and message count.
- **Profile:** Mutual interests content comes from the User Profile "Interests" array.
