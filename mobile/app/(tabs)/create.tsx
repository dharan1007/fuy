import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import ScreenWrapper from '../../components/ScreenWrapper';
import { Image as ImageIcon, BookOpen, Search, Smartphone, Video, Radio, Clock, BarChart2, FileEdit } from 'lucide-react-native';
import SimpleForm from '../../components/post-forms/SimpleForm';
import ChapterForm from '../../components/post-forms/ChapterForm';
import LillForm from '../../components/post-forms/LillForm';
import FillForm from '../../components/post-forms/FillForm';
import XrayForm from '../../components/post-forms/XrayForm';
import AudForm from '../../components/post-forms/AudForm';
import PollForm from '../../components/post-forms/PollForm';
import ClockForm from '../../components/post-forms/ClockForm';
import DraftsList from '../../components/DraftsList';
import { useLocalSearchParams } from 'expo-router';

const { width } = Dimensions.get('window');
const GAP = 10;
const ITEM_WIDTH = (width - 48 - GAP) / 2;

type PostType = 'SIMPLE' | 'CHAPTER' | 'XRAY' | 'LILL' | 'FILL' | 'AUD' | 'CLOCK' | 'PULLUPDOWN' | null;

const POST_TYPES = [
    { type: 'SIMPLE', name: 'Simple', description: 'Photos, Videos or Text', Icon: ImageIcon },
    { type: 'CHAPTER', name: 'Chapters', description: 'Multi-media collections', Icon: BookOpen },
    { type: 'XRAY', name: 'Xrays', description: 'Scratch to reveal', Icon: Search },
    { type: 'LILL', name: 'Lills', description: 'Short vertical videos', Icon: Smartphone },
    { type: 'FILL', name: 'Fills', description: 'Long horizontal videos', Icon: Video },
    { type: 'AUD', name: 'Auds', description: 'Audio with waveform', Icon: Radio },
    { type: 'CLOCK', name: 'Clocks', description: 'Timed stories', Icon: Clock },
    { type: 'PULLUPDOWN', name: 'PUDS', description: 'Voting polls', Icon: BarChart2 },
];

export default function CreateScreen() {
    const { isDark } = useTheme();
    const params = useLocalSearchParams();
    const [selectedType, setSelectedType] = useState<PostType>((params.type as PostType) || null);
    const [showDrafts, setShowDrafts] = useState(false);
    const [draftData, setDraftData] = useState<any>(null);

    const handleSelect = (type: string) => {
        setDraftData(null);
        setSelectedType(type as PostType);
    };

    const handleBack = () => {
        setSelectedType(null);
        setDraftData(null);
    };

    const handleDraftSelect = (draft: any) => {
        setDraftData(draft);
        setSelectedType(draft.postType as PostType);
    };

    const renderForm = () => {
        switch (selectedType) {
            case 'SIMPLE': return <SimpleForm onBack={handleBack} initialData={draftData} />;
            case 'CHAPTER': return <ChapterForm onBack={handleBack} />;
            case 'LILL': return <LillForm onBack={handleBack} />;
            case 'FILL': return <FillForm onBack={handleBack} />;
            case 'XRAY': return <XrayForm onBack={handleBack} />;
            case 'AUD': return <AudForm onBack={handleBack} />;
            case 'CLOCK': return <ClockForm onBack={handleBack} />;
            case 'PULLUPDOWN': return <PollForm onBack={handleBack} />;
            default: return null;
        }
    };

    if (selectedType) {
        return <ScreenWrapper>{renderForm()}</ScreenWrapper>;
    }

    return (
        <ScreenWrapper>
            <ScrollView style={{ flex: 1, backgroundColor: '#000' }} contentContainerStyle={{ padding: 24 }}>
                {/* Header */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
                    <View>
                        <Text style={{ color: '#fff', fontSize: 28, fontWeight: '700', letterSpacing: -0.5 }}>Create</Text>
                        <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 4, letterSpacing: 0.3 }}>
                            Choose your format
                        </Text>
                    </View>
                    <TouchableOpacity
                        onPress={() => setShowDrafts(true)}
                        style={{
                            width: 44,
                            height: 44,
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: 'rgba(255,255,255,0.15)',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <FileEdit size={18} color="rgba(255,255,255,0.6)" />
                    </TouchableOpacity>
                </View>

                {/* Grid */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GAP }}>
                    {POST_TYPES.map((item) => (
                        <TouchableOpacity
                            key={item.type}
                            onPress={() => handleSelect(item.type)}
                            style={{
                                width: ITEM_WIDTH,
                                paddingVertical: 24,
                                paddingHorizontal: 16,
                                backgroundColor: 'rgba(255,255,255,0.03)',
                                borderRadius: 16,
                                borderWidth: 1,
                                borderColor: 'rgba(255,255,255,0.08)',
                            }}
                        >
                            <View
                                style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 10,
                                    backgroundColor: 'rgba(255,255,255,0.08)',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginBottom: 16,
                                }}
                            >
                                <item.Icon size={18} color="rgba(255,255,255,0.7)" />
                            </View>
                            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600', marginBottom: 4 }}>
                                {item.name}
                            </Text>
                            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, lineHeight: 15 }}>
                                {item.description}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>

            <DraftsList
                visible={showDrafts}
                onClose={() => setShowDrafts(false)}
                onSelectDraft={handleDraftSelect}
            />
        </ScreenWrapper>
    );
}


