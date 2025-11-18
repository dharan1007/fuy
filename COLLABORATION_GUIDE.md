# Real-Time Collaboration Feature Guide

This guide explains how to add real-time collaboration capabilities to any feature (Canvas, Hopin, Breathing, etc.) using the collaboration infrastructure.

## Architecture Overview

### Database Models

#### FeatureSession
- Stores collaboration sessions for any feature type
- Fields: `id`, `type`, `title`, `creatorId`, `status`, `canvasData`, `autoSaveEnabled`, `lastSavedAt`, `lastModifiedBy`, `syncVersion`
- Used by: Canvas, Hopin, Breathing, and future features

#### FeatureSessionParticipant
- Links users to sessions with participation status
- Tracks who is actively collaborating

#### CollaborationInvite
- Stores collaboration invitations sent through messaging
- Fields: `sessionId`, `fromUserId`, `toUserId`, `featureType`, `status`, `conversationId`
- Links invites to the conversation where they were sent

#### CollaborationUpdate
- Tracks individual operations on collaborative data
- Fields: `operation` (ADD_BLOCK, UPDATE_BLOCK, REMOVE_BLOCK, DRAW, SAVE), `data`, `timestamp`, `synced`
- Supports real-time sync and operational transformation

### API Endpoints

All endpoints are generic and work with any feature type:

#### `/api/collaboration/canvas-invite` (POST)
Send a collaboration invite through messaging.
```
POST /api/collaboration/canvas-invite
{
  conversationId: string,
  recipientId: string,
  featureType: "CANVAS" | "HOPIN" | "BREATHING" | ...
}
```

#### `/api/collaboration/canvas-invite` (PATCH)
Accept or reject a collaboration invite.
```
PATCH /api/collaboration/canvas-invite
{
  inviteId: string,
  action: "ACCEPT" | "REJECT"
}
```

#### `/api/collaboration/canvas` (GET)
Fetch session data with auto-save state.
```
GET /api/collaboration/canvas?sessionId={sessionId}
```

#### `/api/collaboration/canvas` (PATCH)
Save session data with auto-save handling.
```
PATCH /api/collaboration/canvas
{
  sessionId: string,
  canvasData: object,
  autoSaveEnabled?: boolean
}
```

#### `/api/collaboration/updates` (POST)
Create a collaboration update.
```
POST /api/collaboration/updates
{
  sessionId: string,
  operation: "ADD_BLOCK" | "UPDATE_BLOCK" | "REMOVE_BLOCK" | "DRAW" | "SAVE",
  blockId?: string,
  data: object
}
```

#### `/api/collaboration/updates` (GET)
Fetch collaboration updates for a session.
```
GET /api/collaboration/updates?sessionId={sessionId}&since={timestamp}&limit=100
```

### React Hooks

#### useCollaboration(sessionId)
Main hook for managing collaborative state.

**Features:**
- Fetches and manages canvas/session data
- Auto-save with configurable intervals (30 seconds default)
- Real-time subscriptions via Supabase
- Fallback polling (10 second intervals)

**Returns:**
```typescript
{
  sessionId: string,
  canvasData: CanvasData | null,
  autoSaveEnabled: boolean,
  lastSavedAt: string | null,
  lastModifiedBy: string | null,
  syncVersion: number,
  updates: CollaborationUpdate[],
  isLoading: boolean,
  error: string | null,

  // Actions
  fetchCanvasData: () => Promise<void>,
  saveCanvasData: (data, autoSaveEnabled?) => Promise<{success, error?}>,
  createUpdate: (operation, data, blockId?) => Promise<{success, update?}>,
  fetchUpdates: (since?) => Promise<{success, updates?}>,
  toggleAutoSave: (enabled) => Promise<void>
}
```

#### useCanvasCollaboration()
For messaging integration - send/respond to collaboration invites.

**Returns:**
```typescript
{
  sendCollaborationInvite: (conversationId, recipientId, featureType?) => Promise<result>,
  acceptInvite: (inviteId) => Promise<result>,
  rejectInvite: (inviteId) => Promise<result>,
  isLoading: boolean,
  error: string | null
}
```

## Implementing Collaboration for a New Feature

### Step 1: Add Collaboration UI to Your Component

```typescript
import { useCollaboration } from '@/hooks/useCollaboration';

export function MyFeature() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const collaboration = useCollaboration(sessionId);

  const handleToggleAutoSave = async () => {
    setAutoSaveEnabled(!autoSaveEnabled);
    if (!autoSaveEnabled) {
      await collaboration.toggleAutoSave(true);
    }
  };

  return (
    <div>
      <button onClick={handleToggleAutoSave}>
        {autoSaveEnabled ? '✓ Auto-save enabled' : '✗ Auto-save disabled'}
      </button>

      {/* Feature content */}
    </div>
  );
}
```

### Step 2: Add Collaboration Invites in Messaging

In your message component or messaging hook:

```typescript
import { useCanvasCollaboration } from '@/hooks/useCanvasCollaboration';

export function ChatMessage({ conversationId, recipientId }) {
  const { sendCollaborationInvite, isLoading } = useCanvasCollaboration();

  const handleCollaborate = async (featureType: string) => {
    const result = await sendCollaborationInvite(conversationId, recipientId, featureType);
    if (result.success) {
      console.log('Collaboration invite sent!', result.session);
    }
  };

  return (
    <div>
      <button onClick={() => handleCollaborate('HOPIN')}>
        Collaborate on Hopin
      </button>
    </div>
  );
}
```

