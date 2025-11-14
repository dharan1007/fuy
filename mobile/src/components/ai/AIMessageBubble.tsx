/**
 * AI Message Bubble Component
 * Displays user and AI messages in glass morphic bubbles
 */

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { GlassSurface } from '../glass';
import { BodyM, Caption } from '../typography';
import { GLASS_TOKENS } from '../../theme/glassTheme';
import { AIMessage } from '../../services/aiAssistantService';

interface AIMessageBubbleProps {
  message: AIMessage;
  style?: ViewStyle;
}

export const AIMessageBubble: React.FC<AIMessageBubbleProps> = ({ message, style }) => {
  const isUser = message.type === 'user';

  const bubbleStyle: ViewStyle = {
    maxWidth: '85%',
    alignSelf: isUser ? 'flex-end' : 'flex-start',
    marginVertical: GLASS_TOKENS.spacing[1],
  };

  const containerStyle: ViewStyle = isUser
    ? {
        paddingHorizontal: GLASS_TOKENS.spacing[3],
        paddingVertical: GLASS_TOKENS.spacing[2],
        borderTopLeftRadius: GLASS_TOKENS.glass.radius.large,
        borderTopRightRadius: 4,
        borderBottomLeftRadius: GLASS_TOKENS.glass.radius.large,
        borderBottomRightRadius: GLASS_TOKENS.glass.radius.large,
        backgroundColor: GLASS_TOKENS.colors.primary,
      }
    : {
        paddingHorizontal: GLASS_TOKENS.spacing[3],
        paddingVertical: GLASS_TOKENS.spacing[2],
        borderTopLeftRadius: 4,
        borderTopRightRadius: GLASS_TOKENS.glass.radius.large,
        borderBottomLeftRadius: GLASS_TOKENS.glass.radius.large,
        borderBottomRightRadius: GLASS_TOKENS.glass.radius.large,
      };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <View style={[bubbleStyle, style]}>
      {isUser ? (
        // User Message - Solid Colored
        <View style={containerStyle}>
          <BodyM style={{ color: '#FFFFFF' }}>{message.content}</BodyM>
        </View>
      ) : (
        // AI Message - Glass Surface
        <GlassSurface
          variant="card"
          style={containerStyle}
          padding={0}
          radius={GLASS_TOKENS.glass.radius.large}
          withBorder={true}
          borderColor={GLASS_TOKENS.glass.border.light}
        >
          <BodyM contrast="high">{message.content}</BodyM>
        </GlassSurface>
      )}

      {/* Timestamp */}
      <Caption contrast="low" style={[
        styles.timestamp,
        { textAlign: isUser ? 'right' : 'left' },
      ]}>
        {formatTime(message.timestamp)}
      </Caption>
    </View>
  );
};

const styles = StyleSheet.create({
  timestamp: {
    marginTop: GLASS_TOKENS.spacing[1],
    marginHorizontal: GLASS_TOKENS.spacing[2],
    fontSize: 10,
  },
});
