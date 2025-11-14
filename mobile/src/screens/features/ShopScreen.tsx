import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useShop } from '../../hooks/useFeatures';
import { GlassBackground, GlassSurface } from '../../components/glass';
import { useGlassTokens } from '../../theme';
import type { ShopItem } from '../../store/featuresStore';

const CATEGORIES = ['All', 'Cosmetics', 'Badges', 'Themes', 'Stickers', 'Sounds', 'Subscriptions'];

export default function ShopScreen() {
  const { shopItems, walletBalance, loading, error, loadItems, buy, loadWallet } = useShop();
  const tokens = useGlassTokens();
  const [selectedCategory, setSelectedCategory] = useState('All');

  useEffect(() => {
    loadItems();
    loadWallet();
  }, [loadItems, loadWallet]);

  const filteredItems =
    selectedCategory === 'All'
      ? shopItems
      : shopItems.filter((item: ShopItem) => item.category === selectedCategory);

  const handlePurchase = async (id: string, price: number) => {
    try {
      await buy(id, price);
    } catch (err) {
      console.error('Failed to purchase item:', err);
    }
  };

  return (
    <GlassBackground>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <GlassSurface variant="header" padding={16}>
          <View style={styles.headerContent}>
            <View>
              <Text style={[styles.title, { color: tokens.colors.text.primary }]}>Shop</Text>
              <Text style={[styles.subtitle, { color: tokens.colors.text.secondary }]}>Marketplace & items</Text>
            </View>
            <GlassSurface variant="card" padding={12} style={styles.walletCard}>
              <Text style={styles.walletIcon}>💎</Text>
              <Text style={[styles.walletLabel, { color: tokens.colors.text.secondary }]}>Balance</Text>
              <Text style={[styles.walletAmount, { color: tokens.colors.primary }]}>
                {walletBalance?.toLocaleString() || '0'}
              </Text>
            </GlassSurface>
          </View>
        </GlassSurface>

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
                  selectedCategory === category && { backgroundColor: tokens.colors.primary },
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
            <ActivityIndicator size="large" color={tokens.colors.primary} />
            <Text style={[styles.loadingText, { color: tokens.colors.text.secondary }]}>Loading items...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Failed to load items</Text>
            <Pressable style={[styles.retryButton, { backgroundColor: tokens.colors.primary }]} onPress={loadItems}>
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
                  <View style={[styles.itemIconContainer, { backgroundColor: '#FF7A5C' }]}>
                    <Text style={styles.itemIcon}>{item.icon}</Text>
                  </View>

                  <Text style={[styles.itemName, { color: tokens.colors.text.primary }]} numberOfLines={2}>
                    {item.name}
                  </Text>
                  <Text style={[styles.itemDescription, { color: tokens.colors.text.secondary }]} numberOfLines={1}>
                    {item.description}
                  </Text>

                  {item.purchased ? (
                    <View style={[styles.purchasedBadge, { backgroundColor: '#FFD4C5' }]}>
                      <Text style={styles.purchasedText}>✓ Owned</Text>
                    </View>
                  ) : (
                    <View style={[styles.priceTag, { backgroundColor: tokens.colors.primary }]}>
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
                <Text style={[styles.emptyText, { color: tokens.colors.text.primary }]}>No items found</Text>
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
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 12,
  },
  walletCard: {
    alignItems: 'center',
  },
  walletIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  walletLabel: {
    fontSize: 11,
  },
  walletAmount: {
    fontSize: 18,
    fontWeight: '700',
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
    backgroundColor: '#FFF5F0',
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  categoryButtonActive: {
    borderColor: '#FF7A5C',
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666666',
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
    backgroundColor: '#FFF5F0',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5D7D0',
    alignItems: 'center',
  },
  itemCardPurchased: {
    borderColor: '#FF7A5C',
    backgroundColor: '#FFB3A7',
  },
  itemIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 12,
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
    textAlign: 'center',
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 8,
  },
  priceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
  },
});
