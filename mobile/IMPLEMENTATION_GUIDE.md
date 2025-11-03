# FUY Mobile App - Implementation Guide

This guide provides detailed instructions for continuing the mobile app development and implementing the remaining features.

## Project Status

### ✅ Completed
- Project setup (Expo, React Native, TypeScript)
- Package configuration with all necessary dependencies
- Type definitions for all data models
- Constants and configuration
- Complete API service layer with:
  - Axios client with token management
  - Auth service (login, signup, token refresh, passkeys)
  - Journal service (CRUD operations)
  - Essenz service (goals management)
  - Social service (posts, likes, comments)
  - Chat service (messaging, conversations)
  - Products service (e-commerce)
  - Places service (maps, routes, reviews)
- Zustand state management:
  - Auth store (user, tokens, login/logout)
  - App store (global state, toasts, notifications)
  - Cart store (shopping cart management)
- Navigation setup:
  - Root navigator with auth flow
  - Auth navigator (login, signup)
  - Main tab navigator (6 tabs)
  - Modal screens setup
- Reusable components:
  - Button component (multiple variants)
  - Input component (with validation)
  - Card component (multiple styles)
  - Toast notification component
- Core screens (started):
  - LoginScreen (fully implemented)
  - DashboardScreen (fully implemented)

### 📋 TODO - Priority Order

1. **[HIGH] Complete Core Screens**
   - SignupScreen
   - JournalScreen with rich text editor
   - EssenzScreen with canvas/node-based UI
   - SocialScreen with feed
   - MessagesScreen with chat
   - ProfileScreen with settings

2. **[HIGH] Complete Modal/Detail Screens**
   - JournalDetailScreen
   - PostDetailScreen
   - ChatDetailScreen
   - ProductDetailScreen
   - CheckoutScreen
   - MapScreen
   - SettingsScreen
   - ProfileEditScreen

3. **[MEDIUM] Offline-First Architecture**
   - Set up SQLite database
   - Implement local caching
   - Create sync queue
   - Implement background sync

4. **[MEDIUM] Push Notifications**
   - Firebase configuration
   - Notification permissions
   - Notification handling
   - Deep linking from notifications

5. **[MEDIUM] Native Integrations**
   - Camera integration
   - Location services
   - Media gallery access
   - Biometric authentication

6. **[LOW] Additional Features**
   - Settings customization
   - Offline indicators
   - Performance optimization
   - Error boundaries
   - Analytics

## 📝 Creating New Screens

### Screen Template

```typescript
import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@navigation/types';

import { useAuthStore } from '@store/authStore';
import { showErrorToast } from '@store/appStore';
import Button from '@components/Button';
import Card from '@components/Card';
import { COLORS, SPACING, FONT_SIZES } from '@constants/index';

type ScreenProps = NativeStackScreenProps<RootStackParamList, 'YourScreen'>;

const YourScreen: React.FC<ScreenProps> = ({ navigation, route }) => {
  const { top, bottom } = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load data from API
      // setData(result);
    } catch (error) {
      showErrorToast(error instanceof Error ? error.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: top, paddingBottom: bottom }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} />
        ) : (
          <>
            {/* Content here */}
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
});

export default YourScreen;
```

### Integrating New Screen

1. Create screen file in `src/screens/`
2. Add to navigation in appropriate navigator
3. Update navigation types if needed
4. Import and use services for data fetching

## 🎨 Creating New Components

### Component Template

```typescript
import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { COLORS, SPACING, BORDER_RADIUS } from '@constants/index';

interface YourComponentProps {
  style?: ViewStyle;
  // Add other props
}

const YourComponent: React.FC<YourComponentProps> = ({ style, ...props }) => {
  return (
    <View style={[styles.container, style]}>
      {/* Component content */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // Styles here
  },
});

export default YourComponent;
```

## 🔧 Adding New API Service

### Service Template

```typescript
import { apiClient } from './api';
import { YourType } from '@types/index';

export const yourService = {
  async getItems(userId: string, page: number = 1): Promise<YourType[]> {
    try {
      const response = await apiClient.get<YourType[]>(
        `/users/${userId}/items`,
        { params: { page } }
      );
      return response.data.data || [];
    } catch (error) {
      throw this.handleError(error);
    }
  },

  async createItem(userId: string, data: Partial<YourType>): Promise<YourType> {
    try {
      const response = await apiClient.post<YourType>(
        `/users/${userId}/items`,
        data
      );
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  private handleError(error: any): Error {
    if (error.response?.data?.error) {
      return new Error(error.response.data.error);
    }
    return new Error('Operation failed');
  },
};
```

## 📦 Setting Up SQLite for Offline Support

### 1. Create Database Setup

