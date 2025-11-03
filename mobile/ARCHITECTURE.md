# FUY Mobile App - Architecture & Implementation Guide

## 📋 Overview

The FUY mobile app is a comprehensive React Native application with full state management, API integration, real-time synchronization, and offline support.

### Tech Stack
- **Framework**: React Native + Expo
- **State Management**: Zustand stores
- **Navigation**: React Navigation (custom dual-tab system)
- **API**: Axios with interceptors
- **Real-time**: WebSocket service
- **Persistence**: AsyncStorage
- **Offline**: Queue system with retry logic

---

## 🏗️ Architecture

### 1. **Navigation Structure**
```
App.tsx
├── RootNavigator
│   └── MainAppNavigator (TopTabNavigator)
│       ├── Header Navigation (5 tabs)
│       │   ├── HOME (HomeScreen)
│       │   ├── COMPONENTS (ComponentsHubScreen)
│       │   ├── MESSAGES (MessagesScreen)
│       │   ├── DISCOVER (DiscoverScreen)
│       │   └── PROFILE (ProfileScreen)
│       ├── Feature Navigation (6 tabs)
│       │   ├── Canvas (CanvasScreen)
│       │   ├── Hopln (HoplnScreen)
│       │   ├── Essenz (EssenzScreen)
│       │   ├── Bonding (BondingScreen)
│       │   ├── Ranking (RankingScreen)
│       │   └── Shop (ShopScreen)
```

### 2. **State Management (Zustand Stores)**

Each feature has its own store for isolated state management:

#### **Feed Store** (`src/store/feedStore.ts`)
```typescript
const { posts, loading, error, addPost, addReaction } = useFeedStore();
```
- Manages feed posts, pagination, reactions
- Methods: `setPosts`, `addPost`, `deletePost`, `updatePost`, `addReaction`

#### **Messages Store** (`src/store/messagesStore.ts`)
```typescript
const { conversations, currentConversation, addMessage } = useMessagesStore();
```
- Manages conversations and messages
- Methods: `setConversations`, `addMessage`, `markAsRead`, `deleteConversation`

#### **Canvas Store** (`src/store/canvasStore.ts`)
```typescript
const { entries, addEntry, updateEntry, deleteEntry, searchEntries } = useCanvasStore();
```
- Manages journal entries
- Methods: `setEntries`, `addEntry`, `updateEntry`, `deleteEntry`
- Utilities: `searchEntries()`, `filterByMood()`

#### **Features Store** (`src/store/featuresStore.ts`)
```typescript
// Manages: Routes, Challenges, Connections, Leaderboard, Shop Items
const {
  routes, challenges, connections, leaderboard, shopItems,
  addRoute, addChallenge, addConnection, purchaseItem
} = useFeaturesStore();
```

### 3. **API Service Layer** (`src/services/apiService.ts`)

Centralized API client with automatic token injection:

```typescript
import { apiService } from '@/services/apiService';

// Example usage
const response = await apiService.getFeed(page, limit);
const newPost = await apiService.createPost({ content, mood });
const messages = await apiService.getMessages(conversationId);
```

**Key Features:**
- Automatic Authorization header injection
- Request/response interceptors
- Error handling with auto logout on 401
- Timeout management (10s default)

**Available Endpoints:**
- Feed: `getFeed`, `createPost`, `deletePost`, `addReaction`
- Messages: `getConversations`, `getMessages`, `sendMessage`, `markAsRead`
- Canvas: `getJournalEntries`, `createJournalEntry`, `updateJournalEntry`, `deleteJournalEntry`
- Hopln: `getRoutes`, `createRoute`, `updateRoute`, `deleteRoute`
- Essenz: `getChallenges`, `createChallenge`, `completeChallenge`
- Bonding: `getConnections`, `addConnection`, `updateConnection`, `removeConnection`
- Ranking: `getLeaderboard`, `getUserRank`
- Shop: `getShopItems`, `purchaseItem`, `getWalletBalance`

### 4. **Custom Hooks** (`src/hooks/`)

Each feature has custom hooks that combine API calls with store updates:

#### **useFeeds** (`src/hooks/useFeeds.ts`)
```typescript
const {
  posts,
  loading,
  error,
  refreshing,
  loadFeed,
  onRefresh,
  loadMore,
  addReaction,
  deletePost
} = useFeeds();
```

