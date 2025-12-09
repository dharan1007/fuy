import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Switch } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, Globe, Users, Lock, BarChart2 } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3000';

interface PollFormProps {
    onBack: () => void;
}

export default function PollForm({ onBack }: PollFormProps) {
    const { colors, isDark } = useTheme();
    const { session } = useAuth();
    const [question, setQuestion] = useState('');
    const [optionA, setOptionA] = useState('');
    const [optionB, setOptionB] = useState('');
    const [allowMultiple, setAllowMultiple] = useState(false);
    const [visibility, setVisibility] = useState('PUBLIC');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!question.trim()) {
            Alert.alert('Error', 'Please enter a question');
            return;
        }
        if (!optionA.trim() || !optionB.trim()) {
            Alert.alert('Error', 'Please fill in both options');
            return;
        }
        if (!session?.user?.email) {
            Alert.alert('Error', 'Please log in first');
            return;
        }

        setLoading(true);

        try {
            const { data: userData } = await supabase
                .from('User')
                .select('id')
                .eq('email', session.user.email)
                .single();

            if (!userData?.id) throw new Error('User not found');

            const response = await fetch(`${API_URL}/api/posts/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: userData.id,
                    postType: 'PULLUPDOWN',
                    content: question,
                    visibility,
                    pullUpDownData: {
                        question,
                        optionA,
                        optionB,
                        allowMultiple,
                    },
                }),
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Failed to create poll');
            }

            Alert.alert('Success', 'Poll posted!', [{ text: 'OK', onPress: onBack }]);
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    const VisibilityOption = ({ value, label, icon: Icon }: any) => (
        <TouchableOpacity
            onPress={() => setVisibility(value)}
            className={`flex-1 flex-row items-center justify-center p-3 rounded-xl border ${visibility === value ? 'bg-teal-500 border-teal-500' : 'bg-transparent border-gray-200 dark:border-white/10'}`}
        >
            <Icon size={16} color={visibility === value ? 'white' : colors.text} />
            <Text style={{ color: visibility === value ? 'white' : colors.text, fontWeight: '600', marginLeft: 6 }}>{label}</Text>
        </TouchableOpacity>
    );

    return (
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
            <View className="flex-row items-center mb-6">
                <TouchableOpacity
                    onPress={onBack}
                    className={`p-3 rounded-full mr-4 ${isDark ? 'bg-white/10' : 'bg-gray-100'}`}
                    style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}
                >
                    <ArrowLeft size={24} color={colors.text} />
                </TouchableOpacity>
                <View>
                    <Text style={{ color: colors.text, fontSize: 22, fontWeight: 'bold' }}>New Poll</Text>
                    <Text style={{ color: colors.secondary, fontSize: 12 }}>Pull Up or Pull Down voting</Text>
                </View>
            </View>

            {/* Question */}
            <View className="mb-6">
                <Text style={{ color: colors.secondary, marginBottom: 8, fontWeight: '600' }}>Question</Text>
                <TextInput
                    value={question}
                    onChangeText={setQuestion}
                    placeholder="Ask something..."
                    placeholderTextColor={colors.secondary}
                    multiline
                    style={{
                        color: colors.text,
                        backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5',
                        padding: 16,
                        borderRadius: 16,
                        borderWidth: 1,
                        borderColor: colors.border,
                        minHeight: 80,
                        textAlignVertical: 'top'
                    }}
                />
            </View>

            {/* Option A (Pull Up) */}
            <View className="mb-4">
                <Text style={{ color: colors.secondary, marginBottom: 8, fontWeight: '600' }}>
                    ⬆️ Option A (Pull Up)
                </Text>
                <TextInput
                    value={optionA}
                    onChangeText={setOptionA}
                    placeholder="First option..."
                    placeholderTextColor={colors.secondary}
                    style={{
                        color: colors.text,
                        backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5',
                        padding: 16,
                        borderRadius: 16,
                        borderWidth: 2,
                        borderColor: '#22c55e',
                    }}
                />
            </View>

            {/* Option B (Pull Down) */}
            <View className="mb-6">
                <Text style={{ color: colors.secondary, marginBottom: 8, fontWeight: '600' }}>
                    ⬇️ Option B (Pull Down)
                </Text>
                <TextInput
                    value={optionB}
                    onChangeText={setOptionB}
                    placeholder="Second option..."
                    placeholderTextColor={colors.secondary}
                    style={{
                        color: colors.text,
                        backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5',
                        padding: 16,
                        borderRadius: 16,
                        borderWidth: 2,
                        borderColor: '#ef4444',
                    }}
                />
            </View>

            {/* Allow Multiple Votes */}
            <View className="mb-6 flex-row items-center justify-between p-4 rounded-xl" style={{ backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5' }}>
                <Text style={{ color: colors.text, fontWeight: '600' }}>Allow multiple votes per user</Text>
                <Switch
                    value={allowMultiple}
                    onValueChange={setAllowMultiple}
                    trackColor={{ false: colors.border, true: '#14b8a6' }}
                    thumbColor={allowMultiple ? '#fff' : '#f4f3f4'}
                />
            </View>

            {/* Visibility */}
            <View className="mb-6">
                <Text style={{ color: colors.secondary, marginBottom: 8, fontWeight: '600' }}>Visibility</Text>
                <View className="flex-row gap-2">
                    <VisibilityOption value="PUBLIC" label="Public" icon={Globe} />
                    <VisibilityOption value="FRIENDS" label="Friends" icon={Users} />
                    <VisibilityOption value="PRIVATE" label="Private" icon={Lock} />
                </View>
            </View>

            {/* Submit */}
            <TouchableOpacity
                onPress={handleSubmit}
                disabled={loading}
                style={{
                    backgroundColor: '#14b8a6',
                    padding: 18,
                    borderRadius: 16,
                    alignItems: 'center',
                    marginBottom: 40,
                    opacity: loading ? 0.6 : 1,
                }}
            >
                {loading ? (
                    <ActivityIndicator color="white" />
                ) : (
                    <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 18 }}>Create Poll</Text>
                )}
            </TouchableOpacity>
        </ScrollView>
    );
}
