/**
 * AI Chat Interface Component
 * Full chat interface for AI assistant in messages
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { AIMessageBubble } from './AIMessageBubble';
import { GlassBackground, GlassSurface } from '../glass';
import { BodyM, Caption } from '../typography';
import { GLASS_TOKENS } from '../../theme/glassTheme';
import { useAIAssistant } from '../../hooks/useAIAssistant';

interface AIChatInterfaceProps {
  userId: string;
  onActionDetected?: (action: string, data: any) => void;
  compact?: boolean;
}

export const AIChatInterface: React.FC<AIChatInterfaceProps> = ({
  userId,
  onActionDetected,
  compact = false,
}) => {
  const { messages, loading, error, isTyping, sendMessage, clearConversation } = useAIAssistant({
    userId,
    autoLoadHistory: true,
  });

  const [inputValue, setInputValue] = useState('');
  const flatListRef = useRef<FlatList>(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages]);

  // Detect action in AI response
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.type === 'assistant' && lastMessage.metadata?.action) {
        onActionDetected?.(lastMessage.metadata.action, lastMessage.metadata.actionData);
      }
    }
  }, [messages, onActionDetected]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || loading) return;

    const message = inputValue;
    setInputValue('');
    await sendMessage(message);
  };

  const handleQuickAction = (action: string) => {
    const prompts: Record<string, string> = {
      routine: 'Create a personalized morning routine for me',
      todo: 'Help me create a todo list for today',
      search_product: 'Find me some great products in the shop',
      search_user: 'Search for people with similar interests',
      feature_guide: 'Show me how to use all the features',
      clear: 'Clear conversation',
    };

    if (action === 'clear') {
      clearConversation();
    } else {
      sendMessage(prompts[action] || action);
    }
  };

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <AIMessageBubble message={item} />}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          scrollEnabled={messages.length > 3}
        />

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Ask AI anything..."
            placeholderTextColor={GLASS_TOKENS.textContrast.low}
            value={inputValue}
            onChangeText={setInputValue}
            editable={!loading}
            multiline
            maxLength={500}
          />
          <Pressable
            onPress={handleSendMessage}
            disabled={loading || !inputValue.trim()}
            style={styles.sendButton}
          >
            <BodyM style={{ color: '#FFFFFF' }}>
              {loading ? '⏳' : '➤'}
            </BodyM>
          </Pressable>
        </View>
      </View>
    );
  }

  // Full interface
  return (
    <GlassBackground>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        {/* Header */}
        <View style={styles.header}>
          <BodyM style={{ color: GLASS_TOKENS.textContrast.high }}>🤖 AI Assistant</BodyM>
          <Caption contrast="low">Always here to help</Caption>
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <AIMessageBubble message={item} />}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <BodyM style={{ fontSize: 28, marginBottom: GLASS_TOKENS.spacing[3] }}>
                👋
              </BodyM>
              <BodyM style={{ marginBottom: GLASS_TOKENS.spacing[2] }}>
                Hi! I'm your AI assistant
              </BodyM>
              <Caption contrast="low" style={{ textAlign: 'center' }}>
                I can help you create routines, todos, search products, find people, and guide you through features
              </Caption>
            </View>
          }
          ListFooterComponent={
            isTyping ? (
              <View style={styles.typingIndicator}>
                <ActivityIndicator color={GLASS_TOKENS.colors.primary} />
                <Caption contrast="low" style={{ marginLeft: GLASS_TOKENS.spacing[2] }}>
                  AI is typing...
                </Caption>
              </View>
            ) : null
          }
        />

        {/* Error Display */}
        {error && (
          <GlassSurface
            variant="card"
            style={styles.errorContainer}
            padding={{ horizontal: GLASS_TOKENS.spacing[3], vertical: GLASS_TOKENS.spacing[2] }}
          >
            <BodyM style={{ color: GLASS_TOKENS.colors.danger }}>
              ❌ {error}
            </BodyM>
          </GlassSurface>
        )}

        {/* Input Area */}
        <GlassSurface
          variant="card"
          style={styles.inputWrapper}
          padding={0}
          radius={GLASS_TOKENS.glass.radius.large}
        >
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Ask me anything..."
              placeholderTextColor={GLASS_TOKENS.textContrast.low}
              value={inputValue}
              onChangeText={setInputValue}
              editable={!loading}
              multiline
              maxLength={500}
            />
            <Pressable
              onPress={handleSendMessage}
              disabled={loading || !inputValue.trim()}
              style={styles.sendButton}
            >
              <BodyM style={{ color: '#FFFFFF' }}>
                {loading ? '⏳' : '✈️'}
              </BodyM>
            </Pressable>
          </View>

          {/* Quick Actions */}
          <View style={styles.quickActions}>
            <Pressable
              style={styles.quickActionButton}
              onPress={() => handleQuickAction('routine')}
            >
              <Caption contrast="high">📅 Routine</Caption>
            </Pressable>
            <Pressable
              style={styles.quickActionButton}
              onPress={() => handleQuickAction('todo')}
            >
              <Caption contrast="high">✅ Todo</Caption>
            </Pressable>
            <Pressable
              style={styles.quickActionButton}
              onPress={() => handleQuickAction('search_product')}
            >
              <Caption contrast="high">🛍️ Shop</Caption>
            </Pressable>
            <Pressable
              style={styles.quickActionButton}
              onPress={() => handleQuickAction('feature_guide')}
            >
              <Caption contrast="high">🎓 Guide</Caption>
            </Pressable>
            <Pressable
              style={styles.quickActionButton}
              onPress={() => handleQuickAction('clear')}
            >
              <Caption contrast="high">🗑️ Clear</Caption>
            </Pressable>
          </View>
        </GlassSurface>
      </KeyboardAvoidingView>
    </GlassBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  header: {
    paddingHorizontal: GLASS_TOKENS.spacing[4],
    paddingVertical: GLASS_TOKENS.spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
  },

  messageList: {
    paddingHorizontal: GLASS_TOKENS.spacing[4],
    paddingVertical: GLASS_TOKENS.spacing[3],
    gap: GLASS_TOKENS.spacing[2],
    flexGrow: 1,
    justifyContent: 'flex-end',
  },

  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: GLASS_TOKENS.spacing[8],
  },

  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: GLASS_TOKENS.spacing[2],
    paddingHorizontal: GLASS_TOKENS.spacing[3],
  },

  errorContainer: {
    marginHorizontal: GLASS_TOKENS.spacing[4],
    marginVertical: GLASS_TOKENS.spacing[2],
  },

  inputWrapper: {
    marginHorizontal: GLASS_TOKENS.spacing[4],
    marginVertical: GLASS_TOKENS.spacing[3],
    overflow: 'hidden',
  },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: GLASS_TOKENS.spacing[3],
    paddingVertical: GLASS_TOKENS.spacing[2],
    gap: GLASS_TOKENS.spacing[2],
  },

  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    paddingVertical: GLASS_TOKENS.spacing[2],
    paddingHorizontal: GLASS_TOKENS.spacing[2],
    borderRadius: GLASS_TOKENS.glass.radius.medium,
    backgroundColor: '#000000',
    color: GLASS_TOKENS.textContrast.high,
    fontSize: 14,
  },

  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: GLASS_TOKENS.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  quickActions: {
    flexDirection: 'row',
    gap: GLASS_TOKENS.spacing[2],
    paddingHorizontal: GLASS_TOKENS.spacing[3],
    paddingVertical: GLASS_TOKENS.spacing[2],
    borderTopWidth: 1,
    borderTopColor: '#000000',
    flexWrap: 'wrap',
  },

  quickActionButton: {
    paddingHorizontal: GLASS_TOKENS.spacing[2],
    paddingVertical: GLASS_TOKENS.spacing[1],
    borderRadius: GLASS_TOKENS.glass.radius.full,
    backgroundColor: '#000000',
  },

  compactContainer: {
    flex: 1,
    flexDirection: 'column',
  },
});