#### **useMessages** (`src/hooks/useMessages.ts`)
```typescript
const {
  conversations,
  currentConversation,
  loadConversations,
  openConversation,
  sendMessage
} = useMessages();
```

#### **useCanvas** (`src/hooks/useCanvas.ts`)
```typescript
const {
  entries,
  loading,
  createEntry,
  updateEntry,
  deleteEntry
} = useCanvas();
```

#### **useFeatures** (`src/hooks/useFeatures.ts`)
Specialized hooks for each feature:
```typescript
const { routes, loadRoutes, createRoute } = useHopln();
const { challenges, loadChallenges, createChallenge } = useEssenz();
const { connections, loadConnections, connectWithUser } = useBonding();
const { leaderboard, loadLeaderboard, loadUserRank } = useRanking();
const { shopItems, walletBalance, loadItems, buy } = useShop();
```

### 5. **Real-time Synchronization** (`src/services/webSocketService.ts`)

WebSocket service for real-time updates:

```typescript
import { webSocketService, WS_EVENTS } from '@/services/webSocketService';

// Listen for events
const unsubscribe = webSocketService.on(WS_EVENTS.NEW_POST, (post) => {
  console.log('New post received:', post);
});

// Send events
webSocketService.send('message:send', { content: 'Hello' });

// Check connection status
const isConnected = webSocketService.isConnected();

// Cleanup
unsubscribe();
```

**Real-time Events:**
- `post:new` - New posts in feed
- `post:reaction` - New reactions
- `message:new` - New messages
- `user:online` / `user:offline` - User presence
- `challenge:completed` - Challenge progress
- `rank:update` - Ranking changes
- `connection:request` - New connection requests

### 6. **Offline Support** (`src/services/offlineQueue.ts`)

Queue system for handling requests when offline:

```typescript
import { offlineQueue } from '@/services/offlineQueue';

// Requests are automatically queued when offline
// Automatically retried when connection is restored
const queueSize = await offlineQueue.getQueueSize();
const queue = offlineQueue.getQueue();
await offlineQueue.clearQueue();
```

**Features:**
- Automatic offline detection using NetInfo
- Max 3 retry attempts per request
- Exponential backoff for reconnection
- Persistent storage of queued requests

### 7. **Service Initialization** (`src/services/initializationService.ts`)

Called automatically on app startup:

```typescript
import { initializationService } from '@/services/initializationService';

// Initializes:
// 1. Offline queue
// 2. WebSocket connection (if authenticated)
// 3. Error handling

await initializationService.initialize();
```

---

## 🔄 Data Flow

### Example: Fetching Feed

```
HomeScreen
  ↓
useFeeds() hook
  ↓
apiService.getFeed()  ← API call with token
  ↓
useFeedStore.setPosts()  ← Store update
  ↓
Component re-renders with new data
```

### Example: Offline Message Sending

```
MessagesScreen
  ↓
useMessages().sendMessage()
  ↓
apiService.sendMessage()
  ↓
✗ Network error → offlineQueue.addRequest()
  ↓
[Request persisted to AsyncStorage]
  ↓
[When online]
  ↓
offlineQueue.tryProcessQueue()
  ↓
apiService retries request
  ↓
✓ Success → useMessagesStore.addMessage()
```

### Example: Real-time Update

```
WebSocket receives message
  ↓
webSocketService.handleMessage()
  ↓
Emit to subscribers
  ↓
useMessages() listener updates store
  ↓
Component automatically re-renders
```

---

## 💾 Store Usage Examples

### Feed Store Example
```typescript
import { useFeedStore } from '@/store/feedStore';

export function FeedExample() {
  const { posts, addPost, addReaction } = useFeedStore();

  return (
    <View>
      {posts.map((post) => (
        <Pressable key={post.id} onPress={() => addReaction(post.id)}>
          <Text>{post.content}</Text>
          <Text>❤️ {post.reactions}</Text>
        </Pressable>
      ))}
    </View>
  );
}
```

