import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ProgressBarAndroid, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEssenz } from '../../hooks/useFeatures';

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

export default function EssenzScreen() {
  const { challenges, loading, error, loadChallenges } = useEssenz();
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');

  useEffect(() => {
    loadChallenges();
  }, [loadChallenges]);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return COLORS.calm;
      case 'medium':
        return COLORS.joy;
      case 'hard':
        return COLORS.reflect;
      default:
        return COLORS.primary;
    }
  };

  const handleCompleteDay = async (id: string) => {
    // TODO: Implement challenge completion logic when available
    console.log('Complete challenge:', id);
  };

  const activeChallenges = challenges.filter((c: any) => c.progress < c.totalSteps);
  const completedChallenges = challenges.filter((c: any) => c.progress === c.totalSteps);
  const displayChallenges = activeTab === 'active' ? activeChallenges : completedChallenges;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Essenz</Text>
          <Text style={styles.subtitle}>Growth challenges</Text>
        </View>
        <Pressable style={styles.newChallengeButton}>
          <Text style={styles.newChallengeButtonText}>+</Text>
        </Pressable>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{activeChallenges.length}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{completedChallenges.length}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {Math.round(
              challenges.reduce((sum, c) => sum + (c.progress / c.totalSteps) * 100, 0) /
                challenges.length
            )}
            %
          </Text>
          <Text style={styles.statLabel}>Overall</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <Pressable
          style={[styles.tab, activeTab === 'active' && styles.tabActive]}
          onPress={() => setActiveTab('active')}
        >
          <Text style={[styles.tabText, activeTab === 'active' && styles.tabTextActive]}>
            Active
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'completed' && styles.tabActive]}
          onPress={() => setActiveTab('completed')}
        >
          <Text style={[styles.tabText, activeTab === 'completed' && styles.tabTextActive]}>
            Completed
          </Text>
        </Pressable>
      </View>

      {/* Challenges List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading challenges...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load challenges</Text>
          <Pressable style={styles.retryButton} onPress={loadChallenges}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={displayChallenges}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
          <View style={styles.challengeCard}>
            <View style={styles.challengeHeader}>
              <View style={styles.challengeInfo}>
                <Text style={styles.challengeName}>{item.name}</Text>
                <Text style={styles.challengeCategory}>{item.category}</Text>
              </View>
              <View
                style={[
                  styles.difficultyBadge,
                  { backgroundColor: getDifficultyColor(item.difficulty) + '20' },
                ]}
              >
                <Text
                  style={[
                    styles.difficultyText,
                    { color: getDifficultyColor(item.difficulty) },
                  ]}
                >
                  {item.difficulty.charAt(0).toUpperCase() + item.difficulty.slice(1)}
                </Text>
              </View>
            </View>

            <Text style={styles.challengeDescription}>{item.description}</Text>

            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${(item.progress / item.totalSteps) * 100}%` },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                {item.progress}/{item.totalSteps}
              </Text>
            </View>

            <View style={styles.challengeFooter}>
              <View style={styles.daysLeft}>
                <Text style={styles.daysLeftIcon}>⏰</Text>
                <Text style={styles.daysLeftText}>{item.daysLeft} days left</Text>
              </View>
              <View style={styles.rewardBadge}>
                <Text style={styles.rewardIcon}>🏆</Text>
                <Text style={styles.rewardText}>{item.reward}</Text>
              </View>
              {item.progress < item.totalSteps && (
                <Pressable
                  style={styles.completeButton}
                  onPress={() => handleCompleteDay(item.id)}
                >
                  <Text style={styles.completeButtonText}>+1</Text>
                </Pressable>
              )}
            </View>
          </View>
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>✨</Text>
            <Text style={styles.emptyText}>
              {activeTab === 'active' ? 'No active challenges' : 'No completed challenges'}
            </Text>
            <Text style={styles.emptySubtext}>
              {activeTab === 'active' ? 'Create one to get started' : 'Keep it up!'}
            </Text>
          </View>
        }
      />
      )}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  subtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  newChallengeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  newChallengeButtonText: {
    fontSize: 24,
    color: '#000',
    fontWeight: '700',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  tabTextActive: {
    color: COLORS.primary,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  challengeCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  challengeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  challengeInfo: {
    flex: 1,
  },
  challengeName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  challengeCategory: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  difficultyText: {
    fontSize: 11,
    fontWeight: '600',
  },
  challengeDescription: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 12,
    lineHeight: 16,
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  challengeFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  daysLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  daysLeftIcon: {
    fontSize: 12,
  },
  daysLeftText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  rewardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(106, 168, 255, 0.15)',
  },
  rewardIcon: {
    fontSize: 12,
  },
  rewardText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primary,
  },
  completeButton: {
    marginLeft: 'auto',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completeButtonText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 14,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
});