### Step 3: Handle Real-Time Updates

The `useCollaboration` hook automatically handles real-time updates. To track specific operations:

```typescript
const { updates, createUpdate } = collaboration;

// Listen to updates
useEffect(() => {
  updates.forEach(update => {
    if (update.operation === 'SAVE') {
      console.log('Someone saved!', update.user);
    }
  });
}, [updates]);

// Create an update when user makes changes
const handleDataChange = async (newData) => {
  await createUpdate('UPDATE_BLOCK', newData, blockId);
};
```

### Step 4: Handle Session Lifecycle

```typescript
// When starting a collaboration session
const startCollaborativeSession = async () => {
  const sessionId = generateSessionId();
  setSessionId(sessionId);
  // Make API call to create FeatureSession
};

// When user accepts an invite
const handleAcceptInvite = async (inviteId) => {
  const result = await acceptInvite(inviteId);
  if (result.success) {
    setSessionId(result.invite.sessionId);
  }
};
```

## Real-Time Synchronization Flow

### How Real-Time Updates Work

1. **User A makes a change** → Creates CollaborationUpdate record
2. **Supabase Realtime detects INSERT** → Broadcasts to all subscribers
3. **useCollaboration hook receives update** → Updates local state immediately
4. **UI re-renders** with new data in real-time

### Fallback Mechanism

If Supabase realtime fails:
1. Hook continues polling every 10 seconds
2. Updates are fetched and merged
3. Polling stops when realtime reconnects

## Database Schema Summary

```sql
-- Extended FeatureSession table
ALTER TABLE "FeatureSession"
ADD COLUMN IF NOT EXISTS "canvasData" TEXT,
ADD COLUMN IF NOT EXISTS "autoSaveEnabled" BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS "lastSavedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "lastModifiedBy" TEXT,
ADD COLUMN IF NOT EXISTS "syncVersion" INTEGER DEFAULT 0;

-- CollaborationInvite table
CREATE TABLE "CollaborationInvite" (
  id TEXT PRIMARY KEY,
  sessionId TEXT NOT NULL,
  fromUserId TEXT NOT NULL,
  toUserId TEXT NOT NULL,
  featureType TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  conversationId TEXT NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  respondedAt TIMESTAMP,
  FOREIGN KEY (sessionId) REFERENCES "FeatureSession",
  FOREIGN KEY (fromUserId) REFERENCES "User",
  FOREIGN KEY (toUserId) REFERENCES "User",
  FOREIGN KEY (conversationId) REFERENCES "Conversation"
);

-- CollaborationUpdate table
CREATE TABLE "CollaborationUpdate" (
  id TEXT PRIMARY KEY,
  sessionId TEXT NOT NULL,
  userId TEXT NOT NULL,
  operation TEXT NOT NULL,
  blockId TEXT,
  data TEXT NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  synced BOOLEAN DEFAULT false,
  FOREIGN KEY (sessionId) REFERENCES "FeatureSession",
  FOREIGN KEY (userId) REFERENCES "User"
);
```

## Example: Adding Collaboration to Hopin

### 1. Update HopinProgramsCard Component

```typescript
import { useCollaboration } from '@/hooks/useCollaboration';

export function HopinProgramsCard() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const collaboration = useCollaboration(sessionId);

  return (
    <div>
      {/* Hopin-specific toolbar */}
      <div className="toolbar">
        <button onClick={() => setAutoSaveEnabled(!autoSaveEnabled)}>
          {autoSaveEnabled ? 'Auto-save On' : 'Auto-save Off'}
        </button>
      </div>
      {/* Rest of Hopin content */}
    </div>
  );
}
```

### 2. Add Messaging Integration

In your chat component:

```typescript
const handleCollaborateHopin = async () => {
  const result = await sendCollaborationInvite(
    conversationId,
    recipientId,
    'HOPIN' // Feature type for Hopin
  );
  if (result.success) {
    // User can now join collaborative Hopin session
  }
};
```

### 3. Handle Collaborative Edits

```typescript
const saveHopinProgram = async (programData) => {
  const result = await collaboration.saveCanvasData(programData, autoSaveEnabled);
  if (result.success) {
    // Data saved and synced to collaborators
  }
};
```

## Benefits of This Architecture

1. **Feature-Agnostic**: Works with Canvas, Hopin, Breathing, or any new feature
2. **Real-Time**: Supabase realtime subscriptions for instant updates
3. **Auto-Save**: Configurable auto-save intervals per session
4. **Messaging Integrated**: Collaboration invites sent through existing chat
5. **Operational Tracking**: Each operation recorded for audit trail
6. **Sync Management**: Version tracking and sync status for conflict resolution
7. **Fallback Support**: Polling ensures updates even if realtime fails
8. **RLS Protected**: Supabase Row Level Security controls access

## Testing Collaboration

1. Open feature in two browser windows
2. Enable collaboration from messaging
3. Make changes in one window
4. Observe real-time updates in other window
5. Check auto-save status in UI
6. Verify collaborator info in updates

## Future Enhancements

- Cursor tracking (see where others are editing)
- Conflict resolution with operational transformation
- Presence indicators (who is online)
- Activity feed (see all changes in real-time)
- Permission levels (view-only, edit, admin)
- Session recording and playback
