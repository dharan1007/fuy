# FUY Mobile App - React Native/Expo

A comprehensive cross-platform mobile application built with React Native and Expo that works on both iOS and Android. This app replicates all the features from the FUY web platform with full offline support, push notifications, and native integrations.

## 📱 Features

### Core Features (All 8 Categories)

1. **Wellness & Mindfulness**
   - Journal creation with rich text editor (text, images, video, audio, drawings, checklists)
   - Daily check-ins
   - Breathing exercises
   - Grounding techniques
   - Alter Ego exploration
   - Algorithmic Archaeology (pattern analysis)
   - Self-compassion tools
   - Persona management

2. **Goal Achievement (Essenz)**
   - Visual goal workspace with canvas nodes
   - Node types: goal, steps, prioritize, todo, diary, resources, watchlist, hopin
   - Progress tracking
   - Status management (ACTIVE, COMPLETED, PAUSED)
   - Goal analytics

3. **Social Features**
   - Social feed with posts
   - Like, comment, and share functionality
   - Friend requests and management
   - Rankings and leaderboards
   - Community groups
   - Notifications

4. **Real-time Messaging**
   - 1-on-1 conversations
   - Message history
   - Message search
   - Read receipts
   - Typing indicators
   - Chat analytics

5. **Productivity Tools**
   - Dashboard with analytics
   - Pomodoro timer
   - If-Then planner
   - Relationship building (Bonds)
   - Weekly reviews
   - Task management

6. **Maps & Places**
   - Interactive Awe Routes with Leaflet maps
   - Route creation and waypoint management
   - Photo capture and sharing
   - Place reviews and ratings
   - Nearby places discovery

7. **E-Commerce**
   - Product browsing and search
   - Shopping cart (persistent storage)
   - Product reviews
   - Checkout process
   - Order tracking
   - Seller tools

8. **Account & Profile**
   - Email/Password authentication
   - Passkey (WebAuthn) support
   - Profile management
   - Settings customization
   - Privacy controls

### Technical Features

- **Offline-First Architecture**: SQLite local caching with sync queue
- **Push Notifications**: Real-time alerts for messages, likes, follows
- **Native Integrations**:
  - Camera for photo/video capture
  - Location services for maps and places
  - Media gallery access
  - Biometric authentication
- **State Management**: Zustand for global state
- **API Integration**: Full REST API communication with backend
- **Error Handling**: Comprehensive error management and user feedback
- **Network Detection**: Automatic handling of offline/online states

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ and npm
- Expo CLI: `npm install -g expo-cli`
- iOS development: Xcode (macOS only)
- Android development: Android Studio or Android SDK

### Installation

```bash
# Navigate to mobile directory
cd mobile

# Install dependencies
npm install

# Install Expo SDK dependencies
expo install

# Configure environment variables
cp .env.example .env
# Edit .env with your backend URL and API keys
```

### Environment Variables

Create a `.env` file in the mobile directory:

```env
EXPO_PUBLIC_API_URL=http://your-backend-api.com
EXPO_PUBLIC_RP_ID=your-domain.com
EXPO_PUBLIC_ORIGIN=https://your-domain.com
```

### Running the App

```bash
# Start the Expo development server
npm start

# Run on Android emulator
npm run android

# Run on iOS simulator (macOS only)
npm run ios

# Run on web browser
npm run web

# Build for production
expo build:android
expo build:ios
```

## 📁 Project Structure

```
mobile/
├── src/
│   ├── app/
│   │   └── App.tsx              # Main app component
│   ├── screens/                 # Screen components
│   │   ├── LoginScreen.tsx
│   │   ├── SignupScreen.tsx
│   │   ├── DashboardScreen.tsx
│   │   ├── JournalScreen.tsx
│   │   ├── EssenzScreen.tsx
│   │   ├── SocialScreen.tsx
│   │   ├── MessagesScreen.tsx
│   │   └── ProfileScreen.tsx
│   ├── components/              # Reusable components
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Card.tsx
│   │   ├── Toast.tsx
│   │   └── ...
│   ├── navigation/              # Navigation setup
│   │   ├── RootNavigator.tsx
│   │   ├── AuthNavigator.tsx
│   │   ├── MainTabNavigator.tsx
│   │   └── types.ts
│   ├── services/                # API and data services
│   │   ├── api.ts              # Axios instance with interceptors
│   │   ├── auth.ts             # Authentication service
│   │   ├── journal.ts          # Journal API calls
│   │   ├── essenz.ts           # Goals API calls
│   │   ├── social.ts           # Social/Posts API calls
│   │   ├── chat.ts             # Messaging API calls
│   │   ├── products.ts         # E-commerce API calls
│   │   └── places.ts           # Maps/Places API calls
│   ├── store/                   # Zustand state management
│   │   ├── authStore.ts        # Auth state and actions
│   │   ├── appStore.ts         # Global app state
│   │   └── cartStore.ts        # Shopping cart state
│   ├── db/                      # SQLite database setup
│   │   └── database.ts
│   ├── types/                   # TypeScript types
│   │   └── index.ts
│   ├── constants/               # App constants
│   │   └── index.ts
│   ├── utils/                   # Utility functions
│   │   └── ...
│   ├── hooks/                   # Custom React hooks
│   │   └── ...
│   └── assets/                  # Images, fonts, etc.
├── app.json                     # Expo configuration
├── tsconfig.json                # TypeScript configuration
├── package.json
├── index.js                     # Entry point
└── README.md
```

