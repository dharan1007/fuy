/**
 * Feature 5: Slash Commands (Command Panel)
 *
 * Slides up when input starts with "/" and provides real-time prefix filtering.
 * Available commands: /eta, /loc, /poll, /spin, /sticky
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Animated,
} from 'react-native';
import {
    Clock,
    MapPin,
    BarChart3,
    Disc,
    StickyNote as StickyNoteIcon,
} from 'lucide-react-native';

export interface SlashCommand {
    id: string;
    label: string;
    description: string;
    icon: any;
    iconColor: string;
}

const COMMANDS: SlashCommand[] = [
    {
        id: 'eta',
        label: '/eta',
        description: 'Share your estimated arrival time',
        icon: Clock,
        iconColor: '#3B82F6',
    },
    {
        id: 'loc',
        label: '/loc',
        description: 'Send your current location card',
        icon: MapPin,
        iconColor: '#10B981',
    },
    {
        id: 'poll',
        label: '/poll',
        description: 'Create a quick poll',
        icon: BarChart3,
        iconColor: '#F59E0B',
    },
    {
        id: 'spin',
        label: '/spin',
        description: 'Spin a decision wheel',
        icon: Disc,
        iconColor: '#EF4444',
    },
    {
        id: 'sticky',
        label: '/sticky',
        description: 'Pin a note to the chat header',
        icon: StickyNoteIcon,
        iconColor: '#F59E0B',
    },
];

interface SlashCommandsPanelProps {
    inputText: string;
    onSelectCommand: (command: SlashCommand) => void;
    colors: any;
}

export const SlashCommandsPanel: React.FC<SlashCommandsPanelProps> = ({
    inputText,
    onSelectCommand,
    colors,
}) => {
    const isSlashMode = inputText.startsWith('/');
    const query = inputText.slice(1).toLowerCase();

    const filteredCommands = useMemo(() => {
        if (!isSlashMode) return [];
        if (!query) return COMMANDS;
        return COMMANDS.filter(
            (cmd) =>
                cmd.id.includes(query) ||
                cmd.label.includes(`/${query}`) ||
                cmd.description.toLowerCase().includes(query)
        );
    }, [isSlashMode, query]);

    if (!isSlashMode || filteredCommands.length === 0) {
        return null;
    }

    return (
        <View
            style={{
                backgroundColor: '#1A1A1A',
                borderTopWidth: 1,
                borderColor: 'rgba(255,255,255,0.06)',
                paddingVertical: 4,
            }}
        >
            {filteredCommands.map((cmd) => {
                const Icon = cmd.icon;
                return (
                    <TouchableOpacity
                        key={cmd.id}
                        onPress={() => onSelectCommand(cmd)}
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            paddingHorizontal: 16,
                            paddingVertical: 10,
                            gap: 12,
                        }}
                        activeOpacity={0.6}
                    >
                        <View
                            style={{
                                width: 32,
                                height: 32,
                                borderRadius: 8,
                                backgroundColor: cmd.iconColor + '20',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <Icon size={16} color={cmd.iconColor} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text
                                style={{
                                    color: '#fff',
                                    fontSize: 14,
                                    fontWeight: '700',
                                    letterSpacing: 0.3,
                                }}
                            >
                                {cmd.label}
                            </Text>
                            <Text
                                style={{
                                    color: 'rgba(255,255,255,0.45)',
                                    fontSize: 11,
                                    marginTop: 1,
                                }}
                            >
                                {cmd.description}
                            </Text>
                        </View>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
};

export { COMMANDS };
export default SlashCommandsPanel;
