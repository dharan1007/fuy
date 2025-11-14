import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Pressable,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GlassBackground, GlassSurface, GlassButton, GlassChip } from '../../components/glass';
import { TitleL, TitleM, BodyM, BodyS, Caption } from '../../components/typography';
import { useGlassTokens, GLASS_TOKENS } from '../../theme';
import ModerationService from '../../services/moderationService';
import { AnalyticsCard, GrowthStats } from '../../components/analytics';

interface FlaggedItem {
  id: string;
  contentType: string;
  contentPreview: string;
  violations: string[];
  confidence: number;
  flaggedAt: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'under_review' | 'approved' | 'rejected';
  flaggedBy: string;
  contentOwner: string;
}

interface State {
  flaggedItems: FlaggedItem[];
  stats: {
    totalFlagged: number;
    pendingReview: number;
    approvedContent: number;
    rejectedContent: number;
    suspendedAccounts: number;
    bannedAccounts: number;
  } | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  filter: 'all' | 'pending' | 'critical' | 'under_review';
  selectedItem: FlaggedItem | null;
  reviewNotes: string;
  reviewingId: string | null;
}

export default function ModerationDashboardScreen({ navigation, adminId }: any) {
  const tokens = useGlassTokens();
  const [state, setState] = useState<State>({
    flaggedItems: [],
    stats: null,
    loading: true,
    refreshing: false,
    error: null,
    filter: 'pending',
    selectedItem: null,
    reviewNotes: '',
    reviewingId: null,
  });

  const moderationService = new ModerationService();
  const { width } = Dimensions.get('window');

  useEffect(() => {
    loadDashboard();
  }, [state.filter]);

  const loadDashboard = async () => {
    try {
      setState((s) => ({ ...s, loading: true, error: null }));

      // Simulate loading moderation queue
      // In production, this would call actual API endpoints
      const mockStats = {
        totalFlagged: 1240,
        pendingReview: 45,
        approvedContent: 980,
        rejectedContent: 215,
        suspendedAccounts: 12,
        bannedAccounts: 3,
      };

      const mockItems: FlaggedItem[] = [
        {
          id: 'flag-1',
          contentType: 'product_description',
          contentPreview: 'Premium course on forbidden topic...',
          violations: ['drug_related'],
          confidence: 0.92,
          flaggedAt: '2024-01-15 10:30 AM',
          severity: 'critical',
          status: 'pending',
          flaggedBy: 'system',
          contentOwner: 'seller-123',
        },
        {
          id: 'flag-2',
          contentType: 'product_image',
          contentPreview: 'Image containing prohibited content',
          violations: ['adult_content'],
          confidence: 0.88,
          flaggedAt: '2024-01-15 09:15 AM',
          severity: 'high',
          status: 'pending',
          flaggedBy: 'user',
          contentOwner: 'seller-456',
        },
        {
          id: 'flag-3',
          contentType: 'review',
          contentPreview: 'Hate speech in customer review...',
          violations: ['hate_speech', 'misinformation'],
          confidence: 0.85,
          flaggedAt: '2024-01-14 04:20 PM',
          severity: 'high',
          status: 'under_review',
          flaggedBy: 'system',
          contentOwner: 'user-789',
        },
      ];

      setState((s) => ({
        ...s,
        stats: mockStats,
        flaggedItems: mockItems,
        loading: false,
      }));
    } catch (error: any) {
      setState((s) => ({ ...s, error: error.message, loading: false }));
    }
  };

  const onRefresh = async () => {
    setState((s) => ({ ...s, refreshing: true }));
    try {
      await loadDashboard();
      setState((s) => ({ ...s, refreshing: false }));
    } catch (error: any) {
      setState((s) => ({ ...s, error: error.message, refreshing: false }));
    }
  };

  const handleApprove = async (itemId: string) => {
    Alert.alert(
      'Approve Content',
      'Mark this content as appropriate and remove the flag?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          style: 'default',
          onPress: async () => {
            try {
              setState((s) => ({
                ...s,
                flaggedItems: s.flaggedItems.map((item) =>
                  item.id === itemId ? { ...item, status: 'approved' } : item
                ),
              }));
              Alert.alert('Success', 'Content approved');
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  const handleReject = async (itemId: string) => {
    Alert.alert(
      'Reject Content',
      'Remove this content and notify the seller?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              setState((s) => ({
                ...s,
                flaggedItems: s.flaggedItems.map((item) =>
                  item.id === itemId ? { ...item, status: 'rejected' } : item
                ),
              }));
              Alert.alert('Success', 'Content rejected and removed');
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  const handleSuspendAccount = async (itemId: string) => {
    Alert.alert(
      'Suspend Account',
      'Suspend the seller account for 7 days?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Suspend 7 Days',
          style: 'destructive',
          onPress: async () => {
            try {
              Alert.alert('Success', 'Account suspended for 7 days');
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          },
        },
        {
          text: 'Ban Permanently',
          style: 'destructive',
          onPress: async () => {
            try {
              Alert.alert('Success', 'Account permanently banned');
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return '#FF6B6B';
      case 'high':
        return '#F39C12';
      case 'medium':
        return '#3498DB';
      case 'low':
        return '#2ECC71';
      default:
        return '#95A5A6';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
      case 'under_review':
        return '#F39C12';
      case 'approved':
        return '#2ECC71';
      case 'rejected':
        return '#E74C3C';
      default:
        return '#95A5A6';
    }
  };

  if (state.loading) {
    return (
      <GlassBackground>
        <SafeAreaView style={styles.container}>
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={tokens.colors.primary} />
          </View>
        </SafeAreaView>
      </GlassBackground>
    );
  }

  return (
    <GlassBackground>
      <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
        <FlatList
          scrollIndicatorInsets={{ right: 1 }}
          data={[{ type: 'header' }, { type: 'stats' }, { type: 'filter' }, ...state.flaggedItems.map((item) => ({ type: 'item', data: item }))]}
          keyExtractor={(item, index) =>
            item.type === 'item' ? item.data.id : `${item.type}-${index}`
          }
          renderItem={({ item }) => {
            if (item.type === 'header') {
              return (
                <View style={styles.header}>
                  <TitleL>Moderation Center</TitleL>
                  <Caption contrast="low">Review and enforce platform policies</Caption>
                </View>
              );
            }

            if (item.type === 'stats') {
              return (
                <View style={styles.section}>
                  <GrowthStats
                    title="Moderation Overview"
                    stats={[
                      {
                        label: 'Flagged Content',
                        value: state.stats?.totalFlagged || 0,
                        icon: '🚩',
                        color: '#FF6B6B',
                      },
                      {
                        label: 'Pending Review',
                        value: state.stats?.pendingReview || 0,
                        icon: '⏳',
                        color: '#F39C12',
                      },
                      {
                        label: 'Suspended Accounts',
                        value: state.stats?.suspendedAccounts || 0,
                        icon: '🔒',
                        color: '#3498DB',
                      },
                      {
                        label: 'Banned Accounts',
                        value: state.stats?.bannedAccounts || 0,
                        icon: '🚫',
                        color: '#E74C3C',
                      },
                    ]}
                    columns={2}
                  />
                </View>
              );
            }

            if (item.type === 'filter') {
              return (
                <View style={styles.section}>
                  <View style={styles.filterTabs}>
                    {(['all', 'pending', 'critical', 'under_review'] as const).map((f) => (
                      <Pressable
                        key={f}
                        style={[
                          styles.filterTab,
                          state.filter === f && styles.filterTabActive,
                        ]}
                        onPress={() => setState((s) => ({ ...s, filter: f }))}
                      >
                        <BodyS
                          style={[
                            styles.filterText,
                            state.filter === f && styles.filterTextActive,
                          ]}
                        >
                          {f.charAt(0).toUpperCase() + f.slice(1)}
                        </BodyS>
                      </Pressable>
                    ))}
                  </View>
                </View>
              );
            }

            if (item.type === 'item') {
              const flagged = item.data;
              return (
                <View style={styles.itemContainer}>
                  <GlassSurface variant="card" style={styles.flaggedItem}>
                    {/* Severity & Status Bar */}
                    <View
                      style={[
                        styles.severityBar,
                        { backgroundColor: getSeverityColor(flagged.severity) },
                      ]}
                    />

                    {/* Header */}
                    <View style={styles.itemHeader}>
                      <View style={{ flex: 1 }}>
                        <View
                          style={[
                            styles.contentTypeBadge,
                            { backgroundColor: `${getSeverityColor(flagged.severity)}20` },
                          ]}
                        >
                          <BodyS style={{ color: getSeverityColor(flagged.severity), fontWeight: '600' }}>
                            {flagged.contentType.toUpperCase()}
                          </BodyS>
                        </View>
                        <BodyM numberOfLines={2} style={[styles.preview, { marginTop: GLASS_TOKENS.spacing[2] }]}>
                          {flagged.contentPreview}
                        </BodyM>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <GlassChip
                          label={`${(flagged.confidence * 100).toFixed(0)}% Confidence`}
                          style={{
                            backgroundColor: `${getSeverityColor(flagged.severity)}30`,
                          }}
                        />
                      </View>
                    </View>

                    {/* Violations */}
                    <View style={[styles.divider, { marginTop: GLASS_TOKENS.spacing[3], marginBottom: GLASS_TOKENS.spacing[3] }]} />

                    <View style={styles.violationsContainer}>
                      <Caption contrast="low" style={{ marginBottom: GLASS_TOKENS.spacing[2] }}>
                        Violations Detected:
                      </Caption>
                      <View style={styles.violationsList}>
                        {flagged.violations.map((violation, idx) => (
                          <GlassChip
                            key={idx}
                            label={violation.replace(/_/g, ' ')}
                            style={{
                              backgroundColor: '#FF6B6B30',
                              marginRight: GLASS_TOKENS.spacing[2],
                              marginBottom: GLASS_TOKENS.spacing[1],
                            }}
                          />
                        ))}
                      </View>
                    </View>

                    {/* Meta Info */}
                    <View style={[styles.divider, { marginTop: GLASS_TOKENS.spacing[3], marginBottom: GLASS_TOKENS.spacing[3] }]} />

                    <View style={styles.metaInfo}>
                      <View style={styles.metaItem}>
                        <Caption contrast="low">Flagged</Caption>
                        <BodyS style={{ marginTop: GLASS_TOKENS.spacing[1] }}>{flagged.flaggedAt}</BodyS>
                      </View>
                      <View style={styles.metaItem}>
                        <Caption contrast="low">By</Caption>
                        <BodyS style={{ marginTop: GLASS_TOKENS.spacing[1] }}>
                          {flagged.flaggedBy === 'system' ? '🤖 System' : '👤 User'}
                        </BodyS>
                      </View>
                      <View style={styles.metaItem}>
                        <Caption contrast="low">Status</Caption>
                        <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(flagged.status)}30`, marginTop: GLASS_TOKENS.spacing[1] }]}>
                          <BodyS style={{ color: getStatusColor(flagged.status), fontWeight: '600', fontSize: 12 }}>
                            {flagged.status.toUpperCase()}
                          </BodyS>
                        </View>
                      </View>
                    </View>

                    {/* Action Buttons */}
                    {flagged.status === 'pending' || flagged.status === 'under_review' ? (
                      <View style={[styles.actionButtons, { marginTop: GLASS_TOKENS.spacing[4] }]}>
                        <GlassButton
                          variant="secondary"
                          label="Approve"
                          size="small"
                          onPress={() => handleApprove(flagged.id)}
                        />
                        <GlassButton
                          variant="secondary"
                          label="Reject"
                          size="small"
                          onPress={() => handleReject(flagged.id)}
                        />
                        <GlassButton
                          variant="secondary"
                          label="Suspend"
                          size="small"
                          onPress={() => handleSuspendAccount(flagged.id)}
                        />
                      </View>
                    ) : null}
                  </GlassSurface>
                </View>
              );
            }

            return null;
          }}
          refreshControl={
            <RefreshControl
              refreshing={state.refreshing}
              onRefresh={onRefresh}
              tintColor={tokens.colors.primary}
            />
          }
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            !state.loading ? (
              <View style={styles.emptyState}>
                <BodyM style={{ fontSize: 48, marginBottom: GLASS_TOKENS.spacing[3] }}>
                  ✓
                </BodyM>
                <BodyM style={{ fontWeight: '600', marginBottom: GLASS_TOKENS.spacing[2] }}>
                  All Clear!
                </BodyM>
                <Caption contrast="low" style={{ textAlign: 'center' }}>
                  No flagged content in this category
                </Caption>
              </View>
            ) : null
          }
        />
      </SafeAreaView>
    </GlassBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  header: {
    paddingHorizontal: GLASS_TOKENS.spacing[4],
    paddingVertical: GLASS_TOKENS.spacing[4],
  },

  section: {
    paddingHorizontal: GLASS_TOKENS.spacing[4],
    marginBottom: GLASS_TOKENS.spacing[4],
  },

  filterTabs: {
    flexDirection: 'row',
    gap: GLASS_TOKENS.spacing[2],
  },

  filterTab: {
    paddingHorizontal: GLASS_TOKENS.spacing[3],
    paddingVertical: GLASS_TOKENS.spacing[2],
    borderRadius: GLASS_TOKENS.spacing[2],
    backgroundColor: '#FFFFFF10',
    borderWidth: 1,
    borderColor: '#FFFFFF20',
  },

  filterTabActive: {
    backgroundColor: '#6AA8FF30',
    borderColor: '#6AA8FF',
  },

  filterText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#E8E8F070',
  },

  filterTextActive: {
    color: '#6AA8FF',
    fontWeight: '600',
  },

  listContent: {
    paddingBottom: GLASS_TOKENS.spacing[8],
  },

  itemContainer: {
    paddingHorizontal: GLASS_TOKENS.spacing[4],
    marginBottom: GLASS_TOKENS.spacing[3],
  },

  flaggedItem: {
    overflow: 'hidden',
  },

  severityBar: {
    height: 4,
    width: '100%',
  },

  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: GLASS_TOKENS.spacing[3],
    paddingHorizontal: GLASS_TOKENS.spacing[3],
    paddingVertical: GLASS_TOKENS.spacing[3],
  },

  contentTypeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: GLASS_TOKENS.spacing[2],
    paddingVertical: GLASS_TOKENS.spacing[1],
    borderRadius: GLASS_TOKENS.spacing[2],
  },

  preview: {
    fontSize: 14,
    lineHeight: 20,
  },

  divider: {
    height: 1,
    backgroundColor: '#FFFFFF20',
  },

  violationsContainer: {
    paddingHorizontal: GLASS_TOKENS.spacing[3],
  },

  violationsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  metaInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: GLASS_TOKENS.spacing[2],
    paddingHorizontal: GLASS_TOKENS.spacing[3],
  },

  metaItem: {
    flex: 1,
  },

  statusBadge: {
    paddingHorizontal: GLASS_TOKENS.spacing[2],
    paddingVertical: GLASS_TOKENS.spacing[1],
    borderRadius: GLASS_TOKENS.spacing[2],
    alignSelf: 'flex-start',
  },

  actionButtons: {
    flexDirection: 'row',
    gap: GLASS_TOKENS.spacing[2],
    paddingHorizontal: GLASS_TOKENS.spacing[3],
    paddingBottom: GLASS_TOKENS.spacing[3],
  },

  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: GLASS_TOKENS.spacing[12],
  },
});
