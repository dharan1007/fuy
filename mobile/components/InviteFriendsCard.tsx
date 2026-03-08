import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Share } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Send, Users, Share2, Link } from 'lucide-react-native';

export default function InviteFriendsCard() {
    const { session } = useAuth();
    const { colors, mode } = useTheme();

    const handleInvite = async () => {
        const userId = session?.user?.id || '';
        const inviteUrl = `https://dvange.app/invite?ref=${userId}`;
        const appScheme = `dvange://invite?ref=${userId}`;

        try {
            await Share.share({
                title: 'Join me on Dvange',
                message: `Hey! Come join me on Dvange - where real content lives. Download the app and let's connect!\n\n${inviteUrl}`,
                url: inviteUrl,
            });
        } catch (e) {
            // User cancelled share
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: mode === 'dark' ? '#0a0a0a' : '#f5f5f5' }]}>
            <View style={[styles.card, {
                backgroundColor: mode === 'dark' ? '#141414' : '#fff',
                borderColor: mode === 'dark' ? '#222' : '#e5e5e5',
            }]}>
                <View style={styles.iconRow}>
                    <View style={[styles.iconCircle, { backgroundColor: colors.primary || '#3b82f6' }]}>
                        <Users size={20} color="#fff" />
                    </View>
                </View>

                <Text style={[styles.heading, { color: colors.text }]}>Invite Your Friends</Text>
                <Text style={[styles.subtitle, { color: colors.secondary }]}>
                    Bring your crew to Dvange. Share a link on WhatsApp, Snap, Instagram or anywhere.
                </Text>

                <TouchableOpacity onPress={handleInvite} style={[styles.button, { backgroundColor: colors.primary || '#3b82f6' }]}>
                    <Send size={14} color="#fff" />
                    <Text style={styles.buttonText}>Send Invite</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    card: {
        borderRadius: 20,
        padding: 20,
        alignItems: 'center',
        borderWidth: 1,
    },
    iconRow: {
        marginBottom: 12,
    },
    iconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    heading: {
        fontSize: 17,
        fontWeight: '700',
        marginBottom: 6,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 12,
        textAlign: 'center',
        lineHeight: 18,
        marginBottom: 16,
        paddingHorizontal: 8,
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 28,
        paddingVertical: 12,
        borderRadius: 24,
        gap: 8,
    },
    buttonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },
});
