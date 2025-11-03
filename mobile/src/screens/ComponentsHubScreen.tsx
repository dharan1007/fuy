import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
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

const COMPONENTS = [
  { id: 'canvas', label: 'Canvas', desc: 'Journal & Diary', icon: '🎨' },
  { id: 'hopln', label: 'Hopln', desc: 'Adventure Routes', icon: '🚀' },
  { id: 'essenz', label: 'Essenz', desc: 'Wellness & Growth', icon: '✨' },
  { id: 'bonding', label: 'Bonding', desc: 'Relationships', icon: '🔗' },
  { id: 'ranking', label: 'Ranking', desc: 'Leaderboards', icon: '🏆' },
  { id: 'shop', label: 'Shop', desc: 'Marketplace', icon: '🛍️' },
];

export default function ComponentsHubScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Components Hub</Text>
        <Text style={styles.subtitle}>Access all Fuy features</Text>

        <View style={styles.grid}>
          {COMPONENTS.map((component) => (
            <Pressable key={component.id} style={styles.componentCard}>
              <View style={styles.iconContainer}>
                <Text style={styles.icon}>{component.icon}</Text>
              </View>
              <Text style={styles.componentLabel}>{component.label}</Text>
              <Text style={styles.componentDesc}>{component.desc}</Text>
              <Text style={styles.tapHint}>Tap to access ↓</Text>
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
  content: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 24,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  componentCard: {
    width: '48%',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(106, 168, 255, 0.2)',
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 8,
  },
  icon: {
    fontSize: 40,
  },
  componentLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  componentDesc: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: 8,
  },
  tapHint: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '500',
  },
});
