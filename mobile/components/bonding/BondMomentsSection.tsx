import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { BondMomentData, BondMomentRow } from '../../services/BondingService';

interface BondMomentsSectionProps {
    data: BondMomentData | null;
    onPinMoment: () => void;
    onDeleteMoment: (id: string) => void;
}

function relativeTime(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    return `${months}mo ago`;
}

const BondMomentsSection: React.FC<BondMomentsSectionProps> = React.memo(({
    data,
    onPinMoment,
    onDeleteMoment,
}) => {
    if (!data) return null;

    return (
        <View style={s.container}>
            <View style={s.headerRow}>
                <Text style={s.title}>bond moments</Text>
                <TouchableOpacity onPress={onPinMoment}>
                    <Text style={s.pinAction}>+ pin moment</Text>
                </TouchableOpacity>
            </View>

            {/* First message card */}
            {data.firstMessage && (
                <View style={s.card}>
                    <Text style={s.cardText} numberOfLines={2}>
                        {data.firstMessage.text}
                    </Text>
                    <Text style={s.cardMeta}>
                        first message  {relativeTime(data.firstMessage.createdAt)}
                    </Text>
                </View>
            )}

            {/* Pinned moments */}
            {data.pinned.map((moment: BondMomentRow) => (
                <View key={moment.id} style={s.card}>
                    <Text style={s.cardText} numberOfLines={2}>
                        {moment.preview_text}
                    </Text>
                    <View style={s.cardFooter}>
                        <Text style={s.cardMeta}>
                            pinned by you  {relativeTime(moment.pinned_at)}
                        </Text>
                        <TouchableOpacity
                            onPress={() => onDeleteMoment(moment.id)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <Text style={s.deleteBtn}>remove</Text>
                        </TouchableOpacity>
                    </View>
                    {moment.slash_context_id && (
                        <View style={s.slashTag}>
                            <Text style={s.slashTagText}>/ slash linked</Text>
                        </View>
                    )}
                </View>
            ))}

            {data.pinned.length === 0 && !data.firstMessage && (
                <Text style={s.emptyText}>no moments pinned yet</Text>
            )}
        </View>
    );
});

const s = StyleSheet.create({
    container: {
        marginHorizontal: 10,
        marginBottom: 6,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    title: {
        fontSize: 8,
        color: '#2e2e2e',
        textTransform: 'uppercase',
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    pinAction: {
        fontSize: 8,
        color: '#555',
    },
    card: {
        backgroundColor: '#0e0e0e',
        borderRadius: 7,
        borderWidth: 0.5,
        borderColor: '#141414',
        padding: 9,
        marginBottom: 4,
    },
    cardText: {
        fontSize: 10,
        color: '#eee',
        marginBottom: 4,
        lineHeight: 14,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    cardMeta: {
        fontSize: 7,
        color: '#2e2e2e',
    },
    deleteBtn: {
        fontSize: 7,
        color: '#c8383a',
    },
    slashTag: {
        marginTop: 4,
        backgroundColor: '#141414',
        borderRadius: 3,
        paddingHorizontal: 5,
        paddingVertical: 2,
        alignSelf: 'flex-start',
    },
    slashTagText: {
        fontSize: 7,
        color: '#555',
    },
    emptyText: {
        fontSize: 8,
        color: '#2e2e2e',
        textAlign: 'center',
        paddingVertical: 16,
    },
});

export default BondMomentsSection;