### Features Store Example
```typescript
import { useFeaturesStore } from '@/store/featuresStore';

export function ShopExample() {
  const { shopItems, walletBalance, purchaseItem } = useFeaturesStore();

  const handlePurchase = (itemId: string, cost: number) => {
    const success = purchaseItem(itemId, cost);
    if (success) {
      Alert.alert('Purchase successful!');
    } else {
      Alert.alert('Insufficient balance');
    }
  };

  return (
    <View>
      <Text>Balance: {walletBalance}</Text>
      {shopItems.map((item) => (
        <Pressable
          key={item.id}
          onPress={() => handlePurchase(item.id, item.price)}
        >
          <Text>{item.name} - {item.price} 💎</Text>
        </Pressable>
      ))}
    </View>
  );
}
```

---

## 🔑 Key Configuration

### API Base URL
Edit in `src/services/apiService.ts`:
```typescript
const API_BASE_URL = 'http://localhost:3000/api';  // Change to production URL
```

### WebSocket URL
Edit in `src/services/webSocketService.ts`:
```typescript
const WS_BASE_URL = 'ws://localhost:3000';  // Change to production URL
```

### Offline Queue Settings
Edit in `src/services/offlineQueue.ts`:
```typescript
const MAX_RETRIES = 3;  // Max retry attempts
const QUEUE_KEY = 'offline_queue';  // AsyncStorage key
```

---

## 🚀 Best Practices

1. **Always use hooks instead of directly importing stores**
   ```typescript
   // ✓ Good
   const { posts, loading } = useFeeds();

   // ✗ Avoid
   const { posts, loading } = useFeedStore();
   ```

2. **Handle loading and error states**
   ```typescript
   if (loading) return <LoadingIndicator />;
   if (error) return <ErrorScreen error={error} />;
   return <Content />;
   ```

3. **Cleanup subscriptions**
   ```typescript
   useEffect(() => {
     const unsubscribe = webSocketService.on('event', handler);
     return () => unsubscribe();
   }, []);
   ```

4. **Use automatic offline handling**
   ```typescript
   // Don't check for offline manually
   // Just call API normally
   const response = await apiService.getFeed();
   // Automatically queued and retried when online
   ```

5. **Leverage real-time updates**
   ```typescript
   useEffect(() => {
     const unsubscribe = webSocketService.on(WS_EVENTS.NEW_POST, (post) => {
       useFeedStore.getState().addPost(post);
     });
     return () => unsubscribe();
   }, []);
   ```

---

## 📦 File Structure

```
src/
├── screens/
│   ├── HomeScreen.tsx
│   ├── MessagesScreen.tsx
│   ├── DiscoverScreen.tsx
│   ├── ProfileScreen.tsx
│   ├── ComponentsHubScreen.tsx
│   └── features/
│       ├── CanvasScreen.tsx
│       ├── HoplnScreen.tsx
│       ├── EssenzScreen.tsx
│       ├── BondingScreen.tsx
│       ├── RankingScreen.tsx
│       └── ShopScreen.tsx
├── store/
│   ├── feedStore.ts
│   ├── messagesStore.ts
│   ├── canvasStore.ts
│   └── featuresStore.ts
├── services/
│   ├── apiService.ts
│   ├── webSocketService.ts
│   ├── offlineQueue.ts
│   └── initializationService.ts
├── hooks/
│   ├── useFeeds.ts
│   ├── useMessages.ts
│   ├── useCanvas.ts
│   └── useFeatures.ts
└── App.tsx
```

---

## 🧪 Testing

To test API integration locally:

```bash
# Start mock API server (if available)
npm run dev:api

# Run mobile app
cd mobile && npm start

# Test in Expo Go or emulator
```

---

## 🐛 Troubleshooting

### WebSocket not connecting
- Check authentication token in AsyncStorage
- Verify WebSocket URL is correct
- Check network connectivity
- See console logs in `initializationService`

### API calls failing
- Verify API base URL
- Check network connectivity
- Review request/response interceptors
- Check error handling in components

### Offline queue not syncing
- Check internet connection
- Verify `offlineQueue` initialization
- Review retry logic (max 3 attempts)
- Clear queue if needed: `offlineQueue.clearQueue()`

---

## 📚 Additional Resources

- [Zustand Docs](https://github.com/pmndrs/zustand)
- [React Navigation](https://reactnavigation.org)
- [Axios](https://axios-http.com)
- [React Native Docs](https://reactnative.dev)
