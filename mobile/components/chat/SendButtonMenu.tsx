/**
 * Feature 2: Long-Press Send Button (SendButtonMenu)
 *
 * LongPressGestureHandler (400ms) on the send button reveals:
 *   Section A: Normal / Silent mode pills
 *   Section B: Tone chips (Default, Bold, Shout, Whisper, Uninterested)
 *
 * The selected sendMode + tone are included inside the encrypted JSON payload.
 * Recipient decrypts and applies text styling based on the tone field.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, Animated, Easing, Dimensions } from 'react-native';
import { Send, CheckCheck, VolumeX, Volume2 } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

export type SendMode = 'normal' | 'silent';
export type ToneType = 'default' | 'bold' | 'shout' | 'whisper' | 'uninterested';

interface SendButtonMenuProps {
    onSend: (mode: SendMode, tone: ToneType) => void;
    isEditing: boolean;
    onEditSave: () => void;
    roomId: string;
    disabled?: boolean;
}

const TONE_CONFIG: { id: ToneType; label: string; emoji: string; color: string }[] = [
    { id: 'default', label: 'Default', emoji: '', color: '#FFFFFF' },
    { id: 'bold', label: 'Bold', emoji: 'B', color: '#F59E0B' },
    { id: 'shout', label: 'Shout', emoji: '!', color: '#EF4444' },
    { id: 'whisper', label: 'Whisper', emoji: '~', color: '#6B7280' },
    { id: 'uninterested', label: 'Meh', emoji: '-', color: '#4B5563' },
];

/**
 * Returns React Native style overrides for a given tone, applied to message text on
 * the recipient side.
 */
export const getToneStyle = (tone?: ToneType): any => {
    switch (tone) {
        case 'bold':
            return { fontWeight: '900', fontSize: 15, letterSpacing: 0.3 };
        case 'shout':
            return {
                fontWeight: '900',
                fontSize: 17,
                textTransform: 'uppercase' as const,
                letterSpacing: 1.2,
            };
        case 'whisper':
            return {
                fontWeight: '300',
                fontSize: 12,
                fontStyle: 'italic' as const,
                opacity: 0.7,
            };
        case 'uninterested':
            return {
                fontWeight: '400',
                fontSize: 13,
                opacity: 0.5,
                letterSpacing: -0.3,
            };
        default:
            return {};
    }
};

