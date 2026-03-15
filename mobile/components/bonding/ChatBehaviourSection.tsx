import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { ChatBehaviourStats, SnoozedItem } from '../../services/BondingService';

interface ChatBehaviourSectionProps {
    stats: ChatBehaviourStats | null;
    snoozedPending: SnoozedItem[];
    partnerName: string;
    onSnoozedTap: () => void;
}

const ChatBehaviourSection: React.FC<ChatBehaviourSectionProps> = React.memo(({
    stats,
    snoozedPending,
    partnerName,
    onSnoozedTap,
}) => {
    if (!stats) return null;

    const pendingCount = snoozedPending.filter(s => s.isPending).length;
    const totalSilent = stats.silentSends.myCount + stats.silentSends.theirCount;
    const totalSlash = Object.values(stats.slashCommandCounts)
        .reduce((sum, v) => sum + v.myCount + v.theirCount, 0);
    const totalTone = Object.values(stats.toneCounts).reduce((a, b) => a + b, 0);

    // Format slash breakdown
    const slashBreakdown = Object.entries(stats.slashCommandCounts)
        .map(([type, counts]) => `/${type.toLowerCase().replace('_', '')} x${counts.myCount + counts.theirCount}`)
        .join('  ');

    // Format tone breakdown
    const toneBreakdown = Object.entries(stats.toneCounts)
        .filter(([_, c]) => c > 0)
        .map(([t, c]) => `${t} x${c}`)
        .join('  ');

    return (
        <View style={s.container}>
            <Text style={s.title}>how you talk to each other</Text>

            {/* 3x2 Stat Tile Grid */}
            <View style={s.tileGrid}>
                <StatTile label="silent sends" value={totalSilent} />
                <StatTile label="stacks sent" value={stats.stackCount} />
                <StatTile
                    label="snoozed msgs"
                    value={snoozedPending.length}
                    isRed={pendingCount > 0}
                />
                <StatTile
                    label="polls created"
                    value={(stats.slashCommandCounts['POLL']?.myCount ?? 0) + (stats.slashCommandCounts['POLL']?.theirCount ?? 0)}
                />
                <StatTile
                    label="spins used"
                    value={(stats.slashCommandCounts['SPIN_WHEEL']?.myCount ?? 0) + (stats.slashCommandCounts['SPIN_WHEEL']?.theirCount ?? 0)}
                />
                <StatTile
                    label="canvas sessions"
                    value={stats.canvasSessionCount}
                />
            </View>

            {/* Feature Usage Rows */}
            <View style={s.rowList}>
                <FeatureRow
                    icon="S"
                    label="silent send"
                    sub={`you sent ${stats.silentSends.myCount}  them ${stats.silentSends.theirCount}`}
                    stat={`${totalSilent} total`}
                />
                <FeatureRow
                    icon="[]"
                    label="chat stacks"
                    sub={`${stats.stackCount} stacks from you`}
                    stat={`${stats.stackCount} stacks`}
                />
                <FeatureRow
                    icon="z"
                    label="snoozed messages"
                    sub={pendingCount > 0
                        ? `${pendingCount} of theirs — not replied yet`
                        : `${snoozedPending.length} snoozed — all replied`}
                    stat={pendingCount > 0 ? `${pendingCount} pending` : '0 pending'}
                    isRed={pendingCount > 0}
                    subIsRed={pendingCount > 0}
                />
                <FeatureRow
                    icon="/"
                    label="slash commands used"
                    sub={slashBreakdown || 'none used'}
                    stat={`${totalSlash}`}
                />
                <FeatureRow
                    icon="T"
                    label="tone variants sent"
                    sub={toneBreakdown || 'all default'}
                    stat={`${totalTone}`}
                />
                <FeatureRow
                    icon="~"
                    label="live canvas sessions"
                    sub={stats.canvasSessionCount > 0
                        ? `both on — ${stats.canvasSessionCount} session${stats.canvasSessionCount > 1 ? 's' : ''} this month`
                        : 'no sessions this month'}
                    stat={`${stats.canvasSessionCount}`}
                    statColor="#2e2e2e"
                />
            </View>

            {/* Snoozed Pending Strip */}
            {pendingCount > 0 && (
                <TouchableOpacity style={s.snoozedStrip} onPress={onSnoozedTap} activeOpacity={0.7}>
                    <View style={s.snoozedStripLeft}>
                        <Text style={s.snoozedStripTitle}>snoozed — waiting for your reply</Text>
                        <Text style={s.snoozedStripSub}>
                            {pendingCount} of their messages snoozed — no reply yet
                        </Text>
                    </View>
                    <Text style={s.snoozedStripCount}>{pendingCount}</Text>
                </TouchableOpacity>
            )}
        </View>
    );
});

