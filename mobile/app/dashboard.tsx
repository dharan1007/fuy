import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Dimensions, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    Anchor,
    ShoppingBag,
    Timer,
    Package,
    Tv,
    Heart,
    Book,
    MapPin,
    ChevronLeft,
    Eye,
    MessageCircle,
    TrendingUp,
    CreditCard,
    GraduationCap,
    BookOpen,
    ChevronRight
} from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { api } from '../lib/api-client';

const { width } = Dimensions.get('window');
const GAP = 12;
const ITEM_WIDTH = (width - (GAP * 5)) / 4; // 4 columns

// Meteor Configurations - Black/White with Organic Shapes
const METEORS = [
    {
        id: 'bonding',
        title: 'Relationships',
        subtitle: 'Bonds',
        icon: Heart,
        colors: ['#d90429', '#8d021f'], // Red (Keep)
        route: '/bonds',
        radius: { tl: 30, tr: 25, bl: 25, br: 30 },
        shadowColor: '#d90429',
        borderWidth: 0,
        borderColor: 'transparent'
    },
    {
        id: 'store',
        title: 'Store',
        subtitle: 'Shop',
        icon: ShoppingBag,
        colors: ['#101010', '#000000'],
        route: '/store',
        radius: { tl: 20, tr: 30, bl: 30, br: 25 }, // Blobby
        shadowColor: '#ffffff',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)'
    },
    {
        id: 'wrex',
        title: 'Grounding',
        subtitle: 'WREX',
        icon: Anchor,
        colors: ['#101010', '#000000'],
        route: '/grounding',
        radius: { tl: 35, tr: 15, bl: 35, br: 15 },
        shadowColor: '#ffffff',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)'
    },
    {
        id: 'pomodoro',
        title: 'Focus',
        subtitle: 'Timer',
        icon: Timer,
        colors: ['#101010', '#000000'],
        route: '/pomodoro',
        radius: { tl: 25, tr: 25, bl: 15, br: 30 },
        shadowColor: '#ffffff',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)'
    },
    {
        id: 'orders',
        title: 'Orders',
        subtitle: 'Shipments',
        icon: Package,
        colors: ['#101010', '#000000'],
        route: '/orders',
        radius: { tl: 20, tr: 28, bl: 20, br: 28 },
        shadowColor: '#ffffff',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)'
    },
    {
        id: 'canvas',
        title: 'Journal',
        subtitle: 'Canvas',
        icon: Book,
        colors: ['#101010', '#000000'],
        route: '/journal',
        radius: { tl: 30, tr: 15, bl: 25, br: 20 },
        shadowColor: '#ffffff',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)'
    },
    {
        id: 'hopin',
        title: 'Events',
        subtitle: 'Hopin',
        icon: MapPin,
        colors: ['#101010', '#000000'],
        route: '/hopin',
        radius: { tl: 20, tr: 30, bl: 30, br: 20 },
        shadowColor: '#ffffff',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)'
    },
    {
        id: 'channel',
        title: 'Channel',
        subtitle: 'Broadcast',
        icon: Tv,
        colors: ['#e5e5e5', '#ffffff'], // White (Keep)
        route: '/channel',
        radius: { tl: 30, tr: 20, bl: 25, br: 25 },
        shadowColor: '#ffffff',
        textColor: '#000',
        borderWidth: 0,
        borderColor: 'transparent'
    }
];

// Quick Links for additional pages
const QUICK_LINKS = [
    { id: 'transactions', title: 'Transactions', icon: CreditCard, route: '/transactions' },
    { id: 'purchases', title: 'Purchases', icon: ShoppingBag, route: '/purchases' },
    { id: 'views', title: 'Recently Viewed', icon: Eye, route: '/views' },
    { id: 'courses', title: 'My Courses', icon: GraduationCap, route: '/courses' },
    { id: 'books', title: 'My Books', icon: BookOpen, route: '/books' },
];

