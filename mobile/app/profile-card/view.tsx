import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Dimensions, Clipboard, Alert, FlatList, Share, ViewToken } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Share2, Copy } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { ProfileCardService, ProfileCardData } from '../../services/ProfileCardService';
import ShareCardModal from '../../components/ShareCardModal';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 48;

export default function ProfileCardView() {
    const { userId, code } = useLocalSearchParams();
    const router = useRouter();
    const { colors, mode } = useTheme();

    // ALL HOOKS MUST BE AT THE TOP - before any conditional returns
    const [cardData, setCardData] = useState<ProfileCardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [userProfile, setUserProfile] = useState<any>(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [showShareModal, setShowShareModal] = useState(false);
    const flatListRef = useRef<FlatList>(null);

    const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
        if (viewableItems.length > 0 && viewableItems[0].index !== null) {
            setCurrentIndex(viewableItems[0].index);
        }
    }, []);

    const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

    useEffect(() => {
        const fetchCard = async () => {
            setLoading(true);
            let data: any = null;
            if (code) {
                const res = await ProfileCardService.getCardByCode(code as string);
                data = res;
                if (res?.user) setUserProfile(res.user);
            } else if (userId) {
                const res = await ProfileCardService.getCard(userId as string);
                data = res;
                if (res?.user) setUserProfile(res.user);
            }

            if (data) {
                setCardData({
                    uniqueCode: data.uniqueCode,
                    content: data.content,
                    theme: data.theme
                });
            }
            setLoading(false);
        };
        fetchCard();
    }, [userId, code]);

    const copyCode = () => {
        if (cardData?.uniqueCode) {
            Clipboard.setString(cardData.uniqueCode);
            Alert.alert('Copied', 'Profile Code copied to clipboard!');
        }
    };

    const handleShare = () => {
        setShowShareModal(true);
    };

    // Conditional returns AFTER all hooks
    if (loading) {
        return (
            <View className="flex-1 items-center justify-center" style={{ backgroundColor: colors.background }}>
                <Text style={{ color: colors.secondary }}>Loading Card...</Text>
            </View>
        );
    }

    if (!cardData) {
        return (
            <View className="flex-1 items-center justify-center p-6" style={{ backgroundColor: colors.background }}>
                <Text className="text-lg font-bold mb-2" style={{ color: colors.text }}>Card Not Found</Text>
                <Text style={{ color: colors.secondary }} className="text-center mb-6">This user hasn't created a profile card yet or the code is invalid.</Text>
                <TouchableOpacity onPress={() => router.back()} className="px-6 py-3 rounded-full bg-blue-500">
                    <Text className="text-white font-bold">Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const { basicInfo, sections } = cardData.content;
    const allCards = [
        { type: 'basic', id: 'basic-info', data: basicInfo },
        ...sections.map((s: any) => ({ type: 'section', id: s.id, data: s }))
    ];

    const renderCard = ({ item }: { item: any }) => {
        if (item.type === 'basic') {
            return (
                <View style={{ width: CARD_WIDTH, marginHorizontal: 8 }}>
                    <View className="rounded-3xl overflow-hidden" style={{ minHeight: 350 }}>
                        <BlurView intensity={40} tint={mode === 'light' ? 'light' : 'dark'} className="flex-1 p-6 items-center justify-center border" style={{ borderColor: colors.border }}>
                            <View className="w-28 h-28 rounded-full overflow-hidden mb-4 border-4" style={{ borderColor: colors.card }}>
                                <Image
                                    source={{ uri: userProfile?.profile?.avatarUrl }}
                                    className="w-full h-full"
                                />
                            </View>
                            <Text className="text-2xl font-bold mb-1" style={{ color: colors.text }}>{basicInfo.name}</Text>
                            <Text className="text-base mb-4 opacity-80" style={{ color: colors.text }}>{basicInfo.occupation}</Text>
                            <View className="flex-row gap-4">
                                <InfoBadge label="Age" value={basicInfo.age} colors={colors} />
                                <InfoBadge label="Location" value={basicInfo.location} colors={colors} />
                            </View>
                        </BlurView>
                    </View>
                </View>
            );
        }

        const section = item.data;
        return (
            <View style={{ width: CARD_WIDTH, marginHorizontal: 8 }}>
                <View className="rounded-3xl overflow-hidden border" style={{ borderColor: colors.border, minHeight: 350 }}>
                    <BlurView intensity={25} tint={mode === 'light' ? 'light' : 'dark'} className="flex-1 p-6">
                        <Text className="text-xl font-bold mb-4 uppercase tracking-wider" style={{ color: colors.primary }}>{section.title}</Text>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            {section.questions.map((q: any) => (
                                <View key={q.id} className="mb-4">
                                    <Text className="text-xs opacity-60 mb-1 font-semibold uppercase" style={{ color: colors.secondary }}>{q.question}</Text>
                                    <Text className="text-lg font-medium" style={{ color: colors.text }}>{q.answer || '-'}</Text>
                                </View>
                            ))}
                        </ScrollView>
                    </BlurView>
                </View>
            </View>
        );
    };

    return (
        <View className="flex-1" style={{ backgroundColor: '#000' }}>
            {/* Starfield Background */}
            <Image
                source={{ uri: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?q=80&w=2013&auto=format&fit=crop' }}
                className="absolute inset-0 w-full h-full"
                style={{ opacity: 0.7 }}
            />
            <LinearGradient
                colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.9)']}
                className="absolute inset-0"
                locations={[0, 0.5, 1]}
            />

            <SafeAreaView className="flex-1">
                <View className="flex-row items-center justify-between px-4 py-2 z-10">
                    <TouchableOpacity onPress={() => router.back()} className="p-2 rounded-full bg-white/10">
                        <ChevronLeft color="#fff" size={24} />
                    </TouchableOpacity>
                    <View className="flex-row items-center gap-2 bg-white/10 px-3 py-1 rounded-full">
                        <Text className="font-bold tracking-widest" style={{ color: '#fff' }}>{cardData.uniqueCode}</Text>
                        <TouchableOpacity onPress={copyCode}>
                            <Copy color="#fff" size={14} />
                        </TouchableOpacity>
                    </View>
                    <TouchableOpacity onPress={handleShare} className="p-2 rounded-full bg-white/10">
                        <Share2 color="#fff" size={22} />
                    </TouchableOpacity>
                </View>

                <View className="flex-1 items-center justify-center">
                    <FlatList
                        ref={flatListRef}
                        data={allCards}
                        renderItem={renderCard}
                        keyExtractor={(item) => item.id}
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        snapToInterval={CARD_WIDTH + 16}
                        decelerationRate="fast"
                        contentContainerStyle={{ paddingHorizontal: 16 }}
                        onViewableItemsChanged={onViewableItemsChanged}
                        viewabilityConfig={viewabilityConfig}
                    />

                    <View className="flex-row justify-center items-center mt-4 gap-2">
                        {allCards.map((_, index) => (
                            <View
                                key={index}
                                className="rounded-full"
                                style={{
                                    width: currentIndex === index ? 20 : 8,
                                    height: 8,
                                    backgroundColor: currentIndex === index ? colors.primary : colors.border
                                }}
                            />
                        ))}
                    </View>
                </View>

                <View className="items-center py-4">
                    <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>F U Y  •  P R O F I L E  C A R D</Text>
                </View>
            </SafeAreaView>

            {/* Share Modal */}
            {cardData && (
                <ShareCardModal
                    visible={showShareModal}
                    onClose={() => setShowShareModal(false)}
                    cardCode={cardData.uniqueCode}
                    cardOwnerName={cardData.content?.basicInfo?.name || 'User'}
                />
            )}
        </View>
    );
}

function InfoBadge({ label, value, colors }: any) {
    if (!value) return null;
    return (
        <View className="px-4 py-2 rounded-xl bg-gray-200/20 items-center">
            <Text className="text-[10px] uppercase font-bold opacity-60" style={{ color: colors.text }}>{label}</Text>
            <Text className="text-base font-semibold" style={{ color: colors.text }}>{value}</Text>
        </View>
    );
}
