import React from 'react';
import { View, Text, Image, Dimensions } from 'react-native';
import { Heart, MessageCircle, Share2 } from 'lucide-react-native';
import { FILTERS } from './MediaFilterSelector';

const { width } = Dimensions.get('window');

interface MediaItem {
    uri: string;
    type: 'image' | 'video';
    filter?: string;
    thumbnailUri?: string;
}

interface PostPreviewProps {
    userName: string;
    userAvatar?: string;
    content: string;
    media: MediaItem[];
    visibility: string;
    taggedUsers?: { id: string; name: string }[];
    selectedFilter?: string;
}

export default function PostPreview({ userName, userAvatar, content, media, visibility, taggedUsers = [], selectedFilter }: PostPreviewProps) {
    return (
        <View style={{
            backgroundColor: '#111',
            borderRadius: 16,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.1)',
            marginBottom: 16,
        }}>
            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12 }}>
                <View style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    overflow: 'hidden',
                    marginRight: 10,
                }}>
                    {userAvatar ? (
                        <Image source={{ uri: userAvatar }} style={{ width: '100%', height: '100%' }} />
                    ) : (
                        <View style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>{userName?.charAt(0)?.toUpperCase()}</Text>
                        </View>
                    )}
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>{userName || 'You'}</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>{visibility}</Text>
                </View>
            </View>

            {/* Media */}
            {media.length > 0 && (
                <View style={{ width: '100%', aspectRatio: 1, backgroundColor: '#000' }}>
                    {media[0].type === 'video' ? (
                        media[0].thumbnailUri ? (
                            <Image
                                source={{ uri: media[0].thumbnailUri }}
                                style={{ width: '100%', height: '100%' }}
                                resizeMode="cover"
                            />
                        ) : (
                            <View style={{ width: '100%', height: '100%', backgroundColor: '#222', alignItems: 'center', justifyContent: 'center' }}>
                                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>Video Preview</Text>
                            </View>
                        )
                    ) : (
                        <Image
                            source={{ uri: media[0].uri }}
                            style={{ width: '100%', height: '100%' }}
                            resizeMode="cover"
                        />
                    )}
                    {media.length > 1 && (
                        <View style={{
                            position: 'absolute',
                            top: 10,
                            right: 10,
                            backgroundColor: 'rgba(0,0,0,0.7)',
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 12,
                        }}>
                            <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600' }}>+{media.length - 1}</Text>
                        </View>
                    )}

                    {/* Filter Overlay */}
                    {selectedFilter && selectedFilter !== 'original' && (
                        <View style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: FILTERS.find(f => f.id === selectedFilter)?.overlay || 'transparent',
                            opacity: 1 // Overlay has own opacity
                        }} pointerEvents="none" />
                    )}

                    {selectedFilter && selectedFilter !== 'original' && (
                        <View style={{
                            position: 'absolute',
                            bottom: 10,
                            left: 10,
                            backgroundColor: 'rgba(255,255,255,0.9)',
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 8,
                        }}>
                            <Text style={{ color: '#000', fontSize: 10, fontWeight: '600', textTransform: 'uppercase' }}>{selectedFilter}</Text>
                        </View>
                    )}
                </View>
            )}

            {/* Content */}
            {content && (
                <View style={{ padding: 12 }}>
                    <Text style={{ color: '#fff', fontSize: 14, lineHeight: 20 }} numberOfLines={3}>
                        {content}
                    </Text>
                </View>
            )}

            {/* Tagged Users */}
            {taggedUsers.length > 0 && (
                <View style={{ paddingHorizontal: 12, paddingBottom: 8 }}>
                    <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
                        with {taggedUsers.map(u => u.name).join(', ')}
                    </Text>
                </View>
            )}

            {/* Actions */}
            <View style={{ flexDirection: 'row', padding: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 20 }}>
                    <Heart size={18} color="rgba(255,255,255,0.5)" />
                    <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginLeft: 6 }}>0</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 20 }}>
                    <MessageCircle size={18} color="rgba(255,255,255,0.5)" />
                    <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginLeft: 6 }}>0</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Share2 size={18} color="rgba(255,255,255,0.5)" />
                </View>
            </View>

            {/* Preview Label */}
            <View style={{
                position: 'absolute',
                top: 8,
                left: 8,
                backgroundColor: 'rgba(255,255,255,0.9)',
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 4,
            }}>
                <Text style={{ color: '#000', fontSize: 9, fontWeight: '700', letterSpacing: 1 }}>PREVIEW</Text>
            </View>
        </View>
    );
}
