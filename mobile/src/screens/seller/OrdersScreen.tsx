import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Pressable,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GlassBackground, GlassSurface, GlassChip, GlassButton } from '../../components/glass';
import { TitleL, BodyM, BodyS, Caption } from '../../components/typography';
import { useGlassTokens, GLASS_TOKENS } from '../../theme';
import SellerService from '../../services/sellerService';

interface OrderItem {
  orderId: string;
  buyerId: string;
  buyerName: string;
  productType: string;
  productName: string;
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  date: string;
}

interface State {
  orders: OrderItem[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  page: number;
  hasMore: boolean;
  filter: 'all' | 'pending' | 'completed' | 'cancelled';
}

export default function OrdersScreen({ navigation, sellerId }: any) {
  const tokens = useGlassTokens();
  const [state, setState] = useState<State>({
    orders: [],
    loading: true,
    refreshing: false,
    error: null,
    page: 1,
    hasMore: true,
    filter: 'all',
  });

  const sellerService = new SellerService();

  useEffect(() => {
    loadOrders(true);
  }, [state.filter]);

  const loadOrders = async (reset = false) => {
    try {
      setState((s) => ({ ...s, loading: reset, error: null }));
      const { orders } = await sellerService.getSellerOrders(
        sellerId,
        reset ? 1 : state.page,
        20
      );

      const filteredOrders =
        state.filter === 'all'
          ? orders
          : orders.filter((o) => o.status === state.filter);

      setState((s) => ({
        ...s,
        orders: reset ? filteredOrders : [...s.orders, ...filteredOrders],
        loading: false,
        page: reset ? 2 : s.page + 1,
        hasMore: orders.length === 20,
      }));
    } catch (error: any) {
      setState((s) => ({ ...s, error: error.message, loading: false }));
    }
  };

  const onRefresh = async () => {
    setState((s) => ({ ...s, refreshing: true }));
    try {
      const { orders } = await sellerService.getSellerOrders(sellerId, 1, 20);
      const filteredOrders =
        state.filter === 'all'
          ? orders
          : orders.filter((o) => o.status === state.filter);

      setState((s) => ({
        ...s,
        orders: filteredOrders,
        refreshing: false,
        page: 2,
        hasMore: orders.length === 20,
      }));
    } catch (error: any) {
      setState((s) => ({ ...s, error: error.message, refreshing: false }));
    }
  };

  const handleLoadMore = () => {
    if (state.hasMore && !state.loading) {
      loadOrders(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#2ECC71';
      case 'pending':
      case 'processing':
        return '#F39C12';
      case 'cancelled':
        return '#E74C3C';
      default:
        return '#95A5A6';
    }
  };

  const getPaymentStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return '✓';
      case 'pending':
        return '⏳';
      case 'failed':
        return '✗';
      case 'refunded':
        return '↩️';
      default:
        return '?';
    }
  };

