import React, { useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFeeds } from '../hooks/useFeeds';
import { GlassBackground, GlassSurface, GlassChip, GlassButton } from '../components/glass';
import { TitleM, BodyM, BodyS, Caption } from '../components/typography';
import { useGlassTokens, GLASS_TOKENS } from '../theme';

export default function HomeScreen() {
  const { posts, loading, error, refreshing, hasMore, loadFeed, onRefresh, loadMore, addReaction } =
    useFeeds();
  const tokens = useGlassTokens();

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  const handleLoadMore = () => {
    if (hasMore && !loading) {
      loadMore();
    }
  };

  const getMoodEmoji = (mood?: string) => {
    switch (mood) {
      case 'joy':
        return '😊';
      case 'calm':
        return '😌';
      case 'reflect':
        return '🤔';
      default:
        return '✨';
    }
  };

  return (
    <GlassBackground>
      <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <GlassSurface
              variant="card"
              style={styles.postCard}
              padding={0}
              radius={GLASS_TOKENS.glass.radius.large}
            >
              {/* Post Header - Author info */}
              <View style={styles.postHeader}>
                <View
                  style={[
                    styles.avatar,
                    { backgroundColor: tokens.colors.primary },
                  ]}
                >
                  <BodyM style={{ color: '#FFFFFF' }}>
                    {item.author.charAt(0).toUpperCase()}
                  </BodyM>
                </View>
                <View style={{ flex: 1 }}>
                  <TitleM numberOfLines={1}>{item.author}</TitleM>
                  <Caption contrast="low">{item.timestamp || 'Now'}</Caption>
                </View>
              </View>

              {/* Post Content */}
              <BodyM style={styles.postContent}>
                {item.content}
              </BodyM>

              {/* Mood Badge */}
              {item.mood && (
                <GlassChip
                  label={`${getMoodEmoji(item.mood)} ${item.mood.charAt(0).toUpperCase() + item.mood.slice(1)}`}
                  style={styles.moodChip}
                />
              )}

              {/* Action Overlay at Bottom - Minimal glass chip */}
              <View style={styles.actionOverlay}>
                <Pressable
                  style={styles.actionIconButton}
                  onPress={() => addReaction(item.id)}
                >
                  <BodyS>💜 {item.reactions}</BodyS>
                </Pressable>
                <Pressable style={styles.actionIconButton}>
                  <BodyS>💬 {item.comments}</BodyS>
                </Pressable>
                <Pressable style={styles.actionIconButton}>
                  <BodyS>↗️</BodyS>
                </Pressable>
              </View>
            </GlassSurface>
          )}
          contentContainerStyle={styles.listContent}
          scrollIndicatorInsets={{ right: 1 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={tokens.colors.primary}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loading ? (
              <ActivityIndicator
                size="large"
                color={tokens.colors.primary}
                style={styles.footerLoader}
              />
            ) : null
          }
          ListEmptyComponent={
            error ? (
              <View style={styles.emptyState}>
                <BodyM style={{ marginBottom: GLASS_TOKENS.spacing[3], textAlign: 'center' }}>
                  Error: {error}
                </BodyM>
                <GlassButton
                  variant="primary"
                  label="Retry"
                  onPress={() => loadFeed()}
                />
              </View>
            ) : loading && posts.length === 0 ? (
              <View style={styles.emptyState}>
                <ActivityIndicator size="large" color={tokens.colors.primary} />
              </View>
            ) : posts.length === 0 ? (
              <View style={styles.emptyState}>
                <TitleM style={{ marginBottom: GLASS_TOKENS.spacing[3] }}>
                  No posts yet
                </TitleM>
                <BodyS contrast="low">Be the first to share something</BodyS>
              </View>
            ) : null
          }
        />

        {/* Bottom Glass Action Dock */}
        <View style={styles.actionDock}>
          <GlassButton
            variant="secondary"
            label="Timer"
            size="small"
            leftIcon={<BodyM>⏱️</BodyM>}
            onPress={() => {}}
          />
          <GlassButton
            variant="secondary"
            label="Search"
            size="small"
            leftIcon={<BodyM>🔍</BodyM>}
            onPress={() => {}}
          />
          <GlassButton
            variant="secondary"
            label="Map"
            size="small"
            leftIcon={<BodyM>📍</BodyM>}
            onPress={() => {}}
          />
          <GlassButton
            variant="primary"
            label="Heart"
            size="small"
            leftIcon={<BodyM>❤️</BodyM>}
            onPress={() => {}}
          />
        </View>
      </SafeAreaView>
    </GlassBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  listContent: {
    paddingHorizontal: GLASS_TOKENS.spacing[4],
    paddingVertical: GLASS_TOKENS.spacing[3],
    gap: GLASS_TOKENS.spacing[3],
    paddingBottom: GLASS_TOKENS.spacing[16],
  },

  postCard: {
    borderRadius: GLASS_TOKENS.glass.radius.large,
  },

  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: GLASS_TOKENS.spacing[3],
    paddingHorizontal: GLASS_TOKENS.spacing[3],
    paddingVertical: GLASS_TOKENS.spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
  },

  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },

  postContent: {
    paddingHorizontal: GLASS_TOKENS.spacing[3],
    paddingTop: GLASS_TOKENS.spacing[3],
    paddingBottom: GLASS_TOKENS.spacing[2],
    lineHeight: 24,
  },

  moodChip: {
    marginHorizontal: GLASS_TOKENS.spacing[3],
    marginBottom: GLASS_TOKENS.spacing[2],
    alignSelf: 'flex-start',
  },

  actionOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: GLASS_TOKENS.spacing[2],
    paddingHorizontal: GLASS_TOKENS.spacing[3],
    paddingVertical: GLASS_TOKENS.spacing[2],
    borderTopWidth: 1,
    borderTopColor: '#000000',
  },

  actionIconButton: {
    paddingVertical: GLASS_TOKENS.spacing[1],
    paddingHorizontal: GLASS_TOKENS.spacing[2],
  },

  footerLoader: {
    marginVertical: GLASS_TOKENS.spacing[4],
  },

  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: GLASS_TOKENS.spacing[12],
  },

  // Bottom action dock
  actionDock: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: GLASS_TOKENS.spacing[2],
    paddingHorizontal: GLASS_TOKENS.spacing[4],
    paddingVertical: GLASS_TOKENS.spacing[3],
  },
});
