
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';

export default function TermsScreen() {
    const router = useRouter();
    const { colors } = useTheme();

    return (
        <View className="flex-1" style={{ backgroundColor: colors.background }}>
            <SafeAreaView className="flex-1">
                <View className="px-6 py-4 flex-row items-center gap-4 border-b border-gray-800">
                    <TouchableOpacity onPress={() => router.back()} className="p-2 rounded-full" style={{ backgroundColor: colors.card }}>
                        <ChevronLeft color={colors.text} size={24} />
                    </TouchableOpacity>
                    <Text className="text-xl font-bold" style={{ color: colors.text }}>Terms of Service</Text>
                </View>
                <ScrollView className="flex-1 p-6">
                    <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold', marginBottom: 16 }}>OVERVIEW</Text>
                    <Text style={{ color: colors.text, lineHeight: 24, fontSize: 14, marginBottom: 12 }}>
                        This website and mobile application is operated by FUY Media ("Company," "we," "us," "our"). FUY Media offers this platform, including all information, tools, services, features, and content available through this site and app (collectively, the "Service") to you, the user, conditioned upon your acceptance of all terms, conditions, policies, and notices stated herein.
                    </Text>
                    <Text style={{ color: colors.text, lineHeight: 24, fontSize: 14, marginBottom: 12 }}>
                        By visiting our site, using our mobile application, and/or using any of our Services, you engage in our "Service" and agree to be bound by the following terms and conditions ("Terms of Service," "Terms").
                    </Text>

                    <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold', marginTop: 16, marginBottom: 12 }}>SECTION 1 - USER ELIGIBILITY AND ACCOUNT REGISTRATION</Text>
                    <Text style={{ color: colors.text, lineHeight: 24, fontSize: 14, marginBottom: 12 }}>
                        By agreeing to these Terms of Service, you represent that you are at least 18 years of age or the age of majority in your jurisdiction. You are responsible for maintaining the confidentiality of your account information and password. You agree to accept responsibility for all activities that occur under your account.
                    </Text>

                    <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold', marginTop: 16, marginBottom: 12 }}>SECTION 2 - MESSAGING AND REAL-TIME COMMUNICATION</Text>
                    <Text style={{ color: colors.text, lineHeight: 24, fontSize: 14, marginBottom: 12 }}>
                        FUY Media provides real-time messaging capabilities that allow users to communicate with followers, following connections, and other platform members. By using the messaging service, you agree to:
                        {"\n"}• Use messaging functionality only for legitimate communication purposes.
                        {"\n"}• Not send spam, harassment, threats, hate speech, or inappropriate content.
                        {"\n"}• Respect the privacy and dignity of all platform members.
                    </Text>

                    <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold', marginTop: 16, marginBottom: 12 }}>SECTION 3 - USER PROFILES AND CONTENT</Text>
                    <Text style={{ color: colors.text, lineHeight: 24, fontSize: 14, marginBottom: 12 }}>
                        You retain ownership of all content you create on FUY Media, including profile information, photos, videos, and posts. By uploading content to FUY Media, you grant us a non-exclusive, royalty-free, perpetual, irrevocable, and fully sublicensable right to use, reproduce, modify, distribute, and display your content solely for operating and improving the Service.
                    </Text>

                    <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold', marginTop: 16, marginBottom: 12 }}>SECTION 4 - PROHIBITED CONDUCT</Text>
                    <Text style={{ color: colors.text, lineHeight: 24, fontSize: 14, marginBottom: 12 }}>
                        You are prohibited from:
                        {"\n"}• Using the Service for any unlawful purpose.
                        {"\n"}• Harassing, abusing, threatening, defaming, or intimidating other users.
                        {"\n"}• Uploading or transmitting viruses or malicious code.
                        {"\n"}• Engaging in fraud, scams, or deceptive practices.
                    </Text>

                    <Text style={{ color: colors.text, lineHeight: 24, fontSize: 14, marginTop: 20, marginBottom: 100, textAlign: 'center', opacity: 0.5 }}>
                        Last Updated: November 14, 2024
                    </Text>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}
