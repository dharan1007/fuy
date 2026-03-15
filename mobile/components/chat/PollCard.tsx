/**
 * /poll sub-component: PollCard
 *
 * Interactive poll with animated percentage bars.
 * Vote via broadcast + local state tracking.
 * One vote per user; tap again to deselect.
 */

import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { BarChart3, Check } from 'lucide-react-native';
import { ChannelPool } from '../../lib/ChannelPool';
import * as Haptics from 'expo-haptics';

export interface PollOption {
    text: string;
    votes: number;
}

export interface PollData {
    id: string;
    question: string;
    options: PollOption[];
    creatorId: string;
    myVote?: number; // index of my vote, or undefined
}

interface PollCardProps {
    poll: PollData;
    roomId: string;
    currentUserId: string;
    isMe: boolean;
    onVote: (pollId: string, optionIndex: number) => void;
}

export const PollCard: React.FC<PollCardProps> = ({
    poll,
    roomId,
    currentUserId,
    isMe,
    onVote,
}) => {
    const [myVote, setMyVote] = useState<number | undefined>(poll.myVote);
    const [options, setOptions] = useState<PollOption[]>(poll.options);

    const totalVotes = options.reduce((sum, opt) => sum + opt.votes, 0);

    const handleVote = useCallback(
        (index: number) => {
            Haptics.selectionAsync();

            setOptions((prev) => {
                const updated = [...prev];
                if (myVote === index) {
                    // Deselect
                    updated[index] = { ...updated[index], votes: Math.max(0, updated[index].votes - 1) };
                    setMyVote(undefined);
                } else {
                    // Remove previous vote if any
                    if (myVote !== undefined) {
                        updated[myVote] = { ...updated[myVote], votes: Math.max(0, updated[myVote].votes - 1) };
                    }
                    // Add new vote
                    updated[index] = { ...updated[index], votes: updated[index].votes + 1 };
                    setMyVote(index);
                }
                return updated;
            });

            // Broadcast vote
            ChannelPool.emit(roomId, 'poll:vote', {
                pollId: poll.id,
                optionIndex: index,
                userId: currentUserId,
                action: myVote === index ? 'deselect' : 'select',
            });

            onVote(poll.id, index);
        },
        [myVote, roomId, poll.id, currentUserId, onVote]
    );

    // Listen for peer votes
    React.useEffect(() => {
        const unsub = ChannelPool.on(roomId, 'poll:vote', (payload: any) => {
            if (payload.pollId !== poll.id) return;
            if (payload.userId === currentUserId) return; // Skip self

            setOptions((prev) => {
                const updated = [...prev];
                if (payload.action === 'select') {
                    updated[payload.optionIndex] = {
                        ...updated[payload.optionIndex],
                        votes: updated[payload.optionIndex].votes + 1,
                    };
                } else {
                    updated[payload.optionIndex] = {
                        ...updated[payload.optionIndex],
                        votes: Math.max(0, updated[payload.optionIndex].votes - 1),
                    };
                }
                return updated;
            });
        });

        return unsub;
    }, [roomId, poll.id, currentUserId]);

    return (
        <View
            style={{
                backgroundColor: 'rgba(255,255,255,0.06)',
                borderRadius: 16,
                padding: 16,
                width: 240,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.08)',
            }}
        >
            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <BarChart3 size={16} color="#F59E0B" />
                <Text style={{ color: '#F59E0B', fontSize: 10, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' }}>
                    Poll
                </Text>
            </View>

            {/* Question */}
            <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600', marginBottom: 12 }}>
                {poll.question}
            </Text>

            {/* Options */}
            {options.map((opt, index) => {
                const percentage = totalVotes > 0 ? (opt.votes / totalVotes) * 100 : 0;
                const isSelected = myVote === index;

                return (
                    <TouchableOpacity
                        key={index}
                        onPress={() => handleVote(index)}
                        activeOpacity={0.7}
                        style={{
                            marginBottom: 8,
                            borderRadius: 10,
                            overflow: 'hidden',
                            backgroundColor: 'rgba(255,255,255,0.04)',
                            borderWidth: isSelected ? 1 : 0,
                            borderColor: isSelected ? '#F59E0B' : 'transparent',
                        }}
                    >
                        {/* Progress Bar Background */}
                        <View
                            style={{
                                position: 'absolute',
                                left: 0,
                                top: 0,
                                bottom: 0,
                                width: `${percentage}%` as any,
                                backgroundColor: isSelected
                                    ? 'rgba(245, 158, 11, 0.15)'
                                    : 'rgba(255,255,255,0.05)',
                                borderRadius: 10,
                            }}
                        />

                        <View
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                paddingHorizontal: 12,
                                paddingVertical: 10,
                            }}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                                {isSelected && <Check size={14} color="#F59E0B" />}
                                <Text
                                    style={{
                                        color: '#fff',
                                        fontSize: 13,
                                        fontWeight: isSelected ? '700' : '500',
                                    }}
                                    numberOfLines={1}
                                >
                                    {opt.text}
                                </Text>
                            </View>
                            <Text
                                style={{
                                    color: 'rgba(255,255,255,0.4)',
                                    fontSize: 11,
                                    fontWeight: '600',
                                    marginLeft: 8,
                                }}
                            >
                                {Math.round(percentage)}%
                            </Text>
                        </View>
                    </TouchableOpacity>
                );
            })}

            {/* Total votes */}
            <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, marginTop: 4, textAlign: 'right' }}>
                {totalVotes} vote{totalVotes !== 1 ? 's' : ''}
            </Text>
        </View>
    );
};

export default PollCard;
