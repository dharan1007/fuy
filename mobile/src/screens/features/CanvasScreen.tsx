import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, TextInput, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCanvas } from '../../hooks/useCanvas';
import { GlassBackground, GlassSurface } from '../../components/glass';
import { useGlassTokens } from '../../theme';

export default function CanvasScreen() {
  const {
    entries,
    loading,
    error,
    loadEntries,
    createEntry,
    deleteEntry,
  } = useCanvas();
  const tokens = useGlassTokens();
  const [modalVisible, setModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [selectedMood, setSelectedMood] = useState<'joy' | 'calm' | 'reflect'>('calm');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const handleCreateEntry = async () => {
    if (newTitle.trim() && newContent.trim()) {
      setIsSubmitting(true);
      try {
        await createEntry(newTitle, newContent, selectedMood);
        setNewTitle('');
        setNewContent('');
        setSelectedMood('calm');
        setModalVisible(false);
      } catch (err) {
        console.error('Failed to create entry:', err);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleDeleteEntry = async (id: string) => {
    try {
      await deleteEntry(id);
    } catch (err) {
      console.error('Failed to delete entry:', err);
    }
  };

  const getMoodColor = (mood: string) => {
    switch (mood) {
      case 'joy':
        return '#FFB3A7';
      case 'calm':
        return '#FFD4C5';
      case 'reflect':
        return '#FFE5DB';
      default:
        return tokens.colors.primary;
    }
  };

  const getMoodEmoji = (mood: string) => {
    switch (mood) {
      case 'joy':
        return '😊';
      case 'calm':
        return '🧘';
      case 'reflect':
        return '🤔';
      default:
        return '📝';
    }
  };

  return (
    <GlassBackground>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <GlassSurface variant="header" padding={16}>
          <View style={styles.headerContent}>
            <View>
              <Text style={[styles.title, { color: tokens.colors.text.primary }]}>Canvas</Text>
              <Text style={[styles.subtitle, { color: tokens.colors.text.secondary }]}>Your journal moments</Text>
            </View>
            <Pressable
              style={[styles.addButton, { backgroundColor: tokens.colors.primary }]}
              onPress={() => setModalVisible(true)}
            >
              <Text style={styles.addButtonText}>+</Text>
            </Pressable>
          </View>
        </GlassSurface>

        {/* Entries List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={tokens.colors.primary} />
            <Text style={[styles.loadingText, { color: tokens.colors.text.secondary }]}>Loading entries...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Failed to load entries</Text>
            <Pressable
              style={[styles.retryButton, { backgroundColor: tokens.colors.primary }]}
              onPress={loadEntries}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={entries}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <GlassSurface variant="card" padding={16} style={styles.entryCard}>
                <View style={styles.entryHeader}>
                  <View style={[styles.moodIndicator, { backgroundColor: '#FF7A5C' }]}>
                    <Text style={styles.moodEmoji}>{getMoodEmoji(item.mood)}</Text>
                  </View>
                  <View style={styles.entryMeta}>
                    <Text style={[styles.entryTitle, { color: tokens.colors.text.primary }]}>{item.title}</Text>
                    <Text style={[styles.entryDate, { color: tokens.colors.text.secondary }]}>
                      {item.createdAt || 'Unknown date'}
                    </Text>
                  </View>
                  <Pressable
                    style={styles.deleteButton}
                    onPress={() => handleDeleteEntry(item.id)}
                  >
                    <Text style={styles.deleteIcon}>✕</Text>
                  </Pressable>
                </View>
                <Text style={[styles.entryContent, { color: tokens.colors.text.primary }]} numberOfLines={2}>
                  {item.content}
                </Text>
              </GlassSurface>
            )}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>📝</Text>
                <Text style={[styles.emptyText, { color: tokens.colors.text.primary }]}>
                  No journal entries yet
                </Text>
                <Text style={[styles.emptySubtext, { color: tokens.colors.text.secondary }]}>
                  Create your first canvas moment
                </Text>
              </View>
            }
          />
        )}

        {/* Create Entry Modal */}
        <Modal
          visible={modalVisible}
          animationType="slide"
          onRequestClose={() => setModalVisible(false)}
          transparent={true}
        >
          <GlassBackground>
            <SafeAreaView style={{ flex: 1 }}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: tokens.colors.text.primary }]}>New Canvas Entry</Text>
                  <Pressable onPress={() => setModalVisible(false)}>
                    <Text style={[styles.closeButton, { color: tokens.colors.text.secondary }]}>✕</Text>
                  </Pressable>
                </View>

                <TextInput
                  style={[styles.titleInput, { color: tokens.colors.text.primary, borderColor: '#000000' }]}
                  placeholder="Entry title..."
                  placeholderTextColor={tokens.colors.text.secondary}
                  value={newTitle}
                  onChangeText={setNewTitle}
                />

                <TextInput
                  style={[styles.contentInput, { color: tokens.colors.text.primary, borderColor: '#000000' }]}
                  placeholder="Write your thoughts..."
                  placeholderTextColor={tokens.colors.text.secondary}
                  value={newContent}
                  onChangeText={setNewContent}
                  multiline
                />

                <View style={styles.moodSelector}>
                  <Text style={[styles.moodLabel, { color: tokens.colors.text.primary }]}>How are you feeling?</Text>
                  <View style={styles.moodButtons}>
                    {(['joy', 'calm', 'reflect'] as const).map((mood) => (
                      <Pressable
                        key={mood}
                        style={[
                          styles.moodButton,
                          selectedMood === mood && styles.moodButtonActive,
                          { borderColor: getMoodColor(mood) },
                          selectedMood === mood && { backgroundColor: '#FF7A5C' },
                        ]}
                        onPress={() => setSelectedMood(mood)}
                      >
                        <Text style={styles.moodButtonEmoji}>{getMoodEmoji(mood)}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                <View style={styles.modalActions}>
                  <Pressable
                    style={[styles.actionButton, styles.cancelButton, { borderColor: '#E5D7D0' }]}
                    onPress={() => setModalVisible(false)}
                    disabled={isSubmitting}
                  >
                    <Text style={[styles.cancelButtonText, { color: tokens.colors.text.primary }]}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.actionButton, styles.saveButton, { backgroundColor: tokens.colors.primary }]}
                    onPress={handleCreateEntry}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator size="small" color="#000" />
                    ) : (
                      <Text style={styles.saveButtonText}>Save Canvas</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            </SafeAreaView>
          </GlassBackground>
        </Modal>
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
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 24,
    color: '#000',
    fontWeight: '700',
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
  listContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  entryCard: {
    marginBottom: 12,
    borderRadius: 16,
  },
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    justifyContent: 'space-between',
  },
  moodIndicator: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  moodEmoji: {
    fontSize: 24,
  },
  entryMeta: {
    flex: 1,
  },
  entryTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  entryDate: {
    fontSize: 12,
    marginTop: 3,
    fontWeight: '500',
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FF6464',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteIcon: {
    fontSize: 18,
    color: '#FF6464',
    fontWeight: '700',
  },
  entryContent: {
    fontSize: 14,
    lineHeight: 21,
    letterSpacing: 0.2,
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
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 13,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    fontSize: 20,
  },
  titleInput: {
    backgroundColor: '#FFF5F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    borderWidth: 1,
  },
  contentInput: {
    backgroundColor: '#FFF5F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    marginBottom: 20,
    borderWidth: 1,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  moodSelector: {
    marginBottom: 24,
  },
  moodLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  moodButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  moodButton: {
    flex: 1,
    height: 64,
    borderRadius: 14,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF5F0',
  },
  moodButtonActive: {
    borderColor: '#FF7A5C',
  },
  moodButtonEmoji: {
    fontSize: 32,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 'auto',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#FFF5F0',
    borderWidth: 1,
  },
  cancelButtonText: {
    fontWeight: '700',
    fontSize: 15,
  },
  saveButton: {
    borderWidth: 0,
  },
  saveButtonText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 15,
  },
});
