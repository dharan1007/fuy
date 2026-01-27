import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../../context/ThemeContext';
import { ArrowLeft, MessageCircle, Mail, FileText, HelpCircle, ExternalLink } from 'lucide-react-native';

export default function SupportScreen() {
    const router = useRouter();
    const { colors, mode } = useTheme();

    const borderColor = mode === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)';

    const SupportOption = ({ title, description, icon: Icon, onPress }: { title: string; description: string; icon: any; onPress: () => void }) => (
        <TouchableOpacity
            onPress={onPress}
            style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: 16,
                backgroundColor: 'transparent',
                borderWidth: 1,
                borderColor,
                borderRadius: 16,
                marginBottom: 12,
                gap: 14,
            }}
        >
            <View style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                alignItems: 'center',
                justifyContent: 'center',
            }}>
                <Icon size={20} color={colors.text} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>{title}</Text>
                <Text style={{ fontSize: 12, color: mode === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)', marginTop: 2 }}>{description}</Text>
            </View>
            <ExternalLink size={16} color={mode === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)'} />
        </TouchableOpacity>
    );

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                {/* Header */}
                <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 20,
                    paddingVertical: 16,
                    borderBottomWidth: 1,
                    borderBottomColor: borderColor,
                }}>
                    <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 16 }}>
                        <ArrowLeft size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>Seller Support</Text>
                </View>

                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Info Box */}
                    <View style={{
                        padding: 20,
                        backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                        borderRadius: 16,
                        marginBottom: 24,
                    }}>
                        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 8 }}>Need Help?</Text>
                        <Text style={{ fontSize: 14, color: mode === 'dark' ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)', lineHeight: 22 }}>
                            Our seller support team is here to help you with your store, listings, orders, and payments.
                        </Text>
                    </View>

                    {/* Support Options */}
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 16 }}>Contact Us</Text>

                    <SupportOption
                        title="Live Chat"
                        description="Chat with a support agent"
                        icon={MessageCircle}
                        onPress={() => router.push('/chat')}
                    />

                    <SupportOption
                        title="Email Support"
                        description="support@fuymedia.org"
                        icon={Mail}
                        onPress={() => Linking.openURL('mailto:support@fuymedia.org')}
                    />

                    {/* Resources */}
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginTop: 16, marginBottom: 16 }}>Resources</Text>

                    <SupportOption
                        title="Seller Guidelines"
                        description="Learn about selling on FUY"
                        icon={FileText}
                        onPress={() => Linking.openURL('https://fuymedia.org/seller-guidelines')}
                    />

                    <SupportOption
                        title="FAQ"
                        description="Frequently asked questions"
                        icon={HelpCircle}
                        onPress={() => Linking.openURL('https://fuymedia.org/faq')}
                    />

                    {/* Common Issues */}
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginTop: 16, marginBottom: 16 }}>Common Issues</Text>

                    {[
                        'How do I edit a listing?',
                        'Why was my product rejected?',
                        'How do payouts work?',
                        'Can I offer discounts?',
                    ].map((q, i) => (
                        <TouchableOpacity
                            key={i}
                            style={{
                                padding: 14,
                                backgroundColor: 'transparent',
                                borderWidth: 1,
                                borderColor,
                                borderRadius: 12,
                                marginBottom: 10,
                            }}
                        >
                            <Text style={{ fontSize: 14, color: colors.text }}>{q}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}
