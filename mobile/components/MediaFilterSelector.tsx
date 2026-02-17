import React, { useState, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Dimensions } from 'react-native';
import { Check } from 'lucide-react-native';

const { width } = Dimensions.get('window');

interface MediaItem {
    uri: string;
    type: 'image' | 'video';
    thumbnailUri?: string;
}

export interface Filter {
    id: string;
    name: string;
    overlay: string; // Color overlay for visual effect
    opacity: number;
    tint?: string;
}

export const FILTERS: Filter[] = [
    { id: 'original', name: 'Original', overlay: 'transparent', opacity: 0 },
    { id: 'vivid', name: 'Vivid', overlay: 'rgba(255, 100, 50, 0.15)', opacity: 0.15 },
    { id: 'warm', name: 'Warm', overlay: 'rgba(255, 160, 60, 0.2)', opacity: 0.2 },
    { id: 'cool', name: 'Cool', overlay: 'rgba(50, 100, 200, 0.2)', opacity: 0.2 },
    { id: 'noir', name: 'Noir', overlay: 'rgba(0, 0, 0, 0.4)', opacity: 0.4, tint: '#333' },
    { id: 'fade', name: 'Fade', overlay: 'rgba(200, 200, 200, 0.3)', opacity: 0.3 },
    { id: 'contrast', name: 'Contrast', overlay: 'rgba(0, 0, 0, 0.15)', opacity: 0.15 },
    { id: 'bright', name: 'Bright', overlay: 'rgba(255, 255, 200, 0.15)', opacity: 0.15 },
    { id: 'muted', name: 'Muted', overlay: 'rgba(100, 100, 100, 0.25)', opacity: 0.25 },
    { id: 'vintage', name: 'Vintage', overlay: 'rgba(200, 150, 80, 0.25)', opacity: 0.25 },
];

interface MediaFilterSelectorProps {
    media: MediaItem;
    selectedFilter: string;
    onFilterChange: (filterId: string) => void;
}

export default function MediaFilterSelector({ media, selectedFilter, onFilterChange }: MediaFilterSelectorProps) {
    console.log('[MediaFilterSelector] Render. Media Type:', media.type, 'HasThumbnail:', !!media.thumbnailUri);
    const scrollRef = useRef<ScrollView>(null);

    const getFilter = (filterId: string): Filter => {
        return FILTERS.find(f => f.id === filterId) || FILTERS[0];
    };

    const currentFilter = getFilter(selectedFilter);

    return (
        <View style={{ marginBottom: 20 }}>
            <Text style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 12, fontWeight: '600', fontSize: 11, letterSpacing: 1 }}>
                FILTER {selectedFilter !== 'original' && `(${currentFilter.name.toUpperCase()})`}
            </Text>

            {/* Preview with Filter Overlay */}
            <View style={{
                width: '100%',
                aspectRatio: 16 / 9,
                borderRadius: 12,
                overflow: 'hidden',
                marginBottom: 16,
                backgroundColor: '#000',
            }}>
                {media.type === 'video' ? (
                    media.thumbnailUri ? (
                        <Image
                            source={{ uri: media.thumbnailUri }}
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
                        source={{ uri: media.uri }}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="cover"
                    />
                )}
                {/* Color Overlay for Filter Effect */}
                {selectedFilter !== 'original' && (
                    <View
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: currentFilter.overlay,
                        }}
                        pointerEvents="none"
                    />
                )}
            </View>

            {/* Filter Carousel */}
            <ScrollView
                ref={scrollRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 4 }}
            >
                {FILTERS.map((filter) => (
                    <TouchableOpacity
                        key={filter.id}
                        onPress={() => onFilterChange(filter.id)}
                        style={{
                            marginRight: 12,
                            alignItems: 'center',
                        }}
                    >
                        <View style={{
                            width: 64,
                            height: 64,
                            borderRadius: 8,
                            overflow: 'hidden',
                            borderWidth: 2,
                            borderColor: selectedFilter === filter.id ? '#fff' : 'transparent',
                            marginBottom: 6,
                        }}>

                            {media.type === 'video' && !media.thumbnailUri ? (
                                <View style={{ width: '100%', height: '100%', backgroundColor: '#333', alignItems: 'center', justifyContent: 'center' }}>
                                    {/* Placeholder while thumbnail loads */}
                                    <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' }} />
                                </View>
                            ) : (
                                <Image
                                    source={{ uri: media.type === 'video' ? media.thumbnailUri : media.uri }}
                                    style={{ width: '100%', height: '100%' }}
                                    resizeMode="cover"
                                />
                            )}
                            {/* Filter overlay for thumbnail */}
                            {filter.id !== 'original' && (
                                <View
                                    style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        bottom: 0,
                                        backgroundColor: filter.overlay,
                                    }}
                                    pointerEvents="none"
                                />
                            )}
                            {selectedFilter === filter.id && (
                                <View style={{
                                    position: 'absolute',
                                    top: 0, left: 0, right: 0, bottom: 0,
                                    backgroundColor: 'rgba(0,0,0,0.3)',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}>
                                    <Check size={20} color="#fff" />
                                </View>
                            )}
                        </View>
                        <Text style={{
                            color: selectedFilter === filter.id ? '#fff' : 'rgba(255,255,255,0.5)',
                            fontSize: 10,
                            fontWeight: selectedFilter === filter.id ? '600' : '400',
                        }}>
                            {filter.name}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );
}


