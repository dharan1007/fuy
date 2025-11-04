import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useHopln } from '../../hooks/useFeatures';

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

export default function HoplnScreen() {
  const { routes, loading, error, loadRoutes } = useHopln();
  const [filter, setFilter] = useState<'all' | 'completed' | 'in-progress' | 'planned'>('all');

  useEffect(() => {
    loadRoutes();
  }, [loadRoutes]);

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
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Hopln</Text>
          <Text style={styles.subtitle}>Your adventure routes</Text>
        </View>
        <Pressable style={styles.startButton} onPress={() => console.log('Start route')}>
          <Text style={styles.startButtonText}>Start Route</Text>
        </Pressable>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>12</Text>
          <Text style={styles.statLabel}>Routes</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>45 km</Text>
          <Text style={styles.statLabel}>Total Distance</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>8</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
      </View>

      {/* Filter Buttons */}
      <View style={styles.filterContainer}>
        {FILTER_BUTTONS.map((btn) => (
          <Pressable
            key={btn.id}
            style={[
              styles.filterButton,
              filter === btn.id && styles.filterButtonActive,
            ]}
            onPress={() => setFilter(btn.id as any)}
          >
            <Text
              style={[
                styles.filterText,
                filter === btn.id && styles.filterTextActive,
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
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading routes...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load routes</Text>
          <Pressable style={styles.retryButton} onPress={loadRoutes}>
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
                  <Text style={styles.routeName}>{item.name}</Text>
                  <Text style={styles.routeDate}>
                    {item.startedAt || 'Not started'}
                  </Text>
                </View>
              </View>

              <View style={styles.routeStats}>
                <View style={styles.statItem}>
                  <Text style={styles.statIcon}>📍</Text>
                  <Text style={styles.statText}>{item.distance}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statIcon}>⏱</Text>
                  <Text style={styles.statText}>{item.duration}</Text>
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
              <Text style={styles.emptyText}>No routes found</Text>
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
  startButton: {
    backgroundColor: COLORS.primary,
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
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 0.5,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
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
    borderColor: 'rgba(255, 255, 255, 0.15)',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
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
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
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
    backgroundColor: 'rgba(106, 168, 255, 0.15)',
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
    color: COLORS.text,
    letterSpacing: 0.3,
  },
  routeDate: {
    fontSize: 12,
    color: COLORS.textMuted,
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
    color: COLORS.textMuted,
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
    color: COLORS.text,
  },
});
