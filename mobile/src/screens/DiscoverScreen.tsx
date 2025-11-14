import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, TextInput, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GlassBackground, GlassSurface } from '../components/glass';
import { useGlassTokens } from '../theme';

const TRENDING_CATEGORIES = [
  { id: '1', name: 'Joy Stories', icon: '😊', color: '#FFB3A7' },
  { id: '2', name: 'Wellness', icon: '🧘', color: '#FFD4C5' },
  { id: '3', name: 'Creative', icon: '🎨', color: '#FFE5DB' },
  { id: '4', name: 'Adventure', icon: '🚀', color: '#FF7A5C' },
  { id: '5', name: 'Learning', icon: '📚', color: '#FFE5DB' },
  { id: '6', name: 'Community', icon: '👥', color: '#FFD4C5' },
];

const TRENDING_POSTS = [
  {
    id: '1',
    author: 'Alex',
    title: 'Morning Meditation Guide',
    description: 'A beautiful sunrise meditation to start your day...',
    category: 'Wellness',
    momentCount: 2.5,
    verified: true,
  },
  {
    id: '2',
    author: 'Jordan',
    title: 'Creative Coding Adventures',
    description: 'Exploring the intersection of art and technology...',
    category: 'Creative',
    momentCount: 1.8,
    verified: false,
  },
  {
    id: '3',
    author: 'Sam',
    title: 'Solo Travel Chronicles',
    description: 'Discovering hidden gems across Southeast Asia...',
    category: 'Adventure',
    momentCount: 3.2,
    verified: true,
  },
];

export default function DiscoverScreen() {
  const tokens = useGlassTokens();
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <GlassBackground>
      <SafeAreaView style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header */}
          <GlassSurface variant="header" style={styles.header} padding={16}>
            <Text style={[styles.title, { color: tokens.colors.text.primary }]}>Discover</Text>
            <Text style={[styles.subtitle, { color: tokens.colors.text.secondary }]}>Explore trending moments and categories</Text>
          </GlassSurface>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <TextInput
              style={[styles.searchInput, { color: tokens.colors.text.primary }]}
              placeholder="Search moments..."
              placeholderTextColor={tokens.colors.text.secondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Trending Categories */}
          <View style={styles.sectionContainer}>
            <Text style={[styles.sectionTitle, { color: tokens.colors.text.primary }]}>Trending Categories</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoryScroll}
          >
            {TRENDING_CATEGORIES.map((category) => (
              <Pressable
                key={category.id}
                style={[styles.categoryCard, { borderColor: category.color }]}
              >
                <Text style={styles.categoryIcon}>{category.icon}</Text>
                <Text style={styles.categoryName}>{category.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

          {/* Trending Moments */}
          <View style={styles.sectionContainer}>
            <Text style={[styles.sectionTitle, { color: tokens.colors.text.primary }]}>Trending Now</Text>
            {TRENDING_POSTS.map((post) => (
              <Pressable key={post.id} style={styles.trendingCard}>
                <View style={styles.trendingHeader}>
                  <View>
                    <View style={styles.authorRow}>
                      <Text style={[styles.authorName, { color: tokens.colors.text.primary }]}>{post.author}</Text>
                      {post.verified && <Text style={[styles.verifyBadge, { color: tokens.colors.primary }]}>✓</Text>}
                    </View>
                    <Text style={[styles.categoryTag, { color: tokens.colors.text.secondary }]}>{post.category}</Text>
                  </View>
                </View>

                <Text style={[styles.trendingTitle, { color: tokens.colors.text.primary }]}>{post.title}</Text>
                <Text style={[styles.trendingDescription, { color: tokens.colors.text.secondary }]}>{post.description}</Text>

                <View style={styles.trendingFooter}>
                  <Text style={[styles.momentCount, { color: tokens.colors.primary }]}>⭐ {post.momentCount}K moments</Text>
                </View>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </GlassBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#000000',
  },
  sectionContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  categoryScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  categoryCard: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    backgroundColor: '#FFF5F0',
  },
  categoryIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '600',
  },
  trendingCard: {
    backgroundColor: '#FFF5F0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5D7D0',
  },
  trendingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  authorName: {
    fontSize: 14,
    fontWeight: '600',
  },
  verifyBadge: {
    fontSize: 14,
  },
  categoryTag: {
    fontSize: 11,
    marginTop: 4,
  },
  trendingTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  trendingDescription: {
    fontSize: 13,
    marginBottom: 12,
    lineHeight: 18,
  },
  trendingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  momentCount: {
    fontSize: 12,
    fontWeight: '600',
  },
});
