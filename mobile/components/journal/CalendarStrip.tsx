import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';

interface CalendarStripProps {
    selectedDate: Date;
    onSelectDate: (date: Date) => void;
}

export function CalendarStrip({ selectedDate, onSelectDate }: CalendarStripProps) {
    // Generate last 7 days + next 7 days
    const dates = [];
    for (let i = -2; i <= 4; i++) {
        const d = new Date();
        d.setDate(d.getDate() + i);
        dates.push(d);
    }

    return (
        <View className="py-4">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 }}>
                {dates.map((date, index) => {
                    const isSelected = date.getDate() === selectedDate.getDate();
                    const dayName = date.toLocaleDateString('en-US', { weekday: 'narrow' }); // S, M, T...
                    const dayNum = date.getDate();

                    return (
                        <TouchableOpacity
                            key={index}
                            onPress={() => onSelectDate(date)}
                            className={`items-center justify-center mr-6 ${isSelected ? '' : ''}`}
                        >
                            <Text className={`text-xs mb-2 ${isSelected ? 'text-black font-bold' : 'text-gray-400'}`}>
                                {dayName}
                            </Text>
                            <View
                                className={`w-10 h-10 items-center justify-center rounded-full ${isSelected ? 'bg-black' : 'bg-transparent'
                                    }`}
                            >
                                <Text className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-gray-800'}`}>
                                    {dayNum}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </View>
    );
}
