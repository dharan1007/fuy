import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRanking } from '../../hooks/useFeatures';

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

export default function RankingScreen() {
  const { leaderboard, loading, error, loadLeaderboard, userRank } = useRanking();
  const [selectedTab, setSelectedTab] = useState<'global' | 'friends' | 'weekly'>('global');

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return '📈';
      case 'down':
        return '📉';
      case 'stable':
        return '➡️';
      default:
        return '●';
    }
  };

  const getRankMedal = (rank: number) => {
    switch (rank) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return `#${rank}`;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Ranking</Text>
          <Text style={styles.subtitle}>Global leaderboard</Text>
        </View>
        <View style={styles.topScoreCard}>
          <Text style={styles.topScoreIcon}>⭐</Text>
          <Text style={styles.topScoreLabel}>Your Score</Text>
          <Text style={styles.topScoreValue}>{userRank?.score?.toLocaleString() || '0'}</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {[
          { id: 'global', label: 'Global' },
          { id: 'friends', label: 'Friends' },
          { id: 'weekly', label: 'Weekly' },
        ].map((tab) => (
          <Pressable
            key={tab.id}
            style={[styles.tab, selectedTab === tab.id && styles.tabActive]}
            onPress={() => setSelectedTab(tab.id as any)}
          >
            <Text style={[styles.tabText, selectedTab === tab.id && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Leaderboard List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading leaderboard...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load leaderboard</Text>
          <Pressable style={styles.retryButton} onPress={() => loadLeaderboard()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={leaderboard}
          keyExtractor={(item, index) => `${item.rank}-${index}`}
          renderItem={({ item }) => (
          <View
            style={styles.leaderboardItem}
          >
            <View style={styles.rankMedal}>
              <Text style={styles.medalIcon}>{getRankMedal(item.rank)}</Text>
            </View>

            <View style={styles.userInfo}>
              <Text style={styles.userName}>{item.name}</Text>
              <Text style={styles.userBadges}>{item.badges}</Text>
            </View>

            <View style={styles.scoreContainer}>
              <Text style={styles.score}>{item.score.toLocaleString()}</Text>
              <Text style={styles.trendIcon}>{getTrendIcon(item.trend)}</Text>
            </View>
          </View>
          )}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Achievements Section */}
      <View style={styles.achievementsSection}>
        <Text style={styles.sectionTitle}>Your Achievements</Text>
        <View style={styles.achievementGrid}>
          <Pressable style={styles.achievementCard}>
            <Text style={styles.achievementIcon}>🌟</Text>
            <Text style={styles.achievementLabel}>Rising Star</Text>
          </Pressable>
          <Pressable style={styles.achievementCard}>
            <Text style={styles.achievementIcon}>🔥</Text>
            <Text style={styles.achievementLabel}>On Fire</Text>
          </Pressable>
          <Pressable style={styles.achievementCard}>
            <Text style={styles.achievementIcon}>🎯</Text>
            <Text style={styles.achievementLabel}>On Target</Text>
          </Pressable>
          <Pressable style={styles.achievementCard}>
            <Text style={styles.achievementIcon}>💎</Text>
            <Text style={styles.achievementLabel}>Gem</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.base,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.textMuted,
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  errorText: {
    color: '#FF6464',
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#000',
    fontWeight: '600',
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
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  topScoreCard: {
    marginTop: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(106, 168, 255, 0.3)',
  },
  topScoreIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  topScoreLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  topScoreValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
    marginTop: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  tabActive: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  tabTextActive: {
    color: '#000',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  leaderboardItemHighlight: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(106, 168, 255, 0.1)',
  },
  rankMedal: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(106, 168, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  medalIcon: {
    fontSize: 24,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  userBadges: {
    fontSize: 12,
    marginTop: 2,
  },
  scoreContainer: {
    alignItems: 'flex-end',
  },
  score: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  trendIcon: {
    fontSize: 14,
    marginTop: 4,
  },
  achievementsSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  achievementGrid: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  achievementCard: {
    width: '23%',
    aspectRatio: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  achievementIcon: {
    fontSize: 28,
    marginBottom: 4,
  },
  achievementLabel: {
    fontSize: 9,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
});
