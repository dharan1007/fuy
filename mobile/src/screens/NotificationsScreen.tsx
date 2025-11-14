import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GlassBackground, GlassSurface } from '../components/glass';
import { useGlassTokens } from '../theme';

// Mock notification data
const MOCK_NOTIFICATIONS = [
  {
    id: '1',
    type: 'like',
    title: 'Alex Journey liked your post',
    message: 'They loved your hiking trail story',
    timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
    avatar: 'AJ',
    read: false,
    icon: '💜',
  },
  {
    id: '2',
    type: 'comment',
    title: 'Sarah Mindful commented on your post',
    message: '"Great insights! Really resonates with me" ',
    timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
    avatar: 'SM',
    read: false,
    icon: '💬',
  },
  {
    id: '3',
    type: 'follow',
    title: 'Jordan Creative started following you',
    message: 'Check out their amazing creative projects',
    timestamp: new Date(Date.now() - 1 * 3600000).toISOString(),
    avatar: 'JC',
    read: false,
    icon: '👤',
  },
  {
    id: '4',
    type: 'milestone',
    title: 'You reached 100 followers!',
    message: 'Congratulations on this amazing milestone',
    timestamp: new Date(Date.now() - 2 * 3600000).toISOString(),
    avatar: '',
    read: true,
    icon: '🎉',
  },
  {
    id: '5',
    type: 'achievement',
    title: 'New badge unlocked: Rising Star',
    message: 'You completed 5 challenges in one week',
    timestamp: new Date(Date.now() - 4 * 3600000).toISOString(),
    avatar: '',
    read: true,
    icon: '⭐',
  },
  {
    id: '6',
    type: 'message',
    title: 'Casey Reflect sent you a message',
    message: '"Hey! How did your meditation session go?"',
    timestamp: new Date(Date.now() - 5 * 3600000).toISOString(),
    avatar: 'CR',
    read: true,
    icon: '💬',
  },
  {
    id: '7',
    type: 'update',
    title: 'Essenz challenge update',
    message: 'New challenge: 7-day mindfulness journey',
    timestamp: new Date(Date.now() - 1 * 86400000).toISOString(),
    avatar: '',
    read: true,
    icon: '📢',
  },
];

export default function NotificationsScreen() {
  const tokens = useGlassTokens();
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = () => {
    setLoading(true);
    setTimeout(() => {
      setNotifications(MOCK_NOTIFICATIONS);
      setLoading(false);
    }, 500);
  };

  const handleMarkAsRead = (id: string) => {
    setNotifications(
      notifications.map((notif) =>
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
  };

  const handleDeleteNotification = (id: string) => {
    setNotifications(notifications.filter((notif) => notif.id !== id));
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'like':
        return '#FF6464';
      case 'comment':
        return '#FF7A5C';
      case 'follow':
        return '#FF7A5C';
      case 'milestone':
        return '#FFB3A7';
      case 'achievement':
        return '#FFD4C5';
      case 'message':
        return '#FF7A5C';
      case 'update':
        return '#FFB3A7';
      default:
        return '#FF7A5C';
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <GlassBackground>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <GlassSurface variant="header" style={styles.header} padding={16}>
          <View>
            <Text style={[styles.title, { color: tokens.colors.text.primary }]}>Notifications</Text>
            <Text style={[styles.subtitle, { color: tokens.colors.text.secondary }]}>Stay in the loop</Text>
          </View>
          {unreadCount > 0 && (
            <View style={[styles.unreadBadge, { backgroundColor: tokens.colors.primary }]}>
              <Text style={styles.unreadText}>{unreadCount}</Text>
            </View>
          )}
        </GlassSurface>

        {/* Content */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={tokens.colors.primary} />
            <Text style={[styles.loadingText, { color: tokens.colors.text.secondary }]}>Loading notifications...</Text>
          </View>
        ) : (
          <FlatList
            data={notifications}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <Pressable
                style={[styles.notificationItem, !item.read && styles.notificationItemUnread]}
                onPress={() => handleMarkAsRead(item.id)}
              >
                {/* Avatar/Icon */}
                <View
                  style={[
                    styles.avatarCircle,
                    { backgroundColor: getNotificationColor(item.type) + '20' },
                  ]}
                >
                  <Text style={styles.avatarText}>{item.avatar || item.icon}</Text>
                </View>

                {/* Content */}
                <View style={styles.contentWrapper}>
                  <View style={styles.header2}>
                    <Text style={[styles.notificationTitle, { color: tokens.colors.text.primary }]}>{item.title}</Text>
                    <Text style={[styles.notificationTime, { color: tokens.colors.text.secondary }]}>{formatTime(item.timestamp)}</Text>
                  </View>
                  <Text style={[styles.notificationMessage, { color: tokens.colors.text.secondary }]} numberOfLines={2}>
                    {item.message}
                  </Text>
                </View>

                {/* Unread Dot */}
                {!item.read && <View style={[styles.unreadDot, { backgroundColor: tokens.colors.primary }]} />}

                {/* Delete Button */}
                <Pressable
                  style={styles.deleteBtn}
                  onPress={() => handleDeleteNotification(item.id)}
                >
                  <Text style={styles.deleteBtnText}>✕</Text>
                </Pressable>
              </Pressable>
            )}
            contentContainerStyle={styles.listContent}
            scrollIndicatorInsets={{ right: 1 }}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <View style={styles.emptyIconContainer}>
                  <Text style={styles.emptyIcon}>🔔</Text>
                </View>
                <Text style={[styles.emptyText, { color: tokens.colors.text.primary }]}>No notifications yet</Text>
                <Text style={[styles.emptySubtext, { color: tokens.colors.text.secondary }]}>You're all caught up!</Text>
              </View>
            }
          />
        )}
      </SafeAreaView>
    </GlassBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },

  // HEADER
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  header2: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  unreadBadge: {
    borderRadius: 12,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },

  // LIST
  listContent: {
    paddingHorizontal: 8,
    paddingBottom: 20,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
    marginVertical: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D0D0D0',
  },
  notificationItemUnread: {
    backgroundColor: '#FFF0E6',
    borderColor: '#E5D7D0',
  },

  // AVATAR
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1.5,
    borderColor: '#D0D0D0',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
  },

  // CONTENT
  contentWrapper: {
    flex: 1,
  },
  notificationTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  notificationTime: {
    fontSize: 11,
    fontWeight: '500',
    marginLeft: 8,
  },
  notificationMessage: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 18,
  },

  // INDICATORS
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginHorizontal: 8,
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FF6464',
  },
  deleteBtnText: {
    fontSize: 16,
    color: '#FF6464',
    fontWeight: '700',
  },

  // LOADING / EMPTY
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FF7A5C',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyIcon: {
    fontSize: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 13,
    fontWeight: '500',
  },
});
