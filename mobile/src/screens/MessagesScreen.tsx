import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  ScrollView,
  Modal,
  Pressable,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMessages } from '../hooks/useMessages';
import { GlassBackground, GlassSurface, GlassChip, GlassButton, GlassDivider, StoryRing } from '../components/glass';
import { TitleM, BodyM, BodyS, Caption } from '../components/typography';
import { GLASS_TOKENS } from '../theme/glassTheme';
import { AIChatInterface } from '../components/ai';
import { aiActionHandlers } from '../services/aiActionHandlers';
import { apiService } from '../services/apiService';

export default function MessagesScreen() {
  const { conversations, loading, error, loadConversations, openConversation } = useMessages();
  const [activeTab, setActiveTab] = useState<'inbox' | 'unread' | 'requests'>('inbox');
  const [showAIChat, setShowAIChat] = useState(false);
  const [userId] = useState('user_123'); // Get from auth in real app

  // Search functionality
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Handle search
  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);

    if (query.trim().length === 0) {
      setShowSearchResults(false);
      setSearchResults([]);
      return;
    }

    setShowSearchResults(true);
    setSearchLoading(true);
    try {
      const data = await apiService.searchUsers(query);
      setSearchResults(data.users || []);
    } catch (err) {
      console.error('Search failed:', err);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchResults(false);
  }, []);

  // Format time for display
  const formatTime = (timestamp: string | Date | number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Get initials from name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  // Filter conversations based on tab
  const getFilteredConversations = () => {
    switch (activeTab) {
      case 'unread':
        return conversations.filter((c) => c.unreadCount > 0);
      case 'requests':
        return conversations.slice(0, 2); // Placeholder
      default:
        return conversations;
    }
  };

  const filteredConversations = getFilteredConversations();
  const inboxCount = conversations.length;
  const unreadCount = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  const tabData = [
    { id: 'inbox', label: 'Inbox', count: inboxCount + 1 }, // +1 for AI
    { id: 'unread', label: 'Unread', count: unreadCount },
    { id: 'requests', label: 'Requests', count: 0 },
  ];

  // Add AI Assistant as first conversation
  const aiConversation = {
    id: 'ai-assistant',
    participantName: 'AI Assistant',
    lastMessage: "Hi! I'm here to help with routines, todos, and more...",
    lastMessageTime: Date.now(),
    unreadCount: 0,
  };

  const allConversations = activeTab === 'inbox'
    ? [aiConversation, ...filteredConversations]
    : filteredConversations;

  return (
    <GlassBackground>
      <SafeAreaView style={{ flex: 1 }} edges={['left', 'right', 'bottom']}>
        {/* Stories/Active Friends Row */}
        <View style={styles.storiesContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.storiesContent}
          >
            {conversations.slice(0, 6).map((conv, index) => (
              <StoryRing
                key={conv.id}
                size={48}
                ringWidth={2}
                hasStory={index % 2 === 0}
                initial={getInitials(conv.participantName)}
                placeholderColor={GLASS_TOKENS.colors.primary}
                gradientColors={[GLASS_TOKENS.colors.primary, GLASS_TOKENS.colors.secondary]}
              />
            ))}
          </ScrollView>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputWrapper}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search friends or users..."
              placeholderTextColor={GLASS_TOKENS.colors.textSecondary}
              value={searchQuery}
              onChangeText={handleSearch}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={clearSearch} style={styles.clearButton}>
                <Text style={styles.clearButtonText}>✕</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Show search results or normal tabs */}
        {showSearchResults ? (
          <>
            {/* Tabs - Glass Chips */}
            <View style={styles.tabsContainer}>
              {tabData.map((tab) => (
                <GlassChip
                  key={tab.id}
                  label={`${tab.label}${tab.count > 0 ? ` (${tab.count})` : ''}`}
                  selected={activeTab === tab.id}
                  onPress={() => setActiveTab(tab.id as any)}
                />
              ))}
            </View>

            {/* Search Results */}
            {searchLoading ? (
              <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={GLASS_TOKENS.colors.primary} />
              </View>
            ) : searchResults.length > 0 ? (
              <FlatList
                data={searchResults}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <GlassSurface
                    variant="card"
                    style={styles.conversationItem}
                    onPress={() => {
                      // Start a new conversation with this user
                      console.log('Starting conversation with:', item.name);
                      clearSearch();
                    }}
                    interactive
                    padding={{ horizontal: GLASS_TOKENS.spacing[3], vertical: GLASS_TOKENS.spacing[2] }}
                  >
                    <View style={styles.conversationRow}>
                      {/* Avatar */}
                      <StoryRing
                        size={48}
                        ringWidth={0}
                        initial={getInitials(item.name)}
                        placeholderColor={GLASS_TOKENS.colors.primary}
                      />

                      {/* User Info */}
                      <View style={styles.messageContent}>
                        <View style={styles.messageHeader}>
                          <TitleM numberOfLines={1}>
                            {item.name}
                          </TitleM>
                          <View style={[
                            styles.statusBadge,
                            { backgroundColor: item.status === 'online' ? '#4CAF50' : '#9E9E9E' }
                          ]}>
                            <Caption style={{ color: '#FFF', fontSize: 10 }}>
                              {item.status === 'online' ? '●' : '○'}
                            </Caption>
                          </View>
                        </View>
                        <BodyS contrast="low" numberOfLines={1}>
                          {item.isFriend ? '👥 Friend' : '👤 User'}
                        </BodyS>
                      </View>
                    </View>
                  </GlassSurface>
                )}
                contentContainerStyle={styles.listContent}
                ItemSeparatorComponent={() => (
                  <GlassDivider
                    variant="subtle"
                    style={styles.divider}
                  />
                )}
              />
            ) : (
              <View style={styles.emptyState}>
                <TitleM style={{ marginBottom: GLASS_TOKENS.spacing[3] }}>No users found</TitleM>
                <BodyS contrast="low">Try searching with a different name</BodyS>
              </View>
            )}
          </>
        ) : (
          <>
            {/* Tabs - Glass Chips */}
            <View style={styles.tabsContainer}>
              {tabData.map((tab) => (
                <GlassChip
                  key={tab.id}
                  label={`${tab.label}${tab.count > 0 ? ` (${tab.count})` : ''}`}
                  selected={activeTab === tab.id}
                  onPress={() => setActiveTab(tab.id as any)}
                />
              ))}
            </View>

            {/* Conversation List */}
            {loading ? (
              <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={GLASS_TOKENS.colors.primary} />
              </View>
            ) : error ? (
              <View style={styles.centerContainer}>
                <BodyM style={{ marginBottom: GLASS_TOKENS.spacing[3] }}>Failed to load conversations</BodyM>
                <GlassButton
                  variant="primary"
                  label="Retry"
                  onPress={loadConversations}
                />
              </View>
            ) : (
              <FlatList
                data={allConversations}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <GlassSurface
                    variant="card"
                    style={styles.conversationItem}
                    onPress={() => {
                      if (item.id === 'ai-assistant') {
                        setShowAIChat(true);
                      } else {
                        openConversation(item.id);
                      }
                    }}
                    interactive
                    padding={{ horizontal: GLASS_TOKENS.spacing[3], vertical: GLASS_TOKENS.spacing[2] }}
                  >
                    {/* Avatar + Content */}
                    <View style={styles.conversationRow}>
                      {/* Avatar - Special icon for AI */}
                      {item.id === 'ai-assistant' ? (
                        <View
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: 24,
                            backgroundColor: GLASS_TOKENS.colors.primary,
                            justifyContent: 'center',
                            alignItems: 'center',
                          }}
                        >
                          <Text style={{ fontSize: 24 }}>🤖</Text>
                        </View>
                      ) : (
                        <StoryRing
                          size={48}
                          ringWidth={0}
                          initial={getInitials(item.participantName)}
                          placeholderColor={GLASS_TOKENS.colors.primary}
                        />
                      )}

                      {/* Message Content */}
                      <View style={styles.messageContent}>
                        <View style={styles.messageHeader}>
                          <TitleM numberOfLines={1}>
                            {item.participantName}
                            {item.id === 'ai-assistant' && (
                              <Text style={{ fontSize: 12, marginLeft: 4 }}>✨</Text>
                            )}
                          </TitleM>
                          <Caption contrast="low">{formatTime(item.lastMessageTime)}</Caption>
                        </View>
                        <BodyS contrast="low" numberOfLines={1}>
                          {item.lastMessage}
                        </BodyS>
                      </View>

                      {/* Unread Indicator */}
                      {item.unreadCount > 0 && (
                        <View style={styles.unreadDot} />
                      )}
                    </View>
                  </GlassSurface>
                )}
                contentContainerStyle={styles.listContent}
                ItemSeparatorComponent={() => (
                  <GlassDivider
                    variant="subtle"
                    style={styles.divider}
                  />
                )}
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <TitleM style={{ marginBottom: GLASS_TOKENS.spacing[3] }}>No conversations</TitleM>
                    <BodyS contrast="low">Start a conversation with someone</BodyS>
                  </View>
                }
              />
            )}
          </>
        )}

        {/* Floating Compose FAB */}
        <View style={styles.fabContainer}>
          <GlassButton
            variant="primary"
            label="Compose"
            size="large"
            onPress={() => console.log('New message')}
            leftIcon={<Text style={{ fontSize: 18 }}>✉️</Text>}
          />
        </View>
      </SafeAreaView>

      {/* AI Chat Modal */}
      <Modal
        visible={showAIChat}
        animationType="slide"
        onRequestClose={() => setShowAIChat(false)}
      >
        <AIChatInterface
          userId={userId}
          onActionDetected={async (action, data) => {
            console.log('AI Action detected:', action, data);
            try {
              const result = await aiActionHandlers.handleAction(
                {
                  type: action as
                    | 'create_routine'
                    | 'create_todo'
                    | 'search_products'
                    | 'search_users'
                    | 'search_posts'
                    | 'feature_guide',
                  payload: data,
                },
                userId
              );
              if (!result.success) {
                Alert.alert('Action Failed', result.error || 'Could not complete the action');
              }
            } catch (error) {
              console.error('Error handling AI action:', error);
              Alert.alert('Error', 'Failed to handle action');
            }
          }}
        />
        {/* Close Button */}
        <Pressable
          style={styles.closeButton}
          onPress={() => setShowAIChat(false)}
        >
          <Text style={styles.closeButtonText}>✕</Text>
        </Pressable>
      </Modal>
    </GlassBackground>
  );
}

