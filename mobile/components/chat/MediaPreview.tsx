import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, TextInput, Dimensions, KeyboardAvoidingView, Platform, Modal } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { X, Send, Clock, EyeOff, Mic, Play, Pause, Lock } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { BlurView } from 'expo-blur';

const { width, height } = Dimensions.get('window');

interface MediaPreviewProps {
    uri: string;
    type: 'image' | 'video' | 'document'; // Added document
    onSend: (data: { caption: string; viewOnce: boolean; expiresAt: Date | null; password?: string }) => void;
    onClose: () => void;
}

export default function MediaPreview({ uri, type, onSend, onClose }: MediaPreviewProps) {
    const { colors } = useTheme();
    const [caption, setCaption] = useState('');
    const [viewOnce, setViewOnce] = useState(false);
    const [expiration, setExpiration] = useState<'infinite' | '24h'>('infinite');
    const [isPlaying, setIsPlaying] = useState(false);
    const [password, setPassword] = useState('');
    const [showPasswordInput, setShowPasswordInput] = useState(false);
    const videoRef = useRef<Video>(null);

    const handleSend = () => {
        let expiresAt: Date | null = null;
        if (expiration === '24h') {
            expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        }
        onSend({ caption, viewOnce, expiresAt, password: password.trim() || undefined });
    };

    const togglePlayback = async () => {
        if (!videoRef.current) return;
        if (isPlaying) {
            await videoRef.current.pauseAsync();
        } else {
            await videoRef.current.playAsync();
        }
        setIsPlaying(!isPlaying);
    };

    return (
        <Modal animationType="slide" transparent={false} visible={true}>
            <View style={[styles.container, { backgroundColor: '#000' }]}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} style={styles.iconBtn}>
                        <X size={28} color="#fff" />
                    </TouchableOpacity>

                    <View style={styles.headerControls}>
                        {/* Ephemeral Toggles */}
                        <TouchableOpacity
                            onPress={() => setViewOnce(!viewOnce)}
                            style={[styles.toggleBtn, viewOnce && styles.activeToggle]}
                        >
                            <EyeOff size={20} color={viewOnce ? '#000' : '#fff'} />
                            <Text style={[styles.toggleText, viewOnce && { color: '#000' }]}>1x</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => setExpiration(expiration === '24h' ? 'infinite' : '24h')}
                            style={[styles.toggleBtn, expiration === '24h' && styles.activeToggle]}
                        >
                            <Clock size={20} color={expiration === '24h' ? '#000' : '#fff'} />
                            <Text style={[styles.toggleText, expiration === '24h' && { color: '#000' }]}>24h</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Content */}
                <View style={styles.content}>
                    {type === 'image' || type === 'video' ? (
                        type === 'image' ? (
                            <Image source={{ uri }} style={styles.media} resizeMode="contain" />
                        ) : (
                            <View style={styles.videoContainer}>
                                <Video
                                    ref={videoRef}
                                    style={styles.media}
                                    source={{ uri }}
                                    useNativeControls={false}
                                    resizeMode={ResizeMode.CONTAIN}
                                    isLooping
                                    onPlaybackStatusUpdate={status => setIsPlaying(status.isLoaded && status.isPlaying)}
                                />
                                <TouchableOpacity style={styles.playOverlay} onPress={togglePlayback}>
                                    {!isPlaying && <Play size={50} color="rgba(255,255,255,0.8)" fill="rgba(255,255,255,0.5)" />}
                                </TouchableOpacity>
                            </View>
                        )
                    ) : (
                        // Document Preview
                        <View style={styles.docContainer}>
                            <Text style={styles.docText}>Document Selected</Text>
                            <Text style={styles.docSubText}>{uri.split('/').pop()}</Text>
                        </View>
                    )}
                </View>

                {/* Footer / Caption */}
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.keyboardView}
                >
                    <BlurView intensity={80} tint="dark" style={styles.footer}>
                        <View style={styles.inputContainer}>
                            <TextInput
                                style={styles.input}
                                placeholder="Add a caption..."
                                placeholderTextColor="#999"
                                value={caption}
                                onChangeText={setCaption}
                                multiline
                            />
                            {/* Password Toggle */}
                            <TouchableOpacity
                                style={[styles.passwordBtn, password ? styles.passwordBtnActive : null]}
                                onPress={() => setShowPasswordInput(!showPasswordInput)}
                            >
                                <Lock size={20} color={password ? '#fff' : '#ccc'} />
                            </TouchableOpacity>
                        </View>

                        {showPasswordInput && (
                            <TextInput
                                style={styles.passwordInput}
                                placeholder="Set Password (Optional)"
                                placeholderTextColor="#999"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                            />
                        )}

                        <TouchableOpacity onPress={handleSend} style={styles.sendBtn}>
                            <Send size={24} color="#fff" />
                        </TouchableOpacity>
                    </BlurView>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    header: {
        position: 'absolute',
        top: 50,
        left: 0,
        right: 0,
        zIndex: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        alignItems: 'center',
    },
    headerControls: {
        flexDirection: 'row',
        gap: 12,
    },
    iconBtn: {
        padding: 8,
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: 20,
    },
    toggleBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(255,255,255,0.15)',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
    },
    activeToggle: {
        backgroundColor: '#fff',
    },
    toggleText: {
        fontWeight: 'bold',
        color: '#fff',
        fontSize: 12,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    media: {
        width: width,
        height: height * 0.8,
    },
    videoContainer: {
        width: width,
        height: height * 0.8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    playOverlay: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        justifyContent: 'center',
        alignItems: 'center',
    },
    keyboardView: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 20,
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        paddingBottom: 30, // Safe area
    },
    input: {
        flex: 1,
        paddingHorizontal: 16,
        paddingVertical: 10,
        color: '#fff',
        fontSize: 16,
    },
    sendBtn: {
        backgroundColor: '#3B82F6',
        borderRadius: 25,
        width: 50,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    docContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 20,
    },
    docText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 10,
    },
    docSubText: {
        color: '#ccc',
        fontSize: 14,
        marginTop: 5,
    },
    inputContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 20,
        paddingRight: 10,
        marginRight: 10,
    },
    passwordBtn: {
        padding: 8,
        borderRadius: 20,
    },
    passwordBtnActive: {
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
    },
    passwordInput: {
        width: '100%',
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
        color: '#fff',
        fontSize: 16,
        marginBottom: 10,
        marginTop: 10,
    },
});
