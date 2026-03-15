
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';

export default function PrivacyScreen() {
    const router = useRouter();
    const { colors } = useTheme();

    return (
        <View className="flex-1" style={{ backgroundColor: colors.background }}>
            <SafeAreaView className="flex-1">
                <View className="px-6 py-4 flex-row items-center gap-4 border-b border-gray-800">
                    <TouchableOpacity onPress={() => router.back()} className="p-2 rounded-full" style={{ backgroundColor: colors.card }}>
                        <ChevronLeft color={colors.text} size={24} />
                    </TouchableOpacity>
                    <Text className="text-xl font-bold" style={{ color: colors.text }}>Privacy Policy</Text>
                </View>
                <ScrollView className="flex-1 p-6">
                    <Text style={{ color: colors.text, lineHeight: 24, fontSize: 14, marginBottom: 12 }}>
                        Dvange ("we," "us," "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our real-time messaging platform, web and mobile applications, and services.
                    </Text>

                    <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold', marginTop: 16, marginBottom: 12 }}>1. Information We Collect</Text>
                    <Text style={{ color: colors.text, lineHeight: 24, fontSize: 14, marginBottom: 12 }}>
                        <Text style={{ fontWeight: 'bold' }}>1.1 Account Information:</Text> Name, email address, username, password, profile picture, and bio.{"\n"}
                        <Text style={{ fontWeight: 'bold' }}>1.2 Message Data:</Text> Content of messages you send, timestamps, typing indicators, and shared media.{"\n"}
                        <Text style={{ fontWeight: 'bold' }}>1.3 Usage Analytics:</Text> Features used, interaction patterns, and time spent on the platform.
                    </Text>

                    <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold', marginTop: 16, marginBottom: 12 }}>2. How We Use Your Information</Text>
                    <Text style={{ color: colors.text, lineHeight: 24, fontSize: 14, marginBottom: 12 }}>
                        • Create, manage, and update your account.{"\n"}
                        • Deliver real-time messages instantly to other users.{"\n"}
                        • Manage your followers and friendships.{"\n"}
                        • Detect fraud, prevent abuse, and maintain safety.
                    </Text>

                    <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold', marginTop: 16, marginBottom: 12 }}>3. How We Share Your Information</Text>
                    <Text style={{ color: colors.text, lineHeight: 24, fontSize: 14, marginBottom: 12 }}>
                        Your messages are shared only with the intended recipient(s). They are not publicly visible. We only share information with trusted third-party service providers who help us operate the platform (e.g. Cloud hosting).
                    </Text>

                    <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold', marginTop: 16, marginBottom: 12 }}>4. Data Security & Your Rights</Text>
                    <Text style={{ color: colors.text, lineHeight: 24, fontSize: 14, marginBottom: 12 }}>
                        We implement TLS/SSL encryption and secure password hashing to protect your information. You can access, review, and update your personal information anytime. You may also request deletion of your account and personal data by contacting us at fuy.aphelion@gmail.com.
                    </Text>

                    <Text style={{ color: colors.text, lineHeight: 24, fontSize: 14, marginTop: 20, marginBottom: 100, textAlign: 'center', opacity: 0.5 }}>
                        Last Updated: March 10, 2026
                    </Text>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}