```typescript
// src/db/database.ts
import SQLite from 'react-native-sqlite-storage';
import { SyncQueue } from '@types/index';

SQLite.enablePromise(true);

export class Database {
  private static instance: Database;
  private db: SQLite.SQLiteDatabase | null = null;

  static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  async init(): Promise<void> {
    try {
      this.db = await SQLite.openDatabase({
        name: 'fuy.db',
        location: 'default',
      });

      await this.createTables();
    } catch (error) {
      console.error('Database initialization failed:', error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) return;

    // Sync queue table
    await this.db.executeSql(`
      CREATE TABLE IF NOT EXISTS sync_queue (
        id TEXT PRIMARY KEY,
        action TEXT NOT NULL,
        entity TEXT NOT NULL,
        entityId TEXT NOT NULL,
        payload TEXT NOT NULL,
        timestamp BIGINT NOT NULL,
        retries INT DEFAULT 0,
        maxRetries INT DEFAULT 3,
        error TEXT
      );
    `);

    // Journal cache table
    await this.db.executeSql(`
      CREATE TABLE IF NOT EXISTS journal_cache (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        content TEXT NOT NULL,
        blocks TEXT,
        createdAt TEXT,
        updatedAt TEXT,
        synced BOOLEAN DEFAULT 0
      );
    `);

    // Post cache table
    await this.db.executeSql(`
      CREATE TABLE IF NOT EXISTS post_cache (
        id TEXT PRIMARY KEY,
        userId TEXT,
        content TEXT NOT NULL,
        feature TEXT,
        visibility TEXT,
        createdAt TEXT,
        synced BOOLEAN DEFAULT 0
      );
    `);
  }

  async addToSyncQueue(item: SyncQueue): Promise<void> {
    if (!this.db) return;

    await this.db.executeSql(
      `INSERT INTO sync_queue (id, action, entity, entityId, payload, timestamp, maxRetries)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        item.id,
        item.action,
        item.entity,
        item.entityId,
        JSON.stringify(item.payload),
        item.timestamp,
        item.maxRetries,
      ]
    );
  }

  async getSyncQueue(): Promise<SyncQueue[]> {
    if (!this.db) return [];

    const result = await this.db.executeSql(
      'SELECT * FROM sync_queue WHERE retries < maxRetries ORDER BY timestamp ASC'
    );

    return result[0].rows.raw().map((row: any) => ({
      id: row.id,
      action: row.action,
      entity: row.entity,
      entityId: row.entityId,
      payload: JSON.parse(row.payload),
      timestamp: row.timestamp,
      retries: row.retries,
      maxRetries: row.maxRetries,
      error: row.error,
    }));
  }

  async removeSyncItem(id: string): Promise<void> {
    if (!this.db) return;
    await this.db.executeSql('DELETE FROM sync_queue WHERE id = ?', [id]);
  }

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

export const database = Database.getInstance();
```

### 2. Implement Sync Service

```typescript
// src/services/sync.ts
import { database } from '@db/database';
import { useAppStore } from '@store/appStore';
import NetInfo from '@react-native-community/netinfo';
import { SyncQueue } from '@types/index';

export const syncService = {
  async syncPendingActions(): Promise<void> {
    const isConnected = await NetInfo.fetch();
    if (!isConnected.isConnected) return;

    useAppStore.setState({ syncInProgress: true });

    try {
      const queue = await database.getSyncQueue();

      for (const item of queue) {
        try {
          await this.processSyncItem(item);
          await database.removeSyncItem(item.id);
        } catch (error) {
          // Retry logic here
          console.error('Sync failed for item:', item.id, error);
        }
      }
    } finally {
      useAppStore.setState({ syncInProgress: false });
    }
  },

  private async processSyncItem(item: SyncQueue): Promise<void> {
    const { action, entity, payload } = item;

    switch (action) {
      case 'CREATE':
        // Call API to create
        break;
      case 'UPDATE':
        // Call API to update
        break;
      case 'DELETE':
        // Call API to delete
        break;
    }
  },

  addToQueue(action: 'CREATE' | 'UPDATE' | 'DELETE', entity: string, entityId: string, payload: any): void {
    database.addToSyncQueue({
      id: `${entity}-${entityId}-${Date.now()}`,
      action,
      entity,
      entityId,
      payload,
      timestamp: Date.now(),
      retries: 0,
      maxRetries: 3,
    });
  },
};
```

### 3. Monitor Network and Sync

```typescript
// Add to App.tsx
useEffect(() => {
  const unsubscribe = NetInfo.addEventListener((state) => {
    setOnline(state.isConnected ?? true);

    // Sync when coming back online
    if (state.isConnected && !isOnline) {
      syncService.syncPendingActions();
    }
  });

  return unsubscribe;
}, []);
```

## 🔔 Setting Up Push Notifications

### 1. Configure Firebase

```bash
# Install Firebase
npm install firebase @react-native-firebase/app @react-native-firebase/messaging
```

### 2. Create Notification Service

```typescript
// src/services/notifications.ts
import messaging from '@react-native-firebase/messaging';
import * as Notifications from 'expo-notifications';
import { showInfoToast } from '@store/appStore';

