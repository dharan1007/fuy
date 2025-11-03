import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';

import { useAuthStore } from '../store/authStore';
import { useAppStore } from '../store/appStore';
import { RootStackParamList } from './types';
import AuthNavigator from './AuthNavigator';
import MainTabNavigator from './MainTabNavigator';
import { COLORS } from '../constants/index';

const Stack = createNativeStackNavigator<RootStackParamList>();

const RootNavigator = () => {
  const { isAuthenticated, isLoading, initializeAuth } = useAuthStore();
  const setOnline = useAppStore((state) => state.setOnline);

  useEffect(() => {
    // Initialize app state
    setOnline(true);
    // Initialize auth
    initializeAuth();
  }, [initializeAuth, setOnline]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.white }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        {isAuthenticated ? (
          <>
            <Stack.Group screenOptions={{ headerShown: false }}>
              <Stack.Screen name="MainTabs" component={MainTabNavigator} />
            </Stack.Group>

            {/* Modal screens */}
            <Stack.Group
              screenOptions={{
                presentation: 'modal',
                headerShown: true,
                headerBackTitleVisible: false,
              }}
            >
              <Stack.Screen
                name="JournalDetail"
                component={JournalDetailScreen}
                options={{ headerTitle: 'Journal Entry' }}
              />
              <Stack.Screen
                name="PostDetail"
                component={PostDetailScreen}
                options={{ headerTitle: 'Post' }}
              />
              <Stack.Screen
                name="ChatScreen"
                component={ChatDetailScreen}
                options={{ headerTitle: 'Messages' }}
              />
              <Stack.Screen
                name="ProductDetail"
                component={ProductDetailScreen}
                options={{ headerTitle: 'Product' }}
              />
              <Stack.Screen
                name="Checkout"
                component={CheckoutScreen}
                options={{ headerTitle: 'Checkout' }}
              />
              <Stack.Screen
                name="MapScreen"
                component={MapScreenComponent}
                options={{ headerTitle: 'Map' }}
              />
              <Stack.Screen
                name="Settings"
                component={SettingsScreen}
                options={{ headerTitle: 'Settings' }}
              />
              <Stack.Screen
                name="ProfileEdit"
                component={ProfileEditScreen}
                options={{ headerTitle: 'Edit Profile' }}
              />
              <Stack.Screen
                name="CreatePost"
                component={CreatePostScreen}
                options={{ headerTitle: 'Create Post' }}
              />
              <Stack.Screen
                name="CreateJournal"
                component={CreateJournalScreen}
                options={{ headerTitle: 'New Journal Entry' }}
              />
            </Stack.Group>
          </>
        ) : (
          <Stack.Screen
            name="Auth"
            component={AuthNavigator}
            options={{ headerShown: false }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

// Placeholder components - will be replaced with actual screens
const JournalDetailScreen = () => <View />;
const PostDetailScreen = () => <View />;
const ChatDetailScreen = () => <View />;
const ProductDetailScreen = () => <View />;
const CheckoutScreen = () => <View />;
const MapScreenComponent = () => <View />;
const SettingsScreen = () => <View />;
const ProfileEditScreen = () => <View />;
const CreatePostScreen = () => <View />;
const CreateJournalScreen = () => <View />;

export default RootNavigator;
