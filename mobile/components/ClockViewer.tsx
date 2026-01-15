import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Modal, Image, TouchableOpacity, Dimensions, SafeAreaView, StatusBar, ActivityIndicator } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { X, MoreHorizontal, User } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

interface ClockViewerProps {
    visible: boolean;
    clock: any;
    onClose: () => void;
}

export default function ClockViewer({ visible, clock, onClose }: ClockViewerProps) {
    const videoRef = useRef<Video>(null);
    const [progress, setProgress] = useState(0);
    const [loading, setLoading] = useState(true);
    const insets = useSafeAreaInsets();

    useEffect(() => {
        if (visible) {
            setProgress(0);
            setLoading(true);
        }
    }, [visible, clock]);

    const media = clock?.media?.[0]; // Safely access
    const mediaUrl = clock?.clockData?.mediaUrl || media?.url;
    const mediaType = clock?.clockData?.mediaType || media?.type; // 'VIDEO' or 'IMAGE'
    const duration = clock?.clockData?.duration || 10;
    const user = clock?.user;

    useEffect(() => {
        if (visible) {
            console.log('[ClockViewer] Prop clock:', JSON.stringify(clock, null, 2));
            console.log('[ClockViewer] Extracted mediaUrl:', mediaUrl);
            console.log('[ClockViewer] Extracted mediaType:', mediaType);
        }
    }, [visible, clock, mediaUrl, mediaType]);

    // Auto-advance for images
    useEffect(() => {
        if (!visible || !mediaUrl) return;

        if (mediaType !== 'VIDEO') {
            const timer = setInterval(() => {
                setProgress((p) => {
                    if (p >= 100) return 100;
                    return p + 2;
                });
            }, 100);
            return () => clearInterval(timer);
        }
    }, [visible, mediaUrl, mediaType]);

    // Close when progress full
    useEffect(() => {
        if (progress >= 100) {
            onClose();
        }
    }, [progress, onClose]);

    const handleVideoProgress = (status: any) => {
        if (status.isPlaying) {
            setLoading(false);
            setProgress((status.positionMillis / status.durationMillis) * 100);
        }
        if (status.didJustFinish) {
            setProgress(100); // Trigger useEffect
        }
    };

    if (!clock) return null;

    return (
        <Modal visible={visible} animationType="fade" transparent statusBarTranslucent>
            <View className="flex-1 bg-black">
                <StatusBar barStyle="light-content" />

                {/* Content - Rendered first for background */}
                <View className="absolute top-0 left-0 right-0 bottom-0 items-center justify-center bg-black">
                    {loading && (
                        <View className="absolute z-10">
                            <ActivityIndicator size="large" color="white" />
                        </View>
                    )}

                    {mediaType === 'VIDEO' ? (
                        <Video
                            ref={videoRef}
                            source={{ uri: mediaUrl }}
                            style={{ width, height, backgroundColor: 'black' }}
                            resizeMode={ResizeMode.COVER}
                            shouldPlay={visible}
                            isLooping={false}
                            onPlaybackStatusUpdate={handleVideoProgress}
                            onLoad={() => setLoading(false)}
                        />
                    ) : (
                        <Image
                            source={{ uri: mediaUrl }}
                            style={{ width, height, resizeMode: 'cover' }}
                            onLoadEnd={() => setLoading(false)}
                        />
                    )}
                </View>

                {/* Progress Bar */}
                <View style={{ paddingTop: insets.top + 10, paddingHorizontal: 10, flexDirection: 'row', gap: 4 }}>
                    <View className="flex-1 h-[2px] bg-white/30 rounded-full overflow-hidden">
                        <View style={{ width: `${progress}%`, height: '100%', backgroundColor: 'white' }} />
                    </View>
                </View>

                {/* Header */}
                <View className="flex-row items-center justify-between px-4 mt-4 z-10">
                    <View className="flex-row items-center gap-3">
                        {user?.profile?.avatarUrl ? (
                            <Image source={{ uri: user.profile.avatarUrl }} className="w-8 h-8 rounded-full border border-white/20" />
                        ) : (
                            <View className="w-8 h-8 rounded-full bg-gray-800 items-center justify-center border border-white/20">
                                <User size={16} color="white" />
                            </View>
                        )}
                        <Text className="text-white font-semibold text-sm">{user?.profile?.displayName || user?.name}</Text>
                        <Text className="text-white/60 text-xs">
                            Clock
                        </Text>
                    </View>

                    <View className="flex-row items-center gap-4">
                        <TouchableOpacity onPress={onClose}>
                            <X size={28} color="white" />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}
