import React from 'react';
import { View, StyleSheet, Pressable, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Import screens
import HomeScreen from '../screens/HomeScreen';
import MessagesScreen from '../screens/MessagesScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import DiscoverScreen from '../screens/DiscoverScreen';
import ProfileScreen from '../screens/ProfileScreen';

// Import feature screens
import CanvasScreen from '../screens/features/CanvasScreen';
import HoplnScreen from '../screens/features/HoplnScreen';
import EssenzScreen from '../screens/features/EssenzScreen';
import ShopScreen from '../screens/features/ShopScreen';

// Import custom icons
import {
  HomeIcon,
  MessagesIcon,
  DiscoverIcon,
  ProfileIcon,
  NotificationIcon,
  CanvasIcon,
  HoplnIcon,
  EssenzIcon,
  ShopIcon,
} from '../components/CustomIcons';

// Colors - Pastel white, red/orange, glassmorphic theme
const COLORS = {
  primary: '#FF7A5C',      // Warm coral/orange-red
  secondary: '#FFB3A7',    // Soft peachy pink
  joy: '#FFB3A7',          // Peachy pink
  calm: '#FFD4C5',         // Very light peach
  reflect: '#FFE5DB',      // Pale rose
  base: '#FFFFFF',  // White (opaque)
  baseLight: '#FAFAF8',  // Off-white (opaque)
  surface: '#FFF5F0',  // Light peach (opaque)
  surfaceAlt: '#FFFFFF',  // White (opaque)
  text: '#000000',         // Black
  textMuted: '#666666',    // Dark gray
  border: '#E5D7D0',       // Soft warm border
  borderLight: '#000000',  // Black (opaque)
};

export function TopTabNavigator() {
  const [topTab, setTopTab] = React.useState<'home' | 'messages' | 'notifications' | 'discover' | 'profile'>('home');
  const [bottomTab, setBottomTab] = React.useState<'canvas' | 'hopln' | 'essenz' | 'shop'>('canvas');
  const [showBottomNav, setShowBottomNav] = React.useState(true);

  // Render screen based on active top tab
  const renderScreen = () => {
    switch (topTab) {
      case 'home':
        return showBottomNav ? renderFeatureScreen() : <HomeScreen />;
      case 'messages':
        return <MessagesScreen />;
      case 'notifications':
        return <NotificationsScreen />;
      case 'discover':
        return <DiscoverScreen />;
      case 'profile':
        return <ProfileScreen />;
      default:
        return <HomeScreen />;
    }
  };

  // Render feature screens (Canvas, Hopln, Essenz, Shop)
  const renderFeatureScreen = () => {
    switch (bottomTab) {
      case 'canvas':
        return <CanvasScreen />;
      case 'hopln':
        return <HoplnScreen />;
      case 'essenz':
        return <EssenzScreen />;
      case 'shop':
        return <ShopScreen />;
      default:
        return <CanvasScreen />;
    }
  };

  const handleTopTabPress = (tab: typeof topTab) => {
    setTopTab(tab);
    // Show bottom nav only on home tab
    setShowBottomNav(tab === 'home');
  };

  const handleBottomTabPress = (tab: typeof bottomTab) => {
    setBottomTab(tab);
    // Make sure we're on home tab
    if (topTab !== 'home') {
      setTopTab('home');
      setShowBottomNav(true);
    }
  };

  return (
    <View style={styles.container}>
      {/* TOP HEADER - PROFESSIONAL MINIMALISTIC */}
      <SafeAreaView style={styles.headerSafeArea} edges={['top']}>
        <View style={styles.header}>
          {/* Left navigation icons */}
          <View style={styles.headerLeft}>
            <Pressable
              style={[styles.navIcon, topTab === 'home' && styles.navIconActive]}
              onPress={() => handleTopTabPress('home')}
            >
              <HomeIcon size={20} color={topTab === 'home' ? COLORS.primary : COLORS.textMuted} />
            </Pressable>
            <Pressable
              style={[styles.navIcon, topTab === 'messages' && styles.navIconActive]}
              onPress={() => handleTopTabPress('messages')}
            >
              <MessagesIcon size={20} color={topTab === 'messages' ? COLORS.primary : COLORS.textMuted} />
            </Pressable>
            <Pressable
              style={[styles.navIcon, topTab === 'discover' && styles.navIconActive]}
              onPress={() => handleTopTabPress('discover')}
            >
              <DiscoverIcon size={20} color={topTab === 'discover' ? COLORS.primary : COLORS.textMuted} />
            </Pressable>
          </View>

          {/* App title/logo in center */}
          <Text style={styles.headerTitle}>fuy</Text>

          {/* Right side - Notification + Profile */}
          <View style={styles.headerRight}>
            <Pressable
              style={[styles.notificationBtn, topTab === 'notifications' && styles.notificationBtnActive]}
              onPress={() => handleTopTabPress('notifications')}
            >
              <NotificationIcon size={20} color={topTab === 'notifications' ? COLORS.primary : COLORS.textMuted} />
            </Pressable>
            <Pressable
              style={[styles.profileIcon, topTab === 'profile' && styles.profileIconActive]}
              onPress={() => handleTopTabPress('profile')}
            >
              <ProfileIcon size={20} color={topTab === 'profile' ? COLORS.primary : COLORS.textMuted} />
            </Pressable>
          </View>
        </View>
      </SafeAreaView>

      {/* MAIN CONTENT AREA */}
      <View style={styles.contentContainer}>
        {renderScreen()}
      </View>

      {/* BOTTOM NAVIGATION BAR - ONLY SHOW ON HOME TAB */}
      {showBottomNav && (
        <View style={styles.bottomBar}>
          {/* Left tabs */}
          <View style={styles.bottomLeftTabs}>
            <Pressable
              style={[styles.bottomTab, bottomTab === 'canvas' && styles.bottomTabActive]}
              onPress={() => handleBottomTabPress('canvas')}
            >
              <CanvasIcon size={20} color={bottomTab === 'canvas' ? COLORS.primary : COLORS.textMuted} />
              <Text style={[styles.bottomTabLabel, bottomTab === 'canvas' && styles.bottomTabLabelActive]}>
                Canvas
              </Text>
            </Pressable>

            <Pressable
              style={[styles.bottomTab, bottomTab === 'hopln' && styles.bottomTabActive]}
              onPress={() => handleBottomTabPress('hopln')}
            >
              <HoplnIcon size={20} color={bottomTab === 'hopln' ? COLORS.primary : COLORS.textMuted} />
              <Text style={[styles.bottomTabLabel, bottomTab === 'hopln' && styles.bottomTabLabelActive]}>
                Hopln
              </Text>
            </Pressable>
          </View>

          {/* Center Create Button */}
          <Pressable style={styles.createButton}>
            <Text style={styles.createButtonText}>+</Text>
          </Pressable>

          {/* Right tabs */}
          <View style={styles.bottomRightTabs}>
            <Pressable
              style={[styles.bottomTab, bottomTab === 'essenz' && styles.bottomTabActive]}
              onPress={() => handleBottomTabPress('essenz')}
            >
              <EssenzIcon size={20} color={bottomTab === 'essenz' ? COLORS.primary : COLORS.textMuted} />
              <Text style={[styles.bottomTabLabel, bottomTab === 'essenz' && styles.bottomTabLabelActive]}>
                Essenz
              </Text>
            </Pressable>

            <Pressable
              style={[styles.bottomTab, bottomTab === 'shop' && styles.bottomTabActive]}
              onPress={() => handleBottomTabPress('shop')}
            >
              <ShopIcon size={20} color={bottomTab === 'shop' ? COLORS.primary : COLORS.textMuted} />
              <Text style={[styles.bottomTabLabel, bottomTab === 'shop' && styles.bottomTabLabelActive]}>
                Shop
              </Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // HEADER STYLES
  headerSafeArea: {
    borderBottomWidth: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 1,
  },
  navIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  navIconActive: {
    backgroundColor: '#FF7A5C',
  },
  notificationBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  notificationBtnActive: {
    backgroundColor: '#FF7A5C',
  },
  profileIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  profileIconActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },

  // CONTENT AREA
  contentContainer: {
    flex: 1,
    overflow: 'hidden',
  },

  // BOTTOM NAV STYLES
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    height: 80,
  },
  bottomLeftTabs: {
    flexDirection: 'row',
    flex: 1,
    gap: 4,
  },
  bottomRightTabs: {
    flexDirection: 'row',
    flex: 1,
    justifyContent: 'flex-end',
    gap: 4,
  },
  bottomTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 12,
  },
  bottomTabActive: {
    backgroundColor: '#FF7A5C',
  },
  bottomTabLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '500',
    marginTop: 2,
  },
  bottomTabLabelActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },

  // CREATE BUTTON (CENTER)
  createButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  createButtonText: {
    fontSize: 32,
    color: '#000',
    fontWeight: '700',
    lineHeight: 36,
  },
});

export default TopTabNavigator;
