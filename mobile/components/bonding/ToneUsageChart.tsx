import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface ToneUsageChartProps {
    toneCounts: Record<string, number>;
}

const TONE_LABELS: Record<string, string> = {
    bold: 'bold',
    whisper: 'whisper',
    shout: 'shout',
    uninterested: 'uninterested',
};

const ToneUsageChart: React.FC<ToneUsageChartProps> = React.memo(({ toneCounts }) => {
    const entries = Object.entries(toneCounts).filter(([_, count]) => count > 0);
    const maxCount = entries.length > 0 ? Math.max(...entries.map(([_, c]) => c)) : 1;

    return (
        <View style={s.container}>
            <Text style={s.title}>tone you use with them</Text>

            {entries.length === 0 ? (
                <Text style={s.emptyText}>all messages sent in default tone</Text>
            ) : (
                entries.map(([tone, count]) => (
                    <View key={tone} style={s.row}>
                        <Text style={s.label}>{TONE_LABELS[tone] ?? tone}</Text>
                        <View style={s.barTrack}>
                            <View
                                style={[
                                    s.barFill,
                                    { width: `${(count / maxCount) * 100}%` },
                                ]}
                            />
                        </View>
                        <Text style={s.count}>{count}</Text>
                    </View>
                ))
            )}
        </View>
    );
});

const s = StyleSheet.create({
    container: {
        marginHorizontal: 10,
        marginBottom: 6,
        backgroundColor: '#0e0e0e',
        borderRadius: 7,
        borderWidth: 0.5,
        borderColor: '#141414',
        padding: 10,
    },
    title: {
        fontSize: 8,
        color: '#2e2e2e',
        textTransform: 'uppercase',
        fontWeight: '700',
        letterSpacing: 0.5,
        marginBottom: 10,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    label: {
        width: 50,
        fontSize: 8,
        color: '#555',
    },
    barTrack: {
        flex: 1,
        height: 5,
        backgroundColor: '#141414',
        borderRadius: 2,
        overflow: 'hidden',
        marginHorizontal: 6,
    },
    barFill: {
        height: '100%',
        backgroundColor: '#eee',
        borderRadius: 2,
    },
    count: {
        width: 24,
        fontSize: 8,
        color: '#2e2e2e',
        textAlign: 'right',
    },
    emptyText: {
        fontSize: 8,
        color: '#2e2e2e',
    },
});

export default ToneUsageChart;
