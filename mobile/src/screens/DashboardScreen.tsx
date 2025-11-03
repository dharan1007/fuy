import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import Card from '../components/Card';
import { COLORS, SPACING, FONT_SIZES } from '../constants/index';
import { socialService } from '../services/social';
import { Post } from '../types/index';

const DashboardScreen: React.FC = ({ navigation }: any) => {
  const { top } = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFeed = async () => {
    if (!user) return;
    try {
      const { posts: feedPosts } = await socialService.getFeed();
      setPosts(feedPosts);
    } catch (error) {
      console.error('Failed to load feed:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeed();
  }, [user]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const renderPost = ({ item }: { item: Post }) => (
    <Card style={styles.postCard} onPress={() => navigation.navigate('PostDetail', { id: item.id })}>
      <View style={styles.postHeader}>
        <View>
          <Text style={styles.postAuthor}>
            {item.user?.firstName || 'User'}
          </Text>
          <Text style={styles.postTime}>
            {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>
        <View style={[styles.featureBadge, { backgroundColor: getFeatureColor(item.feature) }]}>
          <Text style={styles.featureText}>{item.feature}</Text>
        </View>
      </View>

      <Text style={styles.postContent} numberOfLines={3}>
        {item.content}
      </Text>

      <View style={styles.postFooter}>
        <View style={styles.statItem}>
          <Ionicons name="heart" size={16} color={COLORS.primary} />
          <Text style={styles.statText}>{item.likes}</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="chatbubble" size={16} color={COLORS.primary} />
          <Text style={styles.statText}>{item.comments}</Text>
        </View>
      </View>
    </Card>
  );

  const getFeatureColor = (feature: string): string => {
    const colors: Record<string, string> = {
      JOURNAL: '#3b82f6',
      JOY: '#10b981',
      AWE: '#f59e0b',
      BONDS: '#ec4899',
      SERENDIPITY: '#8b5cf6',
      CHECKIN: '#6366f1',
      PROGRESS: '#06b6d4',
    };
    return colors[feature] || COLORS.primary;
  };

  return (
    <View style={[styles.container, { paddingTop: top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {user?.firstName || 'Guest'}</Text>
          <Text style={styles.headerSubtitle}>Your daily insights</Text>
        </View>
        <Pressable onPress={() => navigation.navigate('Settings')}>
          <Ionicons name="settings" size={24} color={COLORS.gray800} />
        </Pressable>
      </View>

      {/* Quick Stats */}
      <View style={styles.statsContainer}>
        <Card style={styles.statCard}>
          <Text style={styles.statValue}>7</Text>
          <Text style={styles.statLabel}>Entries</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statValue}>3</Text>
          <Text style={styles.statLabel}>Goals</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statValue}>12</Text>
          <Text style={styles.statLabel}>Friends</Text>
        </Card>
      </View>

      {/* Feed */}
      <View style={styles.feedContainer}>
        <Text style={styles.feedTitle}>Community Feed</Text>
        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: SPACING.lg }} />
        ) : (
          <FlatList
            data={posts}
            renderItem={renderPost}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            contentContainerStyle={styles.feedList}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No posts yet. Be the first to share!</Text>
            }
          />
        )}
      </View>

      {/* Logout Button - for demo purposes */}
      <Pressable onPress={handleLogout} style={styles.logoutButton}>
        <Text style={styles.logoutText}>Logout</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  greeting: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.gray900,
  },
  headerSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray600,
    marginTop: SPACING.xs,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  statValue: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.gray600,
    marginTop: SPACING.xs,
  },
  feedContainer: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
  },
  feedTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.gray900,
    marginBottom: SPACING.md,
  },
  feedList: {
    gap: SPACING.md,
  },
  postCard: {
    marginBottom: 0,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  postAuthor: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.gray900,
  },
  postTime: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.gray600,
    marginTop: SPACING.xs,
  },
  featureBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 4,
  },
  featureText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.white,
    fontWeight: '600',
  },
  postContent: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray700,
    lineHeight: 20,
    marginBottom: SPACING.md,
  },
  postFooter: {
    flexDirection: 'row',
    gap: SPACING.lg,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  statText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.gray600,
  },
  emptyText: {
    textAlign: 'center',
    color: COLORS.gray600,
    fontSize: FONT_SIZES.sm,
    marginTop: SPACING.xl,
  },
  logoutButton: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    backgroundColor: COLORS.danger,
    borderRadius: 8,
  },
  logoutText: {
    color: COLORS.white,
    fontWeight: '600',
  },
});

export default DashboardScreen;
