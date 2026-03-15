import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

interface BondScoreSectionProps {
    score: number;
    partnerName: string;
    passport: {
        communicationPassport: {
            responseTime?: string;
            formatPreference?: string;
            depth?: string;
            availability?: string;
        } | null;
    } | null;
    hardNoCount: number;
    isLoading: boolean;
}

const SIZE = 120;
const STROKE = 8;
const RADIUS = (SIZE - STROKE * 2) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const BondScoreSection: React.FC<BondScoreSectionProps> = React.memo(({
    score,
    partnerName,
    passport,
    hardNoCount,
    isLoading,
}) => {
    const progress = (score / 100) * CIRCUMFERENCE;
    const cp = passport?.communicationPassport;

    const badges: string[] = [];
    if (cp?.responseTime) {
        badges.push(cp.responseTime.toLowerCase().includes('fast') ? 'fast responder' : 'slow responder');
    }
    if (cp?.formatPreference) badges.push(cp.formatPreference);
    if (hardNoCount > 0) badges.push(`${hardNoCount} hard no hit`);

    const displayBadges = badges.slice(0, 3);

    return (
        <View style={s.container}>
            <View style={s.ringRow}>
                <View style={s.ringWrap}>
                    <Svg width={SIZE} height={SIZE}>
                        <Circle
                            cx={SIZE / 2}
                            cy={SIZE / 2}
                            r={RADIUS}
                            stroke="#141414"
                            strokeWidth={STROKE}
                            fill="transparent"
                        />
                        <Circle
                            cx={SIZE / 2}
                            cy={SIZE / 2}
                            r={RADIUS}
                            stroke="#eee"
                            strokeWidth={STROKE}
                            fill="transparent"
                            strokeDasharray={`${progress} ${CIRCUMFERENCE}`}
                            strokeLinecap="round"
                            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
                        />
                    </Svg>
                    <View style={s.ringCenter}>
                        <Text style={s.scoreValue}>{score}%</Text>
                        <Text style={s.scoreLabel}>bond</Text>
                    </View>
                </View>

                <View style={s.infoCol}>
                    <Text style={s.partnerName}>{partnerName}</Text>
                    <View style={s.badgeRow}>
                        {isLoading ? (
                            <>
                                {[0, 1, 2].map(i => (
                                    <View key={i} style={s.skeletonBadge} />
                                ))}
                            </>
                        ) : (
                            displayBadges.map((badge, i) => {
                                const isHardNo = badge.includes('hard no');
                                return (
                                    <View
                                        key={i}
                                        style={[
                                            s.badge,
                                            isHardNo && s.badgeHardNo,
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                s.badgeText,
                                                isHardNo && s.badgeTextHardNo,
                                            ]}
                                        >
                                            {badge}
                                        </Text>
                                    </View>
                                );
                            })
                        )}
                    </View>
                </View>
            </View>
        </View>
    );
});

const s = StyleSheet.create({
    container: {
        marginHorizontal: 10,
        marginBottom: 6,
    },
    ringRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    ringWrap: {
        width: SIZE,
        height: SIZE,
        alignItems: 'center',
        justifyContent: 'center',
    },
    ringCenter: {
        position: 'absolute',
        alignItems: 'center',
    },
    scoreValue: {
        fontSize: 22,
        fontWeight: '700',
        color: '#eee',
    },
    scoreLabel: {
        fontSize: 9,
        color: '#2e2e2e',
        textTransform: 'uppercase',
    },
    infoCol: {
        flex: 1,
    },
    partnerName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#eee',
        marginBottom: 10,
    },
    badgeRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 5,
    },
    badge: {
        backgroundColor: '#0e0e0e',
        borderRadius: 4,
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderWidth: 0.5,
        borderColor: '#141414',
    },
    badgeHardNo: {
        backgroundColor: '#1a0e0e',
        borderColor: '#2e1a1a',
    },
    badgeText: {
        fontSize: 9,
        color: '#555',
        fontWeight: '600',
    },
    badgeTextHardNo: {
        color: '#c8383a',
    },
    skeletonBadge: {
        width: 40,
        height: 14,
        borderRadius: 4,
        backgroundColor: '#141414',
    },
});

export default BondScoreSection;
