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
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  postCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  postMeta: {
    flex: 1,
  },
  author: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
  postTime: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  content: {
    color: COLORS.text,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 12,
  },
  moodBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  moodText: {
    fontSize: 11,
    fontWeight: '600',
  },
  postFooter: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionIcon: {
    fontSize: 14,
  },
  stat: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryText: {
    color: '#000',
    fontWeight: '600',
  },
});
