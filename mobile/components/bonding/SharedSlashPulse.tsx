import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import type { SlashPulseItem } from '../../services/BondingService';

interface SharedSlashPulseProps {
    items: SlashPulseItem[];
}

const SharedSlashPulse: React.FC<SharedSlashPulseProps> = React.memo(({ items }) => {
    const router = useRouter();

    if (items.length === 0) return null;

    const renderChip = ({ item }: { item: SlashPulseItem }) => {
        const isBoth = item.category === 'both';
        const subLabel =
            item.category === 'both' ? 'both active this week' :
            item.category === 'only_me' ? 'only you' : 'only them';

        return (
            <TouchableOpacity
                style={[s.chip, isBoth && s.chipBoth]}
                onPress={() => {
                    router.push({
                        pathname: '/dots/bloom',
                        params: { openSlashId: item.slashId ?? item.tag },
                    });
                }}
                activeOpacity={0.7}
            >
                <Text style={[s.chipName, isBoth && s.chipNameBoth]}>{item.tag}</Text>
                <Text style={s.chipSub}>{subLabel}</Text>
            </TouchableOpacity>
        );
    };

    return (
        <View style={s.container}>
            <Text style={s.title}>shared slash pulse</Text>
            <Text style={s.subtitle}>slashes you both explore</Text>
            <FlatList
                data={items}
                renderItem={renderChip}
                keyExtractor={item => item.tag}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.list}
            />
        </View>
    );
});

const s = StyleSheet.create({
    container: {
        marginBottom: 6,
        marginHorizontal: 10,
    },
    title: {
        fontSize: 8,
        color: '#2e2e2e',
        textTransform: 'uppercase',
        fontWeight: '700',
        letterSpacing: 0.5,
        marginBottom: 2,
    },
    subtitle: {
        fontSize: 7,
        color: '#2e2e2e',
        marginBottom: 8,
    },
    list: {
        gap: 5,
    },
    chip: {
        backgroundColor: '#0e0e0e',
        borderRadius: 6,
        borderWidth: 0.5,
        borderColor: '#141414',
        paddingHorizontal: 7,
        paddingVertical: 5,
    },
    chipBoth: {
        backgroundColor: '#120808',
        borderColor: 'rgba(200, 56, 58, 0.13)',
    },
    chipName: {
        fontSize: 9,
        fontWeight: '700',
        color: '#eee',
    },
    chipNameBoth: {
        color: '#c8383a',
    },
    chipSub: {
        fontSize: 7,
        color: '#2e2e2e',
        marginTop: 1,
    },
});

export default SharedSlashPulse;