export const notificationService = {
  async requestPermissions(): Promise<boolean> {
    try {
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (enabled) {
        const token = await messaging().getToken();
        return !!token;
      }
      return false;
    } catch (error) {
      console.error('Failed to request notification permissions:', error);
      return false;
    }
  },

  async setupNotificationHandlers(): Promise<void> {
    // Handle notifications when app is in foreground
    messaging().onMessage(async (remoteMessage) => {
      showInfoToast(remoteMessage.notification?.body || 'New notification');
    });

    // Handle notification when app is opened from notification
    messaging().onNotificationOpenedApp((remoteMessage) => {
      handleDeepLink(remoteMessage);
    });
  },

  private handleDeepLink(remoteMessage: any): void {
    const data = remoteMessage.data || {};
    // Handle deep linking based on notification type
    // e.g., navigate to post, conversation, etc.
  },
};
```

## 📸 Camera & Media Integration

### 1. Request Permissions

```typescript
// src/hooks/useCamera.ts
import * as ImagePicker from 'expo-image-picker';
import * as Camera from 'expo-camera';
import { Alert } from 'react-native';

export const useCamera = () => {
  const requestCameraPermission = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Camera permission is required');
      return false;
    }
    return true;
  };

  const requestGalleryPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Gallery permission is required');
      return false;
    }
    return true;
  };

  const takePicture = async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return null;

    try {
      // Use CameraView or ImagePicker to capture
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });

      return result;
    } catch (error) {
      console.error('Failed to take picture:', error);
      return null;
    }
  };

  const pickFromGallery = async () => {
    const hasPermission = await requestGalleryPermission();
    if (!hasPermission) return null;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        quality: 0.8,
      });

      return result;
    } catch (error) {
      console.error('Failed to pick image:', error);
      return null;
    }
  };

  return {
    takePicture,
    pickFromGallery,
  };
};
```

## 📍 Location Services

### 1. Request Location Permission

```typescript
// src/hooks/useLocation.ts
import * as Location from 'expo-location';
import { Alert } from 'react-native';

export const useLocation = () => {
  const requestPermission = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Location permission is required');
      return false;
    }
    return true;
  };

  const getCurrentLocation = async () => {
    const hasPermission = await requestPermission();
    if (!hasPermission) return null;

    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      return location;
    } catch (error) {
      console.error('Failed to get location:', error);
      return null;
    }
  };

  const watchLocation = (callback: (location: Location.LocationObject) => void) => {
    return Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 5000,
        distanceInterval: 10,
      },
      callback
    );
  };

  return {
    getCurrentLocation,
    watchLocation,
  };
};
```

## 🎯 Development Workflow

### 1. Local Development

```bash
# Terminal 1: Start backend
cd ../
npm run dev

# Terminal 2: Start mobile app
cd mobile
npm start

# Scan QR code with Expo Go app or press 'a' for Android
```

### 2. Build Process

```bash
# Build for iOS
expo build:ios

# Build for Android
expo build:android

# Create preview build for testing
eas build --platform ios --profile preview
```

### 3. Testing

```bash
# Run tests
npm test

# Run with coverage
npm test -- --coverage

# Lint code
npm run lint

# Type check
npm run type-check
```

## 🐛 Debugging Tips

1. **Network Issues**: Check backend API URL in `.env`
2. **Auth Errors**: Verify JWT token storage and refresh logic
3. **Navigation Bugs**: Check parameter types in `navigation/types.ts`
4. **State Issues**: Use React DevTools or Zustand debug middleware
5. **Performance**: Profile with React Native Performance Monitor

## 📊 Project Metrics

- **Total Dependencies**: ~40
- **Service Files**: 7 (api, auth, journal, essenz, social, chat, products, places)
- **Store Files**: 3 (auth, app, cart)
- **Type Definitions**: 20+
- **Reusable Components**: 4+ (expandable)
- **Screens**: 2 completed, 8+ in progress

## 🎓 Learning Resources

- [React Native Documentation](https://reactnative.dev/)
- [Expo Documentation](https://docs.expo.dev/)
- [React Navigation](https://reactnavigation.org/)
- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## 📞 Next Steps

1. Complete all remaining screens using the provided templates
2. Integrate camera and location services
3. Set up SQLite and sync queue for offline support
4. Configure Firebase for push notifications
5. Test on real devices (iOS and Android)
6. Deploy to App Store and Google Play

This guide should help you continue development efficiently. Refer to the main README.md for API documentation and feature overview.
