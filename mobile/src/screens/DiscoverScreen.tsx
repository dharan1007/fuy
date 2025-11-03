import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, TextInput, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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

const TRENDING_CATEGORIES = [
  { id: '1', name: 'Joy Stories', icon: '😊', color: COLORS.joy },
  { id: '2', name: 'Wellness', icon: '🧘', color: COLORS.calm },
  { id: '3', name: 'Creative', icon: '🎨', color: COLORS.reflect },
  { id: '4', name: 'Adventure', icon: '🚀', color: COLORS.primary },
  { id: '5', name: 'Learning', icon: '📚', color: COLORS.reflect },
  { id: '6', name: 'Community', icon: '👥', color: COLORS.calm },
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
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Discover</Text>
          <Text style={styles.subtitle}>Explore trending moments and categories</Text>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search moments..."
            placeholderTextColor={COLORS.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Trending Categories */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Trending Categories</Text>
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
          <Text style={styles.sectionTitle}>Trending Now</Text>
          {TRENDING_POSTS.map((post) => (
            <Pressable key={post.id} style={styles.trendingCard}>
              <View style={styles.trendingHeader}>
                <View>
                  <View style={styles.authorRow}>
                    <Text style={styles.authorName}>{post.author}</Text>
                    {post.verified && <Text style={styles.verifyBadge}>✓</Text>}
                  </View>
                  <Text style={styles.categoryTag}>{post.category}</Text>
                </View>
              </View>

              <Text style={styles.trendingTitle}>{post.title}</Text>
              <Text style={styles.trendingDescription}>{post.description}</Text>

              <View style={styles.trendingFooter}>
                <Text style={styles.momentCount}>⭐ {post.momentCount}K moments</Text>
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.base,
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
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: COLORS.text,
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  sectionContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
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
    borderColor: 'rgba(106, 168, 255, 0.3)',
    backgroundColor: 'rgba(106, 168, 255, 0.05)',
  },
  categoryIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
  },
  trendingCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
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
    color: COLORS.text,
  },
  verifyBadge: {
    fontSize: 14,
    color: COLORS.primary,
  },
  categoryTag: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  trendingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  trendingDescription: {
    fontSize: 13,
    color: COLORS.textMuted,
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
    color: COLORS.primary,
    fontWeight: '600',
  },
});