export const SendButtonMenu: React.FC<SendButtonMenuProps> = ({
    onSend,
    isEditing,
    onEditSave,
    roomId,
    disabled,
}) => {
    const [showMenu, setShowMenu] = useState(false);
    const [sendMode, setSendMode] = useState<SendMode>('normal');
    const [tone, setTone] = useState<ToneType>('default');
    const slideAnim = useRef(new Animated.Value(0)).current;
    const longPressTimer = useRef<NodeJS.Timeout | null>(null);
    const scaleAnim = useRef(new Animated.Value(1)).current;

    // Load saved preferences
    useEffect(() => {
        AsyncStorage.getItem(`app:send_prefs:${roomId}`).then((data) => {
            if (data) {
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.sendMode) setSendMode(parsed.sendMode);
                    if (parsed.tone) setTone(parsed.tone);
                } catch { }
            }
        });
    }, [roomId]);

    // Save preferences when changed
    const savePrefs = useCallback(
        async (mode: SendMode, t: ToneType) => {
            await AsyncStorage.setItem(
                `app:send_prefs:${roomId}`,
                JSON.stringify({ sendMode: mode, tone: t })
            );
        },
        [roomId]
    );

    const openMenu = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setShowMenu(true);
        Animated.spring(slideAnim, {
            toValue: 1,
            damping: 15,
            stiffness: 200,
            useNativeDriver: true,
        }).start();
    };

    const closeMenu = () => {
        Animated.timing(slideAnim, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
        }).start(() => setShowMenu(false));
    };

    const handlePressIn = () => {
        if (isEditing) return;

        // Scale animation for press feedback
        Animated.timing(scaleAnim, {
            toValue: 0.85,
            duration: 100,
            useNativeDriver: true,
        }).start();

        longPressTimer.current = setTimeout(() => {
            openMenu();
        }, 400);
    };

    const handlePressOut = () => {
        Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
        }).start();

        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
    };

    const handleTap = () => {
        if (isEditing) {
            onEditSave();
        } else if (!showMenu) {
            onSend(sendMode, tone);
        }
    };

    const handleSelectMode = (mode: SendMode) => {
        setSendMode(mode);
        savePrefs(mode, tone);
        Haptics.selectionAsync();
    };

    const handleSelectTone = (t: ToneType) => {
        setTone(t);
        savePrefs(sendMode, t);
        Haptics.selectionAsync();
    };

    const handleSendFromMenu = () => {
        closeMenu();
        setTimeout(() => {
            onSend(sendMode, tone);
        }, 200);
    };

    const menuTranslateY = slideAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [120, 0],
    });

    const menuOpacity = slideAnim.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [0, 0.5, 1],
    });

    return (
        <View style={{ position: 'relative' }}>
            {/* Menu Overlay */}
            {showMenu && (
                <TouchableOpacity
                    activeOpacity={1}
                    onPress={closeMenu}
                    style={{
                        position: 'absolute',
                        bottom: 54,
                        right: 0,
                        zIndex: 100,
                    }}
                >
                    <Animated.View
                        style={{
                            opacity: menuOpacity,
                            transform: [{ translateY: menuTranslateY }],
                            backgroundColor: '#1A1A1A',
                            borderRadius: 16,
                            padding: 16,
                            width: 220,
                            borderWidth: 1,
                            borderColor: 'rgba(255,255,255,0.08)',
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 8 },
                            shadowOpacity: 0.4,
                            shadowRadius: 16,
                            elevation: 12,
                        }}
                    >
                        {/* Section A: Send Mode */}
                        <Text
                            style={{
                                fontSize: 10,
                                fontWeight: '700',
                                letterSpacing: 0.8,
                                color: 'rgba(255,255,255,0.4)',
                                marginBottom: 8,
                                textTransform: 'uppercase',
                            }}
                        >
                            Send Mode
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                            <TouchableOpacity
                                onPress={() => handleSelectMode('normal')}
                                style={{
                                    flex: 1,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 4,
                                    paddingVertical: 8,
                                    borderRadius: 10,
                                    backgroundColor:
                                        sendMode === 'normal'
                                            ? 'rgba(255,255,255,0.15)'
                                            : 'rgba(255,255,255,0.05)',
                                    borderWidth: sendMode === 'normal' ? 1 : 0,
                                    borderColor: 'rgba(255,255,255,0.2)',
                                }}
                            >
                                <Volume2 size={14} color="#fff" />
                                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>
                                    Normal
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => handleSelectMode('silent')}
                                style={{
                                    flex: 1,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 4,
                                    paddingVertical: 8,
                                    borderRadius: 10,
                                    backgroundColor:
                                        sendMode === 'silent'
                                            ? 'rgba(255,255,255,0.15)'
                                            : 'rgba(255,255,255,0.05)',
                                    borderWidth: sendMode === 'silent' ? 1 : 0,
                                    borderColor: 'rgba(255,255,255,0.2)',
                                }}
                            >
                                <VolumeX size={14} color="#fff" />
                                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>
                                    Silent
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Section B: Tone */}
                        <Text
                            style={{
                                fontSize: 10,
                                fontWeight: '700',
                                letterSpacing: 0.8,
                                color: 'rgba(255,255,255,0.4)',
                                marginBottom: 8,
                                textTransform: 'uppercase',
                            }}
                        >
                            Tone
                        </Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                            {TONE_CONFIG.map((t) => (
                                <TouchableOpacity
                                    key={t.id}
                                    onPress={() => handleSelectTone(t.id)}
                                    style={{
                                        paddingHorizontal: 10,
                                        paddingVertical: 6,
                                        borderRadius: 8,
                                        backgroundColor:
                                            tone === t.id
                                                ? 'rgba(255,255,255,0.15)'
                                                : 'rgba(255,255,255,0.03)',
                                        borderWidth: tone === t.id ? 1 : 0,
                                        borderColor: t.color + '40',
                                    }}
                                >
                                    <Text
                                        style={{
                                            fontSize: 11,
                                            fontWeight: tone === t.id ? '700' : '500',
                                            color: tone === t.id ? t.color : 'rgba(255,255,255,0.5)',
                                        }}
                                    >
                                        {t.emoji ? `${t.emoji} ` : ''}{t.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Send from Menu */}
                        <TouchableOpacity
                            onPress={handleSendFromMenu}
                            style={{
                                marginTop: 14,
                                paddingVertical: 10,
                                borderRadius: 12,
                                backgroundColor: '#FFFFFF',
                                alignItems: 'center',
                            }}
                        >
                            <Text style={{ color: '#000', fontWeight: '700', fontSize: 13 }}>
                                Send {sendMode === 'silent' ? '(Silent)' : ''}{' '}
                                {tone !== 'default' ? `as ${tone}` : ''}
                            </Text>
                        </TouchableOpacity>
                    </Animated.View>
                </TouchableOpacity>
            )}

            {/* Send Button */}
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                <TouchableOpacity
                    onPress={handleTap}
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
                    disabled={disabled}
                    style={{
                        width: 42,
                        height: 42,
                        borderRadius: 21,
                        backgroundColor: '#FFFFFF',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: disabled ? 0.5 : 1,
                    }}
                >
                    {isEditing ? (
                        <CheckCheck color="#000000" size={20} />
                    ) : (
                        <Send color="#000000" size={18} style={{ marginLeft: -2, marginTop: 2 }} />
                    )}
                    {/* Silent indicator dot */}
                    {sendMode === 'silent' && !isEditing && (
                        <View
                            style={{
                                position: 'absolute',
                                top: -2,
                                right: -2,
                                width: 10,
                                height: 10,
                                borderRadius: 5,
                                backgroundColor: '#6B7280',
                                borderWidth: 1.5,
                                borderColor: '#000',
                            }}
                        />
                    )}
                    {/* Tone indicator dot */}
                    {tone !== 'default' && !isEditing && (
                        <View
                            style={{
                                position: 'absolute',
                                bottom: -2,
                                right: -2,
                                width: 8,
                                height: 8,
                                borderRadius: 4,
                                backgroundColor:
                                    TONE_CONFIG.find((t) => t.id === tone)?.color || '#fff',
                                borderWidth: 1.5,
                                borderColor: '#000',
                            }}
                        />
                    )}
                </TouchableOpacity>
            </Animated.View>
        </View>
    );
};

export default SendButtonMenu;