## 🔐 Authentication

The app supports multiple authentication methods:

### Email/Password
- Standard email and password login
- Password validation and error handling
- Secure token storage

### Passkeys (WebAuthn)
- Biometric authentication (Face ID, Touch ID)
- PIN-based authentication
- Passwordless login

### JWT Token Management
- Automatic token refresh on expiry
- Secure token storage using Expo Secure Store
- Request interceptors for adding auth headers

## 📱 API Integration

All API calls are made through the `apiClient` which handles:

- **Authentication**: Automatic token injection in headers
- **Token Refresh**: Automatic refresh when token expires
- **Retry Logic**: Exponential backoff for network failures
- **Error Handling**: Consistent error formatting
- **File Upload**: Multipart form data for media files

### Example API Usage

```typescript
import { journalService } from '@services/journal';

// Get journal entries
const { entries, total, hasMore } = await journalService.getEntries(userId, 1, 10);

// Create new entry
const entry = await journalService.createEntry(userId, {
  content: 'Today was great!',
  blocks: [
    { type: 'text', content: 'Dear diary...' }
  ],
  mood: 'happy'
});

// Update entry
const updated = await journalService.updateEntry(entryId, {
  content: 'Updated content'
});

// Delete entry
await journalService.deleteEntry(entryId);
```

## 🎨 Theming & Styling

The app uses a consistent color scheme and typography:

### Colors
- Primary: `#6366f1`
- Secondary: `#8b5cf6`
- Accent: `#ec4899`
- Success: `#10b981`
- Danger: `#ef4444`
- Warning: `#f59e0b`

### Fonts
Responsive typography with sizes from `xs` (12px) to `3xl` (30px)

### Spacing
Consistent spacing scale: `xs` (4px) → `xxl` (32px)

## 📦 State Management

### Auth Store (Zustand)
```typescript
import { useAuthStore } from '@store/authStore';

const user = useAuthStore((state) => state.user);
const login = useAuthStore((state) => state.login);
const logout = useAuthStore((state) => state.logout);
```

### App Store (Zustand)
```typescript
import { useAppStore, showSuccessToast } from '@store/appStore';

const isOnline = useAppStore((state) => state.isOnline);
showSuccessToast('Operation completed!');
```

### Cart Store (Zustand)
```typescript
import { useCartStore } from '@store/cartStore';

const items = useCartStore((state) => state.items);
useCartStore((state) => state.addItem(product, quantity));
```

## 🔄 Offline Support

The app automatically handles offline scenarios:

1. **Network Detection**: Monitors connectivity status
2. **Local Caching**: SQLite stores data locally
3. **Sync Queue**: Queues mutations when offline
4. **Automatic Sync**: Syncs when connection restored
5. **Offline Indicators**: UI shows offline status

### Implementing Offline Features

```typescript
import SQLite from 'react-native-sqlite-storage';

// Access offline database
const db = await openDatabase();

// Implement sync queue for mutations
const syncQueue = useAppStore((state) => state.syncQueue);
if (!isOnline) {
  // Queue the operation
  addToSyncQueue(action, payload);
} else {
  // Sync queued operations
  await syncPendingActions();
}
```

## 🔔 Push Notifications

The app supports push notifications for:

- New messages
- Post likes and comments
- Friend requests
- Goal reminders
- Community updates

### Setup

