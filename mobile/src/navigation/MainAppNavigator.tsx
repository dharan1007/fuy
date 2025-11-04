import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, StyleSheet, Pressable, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Import top tab screens
import HomeScreen from '../screens/HomeScreen';
import ComponentsHubScreen from '../screens/ComponentsHubScreen';
import MessagesScreen from '../screens/MessagesScreen';
import DiscoverScreen from '../screens/DiscoverScreen';
import ProfileScreen from '../screens/ProfileScreen';

// Import bottom tab screens (features)
import CanvasScreen from '../screens/features/CanvasScreen';
import HoplnScreen from '../screens/features/HoplnScreen';
import EssenzScreen from '../screens/features/EssenzScreen';
import BondingScreen from '../screens/features/BondingScreen';
import RankingScreen from '../screens/features/RankingScreen';
import ShopScreen from '../screens/features/ShopScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Colors
const COLORS = {
  primary: '#6AA8FF',
  joy: '#FFB366',
  calm: '#38D67A',
  reflect: '#B88FFF',
  base: '#0F0F12',
  surface: '#1A1A22',
  text: '#E8E8F0',
  textMuted: 'rgba(232, 232, 240, 0.6)',
};

/**
 * TOP HEADER NAVIGATION (5 Main Tabs)
 */
export function TopTabNavigator() {
  const [activeTab, setActiveTab] = React.useState<'home' | 'components' | 'messages' | 'discover' | 'profile'>('home');

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return <HomeScreen />;
      case 'components':
        return <ComponentsHubScreen />;
      case 'messages':
        return <MessagesScreen />;
      case 'discover':
        return <DiscoverScreen />;
      case 'profile':
        return <ProfileScreen />;
      default:
        return <HomeScreen />;
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Header with SafeAreaView to prevent status bar overlap */}
      <SafeAreaView style={styles.safeTopHeader} edges={['top']}>
        <View style={styles.topHeader}>
          <TabButton label="Home" isActive={activeTab === 'home'} onPress={() => setActiveTab('home')} />
          <TabButton label="Components" isActive={activeTab === 'components'} onPress={() => setActiveTab('components')} />
          <TabButton label="Messages" isActive={activeTab === 'messages'} onPress={() => setActiveTab('messages')} />
          <TabButton label="Discover" isActive={activeTab === 'discover'} onPress={() => setActiveTab('discover')} />
          <TabButton label="Profile" isActive={activeTab === 'profile'} onPress={() => setActiveTab('profile')} />
        </View>
      </SafeAreaView>

      {/* Content Area */}
      <View style={styles.contentArea}>
        {renderContent()}
      </View>

      {/* Bottom Feature Tabs */}
      <FeatureTabBar />
    </View>
  );
}

/**
 * BOTTOM FEATURE TABS (6 Bottom Navigation Tabs)
 */
function FeatureTabBar() {
  const [activeFeature, setActiveFeature] = React.useState<'canvas' | 'hopln' | 'essenz' | 'bonding' | 'ranking' | 'shop'>('canvas');

  const renderFeatureContent = () => {
    switch (activeFeature) {
      case 'canvas':
        return <CanvasScreen />;
      case 'hopln':
        return <HoplnScreen />;
      case 'essenz':
        return <EssenzScreen />;
      case 'bonding':
        return <BondingScreen />;
      case 'ranking':
        return <RankingScreen />;
      case 'shop':
        return <ShopScreen />;
      default:
        return <CanvasScreen />;
    }
  };

  const features = [
    { id: 'canvas', label: 'Canvas', icon: '🎨' },
    { id: 'hopln', label: 'Hopln', icon: '🚀' },
    { id: 'essenz', label: 'Essenz', icon: '✨' },
    { id: 'bonding', label: 'Bonding', icon: '🔗' },
    { id: 'ranking', label: 'Ranking', icon: '🏆' },
    { id: 'shop', label: 'Shop', icon: '🛍️' },
  ];

  return (
    <View style={styles.featureContainer}>
      {/* Feature Content */}
      <View style={styles.featureContent}>
        {renderFeatureContent()}
      </View>

      {/* Feature Tabs */}
      <View style={styles.bottomTabs}>
        {features.map((feature) => (
          <Pressable
            key={feature.id}
            style={[styles.featureTab, activeFeature === feature.id && styles.featureTabActive]}
            onPress={() => setActiveFeature(feature.id as any)}
          >
            <Text style={styles.featureIcon}>{feature.icon}</Text>
            {activeFeature === feature.id && (
              <Text style={styles.featureLabel}>{feature.label}</Text>
            )}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

/**
 * Top Tab Button Component
 */
function TabButton({ label, isActive, onPress }: { label: string; isActive: boolean; onPress: () => void }) {
  return (
    <Pressable
      style={[styles.topTabButton, isActive && styles.topTabButtonActive]}
      onPress={onPress}
    >
      <Text style={[styles.topTabText, isActive && styles.topTabTextActive]}>
        {label}
      </Text>
      {isActive && <View style={styles.topTabIndicator} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.base,
  },
  safeTopHeader: {
    backgroundColor: 'rgba(26, 26, 34, 0.8)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  topHeader: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 12,
    justifyContent: 'space-around',
  },
  topTabButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    position: 'relative',
  },
  topTabButtonActive: {
    // Active state
  },
  topTabText: {
    fontSize: 13,
    color: 'rgba(232, 232, 240, 0.6)',
    fontWeight: '500',
  },
  topTabTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  topTabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 12,
    right: 12,
    height: 2,
    backgroundColor: COLORS.primary,
    borderRadius: 1,
  },
  contentArea: {
    flex: 1,
    overflow: 'hidden',
  },
  featureContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  featureContent: {
    flex: 1,
    overflow: 'hidden',
  },
  bottomTabs: {
    flexDirection: 'row',
    backgroundColor: 'rgba(26, 26, 34, 0.8)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 8,
    paddingHorizontal: 4,
    justifyContent: 'space-around',
    height: 65,
  },
  featureTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 12,
    marginHorizontal: 4,
  },
  featureTabActive: {
    backgroundColor: 'rgba(106, 168, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(106, 168, 255, 0.3)',
  },
  featureIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  featureLabel: {
    fontSize: 10,
    color: COLORS.primary,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default TopTabNavigator;
