import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEssenz } from '../../hooks/useFeatures';
import { GlassBackground, GlassSurface } from '../../components/glass';
import { useGlassTokens } from '../../theme';
import type { Challenge } from '../../store/featuresStore';

export default function EssenzScreen() {
  const { challenges, loading, error, loadChallenges } = useEssenz();
  const tokens = useGlassTokens();
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');

  useEffect(() => {
    loadChallenges();
  }, [loadChallenges]);

  const getDifficultyColor = (difficulty: 'easy' | 'medium' | 'hard') => {
    switch (difficulty) {
      case 'easy':
        return '#FFD4C5';
      case 'medium':
        return '#FFB3A7';
      case 'hard':
        return '#FFE5DB';
      default:
        return tokens.colors.primary;
    }
  };

  const handleCompleteDay = async (id: string) => {
    console.log('Complete challenge:', id);
  };

  const activeChallenges = challenges.filter((c: Challenge) => c.progress < c.totalSteps);
  const completedChallenges = challenges.filter((c: Challenge) => c.progress === c.totalSteps);
  const displayChallenges = activeTab === 'active' ? activeChallenges : completedChallenges;

  return (
    <GlassBackground>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <GlassSurface variant="header" padding={16}>
          <View style={styles.headerContent}>
            <View>
              <Text style={[styles.title, { color: tokens.colors.text.primary }]}>Essenz</Text>
              <Text style={[styles.subtitle, { color: tokens.colors.text.secondary }]}>Growth challenges</Text>
            </View>
            <Pressable style={[styles.newChallengeButton, { backgroundColor: tokens.colors.primary }]}>
              <Text style={styles.newChallengeButtonText}>+</Text>
            </Pressable>
          </View>
        </GlassSurface>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <GlassSurface variant="card" padding={12} style={styles.statCard}>
            <Text style={[styles.statValue, { color: tokens.colors.primary }]}>{activeChallenges.length}</Text>
            <Text style={[styles.statLabel, { color: tokens.colors.text.secondary }]}>Active</Text>
          </GlassSurface>
          <GlassSurface variant="card" padding={12} style={styles.statCard}>
            <Text style={[styles.statValue, { color: tokens.colors.primary }]}>{completedChallenges.length}</Text>
            <Text style={[styles.statLabel, { color: tokens.colors.text.secondary }]}>Completed</Text>
          </GlassSurface>
          <GlassSurface variant="card" padding={12} style={styles.statCard}>
            <Text style={[styles.statValue, { color: tokens.colors.primary }]}>
              {Math.round(
                challenges.reduce((sum, c) => sum + (c.progress / c.totalSteps) * 100, 0) /
                  challenges.length
              )}
              %
            </Text>
            <Text style={[styles.statLabel, { color: tokens.colors.text.secondary }]}>Overall</Text>
          </GlassSurface>
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          <Pressable
            style={[
              styles.tab,
              activeTab === 'active' && styles.tabActive,
              activeTab === 'active' && { borderBottomColor: tokens.colors.primary },
            ]}
            onPress={() => setActiveTab('active')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'active' && styles.tabTextActive,
                activeTab === 'active' && { color: tokens.colors.primary },
              ]}
            >
              Active
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.tab,
              activeTab === 'completed' && styles.tabActive,
              activeTab === 'completed' && { borderBottomColor: tokens.colors.primary },
            ]}
            onPress={() => setActiveTab('completed')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'completed' && styles.tabTextActive,
                activeTab === 'completed' && { color: tokens.colors.primary },
              ]}
            >
              Completed
            </Text>
          </Pressable>
        </View>

        {/* Challenges List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={tokens.colors.primary} />
            <Text style={[styles.loadingText, { color: tokens.colors.text.secondary }]}>Loading challenges...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Failed to load challenges</Text>
            <Pressable
              style={[styles.retryButton, { backgroundColor: tokens.colors.primary }]}
              onPress={loadChallenges}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={displayChallenges}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <GlassSurface variant="card" padding={16} style={styles.challengeCard}>
                <View style={styles.challengeHeader}>
                  <View style={styles.challengeInfo}>
                    <Text style={[styles.challengeName, { color: tokens.colors.text.primary }]}>
                      {item.name}
                    </Text>
                    <Text style={[styles.challengeCategory, { color: tokens.colors.text.secondary }]}>
                      {item.category}
                    </Text>
                  </View>
                  <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(item.difficulty) + '20' }]}>
                    <Text style={[styles.difficultyText, { color: getDifficultyColor(item.difficulty) }]}>
                      {item.difficulty.charAt(0).toUpperCase() + item.difficulty.slice(1)}
                    </Text>
                  </View>
                </View>

                <Text style={[styles.challengeDescription, { color: tokens.colors.text.secondary }]}>
                  {item.description}
                </Text>

                <View style={styles.progressContainer}>
                  <View style={styles.progressBar}>
                    <View
                      style={[styles.progressFill, { width: `${(item.progress / item.totalSteps) * 100}%`, backgroundColor: tokens.colors.primary }]}
                    />
                  </View>
                  <Text style={[styles.progressText, { color: tokens.colors.text.secondary }]}>
                    {item.progress}/{item.totalSteps}
                  </Text>
                </View>

                <View style={styles.challengeFooter}>
                  <View style={styles.daysLeft}>
                    <Text style={styles.daysLeftIcon}>⏰</Text>
                    <Text style={[styles.daysLeftText, { color: tokens.colors.text.secondary }]}>
                      {item.daysLeft} days left
                    </Text>
                  </View>
                  <View style={[styles.rewardBadge, { backgroundColor: '#FF7A5C' }]}>
                    <Text style={styles.rewardIcon}>��</Text>
                    <Text style={[styles.rewardText, { color: tokens.colors.primary }]}>{item.reward}</Text>
                  </View>
                  {item.progress < item.totalSteps && (
                    <Pressable
                      style={[styles.completeButton, { backgroundColor: tokens.colors.primary }]}
                      onPress={() => handleCompleteDay(item.id)}
                    >
                      <Text style={styles.completeButtonText}>+1</Text>
                    </Pressable>
                  )}
                </View>
              </GlassSurface>
            )}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>✨</Text>
                <Text style={[styles.emptyText, { color: tokens.colors.text.primary }]}>
                  {activeTab === 'active' ? 'No active challenges' : 'No completed challenges'}
                </Text>
                <Text style={[styles.emptySubtext, { color: tokens.colors.text.secondary }]}>
                  {activeTab === 'active' ? 'Create one to get started' : 'Keep it up!'}
                </Text>
              </View>
            }
          />
        )}
      </SafeAreaView>
    </GlassBackground>
  );
}

const styles = StyleSheet.create({
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  newChallengeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 10,
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
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
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#000',
    fontWeight: '600',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
  },
  tabTextActive: {
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  challengeCard: {
    marginBottom: 12,
    borderRadius: 12,
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
  },
  challengeCategory: {
    fontSize: 11,
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
    marginBottom: 12,
    lineHeight: 16,
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#000000',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
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
  },
  rewardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  rewardIcon: {
    fontSize: 12,
  },
  rewardText: {
    fontSize: 11,
    fontWeight: '600',
  },
  completeButton: {
    marginLeft: 'auto',
    width: 32,
    height: 32,
    borderRadius: 16,
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
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 12,
  },
});