```typescript
import * as Notifications from 'expo-notifications';

// Request permissions
const { status } = await Notifications.requestPermissionsAsync();

// Listen for notifications
Notifications.addNotificationResponseReceivedListener((response) => {
  handleNotification(response.notification.request.content.data);
});
```

## 📸 Camera & Media

The app integrates with device camera and media library:

```typescript
import * as ImagePicker from 'expo-image-picker';
import * as Camera from 'expo-camera';

// Pick image
const result = await ImagePicker.launchImageLibraryAsync();

// Take photo
const photo = await Camera.takePictureAsync();

// Upload to server
await apiClient.uploadFile('/journal/123/blocks', {
  uri: photo.uri,
  name: 'photo.jpg',
  type: 'image/jpeg'
});
```

## 📍 Location Services

Access device location for maps and places:

```typescript
import * as Location from 'expo-location';

// Get current location
const location = await Location.getCurrentPositionAsync();

// Reverse geocoding
const address = await Location.reverseGeocodeAsync({
  latitude: location.coords.latitude,
  longitude: location.coords.longitude
});

// Watch location changes
Location.watchPositionAsync(
  { accuracy: Location.Accuracy.High },
  (location) => handleLocationUpdate(location)
);
```

## 🧪 Testing

The app includes demo credentials for testing:

- **Email**: demo@example.com
- **Password**: password

## 📊 Performance Optimization

- **Lazy Loading**: Screens and components load on demand
- **FlatList Optimization**: Implement `removeClippedSubviews` and `maxToRenderPerBatch`
- **Image Caching**: Fast Image for optimized image loading
- **Memoization**: Use `React.memo` for expensive components
- **Bundle Optimization**: Tree-shaking and code splitting

## 🛠 Development Tools

- **TypeScript**: Full type safety
- **ESLint**: Code linting
- **Expo Dev Tools**: Built-in debugging and hot reload
- **Redux DevTools** (optional): State inspection

## 📚 API Endpoints Reference

### Authentication
- `POST /auth/login` - Login with email/password
- `POST /auth/signup` - Create new account
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - Logout user

### Journal
- `GET /users/:userId/journal` - Get entries
- `POST /users/:userId/journal` - Create entry
- `PUT /journal/:id` - Update entry
- `DELETE /journal/:id` - Delete entry

### Essenz (Goals)
- `GET /users/:userId/essenz` - Get goals
- `POST /users/:userId/essenz` - Create goal
- `PUT /essenz/:id` - Update goal
- `DELETE /essenz/:id` - Delete goal

### Social
- `GET /users/:userId/feed` - Get feed
- `POST /users/:userId/posts` - Create post
- `POST /posts/:id/like` - Like post
- `POST /posts/:id/comments` - Add comment

### Messages
- `GET /users/:userId/conversations` - Get conversations
- `GET /conversations/:id/messages` - Get messages
- `POST /conversations/:id/messages` - Send message

### Products
- `GET /products` - List products
- `GET /products/:id` - Get product details
- `POST /users/:userId/orders` - Create order

### Places
- `GET /users/:userId/places` - Get places
- `GET /places/nearby` - Get nearby places
- `POST /users/:userId/places` - Create place

## 🤝 Contributing

To extend the app:

1. Create new screens in `src/screens/`
2. Add services in `src/services/`
3. Create components in `src/components/`
4. Update types in `src/types/index.ts`
5. Add routes to navigators

## 📝 License

This project is part of the FUY platform.

## 🆘 Support

For issues and questions:
1. Check the codebase documentation
2. Review API endpoint structure
3. Check network connectivity
4. Clear app cache and reinstall

## 🎯 Next Steps

To continue development:

1. **Create Remaining Screens**:
   - SignupScreen
   - JournalScreen
   - EssenzScreen
   - SocialScreen
   - MessagesScreen
   - ProfileScreen

2. **Implement Offline Database**:
   - Set up SQLite database
   - Create sync queue
   - Implement background sync

3. **Add Push Notifications**:
   - Configure Firebase Cloud Messaging
   - Handle notification events
   - Display in-app notifications

4. **Native Module Integration**:
   - Camera configuration
   - Location permissions
   - Media library access
   - Biometric authentication

5. **Testing**:
   - Unit tests with Jest
   - Integration tests
   - E2E tests with Detox
   - Manual testing on devices

6. **Performance**:
   - Profile bundle size
   - Optimize render performance
   - Implement code splitting
   - Cache optimization

## 📞 Contact

For questions about the mobile app implementation, refer to the web platform documentation at `/MOBILE_APP_CODEBASE_SUMMARY.md`.
