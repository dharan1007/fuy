/**
 * AI Message Bubble - Web Version
 * Displays user and AI messages in glass morphic bubbles
 */

import React from 'react';
import { AIMessage } from '../../services/aiAssistantService';
import styles from './AIMessageBubble.module.css';

interface AIMessageBubbleWebProps {
  message: AIMessage;
}

export const AIMessageBubbleWeb: React.FC<AIMessageBubbleWebProps> = ({ message }) => {
  const isUser = message.type === 'user';

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`${styles.bubble} ${isUser ? styles.userBubble : styles.aiBubble}`}>
      <div className={styles.content}>
        {message.content}
      </div>
      <div className={styles.timestamp}>
        {formatTime(message.timestamp)}
      </div>
    </div>
  );
};

export default AIMessageBubbleWeb;
