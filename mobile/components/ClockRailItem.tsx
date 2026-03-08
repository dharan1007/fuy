import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { User } from 'lucide-react-native';
import SeptagonAvatar from './SeptagonAvatar';

interface ClockRailItemProps {
    item: any;
    showSeconds: boolean;
    onPress: () => void;
    mode: 'dark' | 'light';
    colors: any;
}

export default function ClockRailItem({ item, showSeconds, onPress, mode, colors }: ClockRailItemProps) {
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        const updateTime = () => {
            if (!item.expiresAt) return '';

            const diff = new Date(item.expiresAt).getTime() - Date.now();
            if (diff <= 0) {
                setTimeLeft('Exp');
                return;
            }

            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            if (showSeconds) {
                // Detailed format: 12h 30m 15s or 30m 15s
                if (hours > 0) {
                    setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
                } else {
                    setTimeLeft(`${minutes}m ${seconds}s`);
                }
            } else {
                // Simple format: 12h or 30m
                if (hours > 0) {
                    setTimeLeft(`${hours}h`);
                } else {
                    setTimeLeft(`${minutes}m`);
                }
            }
        };

        updateTime(); // Initial call

        // Interval depends on whether we need seconds
        const intervalMs = showSeconds ? 1000 : 60000;
        const interval = setInterval(updateTime, intervalMs);

        return () => clearInterval(interval);
    }, [item.expiresAt, showSeconds]);

    return (
        <TouchableOpacity className="items-center gap-1" onPress={onPress}>
            <View className="relative">
                {/* Septagon Ring and Avatar */}
                <SeptagonAvatar
                    source={item.user.profile?.avatarUrl ? { uri: item.user.profile.avatarUrl } : undefined}
                    size={60}
                    borderWidth={2}
                    borderColor={mode === 'dark' ? 'white' : 'black'}
                    color={mode === 'dark' ? '#222' : '#f0f0f0'}
                >
                    {!item.user.profile?.avatarUrl && <User size={24} color={mode === 'dark' ? 'white' : 'black'} />}
                </SeptagonAvatar>
                {/* Monochrome Badge with Live Time */}
                <View className="absolute -bottom-1 -right-1 bg-white border border-black rounded-full px-1.5 py-0.5" style={{ minWidth: showSeconds ? 50 : undefined, alignItems: 'center' }}>
                    <Text style={{ color: 'black', fontSize: showSeconds ? 8 : 9, fontWeight: 'bold' }}>
                        {timeLeft}
                    </Text>
                </View>
            </View>
            <Text style={{ color: colors.text, fontSize: 11, marginTop: 4, width: 64, textAlign: 'center' }} numberOfLines={1}>
                {item.user.profile?.displayName || item.user.name}
            </Text>
        </TouchableOpacity>
    );
}
