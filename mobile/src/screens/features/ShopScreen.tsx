import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useShop } from '../../hooks/useFeatures';

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

const CATEGORIES = ['All', 'Cosmetics', 'Badges', 'Themes', 'Stickers', 'Sounds', 'Subscriptions'];

export default function ShopScreen() {
  const { shopItems, walletBalance, loading, error, loadItems, buy, loadWallet } = useShop();
  const [selectedCategory, setSelectedCategory] = useState('All');

  useEffect(() => {
    loadItems();
    loadWallet();
  }, [loadItems, loadWallet]);

  const filteredItems =
    selectedCategory === 'All'
      ? shopItems
      : shopItems.filter((item: any) => item.category === selectedCategory);

  const handlePurchase = async (id: string, price: number) => {
    try {
      await buy(id, price);
    } catch (err) {
      console.error('Failed to purchase item:', err);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Shop</Text>
          <Text style={styles.subtitle}>Marketplace & items</Text>
        </View>
        <View style={styles.walletCard}>
          <Text style={styles.walletIcon}>💎</Text>
          <Text style={styles.walletLabel}>Balance</Text>
          <Text style={styles.walletAmount}>{walletBalance?.toLocaleString() || '0'}</Text>
        </View>
      </View>

      {/* Categories */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesScroll}
      >
        <View style={styles.categoriesContainer}>
          {CATEGORIES.map((category) => (
            <Pressable
              key={category}
              style={[
                styles.categoryButton,
                selectedCategory === category && styles.categoryButtonActive,
              ]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text
                style={[
                  styles.categoryText,
                  selectedCategory === category && styles.categoryTextActive,
                ]}
              >
                {category}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {/* Items Grid */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading items...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load items</Text>
          <Pressable style={styles.retryButton} onPress={loadItems}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
          <View style={styles.gridItem}>
            <Pressable
              style={[
                styles.itemCard,
                item.purchased && styles.itemCardPurchased,
              ]}
              onPress={() => !item.purchased && handlePurchase(item.id, item.price)}
            >
              <View style={styles.itemIconContainer}>
                <Text style={styles.itemIcon}>{item.icon}</Text>
              </View>

              <Text style={styles.itemName} numberOfLines={2}>
                {item.name}
              </Text>
              <Text style={styles.itemDescription} numberOfLines={1}>
                {item.description}
              </Text>

              {item.purchased ? (
                <View style={styles.purchasedBadge}>
                  <Text style={styles.purchasedText}>✓ Owned</Text>
                </View>
              ) : (
                <View style={styles.priceTag}>
                  <Text style={styles.priceValue}>{item.price}</Text>
                  <Text style={styles.priceCurrency}>💎</Text>
                </View>
              )}
            </Pressable>
          </View>
        )}
        contentContainerStyle={styles.listContent}
        scrollEnabled={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🛍️</Text>
            <Text style={styles.emptyText}>No items found</Text>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  walletCard: {
    marginTop: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(106, 168, 255, 0.3)',
  },
  walletIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  walletLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  walletAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
    marginTop: 4,
  },
  categoriesScroll: {
    paddingVertical: 12,
  },
  categoriesContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  categoryButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  categoryTextActive: {
    color: '#000',
  },
  listContent: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  gridRow: {
    marginBottom: 8,
    gap: 8,
  },
  gridItem: {
    flex: 1,
  },
  itemCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  itemCardPurchased: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(106, 168, 255, 0.15)',
  },
  itemIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: 'rgba(106, 168, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemIcon: {
    fontSize: 32,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: 11,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: 8,
  },
  priceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  priceValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000',
  },
  priceCurrency: {
    fontSize: 12,
  },
  purchasedBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: COLORS.calm,
  },
  purchasedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000',
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
