import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { Search, Plus, MoreVertical } from 'lucide-react-native';
import { CalendarStrip } from '../../components/journal/CalendarStrip';
import { JournalCard } from '../../components/journal/JournalCard';

// Dummy Data
const TODAY_ENTRIES = [
    {
        id: '1',
        title: 'First day at work',
        content: 'Lorem ipsum dolor sit amet...',
        date: 'Feb 9, 2022',
        time: '12:14',
        mood: 'happy' as const,
        imageUrl: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=500&auto=format&fit=crop&q=60',
    },
];

const RECENT_ENTRIES = [
    {
        id: '2',
        title: 'Soccer game',
        content: 'Played a great game today...',
        date: 'Feb 8, 2022',
        time: '20:35',
        mood: 'happy' as const,
    },
    {
        id: '3',
        title: 'Planning vacation!',
        content: 'Thinking about going to Italy...',
        date: 'Feb 6, 2022',
        time: '21:54',
        mood: 'happy' as const,
    },
    {
        id: '4',
        title: 'Visiting family',
        content: 'Had a lovely dinner with mom...',
        date: 'Feb 5, 2022',
        time: '18:30',
        mood: 'neutral' as const,
    },
];

export default function JournalHome() {
    const router = useRouter();
    const [selectedDate, setSelectedDate] = useState(new Date());

    return (
        <SafeAreaView className="flex-1 bg-white">
            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View className="px-6 pt-4 pb-2 flex-row justify-between items-start">
                    <View>
                        <Text className="text-2xl font-bold text-gray-900">Goodmorning Sam</Text>
                        <Text className="text-gray-400 text-sm mt-1">Tuesday, February 9, 2022</Text>
                    </View>
                    <TouchableOpacity className="p-2 -mr-2">
                        <MoreVertical size={24} color="#374151" />
                    </TouchableOpacity>
                </View>

                {/* Calendar Strip */}
                <CalendarStrip selectedDate={selectedDate} onSelectDate={setSelectedDate} />

                {/* Search Bar */}
                <View className="px-6 py-4">
                    <View className="flex-row items-center bg-gray-50 rounded-2xl px-4 py-3 border border-gray-100">
                        <Search size={20} color="#9CA3AF" />
                        <TextInput
                            placeholder="Search entries"
                            className="flex-1 ml-3 text-base text-gray-900"
                            placeholderTextColor="#9CA3AF"
                        />
                    </View>
                </View>

                {/* Today's Section */}
                <View className="px-6 mb-6">
                    <Text className="text-lg font-bold text-gray-900 mb-4">Today</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-6 px-6">
                        {TODAY_ENTRIES.map((entry) => (
                            <JournalCard
                                key={entry.id}
                                entry={entry}
                                onPress={() => router.push(`/journal/${entry.id}`)}
                                variant="large"
                            />
                        ))}

                        {/* Add New Card Placeholder */}
                        <TouchableOpacity
                            className="w-40 h-64 bg-gray-50 rounded-3xl items-center justify-center border-2 border-dashed border-gray-200"
                            onPress={() => router.push('/journal/create')}
                        >
                            <View className="w-12 h-12 rounded-full bg-white items-center justify-center shadow-sm">
                                <Plus size={24} color="#D1D5DB" />
                            </View>
                        </TouchableOpacity>
                    </ScrollView>
                </View>

                {/* Recent Entries */}
                <View className="px-6 pb-20">
                    <View className="flex-row justify-between items-center mb-4">
                        <Text className="text-lg font-bold text-gray-900">Recent Entries</Text>
                        <TouchableOpacity>
                            <Text className="text-gray-400 text-sm">View all</Text>
                        </TouchableOpacity>
                    </View>

                    {RECENT_ENTRIES.map((entry) => (
                        <JournalCard
                            key={entry.id}
                            entry={entry}
                            onPress={() => router.push(`/journal/${entry.id}`)}
                            variant="list"
                        />
                    ))}
                </View>
            </ScrollView>

            {/* FAB */}
            <View className="absolute bottom-8 right-6">
                <TouchableOpacity
                    className="w-14 h-14 bg-black rounded-2xl items-center justify-center shadow-lg shadow-black/30"
                    onPress={() => router.push('/journal/create')}
                >
                    <Plus size={28} color="white" />
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}
