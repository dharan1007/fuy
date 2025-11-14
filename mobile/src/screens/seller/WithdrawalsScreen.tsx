import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GlassBackground, GlassSurface, GlassButton, GlassChip } from '../../components/glass';
import { TitleL, BodyM, BodyS, Caption } from '../../components/typography';
import { useGlassTokens, GLASS_TOKENS } from '../../theme';
import SellerService from '../../services/sellerService';
import { WithdrawalRequest } from '../../types/seller';

interface State {
  withdrawals: WithdrawalRequest[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  availableBalance: number;
  withdrawAmount: string;
  processing: boolean;
}

export default function WithdrawalsScreen({ navigation, sellerId }: any) {
  const tokens = useGlassTokens();
  const [state, setState] = useState<State>({
    withdrawals: [],
    loading: true,
    refreshing: false,
    error: null,
    availableBalance: 0,
    withdrawAmount: '',
    processing: false,
  });

  const sellerService = new SellerService();

  useEffect(() => {
    loadWithdrawals();
  }, []);

  const loadWithdrawals = async () => {
    try {
      setState((s) => ({ ...s, loading: true, error: null }));
      const [earnings, history] = await Promise.all([
        sellerService.getSellerEarnings(sellerId),
        sellerService.getWithdrawalHistory(sellerId),
      ]);

      setState((s) => ({
        ...s,
        availableBalance: earnings.pendingEarnings,
        withdrawals: history,
        loading: false,
      }));
    } catch (error: any) {
      setState((s) => ({ ...s, error: error.message, loading: false }));
    }
  };

  const onRefresh = async () => {
    setState((s) => ({ ...s, refreshing: true }));
    try {
      const [earnings, history] = await Promise.all([
        sellerService.getSellerEarnings(sellerId),
        sellerService.getWithdrawalHistory(sellerId),
      ]);

      setState((s) => ({
        ...s,
        availableBalance: earnings.pendingEarnings,
        withdrawals: history,
        refreshing: false,
      }));
    } catch (error: any) {
      setState((s) => ({ ...s, error: error.message, refreshing: false }));
    }
  };

  const handleWithdraw = async () => {
    const amount = parseFloat(state.withdrawAmount);

    if (!amount || amount <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid amount');
      return;
    }

    if (amount > state.availableBalance) {
      Alert.alert('Insufficient Balance', 'You cannot withdraw more than your available balance');
      return;
    }

    if (amount < 100) {
      Alert.alert('Minimum Amount', 'Minimum withdrawal amount is ₹100');
      return;
    }

    Alert.alert(
      'Confirm Withdrawal',
      `You are about to request a withdrawal of ₹${amount.toLocaleString('en-IN')}. This will be processed within 2-3 business days.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: 'default',
          onPress: async () => {
            try {
              setState((s) => ({ ...s, processing: true }));
              const withdrawal = await sellerService.requestWithdrawal(sellerId, amount);
              setState((s) => ({
                ...s,
                withdrawals: [withdrawal, ...s.withdrawals],
                withdrawAmount: '',
                availableBalance: s.availableBalance - amount,
                processing: false,
              }));
              Alert.alert('Success', 'Withdrawal request submitted successfully');
            } catch (error: any) {
              Alert.alert('Error', error.message);
              setState((s) => ({ ...s, processing: false }));
            }
          },
        },
      ]
    );
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#2ECC71';
      case 'pending':
        return '#F39C12';
      case 'processing':
        return '#3498DB';
      case 'cancelled':
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
        {/* Header */}
        <View style={styles.header}>
          <TitleL>Withdrawals</TitleL>
          <Caption contrast="low">Request and track your payouts</Caption>
        </View>

        {/* Error State */}
        {state.error && (
          <View style={styles.section}>
            <GlassSurface variant="card">
              <BodyM style={{ color: '#FF6B6B', marginBottom: GLASS_TOKENS.spacing[2] }}>
                ⚠️ {state.error}
              </BodyM>
              <GlassButton variant="primary" label="Retry" onPress={loadWithdrawals} />
            </GlassSurface>
          </View>
        )}

        {/* Balance Card */}
        <View style={styles.section}>
          <GlassSurface variant="card">
            <View style={styles.balanceHeader}>
              <BodyS contrast="low">Available Balance</BodyS>
              <BodyS contrast="low" style={{ fontSize: 18 }}>💰</BodyS>
            </View>
            <TitleL style={{ marginVertical: GLASS_TOKENS.spacing[3] }}>
              {formatCurrency(state.availableBalance)}
            </TitleL>
            <Caption contrast="low">You can withdraw this amount anytime</Caption>
          </GlassSurface>
        </View>

        {/* Withdrawal Form */}
        <View style={styles.section}>
          <BodyM style={[styles.formLabel, { marginBottom: GLASS_TOKENS.spacing[2] }]}>
            Request Withdrawal
          </BodyM>
          <GlassSurface variant="card" style={styles.formCard}>
            <View style={styles.formGroup}>
              <Caption style={styles.inputLabel}>Amount (₹)</Caption>
              <View style={styles.amountInput}>
                <BodyS style={styles.currencySymbol}>₹</BodyS>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  placeholderTextColor="#E8E8F050"
                  value={state.withdrawAmount}
                  onChangeText={(text) => {
                    // Allow only numbers and decimal point
                    const cleaned = text.replace(/[^0-9]/g, '');
                    setState((s) => ({ ...s, withdrawAmount: cleaned }));
                  }}
                  keyboardType="number-pad"
                  editable={!state.processing}
                  maxLength={10}
                />
              </View>
              {state.withdrawAmount && (
                <Caption contrast="low" style={{ marginTop: GLASS_TOKENS.spacing[1] }}>
                  You'll receive: {formatCurrency(
                    parseFloat(state.withdrawAmount) - Math.round(parseFloat(state.withdrawAmount) * 0.02)
                  )}{' '}
                  (2% processing fee)
                </Caption>
              )}
            </View>

            {/* Info Box */}
            <View style={styles.infoBox}>
              <Caption contrast="low">
                ℹ️ Minimum withdrawal: ₹100
              </Caption>
              <Caption contrast="low" style={{ marginTop: GLASS_TOKENS.spacing[1] }}>
                Processing time: 2-3 business days
              </Caption>
            </View>

            {/* Action Button */}
            <GlassButton
              variant="primary"
              label={state.processing ? 'Processing...' : 'Request Withdrawal'}
              onPress={handleWithdraw}
              disabled={state.processing || !state.withdrawAmount}
            />
          </GlassSurface>
        </View>

        {/* Withdrawal History */}
        <View style={styles.section}>
          <BodyM style={[styles.formLabel, { marginBottom: GLASS_TOKENS.spacing[3] }]}>
            Withdrawal History
          </BodyM>

          <FlatList
            data={state.withdrawals}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            renderItem={({ item, index }) => (
              <GlassSurface
                variant="card"
                style={[
                  styles.withdrawalItem,
                  { marginBottom: index < state.withdrawals.length - 1 ? GLASS_TOKENS.spacing[2] : 0 },
                ]}
              >
                <View style={styles.withdrawalHeader}>
                  <View style={{ flex: 1 }}>
                    <BodyM style={{ fontWeight: '600', marginBottom: GLASS_TOKENS.spacing[1] }}>
                      {formatCurrency(item.amount)}
                    </BodyM>
                    <Caption contrast="low">{item.requestDate}</Caption>
                  </View>
                  <GlassChip
                    label={item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                    style={{
                      backgroundColor: getStatusColor(item.status) + '30',
                    }}
                  />
                </View>

                {item.status === 'completed' && item.completedDate && (
                  <View style={[styles.statusInfo, { marginTop: GLASS_TOKENS.spacing[2] }]}>
                    <Caption contrast="low">✓ Completed on {item.completedDate}</Caption>
                  </View>
                )}

                {item.status === 'processing' && (
                  <View style={[styles.statusInfo, { marginTop: GLASS_TOKENS.spacing[2] }]}>
                    <Caption contrast="low">⏳ Processing... Expected in {item.estimatedDays || 2} days</Caption>
                  </View>
                )}

                {item.status === 'failed' && item.failureReason && (
                  <View style={[styles.statusInfo, { marginTop: GLASS_TOKENS.spacing[2] }]}>
                    <Caption style={{ color: '#FF6B6B' }}>✗ Failed: {item.failureReason}</Caption>
                  </View>
                )}

                {item.processingFee && (
                  <Caption contrast="low" style={{ marginTop: GLASS_TOKENS.spacing[2] }}>
                    You'll receive: {formatCurrency(item.amount - item.processingFee)}
                  </Caption>
                )}
              </GlassSurface>
            )}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <BodyM style={{ fontSize: 48, marginBottom: GLASS_TOKENS.spacing[3] }}>
                  📭
                </BodyM>
                <Caption contrast="low">No withdrawal requests yet</Caption>
              </View>
            }
          />
        </View>

        <View style={{ height: GLASS_TOKENS.spacing[8] }} />
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

  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  formLabel: {
    fontWeight: '600',
  },

  formCard: {
    padding: GLASS_TOKENS.spacing[4],
  },

  formGroup: {
    marginBottom: GLASS_TOKENS.spacing[4],
  },

  inputLabel: {
    marginBottom: GLASS_TOKENS.spacing[2],
    display: 'flex',
  },

  amountInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF10',
    borderRadius: GLASS_TOKENS.spacing[2],
    borderWidth: 1,
    borderColor: '#FFFFFF20',
    paddingHorizontal: GLASS_TOKENS.spacing[3],
    gap: GLASS_TOKENS.spacing[2],
  },

  currencySymbol: {
    fontSize: 18,
    fontWeight: '600',
    color: tokens => tokens.colors.primary,
  },

  input: {
    flex: 1,
    paddingVertical: GLASS_TOKENS.spacing[3],
    color: '#E8E8F0',
    fontSize: 18,
    fontWeight: '600',
  },

  infoBox: {
    backgroundColor: '#FFFFFF05',
    borderRadius: GLASS_TOKENS.spacing[2],
    paddingHorizontal: GLASS_TOKENS.spacing[3],
    paddingVertical: GLASS_TOKENS.spacing[2],
    marginBottom: GLASS_TOKENS.spacing[4],
    borderLeftWidth: 3,
    borderLeftColor: '#6AA8FF',
  },

  withdrawalItem: {
    paddingVertical: GLASS_TOKENS.spacing[3],
  },

  withdrawalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },

  statusInfo: {
    backgroundColor: '#FFFFFF05',
    borderRadius: GLASS_TOKENS.spacing[2],
    paddingHorizontal: GLASS_TOKENS.spacing[2],
    paddingVertical: GLASS_TOKENS.spacing[1],
  },

  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: GLASS_TOKENS.spacing[8],
  },
});