const styles = StyleSheet.create({
  // Stories/Active Friends
  storiesContainer: {
    paddingVertical: GLASS_TOKENS.spacing[3],
    paddingHorizontal: GLASS_TOKENS.spacing[4],
  },
  storiesContent: {
    gap: GLASS_TOKENS.spacing[3],
  },

  // Search Bar
  searchContainer: {
    paddingHorizontal: GLASS_TOKENS.spacing[4],
    paddingVertical: GLASS_TOKENS.spacing[2],
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: GLASS_TOKENS.glass.radius.large,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: GLASS_TOKENS.spacing[3],
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 16,
    color: GLASS_TOKENS.colors.text.primary,
  },
  clearButton: {
    padding: GLASS_TOKENS.spacing[2],
  },
  clearButtonText: {
    fontSize: 18,
    color: GLASS_TOKENS.colors.primary,
    fontWeight: 'bold',
  },

  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: GLASS_TOKENS.spacing[4],
    paddingVertical: GLASS_TOKENS.spacing[2],
    gap: GLASS_TOKENS.spacing[2],
  },

  // Conversation List
  listContent: {
    paddingHorizontal: GLASS_TOKENS.spacing[4],
    paddingVertical: GLASS_TOKENS.spacing[3],
    gap: GLASS_TOKENS.spacing[2],
  },

  conversationItem: {
    borderRadius: GLASS_TOKENS.glass.radius.large,
  },

  conversationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: GLASS_TOKENS.spacing[3],
  },

  messageContent: {
    flex: 1,
    gap: GLASS_TOKENS.spacing[1],
  },

  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: GLASS_TOKENS.spacing[2],
  },

  statusBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },

  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: GLASS_TOKENS.colors.primary,
  },

  divider: {
    marginVertical: GLASS_TOKENS.spacing[2],
  },

  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: GLASS_TOKENS.spacing[12],
  },

  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: GLASS_TOKENS.spacing[4],
  },

  fabContainer: {
    position: 'absolute',
    bottom: GLASS_TOKENS.spacing[4],
    right: GLASS_TOKENS.spacing[4],
    paddingBottom: GLASS_TOKENS.spacing[4],
  },

  closeButton: {
    position: 'absolute',
    top: GLASS_TOKENS.spacing[4],
    right: GLASS_TOKENS.spacing[4],
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: GLASS_TOKENS.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },

  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
});
