// src/App.tsx
import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import RootNavigator from './navigation/RootNavigator';
import Toast from '../src/components/Toast';
import { initializationService } from './services/initializationService';

export default function App() {
  const scheme = useColorScheme();

  useEffect(() => {
    // Initialize app services when app launches
    initializationService.initialize();

    // Cleanup when app closes
    return () => {
      initializationService.cleanup();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        {/* RootNavigator already contains <NavigationContainer /> */}
        <RootNavigator />

        <StatusBar
          barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'}
          backgroundColor="transparent"
          translucent
        />

        {/* Remove if your Toast is provided elsewhere */}
        <Toast />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
