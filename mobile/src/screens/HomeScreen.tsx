import React, { useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFeeds } from '../hooks/useFeeds';

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

export default function HomeScreen() {
  const { posts, loading, error, refreshing, hasMore, loadFeed, onRefresh, loadMore, addReaction } =
    useFeeds();

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  const handleLoadMore = () => {
    if (hasMore && !loading) {
      loadMore();
    }
  };

  const getMoodColor = (mood?: string) => {
    switch (mood) {
      case 'joy':
        return COLORS.joy;
      case 'calm':
        return COLORS.calm;
      case 'reflect':
        return COLORS.reflect;
      default:
        return COLORS.primary;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.postCard}>
            <View style={styles.postHeader}>
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>{item.author.charAt(0)}</Text>
              </View>
              <View style={styles.postMeta}>
                <Text style={styles.author}>{item.author}</Text>
                <Text style={styles.postTime}>
                  {item.timestamp || 'Unknown date'}
                </Text>
              </View>
            </View>

            <Text style={styles.content}>{item.content}</Text>

            {item.mood && (
              <View
                style={[
                  styles.moodBadge,
                  { backgroundColor: getMoodColor(item.mood) + '20' },
                ]}
              >
                <Text
                  style={[
                    styles.moodText,
                    { color: getMoodColor(item.mood) },
                  ]}
                >
                  {item.mood.charAt(0).toUpperCase() + item.mood.slice(1)}
                </Text>
              </View>
            )}

            <View style={styles.postFooter}>
              <Pressable
                style={styles.actionButton}
                onPress={() => addReaction(item.id)}
              >
                <Text style={styles.actionIcon}>💜</Text>
                <Text style={styles.stat}>{item.reactions}</Text>
              </Pressable>
              <Pressable style={styles.actionButton}>
                <Text style={styles.actionIcon}>💬</Text>
                <Text style={styles.stat}>{item.comments}</Text>
              </Pressable>
            </View>
          </View>
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loading ? <ActivityIndicator size="large" color={COLORS.primary} style={{ marginVertical: 16 }} /> : null
        }
        ListEmptyComponent={
          error ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Error: {error}</Text>
              <Pressable
                style={styles.retryButton}
                onPress={() => loadFeed()}
              >
                <Text style={styles.retryText}>Retry</Text>
              </Pressable>
            </View>
          ) : loading && posts.length === 0 ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
          ) : posts.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No posts yet</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.base,
  },
  listContent: {
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  postCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 0,
    padding: 0,
    marginBottom: 0,
    borderWidth: 0,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    justifyContent: 'space-between',
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '700',
  },
  postMeta: {
    flex: 1,
  },
  author: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  postTime: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  content: {
    color: COLORS.text,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 8,
    paddingHorizontal: 16,
    letterSpacing: 0.2,
  },
  moodBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginBottom: 12,
    marginLeft: 16,
    borderWidth: 1,
  },
  moodText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  postFooter: {
    flexDirection: 'row',
    gap: 0,
    paddingTop: 0,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderTopWidth: 0,
    borderTopColor: 'transparent',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingRight: 16,
  },
  actionIcon: {
    fontSize: 18,
  },
  stat: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  retryText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 14,
  },
});
