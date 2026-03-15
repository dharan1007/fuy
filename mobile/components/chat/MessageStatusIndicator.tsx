/**
 * OPT-1 UI: MessageStatusIndicator
 *
 * Visual status indicator below each message bubble showing
 * the current state: sending | sent | delivered | confirmed
 */

import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Check, CheckCheck, Clock, AlertCircle } from 'lucide-react-native';
import { MessageQueue, MessageStatus } from '../../lib/MessageQueue';

interface MessageStatusIndicatorProps {
    messageId: string;
    initialStatus?: MessageStatus;
    isMe: boolean;
    readAt?: string;
}

export const MessageStatusIndicator: React.FC<MessageStatusIndicatorProps> = ({
    messageId,
    initialStatus,
    isMe,
    readAt,
}) => {
    const [status, setStatus] = useState<MessageStatus>(
        readAt ? 'confirmed' : (initialStatus || 'confirmed')
    );

    useEffect(() => {
        if (!isMe || readAt) return;

        const unsub = MessageQueue.onStatusChange(messageId, (_, newStatus) => {
            setStatus(newStatus);
        });

        return unsub;
    }, [messageId, isMe, readAt]);

    if (!isMe) return null;

    // If message has readAt, it's been seen
    if (readAt) {
        return (
            <CheckCheck size={12} color="rgba(255,255,255,0.45)" />
        );
    }

    switch (status) {
        case 'sending':
            return <Clock size={12} color="rgba(255,255,255,0.3)" />;
        case 'sent':
            return <Check size={12} color="rgba(255,255,255,0.35)" />;
        case 'delivered':
            return <CheckCheck size={12} color="rgba(255,255,255,0.35)" />;
        case 'confirmed':
            return <CheckCheck size={12} color="rgba(255,255,255,0.45)" />;
        default:
            return <Check size={12} color="rgba(255,255,255,0.3)" />;
    }
};

export default MessageStatusIndicator;
