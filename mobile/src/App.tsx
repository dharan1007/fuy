// src/App.tsx
import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { StatusBar, LogBox } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import RootNavigator from './navigation/RootNavigator';
import Toast from '../src/components/Toast';
import { initializationService } from './services/initializationService';
import { ThemeProvider } from './theme';

// Suppress known warnings
LogBox.ignoreLogs([
  'The native view manager required by name (ExpoBlurView)',
  'ViewManagerAdapter_ExpoBlurView',
  'Push notifications only work on physical devices',
  'Push notifications could not be initialized',
]);

export default function App() {
  useEffect(() => {
    // Initialize app services when app launches
    initializationService.initialize();

    // Cleanup when app closes
    return () => {
      initializationService.cleanup();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent
      />
      <SafeAreaProvider>
        <ThemeProvider>
          {/* RootNavigator already contains <NavigationContainer /> */}
          <RootNavigator />

          {/* Remove if your Toast is provided elsewhere */}
          <Toast />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