  return (
    <GlassBackground>
      <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <TitleL>Orders</TitleL>
          <Caption contrast="low">Track and manage your orders</Caption>
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterTabs}>
          {(['all', 'pending', 'completed', 'cancelled'] as const).map((f) => (
            <Pressable
              key={f}
              style={[
                styles.filterTab,
                state.filter === f && styles.filterTabActive,
              ]}
              onPress={() =>
                setState((s) => ({
                  ...s,
                  filter: f,
                  orders: [],
                  page: 1,
                  hasMore: true,
                }))
              }
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

        {/* Error State */}
        {state.error && (
          <View style={styles.section}>
            <GlassSurface variant="card">
              <BodyM style={{ color: '#FF6B6B', marginBottom: GLASS_TOKENS.spacing[2] }}>
                ⚠️ {state.error}
              </BodyM>
              <GlassButton variant="primary" label="Retry" onPress={() => loadOrders(true)} />
            </GlassSurface>
          </View>
        )}

        {/* Orders List */}
        <FlatList
          data={state.orders}
          keyExtractor={(item) => item.orderId}
          renderItem={({ item }) => (
            <View style={styles.orderCardWrapper}>
              <GlassSurface variant="card" style={styles.orderCard}>
                {/* Order Header */}
                <View style={styles.orderHeader}>
                  <View style={{ flex: 1 }}>
                    <BodyM style={{ fontWeight: '600', marginBottom: GLASS_TOKENS.spacing[1] }}>
                      Order #{item.orderId.slice(-6).toUpperCase()}
                    </BodyM>
                    <Caption contrast="low">{item.date}</Caption>
                  </View>
                  <GlassChip
                    label={item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                    style={{
                      backgroundColor: getStatusColor(item.status) + '30',
                    }}
                  />
                </View>

                {/* Product Info */}
                <View style={styles.divider} />
                <View style={styles.productInfo}>
                  <View style={{ flex: 1 }}>
                    <BodyS contrast="low" style={{ marginBottom: GLASS_TOKENS.spacing[1] }}>
                      {item.productType.toUpperCase()}
                    </BodyS>
                    <BodyM numberOfLines={1} style={{ fontWeight: '600' }}>
                      {item.productName}
                    </BodyM>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <BodyM style={{ fontWeight: '700', marginBottom: GLASS_TOKENS.spacing[1] }}>
                      {formatCurrency(item.amount)}
                    </BodyM>
                    <BodyS style={{ color: tokens.colors.primary }}>
                      {getPaymentStatusIcon(item.paymentStatus)} {item.paymentStatus.toUpperCase()}
                    </BodyS>
                  </View>
                </View>

                {/* Buyer Info */}
                <View style={styles.divider} />
                <View style={styles.buyerInfo}>
                  <BodyS contrast="low">Customer</BodyS>
                  <BodyM numberOfLines={1} style={{ fontWeight: '600' }}>
                    {item.buyerName}
                  </BodyM>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                  <GlassButton
                    variant="secondary"
                    label="Details"
                    size="small"
                    onPress={() =>
                      navigation?.navigate('OrderDetails', {
                        orderId: item.orderId,
                      })
                    }
                  />
                  {item.status === 'completed' && item.paymentStatus === 'paid' && (
                    <GlassButton
                      variant="secondary"
                      label="Invoice"
                      size="small"
                      onPress={() => {
                        Alert.alert('Invoice', `Invoice for order ${item.orderId}`);
                      }}
                    />
                  )}
                </View>
              </GlassSurface>
            </View>
          )}
          contentContainerStyle={styles.listContent}
          scrollIndicatorInsets={{ right: 1 }}
          refreshControl={
            <RefreshControl
              refreshing={state.refreshing}
              onRefresh={onRefresh}
              tintColor={tokens.colors.primary}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            state.loading ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="large" color={tokens.colors.primary} />
              </View>
            ) : null
          }
          ListEmptyComponent={
            !state.loading ? (
              <View style={styles.emptyState}>
                <BodyM style={{ fontSize: 48, marginBottom: GLASS_TOKENS.spacing[3] }}>
                  📭
                </BodyM>
                <BodyM style={{ fontWeight: '600', marginBottom: GLASS_TOKENS.spacing[2] }}>
                  No orders yet
                </BodyM>
                <Caption contrast="low" style={{ textAlign: 'center' }}>
                  Your orders will appear here
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

  header: {
    paddingHorizontal: GLASS_TOKENS.spacing[4],
    paddingVertical: GLASS_TOKENS.spacing[4],
  },

  filterTabs: {
    flexDirection: 'row',
    paddingHorizontal: GLASS_TOKENS.spacing[4],
    gap: GLASS_TOKENS.spacing[2],
    marginBottom: GLASS_TOKENS.spacing[4],
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

  section: {
    paddingHorizontal: GLASS_TOKENS.spacing[4],
    marginBottom: GLASS_TOKENS.spacing[4],
  },

  listContent: {
    paddingHorizontal: GLASS_TOKENS.spacing[4],
    paddingBottom: GLASS_TOKENS.spacing[8],
    gap: GLASS_TOKENS.spacing[3],
  },

  orderCardWrapper: {
    gap: GLASS_TOKENS.spacing[3],
  },

  orderCard: {
    paddingVertical: GLASS_TOKENS.spacing[3],
  },

  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: GLASS_TOKENS.spacing[2],
    paddingHorizontal: GLASS_TOKENS.spacing[3],
  },

  divider: {
    height: 1,
    backgroundColor: '#FFFFFF20',
    marginVertical: GLASS_TOKENS.spacing[3],
    marginHorizontal: GLASS_TOKENS.spacing[3],
  },

  productInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: GLASS_TOKENS.spacing[3],
    gap: GLASS_TOKENS.spacing[2],
  },

  buyerInfo: {
    paddingHorizontal: GLASS_TOKENS.spacing[3],
    paddingVertical: GLASS_TOKENS.spacing[2],
    backgroundColor: '#FFFFFF05',
    borderRadius: GLASS_TOKENS.spacing[2],
    marginHorizontal: GLASS_TOKENS.spacing[3],
  },

  actionButtons: {
    flexDirection: 'row',
    gap: GLASS_TOKENS.spacing[2],
    paddingHorizontal: GLASS_TOKENS.spacing[3],
    paddingTop: GLASS_TOKENS.spacing[3],
  },

  footerLoader: {
    marginVertical: GLASS_TOKENS.spacing[4],
    alignItems: 'center',
  },

  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: GLASS_TOKENS.spacing[12],
  },
});
