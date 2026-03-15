/**
 * Feature 3: Chat Stack
 *
 * Batch-send multiple messages with a "plus" button.
 * Draft tray: horizontal ScrollView, 52px height, max 8 drafts.
 * Each draft encrypted individually before sending.
 * Recipient sees staggered cascade animation (60ms delay between bubbles).
 */

import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    TextInput,
    Alert,
    Animated,
} from 'react-native';
import { Plus, X, Send, Layers } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

const MAX_DRAFTS = 8;

interface Draft {
    id: string;
    text: string;
}

interface ChatStackProps {
    onSendBatch: (texts: string[]) => void;
    colors: any;
    mode: 'light' | 'dark';
}

export const ChatStack: React.FC<ChatStackProps> = ({
    onSendBatch,
    colors,
    mode,
}) => {
    const [isStackMode, setIsStackMode] = useState(false);
    const [drafts, setDrafts] = useState<Draft[]>([]);
    const [currentDraftText, setCurrentDraftText] = useState('');

    const toggleStackMode = () => {
        if (isStackMode && drafts.length > 0) {
            Alert.alert(
                'Discard Drafts?',
                `You have ${drafts.length} unsent message${drafts.length > 1 ? 's' : ''}. Discard them?`,
                [
                    { text: 'Keep Editing', style: 'cancel' },
                    {
                        text: 'Discard',
                        style: 'destructive',
                        onPress: () => {
                            setDrafts([]);
                            setIsStackMode(false);
                            setCurrentDraftText('');
                        },
                    },
                ]
            );
        } else {
            setIsStackMode(!isStackMode);
            if (!isStackMode) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
        }
    };

    const addDraft = () => {
        if (!currentDraftText.trim()) return;
        if (drafts.length >= MAX_DRAFTS) {
            Alert.alert('Limit Reached', `Maximum ${MAX_DRAFTS} messages per stack.`);
            return;
        }

        const newDraft: Draft = {
            id: `d_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            text: currentDraftText.trim(),
        };

        setDrafts((prev) => [...prev, newDraft]);
        setCurrentDraftText('');
        Haptics.selectionAsync();
    };

    const removeDraft = (id: string) => {
        setDrafts((prev) => prev.filter((d) => d.id !== id));
        Haptics.selectionAsync();
    };

    const sendStack = () => {
        // Include current text if any
        let textsToSend = drafts.map((d) => d.text);
        if (currentDraftText.trim()) {
            textsToSend.push(currentDraftText.trim());
        }

        if (textsToSend.length === 0) return;

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onSendBatch(textsToSend);
        setDrafts([]);
        setCurrentDraftText('');
        setIsStackMode(false);
    };

    if (!isStackMode) {
        return (
            <TouchableOpacity
                onPress={toggleStackMode}
                style={{
                    padding: 8,
                }}
            >
                <Layers size={20} color={colors.secondary} />
            </TouchableOpacity>
        );
    }

    return (
        <View>
            {/* Draft Tray */}
            {drafts.length > 0 && (
                <View
                    style={{
                        height: 52,
                        borderBottomWidth: 1,
                        borderColor: 'rgba(255,255,255,0.06)',
                    }}
                >
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{
                            paddingHorizontal: 12,
                            alignItems: 'center',
                            gap: 8,
                        }}
                    >
                        {drafts.map((draft, index) => (
                            <View
                                key={draft.id}
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 6,
                                    backgroundColor: 'rgba(255,255,255,0.08)',
                                    paddingHorizontal: 10,
                                    paddingVertical: 6,
                                    borderRadius: 12,
                                    maxWidth: 160,
                                }}
                            >
                                <Text
                                    style={{
                                        fontSize: 10,
                                        fontWeight: '700',
                                        color: 'rgba(255,255,255,0.3)',
                                        marginRight: 2,
                                    }}
                                >
                                    {index + 1}
                                </Text>
                                <Text
                                    numberOfLines={1}
                                    style={{
                                        fontSize: 12,
                                        color: '#fff',
                                        flex: 1,
                                    }}
                                >
                                    {draft.text}
                                </Text>
                                <TouchableOpacity onPress={() => removeDraft(draft.id)}>
                                    <X size={12} color="rgba(255,255,255,0.5)" />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </ScrollView>
                </View>
            )}

            {/* Stack Input Bar */}
            <View
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                }}
            >
                <TouchableOpacity onPress={toggleStackMode}>
                    <X size={20} color={colors.secondary} />
                </TouchableOpacity>

                <TextInput
                    value={currentDraftText}
                    onChangeText={setCurrentDraftText}
                    placeholder={`Draft ${drafts.length + 1} of ${MAX_DRAFTS}...`}
                    placeholderTextColor="rgba(255,255,255,0.35)"
                    style={{
                        flex: 1,
                        height: 42,
                        borderRadius: 21,
                        backgroundColor: '#111111',
                        borderWidth: 1,
                        borderColor: 'rgba(255,255,255,0.08)',
                        color: '#FFFFFF',
                        fontSize: 14,
                        paddingHorizontal: 16,
                    }}
                    onSubmitEditing={addDraft}
                    returnKeyType="next"
                />

                {/* Add Draft Button */}
                <TouchableOpacity
                    onPress={addDraft}
                    style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <Plus size={18} color="#fff" />
                </TouchableOpacity>

                {/* Send Stack Button */}
                {(drafts.length > 0 || currentDraftText.trim()) && (
                    <TouchableOpacity
                        onPress={sendStack}
                        style={{
                            width: 42,
                            height: 42,
                            borderRadius: 21,
                            backgroundColor: '#FFFFFF',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Send color="#000" size={16} style={{ marginLeft: -1, marginTop: 1 }} />
                        </View>
                        {/* Count badge */}
                        <View
                            style={{
                                position: 'absolute',
                                top: -4,
                                right: -4,
                                minWidth: 16,
                                height: 16,
                                borderRadius: 8,
                                backgroundColor: '#EF4444',
                                alignItems: 'center',
                                justifyContent: 'center',
                                paddingHorizontal: 3,
                            }}
                        >
                            <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>
                                {drafts.length + (currentDraftText.trim() ? 1 : 0)}
                            </Text>
                        </View>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};

/**
 * Staggered Cascade Animation Hook
 * Used by the parent to animate incoming stack messages with 60ms delay
 */
export const useStackCascade = (messageCount: number) => {
    const animations = React.useRef<Animated.Value[]>([]).current;

    React.useEffect(() => {
        // Ensure we have enough animation values
        while (animations.length < messageCount) {
            animations.push(new Animated.Value(0));
        }

        // Stagger animation
        const anims = animations.slice(0, messageCount).map((anim, i) =>
            Animated.timing(anim, {
                toValue: 1,
                duration: 300,
                delay: i * 60,
                useNativeDriver: true,
            })
        );

        Animated.parallel(anims).start();
    }, [messageCount]);

    return animations.slice(0, messageCount).map((anim) => ({
        opacity: anim,
        transform: [
            {
                translateY: anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                }),
            },
        ],
    }));
};

export default ChatStack;