export default function DashboardScreen() {
    const router = useRouter();
    const { colors, mode } = useTheme();
    const [stats, setStats] = useState({ totalViews: 0, totalLikes: 0, totalComments: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        try {
            const { data, error } = await api.get<any>('/api/profile');
            if (data && !error) {
                setStats({
                    totalViews: data.totalViews || 0,
                    totalLikes: data.totalLikes || 0,
                    totalComments: data.totalComments || 0
                });
            }
        } catch (e) {
            console.error('Failed to fetch analytics:', e);
        } finally {
            setLoading(false);
        }
    };

    const formatNumber = (num: number) => {
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    };

    return (
        <View style={{ flex: 1, backgroundColor: '#000' }}>
            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity
                        onPress={() => router.back()}
                        style={styles.backButton}
                    >
                        <ChevronLeft color="white" size={24} />
                    </TouchableOpacity>
                    <View>
                        <Text style={styles.headerTitle}>COMMAND DECK</Text>
                        <View style={styles.statusBadge}>
                            <View style={styles.statusDot} />
                            <Text style={styles.statusText}>SYSTEMS ONLINE</Text>
                        </View>
                    </View>
                </View>

                <ScrollView
                    contentContainerStyle={styles.gridContainer}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Real Analytics Stats */}
                    <View style={{ marginBottom: 20, flexDirection: 'row', gap: 8, paddingHorizontal: 4 }}>
                        <View style={[styles.statCard, { flex: 1, backgroundColor: 'rgba(59, 130, 246, 0.1)', borderColor: 'rgba(59, 130, 246, 0.2)' }]}>
                            <Eye size={16} color="#3b82f6" style={{ marginBottom: 4 }} />
                            <Text style={styles.statLabel}>VIEWS</Text>
                            {loading ? (
                                <ActivityIndicator size="small" color="#3b82f6" />
                            ) : (
                                <Text style={styles.statValue}>{formatNumber(stats.totalViews)}</Text>
                            )}
                        </View>
                        <View style={[styles.statCard, { flex: 1, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.2)' }]}>
                            <Heart size={16} color="#ef4444" style={{ marginBottom: 4 }} />
                            <Text style={styles.statLabel}>LIKES</Text>
                            {loading ? (
                                <ActivityIndicator size="small" color="#ef4444" />
                            ) : (
                                <Text style={styles.statValue}>{formatNumber(stats.totalLikes)}</Text>
                            )}
                        </View>
                        <View style={[styles.statCard, { flex: 1, backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.2)' }]}>
                            <MessageCircle size={16} color="#10b981" style={{ marginBottom: 4 }} />
                            <Text style={styles.statLabel}>COMMENTS</Text>
                            {loading ? (
                                <ActivityIndicator size="small" color="#10b981" />
                            ) : (
                                <Text style={styles.statValue}>{formatNumber(stats.totalComments)}</Text>
                            )}
                        </View>
                    </View>

                    <Text style={{ color: 'white', fontWeight: 'bold', marginBottom: 12, paddingHorizontal: 4 }}>FEATURES</Text>

                    {/* Meteor Grid - 4 Columns */}
                    <View style={styles.grid}>
                        {METEORS.map((meteor) => (
                            <TouchableOpacity
                                key={meteor.id}
                                activeOpacity={0.8}
                                onPress={() => meteor.route ? router.push(meteor.route as any) : null}
                                style={[
                                    styles.meteorCard,
                                    {
                                        borderTopLeftRadius: meteor.radius.tl,
                                        borderTopRightRadius: meteor.radius.tr,
                                        borderBottomLeftRadius: meteor.radius.bl,
                                        borderBottomRightRadius: meteor.radius.br,
                                        shadowColor: meteor.shadowColor,
                                        borderWidth: (meteor as any).borderWidth || 0,
                                        borderColor: (meteor as any).borderColor || 'transparent'
                                    }
                                ]}
                            >
                                <LinearGradient
                                    colors={meteor.colors as [string, string]}
                                    style={StyleSheet.absoluteFill}
                                    start={{ x: 0.3, y: 0.3 }}
                                    end={{ x: 1, y: 1 }}
                                />

                                <View style={styles.cardContent}>
                                    <View style={[
                                        styles.iconContainer,
                                        {
                                            padding: 8, // Smaller padding
                                            marginBottom: 6,
                                            backgroundColor: meteor.textColor === '#000' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.2)',
                                            borderColor: meteor.textColor === '#000' ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.3)'
                                        }
                                    ]}>
                                        <meteor.icon
                                            size={16} // Smaller icon
                                            color={meteor.textColor || 'white'}
                                        />
                                    </View>

                                    <Text
                                        numberOfLines={1}
                                        style={[
                                            styles.cardTitle,
                                            {
                                                fontSize: 10, // Smaller text
                                                color: meteor.textColor || 'white',
                                                marginBottom: 2
                                            }
                                        ]}
                                    >
                                        {meteor.title}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Quick Links */}
                    <Text style={{ color: 'white', fontWeight: 'bold', marginBottom: 12, marginTop: 20, paddingHorizontal: 4 }}>MORE</Text>
                    <View style={{ paddingHorizontal: 4, gap: 8 }}>
                        {QUICK_LINKS.map((link) => (
                            <TouchableOpacity
                                key={link.id}
                                onPress={() => router.push(link.route as any)}
                                style={styles.quickLink}
                            >
                                <View style={styles.quickLinkIcon}>
                                    <link.icon size={18} color="white" />
                                </View>
                                <Text style={styles.quickLinkText}>{link.title}</Text>
                                <ChevronRight size={18} color="rgba(255,255,255,0.5)" />
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Bottom Space */}
                    <View style={{ height: 40 }} />
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 20,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    headerTitle: {
        color: 'white',
        fontSize: 24,
        fontWeight: '900',
        letterSpacing: 1,
        textShadowColor: 'rgba(255,255,255,0.3)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 10,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 10,
        alignSelf: 'flex-start',
        borderWidth: 1,
        borderColor: 'rgba(34, 197, 94, 0.2)',
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#22c55e',
        marginRight: 6,
    },
    statusText: {
        color: '#22c55e',
        fontSize: 9,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    gridContainer: {
        paddingHorizontal: GAP,
        paddingTop: 10,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: GAP,
    },
    meteorCard: {
        width: ITEM_WIDTH,
        height: ITEM_WIDTH * 1.2,
        marginBottom: 8,
        overflow: 'hidden',
        // Shadow for "floating" effect
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
    },
    cardContent: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        zIndex: 10,
    },
    iconContainer: {
        padding: 12,
        borderRadius: 999,
        borderWidth: 1,
        marginBottom: 12,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '900',
        marginBottom: 4,
        textAlign: 'center',
        letterSpacing: 0.5,
    },
    cardSubtitle: {
        fontSize: 10,
        fontWeight: '700',
        fontFamily: 'monospace', // mimicking the mono font in web
        textAlign: 'center',
        opacity: 0.8,
    },
    crater: {
        position: 'absolute',
        borderRadius: 999,
    },
    statCard: {
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statLabel: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
        opacity: 0.7,
        marginBottom: 4,
    },
    statValue: {
        color: 'white',
        fontSize: 18,
        fontWeight: '900',
    },
    quickLink: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    quickLinkIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    quickLinkText: {
        flex: 1,
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
    },
});
