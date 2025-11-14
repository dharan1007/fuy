# Real-Time Messaging Implementation - Web Version

## Overview
This document describes the complete real-time messaging implementation for the web version of the application. Messages are now sent and received instantly, and users can search and chat with their followers and following.

## What's New

### 1. **Real-Time Message Delivery**
- Implemented Socket.io for instant bidirectional communication
- Messages are sent and received in real-time
- Automatic connection management with reconnection logic
- Message state synchronized across all open clients

### 2. **Followers/Following Search**
- New API endpoint: `/api/users/followers-following`
  - Get followers: `GET /api/users/followers-following?type=followers`
  - Get following: `GET /api/users/followers-following?type=following`
  - Search by name: `GET /api/users/followers-following?type=following&search=john`
- Chat search dropdown now shows both followers and following
- Click on any follower/following to start a chat

### 3. **Typing Indicators**
- Users can see who is currently typing
- Typing status automatically shows/hides based on user input
- Real-time typing notifications via Socket.io

### 4. **Online/Offline Status**
- Online status indicator in chat header
- Online badges on friend list in search dropdown
- Real-time presence tracking
- Green dot appears next to online users

### 5. **Optimistic UI Updates**
- Messages appear instantly before server confirmation
- Smooth conversation transitions
- No loading delays for better UX

## Technical Architecture

### Backend Components

#### 1. Socket.io Server (`src/lib/socket.ts`)
- Handles all real-time connections
- User registration and authentication
- Message broadcasting to conversation rooms
- Typing indicator management
- Online/offline presence tracking

#### 2. Custom Server (`server.ts`)
- Integrates Socket.io with Next.js HTTP server
- Handles WebSocket connections separately from Next.js App Router
- Configured for both development and production

#### 3. API Endpoints
- **`/api/users/followers-following/route.ts`** - New endpoint
  - Returns list of followers or following users
  - Supports search filtering
  - Returns user profile information

- **`/api/chat/conversations/route.ts`** - Existing (unchanged)
  - GET: Fetch all conversations
  - POST: Create or get conversation with a user

- **`/api/chat/messages/route.ts`** - Existing (unchanged)
  - GET: Fetch messages for a conversation
  - POST: Send a new message

### Frontend Components

#### 1. useMessaging Hook (`web/src/hooks/useMessaging.ts`)
Custom React hook for managing all messaging functionality:
- Socket.io connection initialization
- Conversation management
- Message fetching and sending
- Followers/following fetching
- Online user tracking
- Typing indicator state management
- Message history management

**Key Functions:**
```typescript
- fetchConversations() - Load all user conversations
- fetchMessages(conversationId) - Load messages for a conversation
- sendMessage(conversationId, content) - Send a message
- createOrGetConversation(friendId) - Start chat with a user
- startTyping/stopTyping - Control typing indicators
- getAllChatUsers() - Get combined followers & following list
```

#### 2. MessagesPage Component (`web/src/pages/MessagesPage.tsx`)
Updated with:
- Real API integration instead of dummy data
- Real-time message updates via Socket.io
- Followers/following search in dropdown
- Online status display
- Typing indicators
- Message sending with optimistic updates
- Auto-scroll to latest message

## Setup Instructions

### 1. Installation
Socket.io packages are already installed:
```bash
npm install  # socket.io and socket.io-client are already included
```

### 2. Database Setup
The Friendship model is already defined in the schema and supports:
- Status: PENDING, ACCEPTED, BLOCKED, GHOSTED
- Bidirectional relationships

### 3. Server Configuration
The custom server uses:
- TypeScript execution via `tsx`
- Port: 3000 (configurable via PORT env var)
- Socket.io running on same HTTP server

### 4. Environment Variables
Add if needed (optional, defaults to current origin):
```
NEXT_PUBLIC_API_URL=http://localhost:3000
```

## Running the Application

### Development
```bash
npm run dev
```
This will:
1. Start the custom server with Socket.io
2. Initialize the Next.js app
3. Set up all real-time connections

### Production Build
```bash
npm run build
npm start
```

## Features in Detail

### Message Flow
1. User types message in input field
2. `handleSendMessage()` is called on Enter or Send button
3. Optimistic message added to UI immediately
4. Message sent to API endpoint
5. API creates message in database and updates conversation
6. Socket.io broadcasts message to all conversation participants
7. Recipient receives message in real-time

### Search Flow
1. User types in search field
2. Query triggers API call to fetch followers/following
3. Results displayed in dropdown
4. User clicks on a result
5. `createOrGetConversation()` creates or retrieves existing conversation
6. Chat opens immediately with the selected user
7. Messages for that conversation are fetched
8. User can start chatting

