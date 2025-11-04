import React from 'react';
import { View, StyleSheet, Pressable, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Import screens
import HomeScreen from '../screens/HomeScreen';
import MessagesScreen from '../screens/MessagesScreen';
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
  border: 'rgba(255, 255, 255, 0.08)',
};

export function TopTabNavigator() {
  const [topTab, setTopTab] = React.useState<'home' | 'messages' | 'discover' | 'profile'>('home');
  const [bottomTab, setBottomTab] = React.useState<'canvas' | 'hopln' | 'essenz' | 'shop'>('canvas');

  const renderTopContent = () => {
    switch (topTab) {
      case 'home':
        return <HomeScreen />;
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

  const renderBottomContent = () => {
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

  // Determine which content to show based on active tabs
  const isTopTabActive = topTab !== 'home';
  const activeScreen = isTopTabActive ? renderTopContent() : renderBottomContent();

  return (
    <View style={styles.container}>
      {/* TOP HEADER - PROFESSIONAL MINIMALISTIC */}
      <SafeAreaView style={styles.headerSafeArea} edges={['top']}>
        <View style={styles.header}>
          {/* Left navigation icons */}
          <View style={styles.headerLeft}>
            <Pressable
              style={[styles.navIcon, topTab === 'home' && styles.navIconActive]}
              onPress={() => setTopTab('home')}
            >
              <HomeIcon size={20} color={topTab === 'home' ? COLORS.primary : COLORS.textMuted} />
            </Pressable>
            <Pressable
              style={[styles.navIcon, topTab === 'messages' && styles.navIconActive]}
              onPress={() => setTopTab('messages')}
            >
              <MessagesIcon size={20} color={topTab === 'messages' ? COLORS.primary : COLORS.textMuted} />
            </Pressable>
            <Pressable
              style={[styles.navIcon, topTab === 'discover' && styles.navIconActive]}
              onPress={() => setTopTab('discover')}
            >
              <DiscoverIcon size={20} color={topTab === 'discover' ? COLORS.primary : COLORS.textMuted} />
            </Pressable>
          </View>

          {/* App title/logo in center */}
          <Text style={styles.headerTitle}>fuy</Text>

          {/* Right side - Notification + Profile */}
          <View style={styles.headerRight}>
            <Pressable style={styles.notificationBtn}>
              <NotificationIcon size={20} color={COLORS.textMuted} />
            </Pressable>
            <Pressable
              style={[styles.profileIcon, topTab === 'profile' && styles.profileIconActive]}
              onPress={() => setTopTab('profile')}
            >
              <ProfileIcon size={20} color={topTab === 'profile' ? COLORS.primary : COLORS.textMuted} />
            </Pressable>
          </View>
        </View>
      </SafeAreaView>

      {/* MAIN CONTENT AREA */}
      <View style={styles.contentContainer}>
        {activeScreen}
      </View>

      {/* BOTTOM NAVIGATION BAR - PROFESSIONAL WITH CREATE BUTTON */}
      <View style={styles.bottomBar}>
        {/* Left tabs */}
        <View style={styles.bottomLeftTabs}>
          <Pressable
            style={[styles.bottomTab, bottomTab === 'canvas' && styles.bottomTabActive]}
            onPress={() => {
              setBottomTab('canvas');
              setTopTab('home');
            }}
          >
            <CanvasIcon size={20} color={bottomTab === 'canvas' ? COLORS.primary : COLORS.textMuted} />
            <Text style={[styles.bottomTabLabel, bottomTab === 'canvas' && styles.bottomTabLabelActive]}>
              Canvas
            </Text>
          </Pressable>

          <Pressable
            style={[styles.bottomTab, bottomTab === 'hopln' && styles.bottomTabActive]}
            onPress={() => {
              setBottomTab('hopln');
              setTopTab('home');
            }}
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
            onPress={() => {
              setBottomTab('essenz');
              setTopTab('home');
            }}
          >
            <EssenzIcon size={20} color={bottomTab === 'essenz' ? COLORS.primary : COLORS.textMuted} />
            <Text style={[styles.bottomTabLabel, bottomTab === 'essenz' && styles.bottomTabLabelActive]}>
              Essenz
            </Text>
          </Pressable>

          <Pressable
            style={[styles.bottomTab, bottomTab === 'shop' && styles.bottomTabActive]}
            onPress={() => {
              setBottomTab('shop');
              setTopTab('home');
            }}
          >
            <ShopIcon size={20} color={bottomTab === 'shop' ? COLORS.primary : COLORS.textMuted} />
            <Text style={[styles.bottomTabLabel, bottomTab === 'shop' && styles.bottomTabLabelActive]}>
              Shop
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.base,
  },

  // HEADER STYLES
  headerSafeArea: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
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
  notificationBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
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
    backgroundColor: 'rgba(106, 168, 255, 0.15)',
  },
  navIconText: {
    fontSize: 18,
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
  profileIconText: {
    fontSize: 18,
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
    backgroundColor: COLORS.surface,
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
    backgroundColor: 'rgba(106, 168, 255, 0.15)',
  },
  bottomTabLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '500',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
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
