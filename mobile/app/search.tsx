import React, { useState } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Search as SearchIcon, ChevronLeft, X, User, Hash, FileText } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';

type ResultType = 'user' | 'post' | 'tag';

interface SearchResult {
    id: string;
    type: ResultType;
    title: string;
    subtitle?: string;
    image?: string;
}

export default function SearchScreen() {
    const router = useRouter();
    const { colors, mode } = useTheme();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);

    const performSearch = async (text: string) => {
        if (text.length < 2) { setResults([]); return; }
        setLoading(true);
        try {
            const { data } = await supabase.from('Profile').select('userId, displayName, avatarUrl').ilike('displayName', `%${text}%`).limit(10);
            const mapped: SearchResult[] = (data || []).map((p: any) => ({
                id: p.userId, type: 'user', title: p.displayName, image: p.avatarUrl
            }));
            setResults(mapped);
        } catch (e) { setResults([]); }
        setLoading(false);
    };

    const getIcon = (type: ResultType) => {
        if (type === 'user') return <User size={18} color={colors.secondary} />;
        if (type === 'tag') return <Hash size={18} color={colors.secondary} />;
        return <FileText size={18} color={colors.secondary} />;
    };

    const handleResultPress = (item: SearchResult) => {
        if (item.type === 'user') {
            router.push(`/profile/${item.id}` as any);
        } else if (item.type === 'tag') {
            router.push(`/slash/${item.title}` as any);
        } else if (item.type === 'post') {
            router.push(`/post/${item.id}` as any);
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <LinearGradient colors={mode === 'light' ? ['#fff', '#f5f5f5'] : ['#000', '#0a0a0a']} style={{ position: 'absolute', inset: 0 }} />
            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 }}>
                    <TouchableOpacity onPress={() => router.back()} style={{ padding: 8, backgroundColor: colors.card, borderRadius: 12 }}>
                        <ChevronLeft color={colors.text} size={22} />
                    </TouchableOpacity>
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: colors.border }}>
                        <SearchIcon color={colors.secondary} size={18} />
                        <TextInput
                            autoFocus
                            placeholder='Search users, posts, tags...'
                            placeholderTextColor={colors.secondary}
                            value={query}
                            onChangeText={t => { setQuery(t); performSearch(t); }}
                            style={{ flex: 1, marginLeft: 10, fontSize: 15, color: colors.text }}
                        />
                        {query.length > 0 && (
                            <TouchableOpacity onPress={() => { setQuery(''); setResults([]); }}>
                                <X color={colors.secondary} size={18} />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
                <FlatList
                    data={results}
                    keyExtractor={item => item.id}
                    contentContainerStyle={{ padding: 16 }}
                    ListEmptyComponent={query.length > 1 ? <Text style={{ color: colors.secondary, textAlign: 'center', marginTop: 40 }}>No results found</Text> : null}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={{ flexDirection: 'row', alignItems: 'center', padding: 14, backgroundColor: colors.card, borderRadius: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.border }}
                            onPress={() => handleResultPress(item)}
                        >
                            {item.image ? <Image source={{ uri: item.image }} style={{ width: 44, height: 44, borderRadius: 22 }} /> : <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.secondary, justifyContent: 'center', alignItems: 'center' }}>{getIcon(item.type)}</View>}
                            <View style={{ flex: 1, marginLeft: 12 }}>
                                <Text style={{ color: colors.text, fontWeight: '600' }}>{item.title}</Text>
                                {item.subtitle && <Text style={{ color: colors.secondary, fontSize: 12 }}>{item.subtitle}</Text>}
                            </View>
                        </TouchableOpacity>
                    )}
                />
            </SafeAreaView>
        </View>
    );
}
