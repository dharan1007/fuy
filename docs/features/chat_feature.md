# Chat Feature Documentation

## 1. Feature Overview
**Feature Name:** Fuy Chat
**File Location:** `mobile/app/(tabs)/chat.tsx`
**Primary Purpose:** The central communication hub for the Fuy app. It supports real-time text messaging, media sharing, conversation management, and AI interaction ("Dbot"). It includes advanced privacy features like PIN locking and biometric protection for specific chats.

## 2. Visual Interface & Design

### A. Main Conversation List
- **Header:**
  - Title: "Chat"
  - Search Bar: "Search connections..."
  - New Chat Button: Floating or header action.
- **List Items (Conversations):**
  - **Avatar:** User profile picture.
  - **Name:** Display name.
  - **Last Message:** Preview of the latest text/media.
  - **Timestamp:** Relative time.
  - **Unread Badge:** Green circle with count.
  - **Status Indicators:** Icons for Pinned, Locked, Muted.

### B. Chat Room (Message View)
- **Header:** User info (Name, Avatar, Status) + Actions (Call, Info).
- **Message Bubble:**
  - **Outgoing:** Aligned right, accented background.
  - **Incoming:** Aligned left, neutral background.
  - **Media:** Image/Video thumbnails with lightbox support.
  - **Reactions:** Small emojis attached to bubbles.
- **Input Area:**
  - Text Input.
  - Media Attachment Button (Clip/Image icon).
  - Audio Record Button (Mic).
  - Send Button.

### C. Chat Tagging & Mentions
- **UI:** When typing `@`, a pop-up list of bond/friends appears.
- **Functionality:** selecting a user inserts a highlighted text span.

## 3. Key Functionalities

### A. Real-time Messaging
- **Supabase Integration:** Uses Supabase Realtime (Channels) to listen for `INSERT` on the `Message` table.
- **Optimistic UI:** Messages appear instantly in simple state before confirmation.

### B. "Bonding" Warnings (Safety)
- **Feature:** If a user attempts to share sensitive info or interact with a stranger ('new' bond type), the system displays a warning.
- **UI:** A banner at the top of the chat or a modal intercept.
- **Logic:** Checks `bondScore` or `bondType`. If `type === 'new'`, warn "You don't know this person well."

### C. Privacy & Security
- **Locked Chats:**
  - Users can "Lock" a conversation.
  - **Access:** Requires PIN or FaceID/TouchID to open.
  - **Implementation:** Uses `LocalAuthentication` from Expo.
- **Hidden Chats:** Conversations can be archived or hidden from the main list.

### D. "Dbot" AI Assistant
- A special conversation type where the "User" is the System AI.
- Responses are generated via API (OpenAI/Gemini wrapper) and streamed back.
- **Visuals:** Distinct avatar and perhaps specific styling for AI bubbles.

## 4. Data Model (Inferred)

### Message Table
```typescript
interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  media_url?: string;
  media_type?: 'image' | 'video' | 'audio';
  created_at: string;
  read_at?: string;
  reactions?: Record<string, string>; // JSON: { userId: 'emoji' }
  reply_to_id?: string;
}
```

### Conversation Table
```typescript
interface Conversation {
  id: string;
  participants: string[]; // Array of User IDs
  last_message_preview: string;
  last_message_at: string;
  is_group: boolean;
  name?: string; // For groups
  settings: {
    pinned: boolean;
    muted: boolean;
    locked: boolean;
    theme: string;
  }
}
```

## 5. Technical Implementation Code Highlights

### Tagging Logic
```typescript
// Detect '@' input
const handleTextChange = (text: string) => {
  if (text.endsWith('@')) {
    setShowMentionList(true);
  }
  setMessageText(text);
};
```

### Render Logic (Virtualized List)
- Uses `FlatList` with `inverted` prop for chat messages (scrolling up to see history).
- **Performance:** `windowSize` and `maxToRenderPerBatch` are tuned for long histories.

### Media Handling
- **Upload:** `expo-image-picker` -> R2 Storage -> Get URL -> Insert Message.
- **Display:** `expo-av` for video, `Image` for photos.

## 6. User Flows
1.  **Sending a Message:**
    - User types -> Clicks Send.
    - Message added to local list (Optimistic).
    - API call firing.
    - Status changes from 'Sending' -> 'Sent' -> 'Delivered' -> 'Read'.
2.  **Tagging:**
    - Type "@User".
    - Select from dropdown.
    - Text becomes `@[User](userId)`.
3.  **Locking:**
    - Long press conversation in list.
    - Select "Lock Chat".
    - Prompt for PIN setup if not exists.

## 7. Edge Cases
- **Offline:** Queue messages locally and retry on connection restore.
- **Deleted Content:** "Message deleted" placeholder if a referenced message is gone.
- **Large Media:** Compression/Resizing before upload to save bandwidth.
