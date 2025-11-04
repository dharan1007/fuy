import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, TextInput, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCanvas } from '../../hooks/useCanvas';

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

export default function CanvasScreen() {
  const {
    entries,
    loading,
    error,
    loadEntries,
    createEntry,
    deleteEntry,
  } = useCanvas();
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
        return COLORS.joy;
      case 'calm':
        return COLORS.calm;
      case 'reflect':
        return COLORS.reflect;
      default:
        return COLORS.primary;
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
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Canvas</Text>
          <Text style={styles.subtitle}>Your journal moments</Text>
        </View>
        <Pressable style={styles.addButton} onPress={() => setModalVisible(true)}>
          <Text style={styles.addButtonText}>+</Text>
        </Pressable>
      </View>

      {/* Entries List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading entries...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load entries</Text>
          <Pressable style={styles.retryButton} onPress={loadEntries}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable style={styles.entryCard}>
              <View style={styles.entryHeader}>
                <View style={styles.moodIndicator}>
                  <Text style={styles.moodEmoji}>{getMoodEmoji(item.mood)}</Text>
                </View>
                <View style={styles.entryMeta}>
                  <Text style={styles.entryTitle}>{item.title}</Text>
                  <Text style={styles.entryDate}>{item.createdAt || 'Unknown date'}</Text>
                </View>
                <Pressable
                  style={styles.deleteButton}
                  onPress={() => handleDeleteEntry(item.id)}
                >
                  <Text style={styles.deleteIcon}>✕</Text>
                </Pressable>
              </View>
              <Text style={styles.entryContent} numberOfLines={2}>
                {item.content}
              </Text>
            </Pressable>
          )}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📝</Text>
              <Text style={styles.emptyText}>No journal entries yet</Text>
              <Text style={styles.emptySubtext}>Create your first canvas moment</Text>
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
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Canvas Entry</Text>
              <Pressable onPress={() => setModalVisible(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </Pressable>
            </View>

            <TextInput
              style={styles.titleInput}
              placeholder="Entry title..."
              placeholderTextColor={COLORS.textMuted}
              value={newTitle}
              onChangeText={setNewTitle}
            />

            <TextInput
              style={styles.contentInput}
              placeholder="Write your thoughts..."
              placeholderTextColor={COLORS.textMuted}
              value={newContent}
              onChangeText={setNewContent}
              multiline
            />

            <View style={styles.moodSelector}>
              <Text style={styles.moodLabel}>How are you feeling?</Text>
              <View style={styles.moodButtons}>
                {(['joy', 'calm', 'reflect'] as const).map((mood) => (
                  <Pressable
                    key={mood}
                    style={[
                      styles.moodButton,
                      selectedMood === mood && styles.moodButtonActive,
                      { borderColor: getMoodColor(mood) },
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
                style={[styles.actionButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
                disabled={isSubmitting}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.actionButton, styles.saveButton]}
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
      </Modal>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 24,
    color: '#000',
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  entryCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
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
    backgroundColor: 'rgba(106, 168, 255, 0.15)',
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
    color: COLORS.text,
    letterSpacing: 0.3,
  },
  entryDate: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 3,
    fontWeight: '500',
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 100, 100, 0.1)',
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
    color: COLORS.text,
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
    color: COLORS.text,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.base,
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
    color: COLORS.text,
  },
  closeButton: {
    fontSize: 20,
    color: COLORS.textMuted,
  },
  titleInput: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  contentInput: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: COLORS.text,
    fontSize: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    minHeight: 120,
    textAlignVertical: 'top',
  },
  moodSelector: {
    marginBottom: 24,
  },
  moodLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
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
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  moodButtonActive: {
    backgroundColor: 'rgba(106, 168, 255, 0.25)',
    borderColor: COLORS.primary,
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
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  cancelButtonText: {
    color: COLORS.text,
    fontWeight: '700',
    fontSize: 15,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
  },
  saveButtonText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 15,
  },
});
