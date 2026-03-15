/**
 * Feature 4: Swipe-to-Snooze
 *
 * Swipe a received message rightward to set a reminder (snooze).
 * 72px threshold -> haptic feedback -> snooze picker bottom sheet.
 * Stores decrypted text locally in AsyncStorage (never re-uploaded).
 * Local notification via expo-notifications on snooze time.
 */

import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Modal,
    Animated,
    Platform,
} from 'react-native';
import {
    Clock,
    Moon,
    Sun,
    Calendar,
    Bell,
    X,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';

const SNOOZE_STORAGE_KEY = 'app:snooze:items';

export interface SnoozedMessage {
    id: string;
    messageId: string;
    text: string;
    senderName: string;
    conversationId: string;
    snoozedAt: string;
    reminderAt: string;
    dismissed: boolean;
}

interface SwipeToSnoozeProps {
    messageId: string;
    messageText: string;
    senderName: string;
    conversationId: string;
    colors: any;
}

/**
 * Schedule a local notification for the snoozed message.
 */
async function scheduleSnoozeNotification(
    message: SnoozedMessage,
    triggerDate: Date
) {
    try {
        // Request permissions if not already granted
        const { status } = await Notifications.getPermissionsAsync();
        if (status !== 'granted') {
            const { status: newStatus } = await Notifications.requestPermissionsAsync();
            if (newStatus !== 'granted') return;
        }

        await Notifications.scheduleNotificationAsync({
            content: {
                title: `Reminder from ${message.senderName}`,
                body: message.text.substring(0, 100),
                data: {
                    type: 'snooze_reminder',
                    messageId: message.messageId,
                    conversationId: message.conversationId,
                    snoozeId: message.id,
                },
                sound: true,
            },
            trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: triggerDate,
            },
        });
    } catch (e) {
        console.error('[SwipeToSnooze] Failed to schedule notification:', e);
    }
}

/**
 * Save a snoozed message to AsyncStorage.
 */
