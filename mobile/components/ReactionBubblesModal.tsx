import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, ActivityIndicator, Image } from 'react-native';
import { supabase } from '../lib/supabase';
import { X, User as UserIcon } from 'lucide-react-native';

interface ReactionBubblesModalProps {
    visible: boolean;
    postId: string;
    onClose: () => void;
}

export default function ReactionBubblesModal({ visible, postId, onClose }: ReactionBubblesModalProps) {
    const [bubbles, setBubbles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (visible) {
            fetchBubbles();
        }
    }, [visible, postId]);

    const fetchBubbles = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('ReactionBubble')
                .select(`
                    id,
                    mediaUrl,
                    mediaType,
                    createdAt,
                    user:User (
                        id,
                        name,
                        profile:Profile (
                            displayName,
                            avatarUrl
                        )
                    )
                `)
                .eq('postId', postId)
                .order('createdAt', { ascending: false });

            if (error) throw error;
            setBubbles(data || []);
        } catch (error) {
            console.error("Error fetching reaction bubbles:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="formSheet"
            onRequestClose={onClose}
        >
            <View className="flex-1 bg-zinc-950">
                <View className="flex-row items-center justify-between p-4 border-b border-white/10">
                    <Text className="text-white font-bold text-lg">Reactions</Text>
                    <TouchableOpacity onPress={onClose} className="p-2">
                        <X color="white" size={24} />
                    </TouchableOpacity>
                </View>

                {loading ? (
                    <View className="flex-1 justify-center items-center">
                        <ActivityIndicator size="small" color="white" />
                    </View>
                ) : bubbles.length === 0 ? (
                    <View className="flex-1 justify-center items-center">
                        <Text className="text-white/50">No reactions yet</Text>
                    </View>
                ) : (
                    <FlatList
                        data={bubbles}
                        keyExtractor={item => item.id}
                        contentContainerStyle={{ padding: 16, gap: 16 }}
                        renderItem={({ item }) => {
                            const userObj = Array.isArray(item.user) ? item.user[0] : item.user;
                            const name = userObj?.profile?.displayName || userObj?.name || 'Anonymous';
                            const avatar = userObj?.profile?.avatarUrl;

                            return (
                                <View className="flex-row items-center justify-between bg-zinc-900 rounded-2xl p-3">
                                    <View className="flex-row items-center gap-3">
                                        {item.mediaUrl ? (
                                            <View className="w-12 h-12 rounded-full overflow-hidden bg-black border border-white/10">
                                                <Image source={{ uri: item.mediaUrl }} style={{ width: '100%', height: '100%' }} />
                                            </View>
                                        ) : (
                                            <View className="w-12 h-12 rounded-full bg-zinc-800 items-center justify-center">
                                                <UserIcon color="white" size={20} />
                                            </View>
                                        )}
                                        <View>
                                            <Text className="text-white font-semibold text-base">{name}</Text>
                                        </View>
                                    </View>
                                </View>
                            );
                        }}
                    />
                )}
            </View>
        </Modal>
    );
}
