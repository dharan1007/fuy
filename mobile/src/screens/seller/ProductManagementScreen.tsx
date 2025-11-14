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
import ProductService from '../../services/productService';
import { Product } from '../../types/product';

interface State {
  products: Product[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  page: number;
  hasMore: boolean;
  filter: 'all' | 'published' | 'draft';
}

export default function ProductManagementScreen({ navigation, sellerId }: any) {
  const tokens = useGlassTokens();
  const [state, setState] = useState<State>({
    products: [],
    loading: true,
    refreshing: false,
    error: null,
    page: 1,
    hasMore: true,
    filter: 'all',
  });

  const productService = new ProductService();

  useEffect(() => {
    loadProducts(true);
  }, [state.filter]);

  const loadProducts = async (reset = false) => {
    try {
      setState((s) => ({ ...s, loading: reset, error: null }));
      const status = state.filter === 'all' ? undefined : state.filter;
      const { products } = await productService.getSellerProducts(
        sellerId,
        status,
        undefined,
        reset ? 1 : state.page,
        20
      );

      setState((s) => ({
        ...s,
        products: reset ? products : [...s.products, ...products],
        loading: false,
        page: reset ? 2 : s.page + 1,
        hasMore: products.length === 20,
      }));
    } catch (error: any) {
      setState((s) => ({ ...s, error: error.message, loading: false }));
    }
  };

  const onRefresh = async () => {
    setState((s) => ({ ...s, refreshing: true }));
    try {
      const status = state.filter === 'all' ? undefined : state.filter;
      const { products } = await productService.getSellerProducts(
        sellerId,
        status,
        undefined,
        1,
        20
      );

      setState((s) => ({
        ...s,
        products,
        refreshing: false,
        page: 2,
        hasMore: products.length === 20,
      }));
    } catch (error: any) {
      setState((s) => ({ ...s, error: error.message, refreshing: false }));
    }
  };

  const handleLoadMore = () => {
    if (state.hasMore && !state.loading) {
      loadProducts(false);
    }
  };

  const handlePublish = async (productId: string) => {
    try {
      await productService.publishProduct(productId);
      Alert.alert('Success', 'Product published successfully');
      onRefresh();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleUnpublish = async (productId: string) => {
    Alert.alert(
      'Unpublish Product',
      'Are you sure you want to unpublish this product? It will no longer be visible to customers.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unpublish',
          style: 'destructive',
          onPress: async () => {
            try {
              await productService.unpublishProduct(productId);
              Alert.alert('Success', 'Product unpublished successfully');
              onRefresh();
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  const handleDelete = async (productId: string) => {
    Alert.alert(
      'Delete Product',
      'Are you sure you want to delete this product? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await productService.deleteProduct(productId);
              Alert.alert('Success', 'Product deleted successfully');
              onRefresh();
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  };

  const getProductTypeIcon = (type: string) => {
    switch (type) {
      case 'template':
        return '🎨';
      case 'course':
        return '📚';
      case 'plan':
        return '📋';
      case 'exclusive_content':
        return '🔒';
      default:
        return '📦';
    }
  };

  const renderProduct = ({ item, index }: { item: Product; index: number }) => (
    <GlassSurface
      variant="card"
      style={[
        styles.productCard,
        { marginBottom: index < state.products.length - 1 ? GLASS_TOKENS.spacing[2] : 0 },
      ]}
    >
      {/* Product Header */}
      <View style={styles.productHeader}>
        <View style={styles.productIcon}>
          <BodyM style={{ fontSize: 24 }}>{getProductTypeIcon(item.productType)}</BodyM>
        </View>
        <View style={{ flex: 1 }}>
          <BodyM numberOfLines={1} style={{ fontWeight: '600', marginBottom: GLASS_TOKENS.spacing[1] }}>
            {item.title}
          </BodyM>
          <BodyS contrast="low" numberOfLines={1}>
            {item.productType.toUpperCase()}
          </BodyS>
        </View>
        <GlassChip
          label={item.status === 'published' ? 'Live' : 'Draft'}
          style={{
            backgroundColor: item.status === 'published' ? '#2ECC7130' : '#F39C1230',
          }}
        />
      </View>

      {/* Product Info */}
      <View style={[styles.divider, { marginTop: GLASS_TOKENS.spacing[3], marginBottom: GLASS_TOKENS.spacing[3] }]} />

      <View style={styles.productInfo}>
        <View style={styles.infoItem}>
          <Caption contrast="low">Price</Caption>
          <BodyM style={{ fontWeight: '600', marginTop: GLASS_TOKENS.spacing[1] }}>
            {formatCurrency(item.price)}
          </BodyM>
        </View>

        {item.sales !== undefined && (
          <View style={styles.infoItem}>
            <Caption contrast="low">Sales</Caption>
            <BodyM style={{ fontWeight: '600', marginTop: GLASS_TOKENS.spacing[1] }}>
              {item.sales}
            </BodyM>
          </View>
        )}

        {item.rating !== undefined && (
          <View style={styles.infoItem}>
            <Caption contrast="low">Rating</Caption>
            <BodyM style={{ fontWeight: '600', marginTop: GLASS_TOKENS.spacing[1] }}>
              {item.rating?.toFixed(1) || 'N/A'}⭐
            </BodyM>
          </View>
        )}
      </View>

      {/* Description */}
      {item.description && (
        <View style={[styles.divider, { marginTop: GLASS_TOKENS.spacing[3], marginBottom: GLASS_TOKENS.spacing[3] }]} />
      )}

      {item.description && (
        <Caption contrast="low" numberOfLines={2} style={{ marginBottom: GLASS_TOKENS.spacing[3] }}>
          {item.description}
        </Caption>
      )}

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <GlassButton
          variant="secondary"
          label="View"
          size="small"
          onPress={() =>
            navigation?.navigate('ProductDetails', {
              productId: item.id,
            })
          }
        />
        <GlassButton
          variant="secondary"
          label="Edit"
          size="small"
          onPress={() =>
            navigation?.navigate('EditProduct', {
              productId: item.id,
            })
          }
        />

        {item.status === 'draft' && (
          <GlassButton
            variant="secondary"
            label="Publish"
            size="small"
            onPress={() => handlePublish(item.id)}
          />
        )}

        {item.status === 'published' && (
          <GlassButton
            variant="secondary"
            label="Unpublish"
            size="small"
            onPress={() => handleUnpublish(item.id)}
          />
        )}

        <Pressable
          style={styles.deleteButton}
          onPress={() => handleDelete(item.id)}
        >
          <BodyS style={{ color: '#FF6B6B' }}>🗑️</BodyS>
        </Pressable>
      </View>
    </GlassSurface>
  );

  return (
    <GlassBackground>
      <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <TitleL>Products</TitleL>
          <Caption contrast="low">Manage and organize your products</Caption>
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterTabs}>
          {(['all', 'published', 'draft'] as const).map((f) => (
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
                  products: [],
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
              <GlassButton variant="primary" label="Retry" onPress={() => loadProducts(true)} />
            </GlassSurface>
          </View>
        )}

        {/* Add Product Button */}
        <View style={styles.addButtonContainer}>
          <GlassButton
            variant="primary"
            label="➕ Add New Product"
            onPress={() => navigation?.navigate('CreateProduct')}
          />
        </View>

        {/* Products List */}
        <FlatList
          data={state.products}
          keyExtractor={(item) => item.id}
          renderItem={renderProduct}
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
                  No products yet
                </BodyM>
                <Caption contrast="low" style={{ textAlign: 'center', marginBottom: GLASS_TOKENS.spacing[4] }}>
                  Create your first product to get started
                </Caption>
                <GlassButton
                  variant="primary"
                  label="Create Product"
                  onPress={() => navigation?.navigate('CreateProduct')}
                />
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

  addButtonContainer: {
    paddingHorizontal: GLASS_TOKENS.spacing[4],
    marginBottom: GLASS_TOKENS.spacing[3],
  },

  listContent: {
    paddingHorizontal: GLASS_TOKENS.spacing[4],
    paddingBottom: GLASS_TOKENS.spacing[8],
    gap: GLASS_TOKENS.spacing[2],
  },

  productCard: {
    paddingVertical: GLASS_TOKENS.spacing[3],
  },

  productHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: GLASS_TOKENS.spacing[3],
    paddingHorizontal: GLASS_TOKENS.spacing[3],
  },

  productIcon: {
    width: 44,
    height: 44,
    borderRadius: GLASS_TOKENS.spacing[2],
    backgroundColor: '#FFFFFF10',
    justifyContent: 'center',
    alignItems: 'center',
  },

  divider: {
    height: 1,
    backgroundColor: '#FFFFFF20',
  },

  productInfo: {
    flexDirection: 'row',
    gap: GLASS_TOKENS.spacing[3],
    paddingHorizontal: GLASS_TOKENS.spacing[3],
  },

  infoItem: {
    flex: 1,
  },

  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GLASS_TOKENS.spacing[2],
    paddingHorizontal: GLASS_TOKENS.spacing[3],
  },

  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: GLASS_TOKENS.spacing[2],
    backgroundColor: '#FF6B6B20',
    justifyContent: 'center',
    alignItems: 'center',
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
