import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBonding } from '../../hooks/useFeatures';

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

interface Connection {
  id: string;
  name: string;
  status: 'close' | 'friend' | 'acquaintance';
  sharedMoments: number;
  lastInteraction: string;
  vibe: string;
}

const MOCK_CONNECTIONS: Connection[] = [
  {
    id: '1',
    name: 'Alex Chen',
    status: 'close',
    sharedMoments: 45,
    lastInteraction: '2 hours ago',
    vibe: '✨ Creative Energy',
  },
  {
    id: '2',
    name: 'Jordan Smith',
    status: 'friend',
    sharedMoments: 23,
    lastInteraction: '1 day ago',
    vibe: '🧘 Zen Vibes',
  },
  {
    id: '3',
    name: 'Sam Taylor',
    status: 'friend',
    sharedMoments: 18,
    lastInteraction: '3 days ago',
    vibe: '🚀 Adventure Seeker',
  },
  {
    id: '4',
    name: 'Morgan Lee',
    status: 'acquaintance',
    sharedMoments: 7,
    lastInteraction: '1 week ago',
    vibe: '🎨 Artist',
  },
];

export default function BondingScreen() {
  const { connections, loading, error, loadConnections } = useBonding();
  const [selectedTab, setSelectedTab] = useState<'all' | 'close' | 'friends'>('all');

  useEffect(() => {
    loadConnections();
  }, [loadConnections]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'close':
        return COLORS.joy;
      case 'friend':
        return COLORS.calm;
      case 'acquaintance':
        return COLORS.primary;
      default:
        return COLORS.textMuted;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'close':
        return 'Close';
      case 'friend':
        return 'Friend';
      case 'acquaintance':
        return 'Acquaintance';
      default:
        return status;
    }
  };

  const filteredConnections =
    selectedTab === 'all'
      ? connections
      : selectedTab === 'close'
      ? connections.filter((c) => c.status === 'close')
      : connections.filter((c) => c.status !== 'acquaintance');

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Bonding</Text>
          <Text style={styles.subtitle}>Your connections</Text>
        </View>
        <Pressable style={styles.addButton}>
          <Text style={styles.addButtonText}>+</Text>
        </Pressable>
      </View>

      {/* Connection Intro */}
      <View style={styles.introCard}>
        <Text style={styles.introIcon}>🔗</Text>
        <Text style={styles.introTitle}>Your Bond Network</Text>
        <Text style={styles.introText}>
          {connections.length} connections spanning {connections.reduce((sum, c) => sum + c.sharedMoments, 0)} shared moments
        </Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {[
          { id: 'all', label: 'All' },
          { id: 'close', label: 'Close' },
          { id: 'friends', label: 'Friends' },
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

      {/* Connections List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading connections...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load connections</Text>
          <Pressable style={styles.retryButton} onPress={loadConnections}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={filteredConnections}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable style={styles.connectionCard}>
            <View style={styles.connectionHeader}>
              <View style={styles.avatarContainer}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
                </View>
              </View>

              <View style={styles.connectionInfo}>
                <View style={styles.nameRow}>
                  <Text style={styles.connectionName}>{item.name}</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(item.status) + '20' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        { color: getStatusColor(item.status) },
                      ]}
                    >
                      {getStatusLabel(item.status)}
                    </Text>
                  </View>
                </View>
                <Text style={styles.connectionVibe}>{item.vibe}</Text>
              </View>
            </View>

            <View style={styles.connectionStats}>
              <View style={styles.statItem}>
                <Text style={styles.statIcon}>🎨</Text>
                <Text style={styles.statValue}>{item.sharedMoments} moments</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statIcon}>⏱</Text>
                <Text style={styles.statValue}>{item.lastInteraction}</Text>
              </View>
            </View>

            <View style={styles.actionButtons}>
              <Pressable style={styles.actionButton}>
                <Text style={styles.actionIcon}>💬</Text>
              </Pressable>
              <Pressable style={styles.actionButton}>
                <Text style={styles.actionIcon}>🔗</Text>
              </Pressable>
              <Pressable style={styles.actionButton}>
                <Text style={styles.actionIcon}>⭐</Text>
              </Pressable>
            </View>
          </Pressable>
            )}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🤝</Text>
              <Text style={styles.emptyText}>No connections found</Text>
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
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 24,
    color: '#000',
    fontWeight: '700',
  },
  introCard: {
    marginHorizontal: 16,
    marginVertical: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(106, 168, 255, 0.2)',
  },
  introIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  introTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  introText: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
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
  connectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  connectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  connectionInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  connectionName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  connectionVibe: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  connectionStats: {
    flexDirection: 'row',
    gap: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statIcon: {
    fontSize: 14,
  },
  statValue: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(106, 168, 255, 0.1)',
    alignItems: 'center',
  },
  actionIcon: {
    fontSize: 16,
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