async function saveSnoozedMessage(msg: SnoozedMessage) {
    try {
        const existing = await AsyncStorage.getItem(SNOOZE_STORAGE_KEY);
        const items: SnoozedMessage[] = existing ? JSON.parse(existing) : [];
        items.push(msg);
        await AsyncStorage.setItem(SNOOZE_STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
        console.error('[SwipeToSnooze] Failed to save:', e);
    }
}

/**
 * Get all snoozed messages from AsyncStorage.
 */
export async function getSnoozedMessages(): Promise<SnoozedMessage[]> {
    try {
        const existing = await AsyncStorage.getItem(SNOOZE_STORAGE_KEY);
        return existing ? JSON.parse(existing) : [];
    } catch {
        return [];
    }
}

/**
 * Dismiss a snooze reminder.
 */
export async function dismissSnooze(snoozeId: string) {
    try {
        const existing = await AsyncStorage.getItem(SNOOZE_STORAGE_KEY);
        const items: SnoozedMessage[] = existing ? JSON.parse(existing) : [];
        const updated = items.map((i) =>
            i.id === snoozeId ? { ...i, dismissed: true } : i
        );
        await AsyncStorage.setItem(SNOOZE_STORAGE_KEY, JSON.stringify(updated));
    } catch {
        // Ignore
    }
}

export const SnoozePickerModal: React.FC<{
    visible: boolean;
    onClose: () => void;
    onSelect: (date: Date) => void;
    colors: any;
}> = ({ visible, onClose, onSelect, colors }) => {
    const now = new Date();

    const options = [
        {
            id: '1h',
            label: '1 Hour',
            icon: Clock,
            getDate: () => new Date(now.getTime() + 60 * 60 * 1000),
        },
        {
            id: 'tonight',
            label: 'Tonight 8 PM',
            icon: Moon,
            getDate: () => {
                const d = new Date(now);
                d.setHours(20, 0, 0, 0);
                if (d.getTime() <= now.getTime()) d.setDate(d.getDate() + 1);
                return d;
            },
        },
        {
            id: 'tomorrow',
            label: 'Tomorrow 8 AM',
            icon: Sun,
            getDate: () => {
                const d = new Date(now);
                d.setDate(d.getDate() + 1);
                d.setHours(8, 0, 0, 0);
                return d;
            },
        },
        {
            id: '3days',
            label: '3 Days',
            icon: Calendar,
            getDate: () => new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
        },
    ];

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <TouchableOpacity
                style={{
                    flex: 1,
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    justifyContent: 'flex-end',
                }}
                activeOpacity={1}
                onPress={onClose}
            >
                <View
                    style={{
                        backgroundColor: '#1A1A1A',
                        borderTopLeftRadius: 20,
                        borderTopRightRadius: 20,
                        padding: 20,
                    }}
                >
                    {/* Header */}
                    <View
                        style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 16,
                        }}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Bell size={18} color="#F59E0B" />
                            <Text
                                style={{
                                    color: '#fff',
                                    fontSize: 16,
                                    fontWeight: '700',
                                }}
                            >
                                Snooze Message
                            </Text>
                        </View>
                        <TouchableOpacity onPress={onClose}>
                            <X size={20} color="rgba(255,255,255,0.5)" />
                        </TouchableOpacity>
                    </View>

                    {/* Options Grid */}
                    <View
                        style={{
                            flexDirection: 'row',
                            flexWrap: 'wrap',
                            gap: 12,
                        }}
                    >
                        {options.map((opt) => {
                            const Icon = opt.icon;
                            return (
                                <TouchableOpacity
                                    key={opt.id}
                                    onPress={() => onSelect(opt.getDate())}
                                    style={{
                                        width: '47%',
                                        padding: 16,
                                        borderRadius: 14,
                                        backgroundColor: 'rgba(255,255,255,0.06)',
                                        borderWidth: 1,
                                        borderColor: 'rgba(255,255,255,0.08)',
                                        alignItems: 'center',
                                        gap: 8,
                                    }}
                                >
                                    <Icon size={22} color="#F59E0B" />
                                    <Text
                                        style={{
                                            color: '#fff',
                                            fontSize: 13,
                                            fontWeight: '600',
                                        }}
                                    >
                                        {opt.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>
            </TouchableOpacity>
        </Modal>
    );
};

/**
 * Hook to handle snooze logic. Used by parent component.
 */
export const useSnooze = () => {
    const [showSnoozePicker, setShowSnoozePicker] = useState(false);
    const [snoozeTarget, setSnoozeTarget] = useState<{
        messageId: string;
        text: string;
        senderName: string;
        conversationId: string;
    } | null>(null);

    const initiateSnooze = useCallback(
        (messageId: string, text: string, senderName: string, conversationId: string) => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setSnoozeTarget({ messageId, text, senderName, conversationId });
            setShowSnoozePicker(true);
        },
        []
    );

    const handleSnoozeSelect = useCallback(
        async (date: Date) => {
            if (!snoozeTarget) return;

            const snoozedMsg: SnoozedMessage = {
                id: `snz_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                messageId: snoozeTarget.messageId,
                text: snoozeTarget.text,
                senderName: snoozeTarget.senderName,
                conversationId: snoozeTarget.conversationId,
                snoozedAt: new Date().toISOString(),
                reminderAt: date.toISOString(),
                dismissed: false,
            };

            await saveSnoozedMessage(snoozedMsg);
            await scheduleSnoozeNotification(snoozedMsg, date);

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setShowSnoozePicker(false);
            setSnoozeTarget(null);
        },
        [snoozeTarget]
    );

    const closeSnoozePicker = useCallback(() => {
        setShowSnoozePicker(false);
        setSnoozeTarget(null);
    }, []);

    return {
        showSnoozePicker,
        initiateSnooze,
        handleSnoozeSelect,
        closeSnoozePicker,
    };
};

export default SnoozePickerModal;
