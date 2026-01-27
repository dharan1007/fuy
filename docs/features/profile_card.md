# Profile Card Feature Documentation

## 1. Feature Overview
**Feature Name:** Profile Card (View & Editor)
**File Location:** `mobile/app/profile-card/view.tsx` & `editor.tsx`
**Primary Purpose:** A highly customizable, digital business card/persona. Unlike a standard profile page, the "Card" is a swipeable, multi-page experience that showcases the user's "Vibe", "Deep Dive" (metrics/bio), and "Favorites". It effectively replaces Linktree-style external pages.

## 2. The Viewer Experience (`view.tsx`)

### A. Interaction Paradigm
- **Horizontal Swipe:** The card is a PagerView (or horizontal ScrollView).
- **Pages:**
    1.  **Cover/Main:** Name, Role, Location, Avatar, "Vibe" tags.
    2.  **About/Deep Dive:** Long-form bio, extended stats or Q&A.
    3.  **Favorites:** Curated lists (Books, Songs, Links).
- **Background:** High-quality image (User uploaded) covering the full card, often with overlay gradients for text readability.

### B. Key Components
- **QR Code / Share:** Button to generate a shareable image or link.
- **"Save Contact":** Functionality to add to phone contacts (vCard logic).
- **Profile Code:** A unique 7-digit code (similar to Hopin) for quick lookup.

## 3. The Editor Experience (`editor.tsx`)

### A. Editor Flow
A multi-step form wizard.
1.  **Step 1: Identity**
    - Name, Display Name.
    - Avatar Upload.
2.  **Step 2: Professional**
    - Role/Title.
    - Company/Organization.
    - Location.
3.  **Step 3: Vibe & Deep Dive**
    - **Vibe:** Short keywords (e.g., "Creator", "Developer").
    - **Deep Dive:** Markdown-supported rich text area.
4.  **Step 4: Design**
    - **Background Image:** Upload to R2.
    - **Theme:** Select color overlay opacity.

### B. Technical Challenges (Solved)
- **RLS Bypass:** The editor uses a specific backend endpoint `/api/profile-card` instead of direct Supabase `upsert` in some cases to handle complex permissions or RLS (Row Level Security) issues encountered during development.
- **Image Upload:** Integration with `MediaUploadService` to send files to Cloudflare R2 and get a public URL string.

## 4. Data Structure
**Table:** `ProfileCard` (linked 1:1 to User/Profile)
```typescript
interface ProfileCardData {
    id: string;
    userId: string;
    theme: string; // JSON or specific string
    backgroundUrl: string;
    badges: string[]; // Vibe tags
    bio: string; // Deep dive
    links: Link[];
    stats: Record<string, any>;
    design_settings: {
        opacity: number;
        font: string;
    }
}
```

## 5. Visual Design
- **Card Aspect Ratio:** mimics a physical ID or tarot card (~9:16 vertical).
- **Typography:**
    - Huge names (`fontSize: 32+`).
    - Use of `fontCondensed` for impactful headers.
- **Animations:**
    - Elements likely fade in/slide up when swiping between pages.

## 6. User Value
- **Identity:** Allows users to express more than just "Posts".
- **Networking:** Ideal for sharing at the Hopin events (digital handshake).
- **Showcase:** "Favorites" section acts as a micro-portfolio.
