// app/dots/bloom-end.tsx — Session End Screen
import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';

const { width: SW } = Dimensions.get('window');

export default function BloomEndScreen() {
    const params = useLocalSearchParams();
    const router = useRouter();

    const slashName = params.slashName as string || 'unknown';
    const lillsWatched = parseInt(params.lillsWatched as string || '0');
    const notesCount = parseInt(params.notesCount as string || '0');
    const minutesWatched = parseInt(params.minutesWatched as string || '0');

    useEffect(() => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        scheduleSpacedRepetition();
    }, []);

    const scheduleSpacedRepetition = async () => {
        try {
            const { status } = await Notifications.requestPermissionsAsync();
            if (status !== 'granted') return;

            // Schedule spaced repetition reminders: day 1, day 4, day 14
            const delays = [1, 4, 14];
            for (const dayOffset of delays) {
                const trigger = new Date();
                trigger.setDate(trigger.getDate() + dayOffset);
                trigger.setHours(9, 0, 0, 0);

                await Notifications.scheduleNotificationAsync({
                    content: {
                        title: `/${slashName}`,
                        body: `Revisit your notes from this session (day ${dayOffset})`,
                    },
                    trigger: { date: trigger } as any,
                });
            }
        } catch (e) {
            console.log('Notification scheduling error:', e);
        }
    };

    const scheduleTomorrow = async () => {
        try {
            const { status } = await Notifications.requestPermissionsAsync();
            if (status !== 'granted') return;

            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(9, 0, 0, 0);

            await Notifications.scheduleNotificationAsync({
                content: {
                    title: `Continue /${slashName}`,
                    body: 'Pick up where you left off in your bloom session',
                },
                trigger: { date: tomorrow } as any,
            });
        } catch (e) {
            console.log('Tomorrow scheduling error:', e);
        }
    };

    const handleContinueTomorrow = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        await scheduleTomorrow();
        router.replace('/(tabs)/dots' as any);
    };

    const handleReturnToSphere = () => {
        router.replace('/(tabs)/dots' as any);
    };

    return (
        <View style={st.root}>
            {/* Session complete */}
            <Text style={st.heading}>SESSION COMPLETE</Text>
            <Text style={st.slashName}>/{slashName}</Text>
            <Text style={st.summary}>
                {minutesWatched} min  {lillsWatched} lills
            </Text>

            {/* 2x2 stats grid */}
            <View style={st.statsGrid}>
                <View style={st.statCell}>
                    <Text style={st.statValue}>{lillsWatched}</Text>
                    <Text style={st.statLabel}>lills watched</Text>
                </View>
                <View style={st.statCell}>
                    <Text style={st.statValue}>{notesCount}</Text>
                    <Text style={st.statLabel}>notes saved</Text>
                </View>
                <View style={st.statCell}>
                    <Text style={st.statValue}>1</Text>
                    <Text style={st.statLabel}>creators</Text>
                </View>
                <View style={[st.statCell, st.statCellHighlight]}>
                    <Text style={st.statValue}>{minutesWatched}</Text>
                    <Text style={st.statLabel}>minutes</Text>
                </View>
            </View>

            {/* Study note card */}
            <View style={st.noteCard}>
                <Text style={st.noteCardTitle}>/{slashName}</Text>
                <Text style={st.noteCardCount}>{notesCount} notes</Text>
                <Text style={st.noteCardSchedule}>revisit: day 1 - day 4 - day 14</Text>
            </View>

            {/* Primary button */}
            <TouchableOpacity onPress={handleContinueTomorrow} style={st.primaryBtn}>
                <Text style={st.primaryBtnText}>continue tomorrow</Text>
            </TouchableOpacity>

            {/* Secondary link */}
            <TouchableOpacity onPress={handleReturnToSphere} style={st.secondaryLink}>
                <Text style={st.secondaryText}>return to sphere</Text>
            </TouchableOpacity>
        </View>
    );
}

const st = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#080808', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
    heading: { color: '#555', fontSize: 9, fontWeight: '600', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 },
    slashName: { color: '#eee', fontSize: 22, fontWeight: '700', marginBottom: 6 },
    summary: { color: '#333', fontSize: 9, marginBottom: 28 },

    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', width: '100%', gap: 8, marginBottom: 24 },
    statCell: { width: (SW - 72) / 2, backgroundColor: '#0e0e0e', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 0.5, borderColor: '#1c1c1c' },
    statCellHighlight: { backgroundColor: '#1a1a1a' },
    statValue: { color: '#eee', fontSize: 20, fontWeight: '700' },
    statLabel: { color: '#2e2e2e', fontSize: 8, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 },

    noteCard: { width: '100%', backgroundColor: '#0e0e0e', borderRadius: 12, padding: 16, borderWidth: 0.5, borderColor: '#1c1c1c', marginBottom: 24 },
    noteCardTitle: { color: '#c8383a', fontSize: 12, fontWeight: '700' },
    noteCardCount: { color: '#555', fontSize: 9, marginTop: 4 },
    noteCardSchedule: { color: '#2e2e2e', fontSize: 8, marginTop: 6 },

    primaryBtn: { width: '100%', backgroundColor: '#eee', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginBottom: 12 },
    primaryBtnText: { color: '#080808', fontSize: 11, fontWeight: '700' },

    secondaryLink: { paddingVertical: 8 },
    secondaryText: { color: '#1e1e1e', fontSize: 8 },
});
