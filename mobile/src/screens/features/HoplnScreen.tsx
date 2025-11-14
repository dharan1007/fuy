import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useHopln } from '../../hooks/useFeatures';
import { GlassBackground, GlassSurface } from '../../components/glass';
import { useGlassTokens } from '../../theme';

export default function HoplnScreen() {
  const { routes, loading, error, loadRoutes } = useHopln();
  const tokens = useGlassTokens();
  const [filter, setFilter] = useState<'all' | 'completed' | 'in-progress' | 'planned'>('all');

  useEffect(() => {
    loadRoutes();
  }, [loadRoutes]);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return '#FFD4C5';
      case 'medium':
        return '#FFB3A7';
      case 'hard':
        return '#FFE5DB';
      default:
        return '#FF7A5C';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return '✓';
      case 'in-progress':
        return '⏱';
      case 'planned':
        return '📍';
      default:
        return '●';
    }
  };

  const filteredRoutes = filter === 'all' ? routes : routes.filter((r) => r.status === filter);

  const FILTER_BUTTONS = [
    { id: 'all', label: 'All Routes' },
    { id: 'completed', label: 'Completed' },
    { id: 'in-progress', label: 'Active' },
    { id: 'planned', label: 'Planned' },
  ];

  return (
    <GlassBackground>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <GlassSurface variant="header" style={styles.header} padding={16}>
          <View style={{flex: 1}}>
            <Text style={[styles.title, { color: tokens.colors.text.primary }]}>Hopln</Text>
            <Text style={[styles.subtitle, { color: tokens.colors.text.secondary }]}>Your adventure routes</Text>
          </View>
          <Pressable style={[styles.startButton, { backgroundColor: tokens.colors.primary }]} onPress={() => console.log('Start route')}>
            <Text style={styles.startButtonText}>Start Route</Text>
          </Pressable>
        </GlassSurface>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: tokens.colors.primary }]}>12</Text>
          <Text style={[styles.statLabel, { color: tokens.colors.text.secondary }]}>Routes</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: tokens.colors.primary }]}>45 km</Text>
          <Text style={[styles.statLabel, { color: tokens.colors.text.secondary }]}>Total Distance</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: tokens.colors.primary }]}>8</Text>
          <Text style={[styles.statLabel, { color: tokens.colors.text.secondary }]}>Completed</Text>
        </View>
      </View>

      {/* Filter Buttons */}
      <View style={styles.filterContainer}>
        {FILTER_BUTTONS.map((btn) => (
          <Pressable
            key={btn.id}
            style={[
              styles.filterButton,
              filter === btn.id && [styles.filterButtonActive, { backgroundColor: tokens.colors.primary, borderColor: tokens.colors.primary }],
            ]}
            onPress={() => setFilter(btn.id as any)}
          >
            <Text
              style={[
                styles.filterText,
                filter === btn.id ? { color: '#000' } : { color: tokens.colors.text.secondary },
              ]}
            >
              {btn.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Routes List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={tokens.colors.primary} />
          <Text style={[styles.loadingText, { color: tokens.colors.text.secondary }]}>Loading routes...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load routes</Text>
          <Pressable style={[styles.retryButton, { backgroundColor: tokens.colors.primary }]} onPress={loadRoutes}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={filteredRoutes}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable style={styles.routeCard}>
              <View style={styles.routeHeader}>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusIcon}>{getStatusIcon(item.status)}</Text>
                </View>
                <View style={styles.routeInfo}>
                  <Text style={[styles.routeName, { color: tokens.colors.text.primary }]}>{item.name}</Text>
                  <Text style={[styles.routeDate, { color: tokens.colors.text.secondary }]}>
                    {item.startedAt || 'Not started'}
                  </Text>
                </View>
              </View>

              <View style={styles.routeStats}>
                <View style={styles.statItem}>
                  <Text style={styles.statIcon}>📍</Text>
                  <Text style={[styles.statText, { color: tokens.colors.text.secondary }]}>{item.distance}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statIcon}>⏱</Text>
                  <Text style={[styles.statText, { color: tokens.colors.text.secondary }]}>{item.duration}</Text>
                </View>
                <View
                  style={[
                    styles.difficultyBadge,
                    { borderColor: getDifficultyColor(item.difficulty) },
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
            </Pressable>
          )}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🛤️</Text>
              <Text style={[styles.emptyText, { color: tokens.colors.text.primary }]}>No routes found</Text>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  startButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  startButtonText: {
    color: '#000',
    fontWeight: '600',
    fontSize: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#000000',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  statLabel: {
    fontSize: 11,
    marginTop: 4,
    fontWeight: '500',
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#000000',
    backgroundColor: '#FFF5F0',
  },
  filterButtonActive: {
    borderWidth: 1.5,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  filterTextActive: {
    color: '#000',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  routeCard: {
    backgroundColor: '#FFF5F0',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#000000',
  },
  routeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF7A5C',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statusIcon: {
    fontSize: 18,
  },
  routeInfo: {
    flex: 1,
  },
  routeName: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  routeDate: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  routeStats: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statIcon: {
    fontSize: 14,
  },
  statText: {
    fontSize: 12,
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    marginLeft: 'auto',
  },
  difficultyText: {
    fontSize: 10,
    fontWeight: '600',
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
  },
});
