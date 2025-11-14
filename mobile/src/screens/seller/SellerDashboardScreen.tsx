import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Pressable,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GlassBackground, GlassSurface, GlassButton, GlassChip } from '../../components/glass';
import { TitleL, TitleM, BodyM, BodyS, Caption } from '../../components/typography';
import { useGlassTokens, GLASS_TOKENS } from '../../theme';
import SellerService from '../../services/sellerService';
import { StoreAnalytics } from '../../types/seller';

const { width } = Dimensions.get('window');

interface DashboardState {
  analytics: StoreAnalytics | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
}

export default function SellerDashboardScreen({ navigation, sellerId }: any) {
  const tokens = useGlassTokens();
  const [state, setState] = useState<DashboardState>({
    analytics: null,
    loading: true,
    refreshing: false,
    error: null,
  });

  const sellerService = new SellerService();

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setState((s) => ({ ...s, loading: true, error: null }));
      const analytics = await sellerService.getStoreAnalytics(sellerId);
      setState((s) => ({ ...s, analytics, loading: false }));
    } catch (error: any) {
      setState((s) => ({ ...s, error: error.message, loading: false }));
    }
  };

  const onRefresh = async () => {
    setState((s) => ({ ...s, refreshing: true }));
    try {
      const analytics = await sellerService.getStoreAnalytics(sellerId);
      setState((s) => ({ ...s, analytics, refreshing: false }));
    } catch (error: any) {
      setState((s) => ({ ...s, error: error.message, refreshing: false }));
    }
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  };

  if (state.loading && !state.analytics) {
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

  const analytics = state.analytics;

  return (
    <GlassBackground>
      <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
        <ScrollView
          scrollIndicatorInsets={{ right: 1 }}
          refreshControl={
            <RefreshControl
              refreshing={state.refreshing}
              onRefresh={onRefresh}
              tintColor={tokens.colors.primary}
            />
          }
        >
          {/* Header */}
          <View style={styles.header}>
            <TitleL>Dashboard</TitleL>
            <Caption contrast="low">Your store analytics & performance</Caption>
          </View>

          {/* Error State */}
          {state.error && (
            <GlassSurface variant="card" style={styles.errorContainer}>
              <BodyM style={{ color: '#FF6B6B', marginBottom: GLASS_TOKENS.spacing[2] }}>
                ⚠️ {state.error}
              </BodyM>
              <GlassButton variant="primary" label="Retry" onPress={loadAnalytics} />
            </GlassSurface>
          )}

          {analytics && (
            <>
              {/* Key Metrics */}
              <View style={styles.metricsGrid}>
                {/* Revenue */}
                <GlassSurface variant="card" style={styles.metricCard}>
                  <View style={styles.metricHeader}>
                    <BodyS contrast="low">Total Revenue</BodyS>
                    <BodyM style={{ fontSize: 20 }}>💰</BodyM>
                  </View>
                  <TitleM style={{ marginTop: GLASS_TOKENS.spacing[2], marginBottom: GLASS_TOKENS.spacing[1] }}>
                    {formatCurrency(analytics.totalRevenue)}
                  </TitleM>
                  <Caption contrast="low">
                    +{((analytics.totalRevenue / (analytics.totalRevenue + 1)) * 100).toFixed(1)}% this month
                  </Caption>
                </GlassSurface>

                {/* Orders */}
                <GlassSurface variant="card" style={styles.metricCard}>
                  <View style={styles.metricHeader}>
                    <BodyS contrast="low">Total Orders</BodyS>
                    <BodyM style={{ fontSize: 20 }}>📦</BodyM>
                  </View>
                  <TitleM style={{ marginTop: GLASS_TOKENS.spacing[2], marginBottom: GLASS_TOKENS.spacing[1] }}>
                    {analytics.totalOrders}
                  </TitleM>
                  <Caption contrast="low">
                    {analytics.monthlyData?.[analytics.monthlyData.length - 1]?.orders || 0} this month
                  </Caption>
                </GlassSurface>

                {/* Customers */}
                <GlassSurface variant="card" style={styles.metricCard}>
                  <View style={styles.metricHeader}>
                    <BodyS contrast="low">Total Customers</BodyS>
                    <BodyM style={{ fontSize: 20 }}>👥</BodyM>
                  </View>
                  <TitleM style={{ marginTop: GLASS_TOKENS.spacing[2], marginBottom: GLASS_TOKENS.spacing[1] }}>
                    {analytics.uniqueCustomers}
                  </TitleM>
                  <Caption contrast="low">Repeat: {analytics.repeatCustomers}</Caption>
                </GlassSurface>

                {/* Rating */}
                <GlassSurface variant="card" style={styles.metricCard}>
                  <View style={styles.metricHeader}>
                    <BodyS contrast="low">Average Rating</BodyS>
                    <BodyM style={{ fontSize: 20 }}>⭐</BodyM>
                  </View>
                  <TitleM style={{ marginTop: GLASS_TOKENS.spacing[2], marginBottom: GLASS_TOKENS.spacing[1] }}>
                    {analytics.averageRating?.toFixed(1) || '0.0'}
                  </TitleM>
                  <Caption contrast="low">({analytics.totalReviews} reviews)</Caption>
                </GlassSurface>
              </View>

              {/* Quick Actions */}
              <View style={styles.section}>
                <BodyM style={{ marginBottom: GLASS_TOKENS.spacing[3], fontWeight: '600' }}>
                  Quick Actions
                </BodyM>
                <View style={styles.actionGrid}>
                  <GlassButton
                    variant="secondary"
                    label="Add Product"
                    size="small"
                    leftIcon={<BodyM>➕</BodyM>}
                    onPress={() => navigation?.navigate('ProductManagement')}
                  />
                  <GlassButton
                    variant="secondary"
                    label="View Orders"
                    size="small"
                    leftIcon={<BodyM>📋</BodyM>}
                    onPress={() => navigation?.navigate('Orders')}
                  />
                  <GlassButton
                    variant="secondary"
                    label="Withdrawals"
                    size="small"
                    leftIcon={<BodyM>💳</BodyM>}
                    onPress={() => navigation?.navigate('Withdrawals')}
                  />
                  <GlassButton
                    variant="secondary"
                    label="Store Settings"
                    size="small"
                    leftIcon={<BodyM>⚙️</BodyM>}
                    onPress={() => navigation?.navigate('StoreProfile')}
                  />
                </View>
              </View>

              {/* Top Products */}
              {analytics.topProducts && analytics.topProducts.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <BodyM style={{ fontWeight: '600' }}>Top Products</BodyM>
                    <Pressable onPress={() => navigation?.navigate('ProductManagement')}>
                      <Caption style={{ color: tokens.colors.primary }}>View All</Caption>
                    </Pressable>
                  </View>
                  {analytics.topProducts.slice(0, 3).map((product, index) => (
                    <GlassSurface
                      key={product.productId}
                      variant="card"
                      style={[
                        styles.productItem,
                        { marginBottom: index < 2 ? GLASS_TOKENS.spacing[2] : 0 },
                      ]}
                    >
                      <View style={styles.productItemContent}>
                        <View style={styles.productRank}>
                          <BodyS style={{ color: tokens.colors.primary, fontWeight: '700' }}>
                            {index + 1}
                          </BodyS>
                        </View>
                        <View style={{ flex: 1 }}>
                          <BodyM numberOfLines={1} style={{ fontWeight: '600' }}>
                            {product.name}
                          </BodyM>
                          <Caption contrast="low">{product.sales} sales</Caption>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <BodyM style={{ fontWeight: '600' }}>
                            {formatCurrency(product.revenue)}
                          </BodyM>
                          <Caption contrast="low">{product.rating?.toFixed(1)}⭐</Caption>
                        </View>
                      </View>
                    </GlassSurface>
                  ))}
                </View>
              )}

              {/* Recent Orders */}
              {analytics.recentOrders && analytics.recentOrders.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <BodyM style={{ fontWeight: '600' }}>Recent Orders</BodyM>
                    <Pressable onPress={() => navigation?.navigate('Orders')}>
                      <Caption style={{ color: tokens.colors.primary }}>View All</Caption>
                    </Pressable>
                  </View>
                  {analytics.recentOrders.slice(0, 3).map((order, index) => (
                    <GlassSurface
                      key={order.orderId}
                      variant="card"
                      style={[
                        styles.orderItem,
                        { marginBottom: index < 2 ? GLASS_TOKENS.spacing[2] : 0 },
                      ]}
                    >
                      <View style={styles.orderItemContent}>
                        <View>
                          <BodyM numberOfLines={1} style={{ fontWeight: '600', maxWidth: 200 }}>
                            Order #{order.orderId.slice(-6).toUpperCase()}
                          </BodyM>
                          <Caption contrast="low">{order.date}</Caption>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <BodyM style={{ fontWeight: '600' }}>
                            {formatCurrency(order.amount)}
                          </BodyM>
                          <GlassChip
                            label={order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                            style={{
                              marginTop: GLASS_TOKENS.spacing[1],
                              backgroundColor:
                                order.status === 'completed'
                                  ? '#2ECC71'
                                  : order.status === 'pending'
                                    ? '#F39C12'
                                    : '#E74C3C',
                            }}
                          />
                        </View>
                      </View>
                    </GlassSurface>
                  ))}
                </View>
              )}

              {/* Store Status */}
              <View style={styles.section}>
                <BodyM style={{ marginBottom: GLASS_TOKENS.spacing[3], fontWeight: '600' }}>
                  Store Status
                </BodyM>
                <GlassSurface variant="card">
                  <View style={styles.statusItem}>
                    <View>
                      <BodyM style={{ fontWeight: '600' }}>Store Active</BodyM>
                      <Caption contrast="low">Your store is live and visible</Caption>
                    </View>
                    <View style={styles.statusBadge}>
                      <BodyS style={{ color: '#2ECC71' }}>✓</BodyS>
                    </View>
                  </View>
                  <View style={[styles.statusItem, { marginTop: GLASS_TOKENS.spacing[3], borderTopWidth: 1, borderTopColor: '#FFFFFF20', paddingTopWidth: GLASS_TOKENS.spacing[3] }]}>
                    <View>
                      <BodyM style={{ fontWeight: '600' }}>Moderation Status</BodyM>
                      <Caption contrast="low">No content violations</Caption>
                    </View>
                    <View style={styles.statusBadge}>
                      <BodyS style={{ color: '#2ECC71' }}>✓</BodyS>
                    </View>
                  </View>
                </GlassSurface>
              </View>

              {/* Bottom spacing */}
              <View style={{ height: GLASS_TOKENS.spacing[8] }} />
            </>
          )}
        </ScrollView>
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

  errorContainer: {
    marginHorizontal: GLASS_TOKENS.spacing[4],
    marginBottom: GLASS_TOKENS.spacing[3],
  },

  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: GLASS_TOKENS.spacing[3],
    gap: GLASS_TOKENS.spacing[2],
    marginBottom: GLASS_TOKENS.spacing[4],
  },

  metricCard: {
    width: (width - GLASS_TOKENS.spacing[6] - GLASS_TOKENS.spacing[4]) / 2,
  },

  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  section: {
    paddingHorizontal: GLASS_TOKENS.spacing[4],
    marginBottom: GLASS_TOKENS.spacing[5],
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: GLASS_TOKENS.spacing[3],
  },

  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GLASS_TOKENS.spacing[2],
  },

  productItem: {
    paddingVertical: GLASS_TOKENS.spacing[3],
  },

  productItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: GLASS_TOKENS.spacing[3],
  },

  productRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6AA8FF20',
    justifyContent: 'center',
    alignItems: 'center',
  },

  orderItem: {
    paddingVertical: GLASS_TOKENS.spacing[3],
  },

  orderItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  statusItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  statusBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2ECC7120',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
