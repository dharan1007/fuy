import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, Globe, Users, Lock, Plus, X, Clapperboard, Link, Wrench, Network } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3000';

interface BTSFormProps {
    onBack: () => void;
}

interface Credit {
    name: string;
    role: string;
    link?: string;
}

interface Tool {
    name: string;
    category: string;
    link?: string;
}

export default function BTSForm({ onBack }: BTSFormProps) {
    const { colors, isDark } = useTheme();
    const { session } = useAuth();
    const [description, setDescription] = useState('');
    const [visibility, setVisibility] = useState('PUBLIC');
    const [credits, setCredits] = useState<Credit[]>([{ name: '', role: '' }]);
    const [tools, setTools] = useState<Tool[]>([{ name: '', category: '' }]);
    const [links, setLinks] = useState<string[]>(['']);
    const [loading, setLoading] = useState(false);

    const addCredit = () => {
        if (credits.length < 10) {
            setCredits([...credits, { name: '', role: '' }]);
        }
    };

    const updateCredit = (index: number, field: keyof Credit, value: string) => {
        const newCredits = [...credits];
        newCredits[index][field] = value;
        setCredits(newCredits);
    };

    const removeCredit = (index: number) => {
        if (credits.length > 1) {
            setCredits(credits.filter((_, i) => i !== index));
        }
    };

    const addTool = () => {
        if (tools.length < 10) {
            setTools([...tools, { name: '', category: '' }]);
        }
    };

    const updateTool = (index: number, field: keyof Tool, value: string) => {
        const newTools = [...tools];
        newTools[index][field] = value;
        setTools(newTools);
    };

    const removeTool = (index: number) => {
        if (tools.length > 1) {
            setTools(tools.filter((_, i) => i !== index));
        }
    };

    const handleSubmit = async () => {
        const validCredits = credits.filter(c => c.name.trim() && c.role.trim());
        if (validCredits.length === 0) {
            Alert.alert('Error', 'Please add at least one credit with name and role');
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

            const validTools = tools.filter(t => t.name.trim());
            const validLinks = links.filter(l => l.trim()).map(l => ({ title: 'Link', url: l, description: '' }));

            const response = await fetch(`${API_URL}/api/posts/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: userData.id,
                    postType: 'BTS',
                    content: description || 'Behind the Scenes',
                    visibility,
                    btsData: {
                        credits: JSON.stringify(validCredits),
                        tools: validTools.length > 0 ? JSON.stringify(validTools) : null,
                        links: validLinks.length > 0 ? JSON.stringify(validLinks) : null,
                    },
                }),
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Failed to create BTS');
            }

            Alert.alert('Success', 'BTS posted!', [{ text: 'OK', onPress: onBack }]);
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    const VisibilityOption = ({ value, label, icon: Icon }: any) => (
        <TouchableOpacity
            onPress={() => setVisibility(value)}
            className={`flex-1 flex-row items-center justify-center p-3 rounded-xl border ${visibility === value ? 'bg-orange-500 border-orange-500' : 'bg-transparent border-gray-200 dark:border-white/10'}`}
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
                    <Text style={{ color: colors.text, fontSize: 22, fontWeight: 'bold' }}>New BTS</Text>
                    <Text style={{ color: colors.secondary, fontSize: 12 }}>Credits, tools & resources</Text>
                </View>
            </View>

            {/* Description */}
            <View className="mb-6">
                <Text style={{ color: colors.secondary, marginBottom: 8, fontWeight: '600' }}>Description</Text>
                <TextInput
                    value={description}
                    onChangeText={setDescription}
                    placeholder="What's behind the scenes?"
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

            {/* Credits Section */}
            <View className="mb-6">
                <View className="flex-row justify-between items-center mb-3">
                    <View className="flex-row items-center">
                        <Clapperboard size={20} color="#f97316" />
                        <Text style={{ color: colors.text, marginLeft: 8, fontWeight: '600', fontSize: 16 }}>Credits</Text>
                    </View>
                    <TouchableOpacity onPress={addCredit} className="bg-orange-500 px-3 py-1 rounded-full">
                        <Text style={{ color: 'white', fontWeight: '600' }}>+ Add</Text>
                    </TouchableOpacity>
                </View>
                {credits.map((credit, index) => (
                    <View key={index} className="flex-row gap-2 mb-2">
                        <TextInput
                            value={credit.name}
                            onChangeText={(v) => updateCredit(index, 'name', v)}
                            placeholder="Name"
                            placeholderTextColor={colors.secondary}
                            style={{
                                flex: 1,
                                color: colors.text,
                                backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5',
                                padding: 12,
                                borderRadius: 12,
                            }}
                        />
                        <TextInput
                            value={credit.role}
                            onChangeText={(v) => updateCredit(index, 'role', v)}
                            placeholder="Role"
                            placeholderTextColor={colors.secondary}
                            style={{
                                flex: 1,
                                color: colors.text,
                                backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5',
                                padding: 12,
                                borderRadius: 12,
                            }}
                        />
                        {credits.length > 1 && (
                            <TouchableOpacity onPress={() => removeCredit(index)} className="p-3">
                                <X size={16} color="#ef4444" />
                            </TouchableOpacity>
                        )}
                    </View>
                ))}
            </View>

            {/* Tools Section */}
            <View className="mb-6">
                <View className="flex-row justify-between items-center mb-3">
                    <View className="flex-row items-center">
                        <Wrench size={20} color="#f97316" />
                        <Text style={{ color: colors.text, marginLeft: 8, fontWeight: '600', fontSize: 16 }}>Tools Used</Text>
                    </View>
                    <TouchableOpacity onPress={addTool} className="bg-orange-500 px-3 py-1 rounded-full">
                        <Text style={{ color: 'white', fontWeight: '600' }}>+ Add</Text>
                    </TouchableOpacity>
                </View>
                {tools.map((tool, index) => (
                    <View key={index} className="flex-row gap-2 mb-2">
                        <TextInput
                            value={tool.name}
                            onChangeText={(v) => updateTool(index, 'name', v)}
                            placeholder="Tool name"
                            placeholderTextColor={colors.secondary}
                            style={{
                                flex: 1,
                                color: colors.text,
                                backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5',
                                padding: 12,
                                borderRadius: 12,
                            }}
                        />
                        <TextInput
                            value={tool.category}
                            onChangeText={(v) => updateTool(index, 'category', v)}
                            placeholder="Category"
                            placeholderTextColor={colors.secondary}
                            style={{
                                flex: 1,
                                color: colors.text,
                                backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5',
                                padding: 12,
                                borderRadius: 12,
                            }}
                        />
                        {tools.length > 1 && (
                            <TouchableOpacity onPress={() => removeTool(index)} className="p-3">
                                <X size={16} color="#ef4444" />
                            </TouchableOpacity>
                        )}
                    </View>
                ))}
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
                    backgroundColor: '#f97316',
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
                    <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 18 }}>Post BTS</Text>
                )}
            </TouchableOpacity>
        </ScrollView>
    );
}
