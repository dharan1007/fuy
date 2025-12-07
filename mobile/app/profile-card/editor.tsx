import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { ChevronLeft, Plus, Trash2, Save, Eye, Check } from 'lucide-react-native';
import { ProfileCardService, CardSection } from '../../services/ProfileCardService';
import { BlurView } from 'expo-blur';
import { supabase } from '../../lib/supabase';

export default function ProfileCardEditor() {
    const router = useRouter();
    const { colors, mode } = useTheme();
    const { session } = useAuth();
    const [loading, setLoading] = useState(false);
    const [dbUserId, setDbUserId] = useState<string | null>(null);
    const [sections, setSections] = useState<CardSection[]>([
        {
            id: 'favorites',
            title: 'Favorites',
            questions: [
                { id: 'q1', question: 'Favorite Music', answer: '', type: 'text' },
                { id: 'q2', question: 'Favorite Artist', answer: '', type: 'text' },
                { id: 'q3', question: 'Favorite Place', answer: '', type: 'text' },
            ]
        },
        {
            id: 'hobbies',
            title: 'Hobbies',
            questions: [
                { id: 'q4', question: 'Free time activity', answer: '', type: 'text' },
            ]
        }
    ]);
    const [basicInfo, setBasicInfo] = useState({
        name: session?.user?.user_metadata?.name || '',
        age: '',
        location: '',
        occupation: ''
    });

    // Resolve database User ID from email
    useEffect(() => {
        const resolveDbUser = async () => {
            if (session?.user?.email) {
                const { data } = await supabase
                    .from('User')
                    .select('id')
                    .eq('email', session.user.email)
                    .single();
                if (data) {
                    setDbUserId(data.id);
                }
            }
        };
        resolveDbUser();
    }, [session?.user?.email]);

    useEffect(() => {
        if (dbUserId) {
            loadCard();
        }
    }, [dbUserId]);

    const loadCard = async () => {
        if (!dbUserId) return;
        setLoading(true);
        const card = await ProfileCardService.getCard(dbUserId);
        if (card && card.content) {
            setSections(card.content.sections || []);
            setBasicInfo(prev => ({ ...prev, ...card.content.basicInfo }));
        }
        setLoading(false);
    };

    const handleSave = async () => {
        if (!dbUserId) {
            Alert.alert('Error', 'User not found. Please try logging in again.');
            return;
        }
        setLoading(true);
        try {
            await ProfileCardService.saveCard(dbUserId, {
                content: { sections, basicInfo },
                theme: 'default'
            });
            Alert.alert('Success', 'Profile Card saved!');
            router.back();
        } catch (error: any) {
            console.error('Save Card Error:', error);
            Alert.alert('Error', 'Failed to save card: ' + (error.message || 'Unknown error'));
        } finally {
            setLoading(false);
        }
    };

    const addSection = () => {
        setSections([...sections, {
            id: Date.now().toString(),
            title: 'New Section',
            questions: []
        }]);
    };

    const addQuestion = (sectionId: string) => {
        setSections(sections.map(s => {
            if (s.id === sectionId) {
                return {
                    ...s,
                    questions: [...s.questions, {
                        id: Date.now().toString(),
                        question: 'New Question',
                        answer: '',
                        type: 'text'
                    }]
                };
            }
            return s;
        }));
    };

    const updateQuestion = (sectionId: string, qId: string, field: 'question' | 'answer', text: string) => {
        setSections(sections.map(s => {
            if (s.id === sectionId) {
                return {
                    ...s,
                    questions: s.questions.map(q => q.id === qId ? { ...q, [field]: text } : q)
                };
            }
            return s;
        }));
    };

    const deleteSection = (id: string) => {
        setSections(sections.filter(s => s.id !== id));
    };

    const deleteQuestion = (sectionId: string, qId: string) => {
        setSections(sections.map(s => {
            if (s.id === sectionId) {
                return { ...s, questions: s.questions.filter(q => q.id !== qId) };
            }
            return s;
        }));
    };

    return (
        <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
            {/* Header */}
            <View className="flex-row items-center justify-between px-4 py-3 border-b" style={{ borderColor: colors.border }}>
                <TouchableOpacity onPress={() => router.back()} className="p-2">
                    <ChevronLeft color={colors.text} size={24} />
                </TouchableOpacity>
                <Text className="text-lg font-bold" style={{ color: colors.text }}>Edit Profile Card</Text>
                <TouchableOpacity onPress={handleSave} disabled={loading} className="p-2 bg-blue-500 rounded-full">
                    {loading ? <ActivityIndicator color="#fff" size="small" /> : <Save color="#fff" size={20} />}
                </TouchableOpacity>
            </View>

            <ScrollView className="flex-1 px-4 py-4">
                {/* Basic Info */}
                <Text className="text-base font-bold mb-3" style={{ color: colors.secondary }}>BASIC INFO (Compulsory)</Text>
                <View className="p-4 rounded-xl mb-6 border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                    <TextInput
                        placeholder="Name"
                        placeholderTextColor={colors.secondary}
                        value={basicInfo.name}
                        onChangeText={t => setBasicInfo({ ...basicInfo, name: t })}
                        className="mb-3 p-3 border-b"
                        style={{ color: colors.text, borderColor: colors.border }}
                    />
                    <TextInput
                        placeholder="Age"
                        placeholderTextColor={colors.secondary}
                        value={basicInfo.age}
                        onChangeText={t => setBasicInfo({ ...basicInfo, age: t })}
                        className="mb-3 p-3 border-b"
                        style={{ color: colors.text, borderColor: colors.border }}
                    />
                    <TextInput
                        placeholder="Location"
                        placeholderTextColor={colors.secondary}
                        value={basicInfo.location}
                        onChangeText={t => setBasicInfo({ ...basicInfo, location: t })}
                        className="mb-3 p-3 border-b"
                        style={{ color: colors.text, borderColor: colors.border }}
                    />
                    <TextInput
                        placeholder="Occupation / Studying"
                        placeholderTextColor={colors.secondary}
                        value={basicInfo.occupation}
                        onChangeText={t => setBasicInfo({ ...basicInfo, occupation: t })}
                        className="p-3"
                        style={{ color: colors.text }}
                    />
                </View>

                {/* Sections */}
                {sections.map((section, idx) => (
                    <View key={section.id} className="mb-6">
                        <View className="flex-row justify-between items-center mb-2">
                            <TextInput
                                value={section.title}
                                onChangeText={t => setSections(sections.map(s => s.id === section.id ? { ...s, title: t } : s))}
                                className="text-lg font-bold flex-1 mr-2"
                                style={{ color: colors.primary }}
                            />
                            <TouchableOpacity onPress={() => deleteSection(section.id)}>
                                <Trash2 color={colors.secondary} size={18} />
                            </TouchableOpacity>
                        </View>

                        <View className="p-2 rounded-xl border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                            {section.questions.map((q) => (
                                <View key={q.id} className="mb-4 border-b pb-4 last:border-0 last:pb-0" style={{ borderColor: colors.border }}>
                                    <View className="flex-row items-center mb-2">
                                        <TextInput
                                            value={q.question}
                                            onChangeText={t => updateQuestion(section.id, q.id, 'question', t)}
                                            className="font-semibold flex-1 text-sm"
                                            style={{ color: colors.secondary }}
                                        />
                                        <TouchableOpacity onPress={() => deleteQuestion(section.id, q.id)}>
                                            <XIcon color={colors.secondary} size={14} />
                                        </TouchableOpacity>
                                    </View>
                                    <TextInput
                                        placeholder="Your Answer..."
                                        placeholderTextColor={colors.secondary}
                                        value={q.answer}
                                        onChangeText={t => updateQuestion(section.id, q.id, 'answer', t)}
                                        className="p-3 rounded-lg bg-gray-50/5"
                                        style={{ color: colors.text, backgroundColor: mode === 'dark' ? '#ffffff10' : '#f3f4f6' }}
                                    />
                                </View>
                            ))}
                            <TouchableOpacity onPress={() => addQuestion(section.id)} className="mt-2 py-2 items-center border-t border-dashed" style={{ borderColor: colors.border }}>
                                <Text style={{ color: colors.primary }} className="text-sm font-semibold">+ Add Question</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ))}

                <TouchableOpacity onPress={addSection} className="flex-row items-center justify-center p-4 rounded-xl border-2 border-dashed mb-10" style={{ borderColor: colors.border }}>
                    <Plus color={colors.secondary} size={24} />
                    <Text className="ml-2 font-bold" style={{ color: colors.secondary }}>Add New Section</Text>
                </TouchableOpacity>

            </ScrollView>
        </SafeAreaView>
    );
}

function XIcon({ color, size }: { color: string, size: number }) {
    return (
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color, fontSize: size, lineHeight: size }}>×</Text>
        </View>
    )
}
