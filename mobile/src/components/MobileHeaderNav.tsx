import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';

const COLORS = {
  primary: '#6AA8FF',
  joy: '#FFB366',
  calm: '#38D67A',
  reflect: '#B88FFF',
  base: '#0F0F12',
  surface: '#1A1A22',
  text: '#E8E8F0',
  textMuted: '#E8E8F0',
};

interface TopHeaderProps {
  activeTab: 'home' | 'components' | 'messages' | 'discover' | 'profile';
  onTabChange: (tab: 'home' | 'components' | 'messages' | 'discover' | 'profile') => void;
}

/**
 * Reusable Top Header Navigation Component for Mobile
 * Displays 5 main navigation tabs with active state indicator
 */
export function TopHeader({ activeTab, onTabChange }: TopHeaderProps) {
  const tabs = [
    { id: 'home' as const, label: 'Home' },
    { id: 'components' as const, label: 'Components' },
    { id: 'messages' as const, label: 'Messages' },
    { id: 'discover' as const, label: 'Discover' },
    { id: 'profile' as const, label: 'Profile' },
  ];

  return (
    <View style={styles.topHeader}>
      {tabs.map((tab) => (
        <TabButton
          key={tab.id}
          label={tab.label}
          isActive={activeTab === tab.id}
          onPress={() => onTabChange(tab.id)}
        />
      ))}
    </View>
  );
}

/**
 * Individual Tab Button Component
 */
function TabButton({
  label,
  isActive,
  onPress,
}: {
  label: string;
  isActive: boolean;
  onPress: () => void;
}) {
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

/**
 * Screen Header Component - Used in individual screens
 * Displays screen title and optional action button
 */
interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  actionIcon?: string;
  onActionPress?: () => void;
}

export function ScreenHeader({
  title,
  subtitle,
  actionIcon,
  onActionPress,
}: ScreenHeaderProps) {
  return (
    <View style={styles.screenHeader}>
      <View style={styles.headerContent}>
        <Text style={styles.headerTitle}>{title}</Text>
        {subtitle && <Text style={styles.headerSubtitle}>{subtitle}</Text>}
      </View>
      {actionIcon && (
        <Pressable style={styles.headerAction} onPress={onActionPress}>
          <Text style={styles.headerActionIcon}>{actionIcon}</Text>
        </Pressable>
      )}
    </View>
  );
}

/**
 * Section Header Component - For grouping content within screens
 */
interface SectionHeaderProps {
  title: string;
  onViewAllPress?: () => void;
}

export function SectionHeader({ title, onViewAllPress }: SectionHeaderProps) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {onViewAllPress && (
        <Pressable onPress={onViewAllPress}>
          <Text style={styles.sectionViewAll}>View All</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Top Header Styles
  topHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#FFFFFF',
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
    // Active state styling
  },
  topTabText: {
    fontSize: 13,
    color: '#E8E8F0',
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

  // Screen Header Styles
  screenHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#FFFFFF',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '400',
  },
  headerAction: {
    padding: 8,
    marginRight: -8,
  },
  headerActionIcon: {
    fontSize: 24,
  },

  // Section Header Styles
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  sectionViewAll: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '500',
  },
});
