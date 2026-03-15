/**
 * /loc sub-component: LocCard
 *
 * Location card with a 160px static map view + 40px address bar.
 * Uses expo-location for coordinates.
 * Payload: type cleartext, lat/lng/address encrypted within message content.
 */

import React from 'react';
import { View, Text, TouchableOpacity, Linking, Platform } from 'react-native';
import { MapPin, Navigation } from 'lucide-react-native';

export interface LocationData {
    latitude: number;
    longitude: number;
    address?: string;
    accuracy?: number;
}

interface LocCardProps {
    location: LocationData;
    isMe: boolean;
    senderName?: string;
}

export const LocCard: React.FC<LocCardProps> = ({
    location,
    isMe,
    senderName,
}) => {
    const handleOpenMaps = () => {
        const { latitude, longitude } = location;
        const label = location.address || 'Shared Location';

        const url = Platform.select({
            ios: `maps:0,0?q=${label}@${latitude},${longitude}`,
            android: `geo:${latitude},${longitude}?q=${latitude},${longitude}(${label})`,
        });

        if (url) Linking.openURL(url);
    };

    return (
        <TouchableOpacity
            onPress={handleOpenMaps}
            activeOpacity={0.8}
            style={{
                borderRadius: 14,
                overflow: 'hidden',
                width: 220,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.08)',
            }}
        >
            {/* Map Preview Area */}
            <View
                style={{
                    height: 120,
                    backgroundColor: '#1a2332',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                }}
            >
                {/* Grid pattern background */}
                <View style={{ position: 'absolute', inset: 0, opacity: 0.15 }}>
                    {Array.from({ length: 6 }).map((_, i) => (
                        <View
                            key={`h${i}`}
                            style={{
                                position: 'absolute',
                                top: i * 24,
                                left: 0,
                                right: 0,
                                height: 1,
                                backgroundColor: '#3B82F6',
                            }}
                        />
                    ))}
                    {Array.from({ length: 10 }).map((_, i) => (
                        <View
                            key={`v${i}`}
                            style={{
                                position: 'absolute',
                                left: i * 24,
                                top: 0,
                                bottom: 0,
                                width: 1,
                                backgroundColor: '#3B82F6',
                            }}
                        />
                    ))}
                </View>

                {/* Pin icon */}
                <View
                    style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: '#EF4444',
                        alignItems: 'center',
                        justifyContent: 'center',
                        shadowColor: '#EF4444',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.4,
                        shadowRadius: 8,
                        elevation: 6,
                    }}
                >
                    <MapPin size={20} color="#fff" />
                </View>

                {/* Coordinates */}
                <Text
                    style={{
                        position: 'absolute',
                        bottom: 6,
                        right: 8,
                        fontSize: 9,
                        color: 'rgba(255,255,255,0.3)',
                        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
                    }}
                >
                    {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                </Text>
            </View>

            {/* Address Bar */}
            <View
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    backgroundColor: 'rgba(255,255,255,0.06)',
                    gap: 8,
                }}
            >
                <Navigation size={14} color="#10B981" />
                <Text
                    numberOfLines={1}
                    style={{
                        flex: 1,
                        fontSize: 12,
                        color: '#fff',
                        fontWeight: '500',
                    }}
                >
                    {location.address || 'Shared Location'}
                </Text>
                <Text
                    style={{
                        fontSize: 10,
                        color: 'rgba(255,255,255,0.3)',
                    }}
                >
                    Open
                </Text>
            </View>
        </TouchableOpacity>
    );
};

export default LocCard;
