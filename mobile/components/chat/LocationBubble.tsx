import React from 'react';
import { View, Text, TouchableOpacity, Image, Linking, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';

interface LocationBubbleProps {
    locationUrl: string; // "lat,long"
    address?: string; // stored in content usually, but we can pass it
    isMe: boolean;
}

export default function LocationBubble({ locationUrl, address, isMe }: LocationBubbleProps) {
    const [latStr, longStr] = locationUrl.split(',');
    const latitude = parseFloat(latStr);
    const longitude = parseFloat(longStr);

    const isValid = !isNaN(latitude) && !isNaN(longitude);

    const openMaps = () => {
        const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
        const latLng = `${latitude},${longitude}`;
        const label = address || 'Location';
        const url = Platform.select({
            ios: `${scheme}${label}@${latLng}`,
            android: `${scheme}${latLng}(${label})`
        });

        if (url) Linking.openURL(url);
    };

    if (!isValid) {
        return (
            <View className="p-3 bg-red-500/20 rounded-xl">
                <Text className="text-red-500 text-xs">Invalid Location Data</Text>
            </View>
        );
    }

    return (
        <TouchableOpacity
            onPress={openMaps}
            className="rounded-xl overflow-hidden bg-zinc-800"
            style={{ width: 200, height: 150 }}
        >
            <MapView
                style={{ flex: 1 }}
                initialRegion={{
                    latitude,
                    longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                }}
                scrollEnabled={false}
                zoomEnabled={false}
                rotateEnabled={false}
                pitchEnabled={false}
            >
                <Marker coordinate={{ latitude, longitude }} />
            </MapView>

            <View className="absolute bottom-0 left-0 right-0 bg-black/60 p-2 flex-row alignItems-center gap-2">
                <Ionicons name="location" size={14} color="#ef4444" />
                <Text className="text-white text-xs flex-1" numberOfLines={1}>
                    {address && address !== '📍 Location' ? address : 'Shared Location'}
                </Text>
            </View>
        </TouchableOpacity>
    );
}
