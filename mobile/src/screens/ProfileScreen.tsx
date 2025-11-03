import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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

interface UserProfile {
  name: string;
  username: string;
  bio: string;
  momentCount: number;
  followersCount: number;
  followingCount: number;
  joinDate: string;
}

export default function ProfileScreen() {
  const [profile] = useState<UserProfile>({
    name: 'You',
    username: '@fuy_explorer',
    bio: 'Life is a collection of beautiful moments ✨',
    momentCount: 42,
    followersCount: 1024,
    followingCount: 386,
    joinDate: 'Joined Dec 2024',
  });

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [privacyMode, setPrivacyMode] = useState(false);

  const PROFILE_SECTIONS = [
    { id: '1', label: 'Your Moments', value: profile.momentCount, icon: '🎨' },
    { id: '2', label: 'Followers', value: profile.followersCount, icon: '👥' },
    { id: '3', label: 'Following', value: profile.followingCount, icon: '🔗' },
  ];

  const SETTINGS = [
    {
      id: '1',
      label: 'Notifications',
      description: 'Get notifications for new moments',
      value: notificationsEnabled,
      onChange: setNotificationsEnabled,
    },
    {
      id: '2',
      label: 'Dark Mode',
      description: 'Use dark theme',
      value: darkMode,
      onChange: setDarkMode,
    },
    {
      id: '3',
      label: 'Private Profile',
      description: 'Only followers can see your moments',
      value: privacyMode,
      onChange: setPrivacyMode,
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>👤</Text>
            </View>
          </View>

          <Text style={styles.name}>{profile.name}</Text>
          <Text style={styles.username}>{profile.username}</Text>
          <Text style={styles.bio}>{profile.bio}</Text>
          <Text style={styles.joinDate}>{profile.joinDate}</Text>

          <View style={styles.actionButtons}>
            <Pressable style={styles.actionButton}>
              <Text style={styles.actionButtonText}>Edit Profile</Text>
            </Pressable>
            <Pressable style={[styles.actionButton, styles.secondaryButton]}>
              <Text style={styles.secondaryButtonText}>Share Profile</Text>
            </Pressable>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          {PROFILE_SECTIONS.map((stat) => (
            <View key={stat.id} style={styles.statItem}>
              <Text style={styles.statIcon}>{stat.icon}</Text>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Settings */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Settings</Text>

          {SETTINGS.map((setting) => (
            <View key={setting.id} style={styles.settingItem}>
              <View style={styles.settingContent}>
                <Text style={styles.settingLabel}>{setting.label}</Text>
                <Text style={styles.settingDescription}>{setting.description}</Text>
              </View>
              <Switch
                value={setting.value}
                onValueChange={setting.onChange}
                trackColor={{ false: 'rgba(255, 255, 255, 0.1)', true: COLORS.primary }}
              />
            </View>
          ))}
        </View>

        {/* Additional Options */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>More</Text>

          <Pressable style={styles.optionItem}>
            <Text style={styles.optionIcon}>❓</Text>
            <Text style={styles.optionLabel}>Help & Support</Text>
          </Pressable>

          <Pressable style={styles.optionItem}>
            <Text style={styles.optionIcon}>⚙️</Text>
            <Text style={styles.optionLabel}>Privacy Policy</Text>
          </Pressable>

          <Pressable style={styles.optionItem}>
            <Text style={styles.optionIcon}>📋</Text>
            <Text style={styles.optionLabel}>Terms of Service</Text>
          </Pressable>

          <Pressable style={[styles.optionItem, styles.dangerOption]}>
            <Text style={styles.optionIcon}>🚪</Text>
            <Text style={styles.dangerLabel}>Sign Out</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.base,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
  },
  profileCard: {
    marginHorizontal: 16,
    marginVertical: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(106, 168, 255, 0.2)',
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 40,
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  username: {
    fontSize: 14,
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  bio: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 18,
  },
  joinDate: {
    fontSize: 11,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#000',
    fontWeight: '600',
    fontSize: 14,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  secondaryButtonText: {
    color: COLORS.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  statItem: {
    alignItems: 'center',
  },
  statIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  sectionContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    marginBottom: 8,
  },
  settingContent: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  settingDescription: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    marginBottom: 8,
    gap: 12,
  },
  optionIcon: {
    fontSize: 18,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  dangerOption: {
    backgroundColor: 'rgba(255, 100, 100, 0.05)',
  },
  dangerLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FF6464',
  },
});