// ── Sub-components ───────────────────────────────────────────────────────────

const StatTile = ({ label, value, isRed = false }: { label: string; value: number; isRed?: boolean }) => (
    <View style={[s.tile, isRed && s.tileRed]}>
        <Text style={[s.tileValue, isRed && s.tileValueRed]}>{value}</Text>
        <Text style={s.tileLabel}>{label}</Text>
    </View>
);

const FeatureRow = ({
    icon,
    label,
    sub,
    stat,
    isRed = false,
    subIsRed = false,
    statColor,
}: {
    icon: string;
    label: string;
    sub: string;
    stat: string;
    isRed?: boolean;
    subIsRed?: boolean;
    statColor?: string;
}) => (
    <View style={s.featureRow}>
        <View style={s.featureIcon}>
            <Text style={s.featureIconText}>{icon}</Text>
        </View>
        <View style={s.featureContent}>
            <Text style={s.featureLabel}>{label}</Text>
            <Text style={[s.featureSub, subIsRed && { color: '#4a2020' }]}>{sub}</Text>
        </View>
        <Text style={[s.featureStat, isRed && { color: '#c8383a' }, statColor ? { color: statColor } : null]}>
            {stat}
        </Text>
    </View>
);

// ── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
    container: {
        marginHorizontal: 10,
        marginBottom: 6,
    },
    title: {
        fontSize: 8,
        color: '#2e2e2e',
        textTransform: 'uppercase',
        fontWeight: '700',
        letterSpacing: 0.5,
        marginBottom: 8,
    },
    tileGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 4,
        marginBottom: 8,
    },
    tile: {
        width: '31.5%',
        backgroundColor: '#0e0e0e',
        borderRadius: 6,
        borderWidth: 0.5,
        borderColor: '#141414',
        paddingVertical: 6,
        paddingHorizontal: 7,
        alignItems: 'center',
    },
    tileRed: {
        backgroundColor: '#120808',
        borderColor: '#2e1a1a',
    },
    tileValue: {
        fontSize: 13,
        fontWeight: '700',
        color: '#eee',
    },
    tileValueRed: {
        color: '#c8383a',
    },
    tileLabel: {
        fontSize: 7,
        color: '#2e2e2e',
        textTransform: 'uppercase',
        marginTop: 2,
    },
    rowList: {
        borderRadius: 7,
        overflow: 'hidden',
    },
    featureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 7,
        paddingHorizontal: 8,
        borderBottomWidth: 0.5,
        borderBottomColor: '#0e0e0e',
    },
    featureIcon: {
        width: 22,
        height: 22,
        borderRadius: 4,
        backgroundColor: '#141414',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
    },
    featureIconText: {
        fontSize: 9,
        color: '#555',
        fontFamily: 'monospace',
        fontWeight: '700',
    },
    featureContent: {
        flex: 1,
    },
    featureLabel: {
        fontSize: 9,
        fontWeight: '700',
        color: '#eee',
    },
    featureSub: {
        fontSize: 8,
        color: '#2e2e2e',
        marginTop: 1,
    },
    featureStat: {
        fontSize: 9,
        color: '#555',
        fontWeight: '600',
        marginLeft: 8,
    },
    snoozedStrip: {
        backgroundColor: '#0e0e0e',
        borderRadius: 7,
        borderWidth: 0.5,
        borderColor: '#141414',
        padding: 9,
        marginTop: 4,
        flexDirection: 'row',
        alignItems: 'center',
    },
    snoozedStripLeft: {
        flex: 1,
    },
    snoozedStripTitle: {
        fontSize: 9,
        color: '#eee',
        fontWeight: '600',
    },
    snoozedStripSub: {
        fontSize: 8,
        color: '#2e2e2e',
        marginTop: 1,
    },
    snoozedStripCount: {
        fontSize: 12,
        fontWeight: '700',
        color: '#c8383a',
        marginLeft: 8,
    },
});

export default ChatBehaviourSection;