### Online Status Flow
1. Socket.io client connects and registers user ID
2. Server broadcasts `user:online` event to all clients
3. Online users stored in Set state
4. Disconnection triggers `user:offline` event
5. UI updates to show/hide online indicators

### Typing Indicator Flow
1. User starts typing in message input
2. `startTyping()` emits `typing:start` event to Socket.io
3. Debounced with 1 second timeout
4. If user stops typing, `stopTyping()` emits `typing:end` event
5. Other users in conversation see "X is typing..." message
6. Message appears below conversation

## Database Schema Reference

### Friendship Model
```prisma
model Friendship {
  id        String   @id @default(cuid())
  userId    String
  friendId  String
  status    String   @default("PENDING")  // PENDING | ACCEPTED | BLOCKED | GHOSTED
  isGhosted Boolean  @default(false)
  ghostedBy String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user   User @relation("A", fields: [userId], references: [id])
  friend User @relation("B", fields: [friendId], references: [id])

  @@unique([userId, friendId])
}
```

### Conversation Model (existing)
```prisma
model Conversation {
  id            String   @id @default(cuid())
  participantA  String
  participantB  String
  lastMessage   String?
  lastMessageAt DateTime?

  userA         User     @relation("ConversationA", ...)
  userB         User     @relation("ConversationB", ...)
  messages      Message[]
  sessionLogs   ChatSessionLog[]

  @@unique([participantA, participantB])
}
```

### Message Model (existing)
```prisma
model Message {
  id              String   @id @default(cuid())
  conversationId  String
  senderId        String
  content         String
  readAt          DateTime?
  createdAt       DateTime @default(now())

  conversation    Conversation @relation(...)
  sender          User         @relation("MessagesSent", ...)
}
```

## Socket.io Events

### Client → Server
- `user:register` - User connects and registers their ID
- `typing:start` - User starts typing
- `typing:end` - User stops typing
- `message:send` - Send a message to a conversation
- `message:read` - Mark messages as read

### Server → Client (Broadcasting)
- `user:online` - User came online
- `user:offline` - User went offline
- `message:new` - New message received
- `typing:start` - Someone started typing
- `typing:end` - Someone stopped typing
- `message:read` - Messages marked as read

## Error Handling

The implementation includes:
- Session validation (requireUserId)
- Authorization checks (users can only access their conversations)
- Graceful error handling with user-friendly messages
- Automatic Socket.io reconnection with exponential backoff
- Network error recovery

## Performance Considerations

1. **Message Pagination** - Limited to 100 messages per fetch
2. **Connection Pooling** - Socket.io connection reused across component tree
3. **Debounced Typing** - Typing indicator updates debounced at 1 second
4. **Optimistic Updates** - Instant UI updates without waiting for server
5. **Session Logging** - Automatic tracking of chat session duration

## Testing Checklist

- [ ] Users can see their followers and following in search
- [ ] Search filters followers/following by name
- [ ] Can start a new conversation by clicking on a user
- [ ] Messages sent appear instantly
- [ ] Messages received appear in real-time
- [ ] Typing indicator shows when user is typing
- [ ] Online status displays correctly
- [ ] Can switch between conversations
- [ ] Message history loads when opening old conversation
- [ ] Connection reconnects if network drops
- [ ] Conversation last message updates correctly
- [ ] Works on multiple browser tabs simultaneously

## Troubleshooting

### WebSocket Connection Issues
If Socket.io connection fails:
1. Check that the custom server is running (port 3000)
2. Verify `NEXT_PUBLIC_API_URL` is set correctly
3. Check browser console for connection errors
4. Ensure firewall allows WebSocket connections

### Messages Not Sending
1. Check network tab for API request to `/api/chat/messages`
2. Verify user is authenticated (session exists)
3. Check that conversation was created
4. Ensure Socket.io is connected

### Search Not Working
1. Verify followers/following relationship exists in database
2. Check that friendship status is "ACCEPTED"
3. Look for errors in network requests to `/api/users/followers-following`

## Future Enhancements

1. **Message Search** - Search within conversation history
2. **File Sharing** - Share images and documents
3. **Message Reactions** - Emoji reactions to messages
4. **Read Receipts** - Show when messages are read
5. **Group Chat** - Multiple participants in one conversation
6. **Voice/Video Calls** - Real-time audio/video integration
7. **Message Encryption** - End-to-end encryption
8. **Push Notifications** - Notify users of new messages

## Support
For issues or questions, please refer to:
- Socket.io Documentation: https://socket.io/docs/
- Next.js Documentation: https://nextjs.org/docs
- Prisma Documentation: https://www.prisma.io/docs
