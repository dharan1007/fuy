import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Modal, Image, TouchableOpacity, TouchableWithoutFeedback, Dimensions, StatusBar, ActivityIndicator } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { X, User, Play, Pause } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');
const CONTENT_PADDING = 12;
const BORDER_RADIUS = 24;

interface ClockViewerProps {
    visible: boolean;
    clock: any;
    onClose: () => void;
}

export default function ClockViewer({ visible, clock, onClose }: ClockViewerProps) {
    const [progress, setProgress] = useState(0);
    const [loading, setLoading] = useState(true);
    const [isPaused, setIsPaused] = useState(false);
    const insets = useSafeAreaInsets();

    const media = clock?.media?.[0];
    const mediaUrl = clock?.clockData?.mediaUrl || media?.url;
    const mediaType = clock?.clockData?.mediaType || media?.type;
    const user = clock?.user;

    const player = useVideoPlayer(mediaType === 'VIDEO' ? mediaUrl : null, player => {
        player.loop = false;
        player.muted = false;
    });

    useEffect(() => {
        if (visible && mediaType === 'VIDEO' && player) {
            if (!isPaused) {
                player.play();
                setLoading(false);
            } else {
                player.pause();
            }
        }
    }, [visible, isPaused, mediaUrl, mediaType, player]);

    useEffect(() => {
        if (visible) {
            setProgress(0);
            setLoading(true);
            setIsPaused(false);
        }
    }, [visible, clock]);



    // Auto-advance for images (only when not paused)
    useEffect(() => {
        if (!visible || !mediaUrl || isPaused) return;

        if (mediaType !== 'VIDEO') {
            const timer = setInterval(() => {
                setProgress((p) => {
                    if (p >= 100) return 100;
                    return p + 2;
                });
            }, 100);
            return () => clearInterval(timer);
        } else {
            // Video progress tracker
            const timer = setInterval(() => {
                if (player) {
                    const duration = player.duration || 1;
                    const position = player.currentTime || 0;
                    if (duration > 0) {
                        setLoading(false);
                        const newProgress = (position / duration) * 100;
                        setProgress(newProgress);
                        // expo-video might not emit didJustFinish natively, we can check if it reached end
                        if (position >= duration - 0.1 && duration > 0.5) {
                            setProgress(100);
                        }
                    }
                }
            }, 100);
            return () => clearInterval(timer);
        }
    }, [visible, mediaUrl, mediaType, isPaused, player]);

    // Close when progress full
    useEffect(() => {
        if (progress >= 100) {
            onClose();
        }
    }, [progress, onClose]);

    const togglePause = () => {
        setIsPaused(!isPaused);
    };

    if (!clock) return null;

    return (
        <Modal visible={visible} animationType="fade" transparent statusBarTranslucent>
            <View style={{ flex: 1, backgroundColor: '#000' }}>
                <StatusBar barStyle="light-content" />

                {/* Content Container with Padding */}
                <View style={{
                    flex: 1,
                    paddingTop: insets.top + CONTENT_PADDING,
                    paddingBottom: insets.bottom + CONTENT_PADDING,
                    paddingHorizontal: CONTENT_PADDING
                }}>
                    {/* Progress Bar - Outside the rounded content */}
                    <View style={{ flexDirection: 'row', gap: 4, marginBottom: 12 }}>
                        <View style={{ flex: 1, height: 3, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 2, overflow: 'hidden' }}>
                            <View style={{ width: `${progress}%`, height: '100%', backgroundColor: 'white' }} />
                        </View>
                    </View>

                    {/* Header */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, zIndex: 10 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            {user?.profile?.avatarUrl ? (
                                <Image source={{ uri: user.profile.avatarUrl }} style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }} />
                            ) : (
                                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}>
                                    <User size={18} color="white" />
                                </View>
                            )}
                            <View>
                                <Text style={{ color: 'white', fontWeight: '600', fontSize: 14 }}>{user?.profile?.displayName || user?.name}</Text>
                                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>Clock</Text>
                            </View>
                        </View>

                        <TouchableOpacity onPress={onClose} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' }}>
                            <X size={22} color="white" />
                        </TouchableOpacity>
                    </View>

                    {/* Main Content with Curved Edges */}
                    <TouchableWithoutFeedback onPress={togglePause}>
                        <View style={{
                            flex: 1,
                            borderRadius: BORDER_RADIUS,
                            overflow: 'hidden',
                            backgroundColor: '#111'
                        }}>
                            {loading && (
                                <View style={{ position: 'absolute', zIndex: 10, alignItems: 'center', justifyContent: 'center', top: 0, left: 0, right: 0, bottom: 0 }}>
                                    <ActivityIndicator size="large" color="white" />
                                </View>
                            )}

                            {mediaType === 'VIDEO' && player ? (
                                <VideoView
                                    player={player}
                                    style={{ width: '100%', height: '100%' }}
                                    contentFit="cover"
                                    nativeControls={false}
                                />
                            ) : (
                                <Image
                                    source={{ uri: mediaUrl }}
                                    style={{ width: '100%', height: '100%' }}
                                    resizeMode="cover"
                                    onLoadEnd={() => setLoading(false)}
                                />
                            )}

                            {/* Pause Indicator */}
                            {isPaused && (
                                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.3)' }}>
                                    <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' }}>
                                        <Play size={40} color="white" fill="white" />
                                    </View>
                                </View>
                            )}
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </View>
        </Modal>
    );
}

