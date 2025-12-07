import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import ScreenWrapper from '../../components/ScreenWrapper';
import { Book, Search, Clapperboard, Smartphone, Monitor, Video, Radio, BarChart2 } from 'lucide-react-native';
import ChapterForm from '../../components/post-forms/ChapterForm';

// Determine screen width for 2-column layout
const { width } = Dimensions.get('window');
const GAP = 12;
const ITEM_WIDTH = (width - 48 - GAP) / 2; // 48 = padding horizontal (24*2)

type PostType = 'CHAPTER' | 'XRAY' | 'BTS' | 'LILL' | 'FILL' | 'AUD' | 'CHAN' | 'PULLUPDOWN' | null;

const POST_TYPES = [
    {
        type: 'CHAPTER',
        name: 'Chapters',
        description: 'Multi-media collections',
        Icon: Book,
        color: '#a855f7', // purple
    },
    {
        type: 'XRAY',
        name: 'Xrays',
        description: 'Interactive reveals',
        Icon: Search,
        color: '#06b6d4', // cyan
    },
    {
        type: 'BTS',
        name: 'BTS',
        description: 'Behind the scenes',
        Icon: Clapperboard,
        color: '#f97316', // orange
    },
    {
        type: 'LILL',
        name: 'Lills',
        description: 'Short vertical videos',
        Icon: Smartphone,
        color: '#22c55e', // green
    },
    {
        type: 'FILL',
        name: 'Fills',
        description: 'Long horiz videos',
        Icon: Video,
        color: '#ef4444', // red
    },
    {
        type: 'AUD',
        name: 'Auds',
        description: 'Audio with waves',
        Icon: Radio,
        color: '#6366f1', // indigo
    },
    {
        type: 'CHAN',
        name: 'Chans',
        description: 'Channels & Episodes',
        Icon: Monitor,
        color: '#eab308', // yellow
    },
    {
        type: 'PULLUPDOWN',
        name: 'Polls',
        description: 'Interactive voting',
        Icon: BarChart2,
        color: '#14b8a6', // teal
    },
];

export default function CreateScreen() {
    const { colors, isDark } = useTheme();
    const [selectedType, setSelectedType] = useState<PostType>(null);

    const handleSelect = (type: string) => {
        setSelectedType(type as PostType);
    };

    // Render specific form based on selection
    if (selectedType === 'CHAPTER') {
        return <ScreenWrapper><ChapterForm onBack={() => setSelectedType(null)} /></ScreenWrapper>;
    }

    // Placeholder for other forms (can be replaced by specific components as they are built)
    if (selectedType) {
        return (
            <ScreenWrapper>
                <View className="flex-1 items-center justify-center p-6">
                    <Text style={{ color: colors.text, fontSize: 20, marginBottom: 10 }}>{selectedType} Form</Text>
                    <Text style={{ color: colors.secondary, textAlign: 'center', marginBottom: 20 }}>
                        This post type is under construction for mobile.
                    </Text>
                    <TouchableOpacity
                        onPress={() => setSelectedType(null)}
                        style={{ padding: 12, backgroundColor: colors.card, borderRadius: 8 }}
                    >
                        <Text style={{ color: colors.text }}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </ScreenWrapper>
        );
    }

    // Default: Selection Grid
    return (
        <ScreenWrapper>
            <ScrollView contentContainerStyle={{ padding: 24 }}>
                <View className="mb-8">
                    <Text style={{ color: colors.text, fontSize: 32, fontWeight: 'bold' }}>Create</Text>
                    <Text style={{ color: colors.secondary, fontSize: 16, marginTop: 4 }}>
                        Share your world in any format.
                    </Text>
                </View>

                <View className="flex-row flex-wrap" style={{ gap: GAP }}>
                    {POST_TYPES.map((item) => (
                        <TouchableOpacity
                            key={item.type}
                            onPress={() => handleSelect(item.type)}
                            style={{
                                width: ITEM_WIDTH,
                                height: ITEM_WIDTH * 1.1,
                                backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'white',
                                borderRadius: 20,
                                padding: 16,
                                justifyContent: 'space-between',
                                borderWidth: 1,
                                borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'
                            }}
                        >
                            <View
                                style={{
                                    width: 48,
                                    height: 48,
                                    borderRadius: 14,
                                    backgroundColor: item.color + '20', // 20% opacity
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                <item.Icon size={24} color={item.color} />
                            </View>

                            <View>
                                <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold' }}>
                                    {item.name}
                                </Text>
                                <Text style={{ color: colors.secondary, fontSize: 13, marginTop: 4 }}>
                                    {item.description}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>
        </ScreenWrapper>
    );
}
