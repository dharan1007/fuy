import React, { useState, useRef } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet, Dimensions, Share, ScrollView, Image, Alert
} from 'react-native';
import { Share2, X, MapPin, Timer, TrendingUp, Flame, Camera, ImageIcon, Mountain } from 'lucide-react-native';
import * as Sharing from 'expo-sharing';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { ActivitySession } from '../../services/ActivityTrackingService';
import ActivityTrackingService from '../../services/ActivityTrackingService';
import ActivityMapView from './ActivityMapView';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 48;

type CardStyle = 'filter' | 'minimal' | 'map' | 'poster' | 'dark';

interface ActivityShareCardProps {
    session: ActivitySession;
    onClose: () => void;
    isDark?: boolean;
}

export default function ActivityShareCard({ session, onClose, isDark = true }: ActivityShareCardProps) {
    const colors = isDark ? {
        background: '#0B0B0B',
        surface: '#161616',
        text: '#FFFFFF',
        textSecondary: '#9CA3AF',
        textTertiary: '#6B7280',
        accent: '#FFFFFF',
        accentSubtle: '#2A2A2A',
    } : {
        background: '#F8F8F8',
        surface: '#FFFFFF',
        text: '#000000',
        textSecondary: '#6B7280',
        textTertiary: '#9CA3AF',
        accent: '#000000',
        accentSubtle: '#F0F0F0',
    };

    const [selectedStyle, setSelectedStyle] = useState<CardStyle>('filter');
    const [filterPhoto, setFilterPhoto] = useState<string | null>(null);

    const distKm = (session.distance / 1000).toFixed(2);
    const duration = ActivityTrackingService.formatDuration(session.duration);
    const pace = ActivityTrackingService.formatPace(session.avgPace);
    const activityLabel = ActivityTrackingService.getActivityLabel(session.activityType);
    const speed = session.avgSpeed ? session.avgSpeed.toFixed(1) : '0.0';

    const dateStr = new Date(session.startTime).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });

    const handlePickPhoto = async (useCamera: boolean) => {
        if (useCamera) {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission', 'Camera permission is required');
                return;
            }
            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [9, 16],
                quality: 0.8,
            });
            if (!result.canceled && result.assets[0]) {
                setFilterPhoto(result.assets[0].uri);
            }
        } else {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission', 'Gallery permission is required');
                return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [9, 16],
                quality: 0.8,
            });
            if (!result.canceled && result.assets[0]) {
                setFilterPhoto(result.assets[0].uri);
            }
        }
    };

    const handleShare = async () => {
        try {
            await Share.share({
                message: `${activityLabel} -- ${distKm} km\nDuration: ${duration}\nSpeed: ${speed} km/h\nCalories: ${session.calories} kcal\nElevation: ${session.elevationGain.toFixed(0)}m\n\n${dateStr}\n\nTracked with Dvange WREX`,
            });
        } catch (e) {
            console.error('Share failed:', e);
        }
    };

    // Shared photo picker UI when no photo is selected
    const renderPhotoPicker = () => (
        <View style={styles.filterPickerContainer}>
            <Text style={styles.filterPickerTitle}>Add Your Photo</Text>
            <Text style={styles.filterPickerSubtext}>Take a selfie or pick from gallery</Text>

            <View style={styles.filterPickerButtons}>
                <TouchableOpacity
                    onPress={() => handlePickPhoto(true)}
                    style={styles.filterPickerBtn}
                >
                    <Camera size={24} color="#fff" />
                    <Text style={styles.filterPickerBtnText}>Camera</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => handlePickPhoto(false)}
                    style={styles.filterPickerBtn}
                >
                    <ImageIcon size={24} color="#fff" />
                    <Text style={styles.filterPickerBtnText}>Gallery</Text>
                </TouchableOpacity>
            </View>

            {/* Preview of stats that will overlay */}
            <View style={styles.filterPreviewStats}>
                <Text style={styles.filterPreviewLabel}>DVANGE WREX</Text>
                <Text style={styles.filterPreviewValue}>{distKm} km -- {duration}</Text>
            </View>
        </View>
    );

    // Change photo button overlay
    const renderChangePhotoBtn = () => (
        <TouchableOpacity
            onPress={() => setFilterPhoto(null)}
            style={styles.filterChangeBtn}
        >
            <X size={16} color="#fff" />
        </TouchableOpacity>
    );

    // ---------- CARD STYLE 1: FILTER (Original) ----------
    const renderFilterCard = () => (
        <View style={[styles.shareCard, { backgroundColor: '#000', overflow: 'hidden', padding: 0 }]}>
            {filterPhoto ? (
                <View style={styles.filterContainer}>
                    <Image source={{ uri: filterPhoto }} style={styles.filterPhoto} resizeMode="cover" />

                    {/* Top gradient overlay */}
                    <LinearGradient
                        colors={['rgba(0,0,0,0.7)', 'transparent']}
                        style={styles.filterTopGradient}
                    />

                    {/* Bottom gradient overlay */}
                    <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.85)']}
                        style={styles.filterBottomGradient}
                    />

                    {/* Dvange branding - top */}
                    <View style={styles.filterBrandTop}>
                        <Text style={styles.filterBrandText}>DVANGE</Text>
                        <Text style={styles.filterBrandSub}>WREX</Text>
                    </View>

                    {/* Activity stats overlay - bottom */}
                    <View style={styles.filterStatsOverlay}>
                        <Text style={styles.filterActivityLabel}>{activityLabel.toUpperCase()}</Text>

                        <View style={styles.filterHeroRow}>
                            <Text style={styles.filterHeroValue}>{distKm}</Text>
                            <Text style={styles.filterHeroUnit}>KM</Text>
                        </View>

                        <View style={styles.filterMetricsRow}>
                            <View style={styles.filterMetric}>
                                <Timer size={11} color="rgba(255,255,255,0.6)" />
                                <Text style={styles.filterMetricValue}>{duration}</Text>
                            </View>
                            <View style={styles.filterMetricDivider} />
                            <View style={styles.filterMetric}>
                                <TrendingUp size={11} color="rgba(255,255,255,0.6)" />
                                <Text style={styles.filterMetricValue}>{speed} km/h</Text>
                            </View>
                            <View style={styles.filterMetricDivider} />
                            <View style={styles.filterMetric}>
                                <Flame size={11} color="rgba(255,255,255,0.6)" />
                                <Text style={styles.filterMetricValue}>{session.calories} cal</Text>
                            </View>
                        </View>

                        {session.elevationGain > 0 && (
                            <View style={styles.filterElevationRow}>
                                <Text style={styles.filterElevationText}>
                                    Elevation: {session.elevationGain.toFixed(0)}m
                                </Text>
                            </View>
                        )}

                        <Text style={styles.filterDateText}>{dateStr}</Text>
                    </View>

                    {renderChangePhotoBtn()}
                </View>
            ) : (
                renderPhotoPicker()
            )}
        </View>
    );

    // ---------- CARD STYLE 2: MINIMAL ----------
    const renderMinimalCard = () => (
        <View style={[styles.shareCard, { backgroundColor: '#0A0A0A', overflow: 'hidden', padding: 0 }]}>
            {filterPhoto ? (
                <View style={styles.filterContainer}>
                    <Image source={{ uri: filterPhoto }} style={[styles.filterPhoto, { opacity: 0.35 }]} resizeMode="cover" />

                    {/* Subtle white overlay for clean look */}
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.4)' }]} />

                    {/* Top-left branding */}
                    <View style={{ position: 'absolute', top: 24, left: 20 }}>
                        <Text style={{ color: '#F5F5DC', fontSize: 11, fontWeight: '600', letterSpacing: 4, opacity: 0.7 }}>DVANGE</Text>
                    </View>

                    {/* Center content */}
                    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 }}>
                        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '600', letterSpacing: 3, marginBottom: 8 }}>{activityLabel.toUpperCase()}</Text>
                        <Text style={{ color: '#FFFFFF', fontSize: 64, fontWeight: '200', letterSpacing: -3 }}>{distKm}</Text>
                        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, fontWeight: '500', letterSpacing: 4, marginTop: -4, marginBottom: 32 }}>KILOMETERS</Text>

                        <View style={{ flexDirection: 'row', gap: 32 }}>
                            <View style={{ alignItems: 'center' }}>
                                <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>{duration}</Text>
                                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '500', marginTop: 2 }}>Duration</Text>
                            </View>
                            <View style={{ alignItems: 'center' }}>
                                <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>{speed}</Text>
                                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '500', marginTop: 2 }}>km/h</Text>
                            </View>
                            <View style={{ alignItems: 'center' }}>
                                <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>{session.calories}</Text>
                                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '500', marginTop: 2 }}>Cal</Text>
                            </View>
                        </View>
                    </View>

                    {/* Bottom branding */}
                    <View style={{ position: 'absolute', bottom: 24, left: 0, right: 0, alignItems: 'center' }}>
                        <Text style={{ color: 'rgba(245,245,220,0.3)', fontSize: 9, fontWeight: '600', letterSpacing: 3 }}>WREX -- {dateStr.toUpperCase()}</Text>
                    </View>

                    {renderChangePhotoBtn()}
                </View>
            ) : (
                renderPhotoPicker()
            )}
        </View>
    );

    // ---------- CARD STYLE 3: MAP ----------
    const renderMapCard = () => (
        <View style={[styles.shareCard, { backgroundColor: '#0A0A0A', overflow: 'hidden', padding: 0 }]}>
            {filterPhoto ? (
                <View style={styles.filterContainer}>
                    <Image source={{ uri: filterPhoto }} style={styles.filterPhoto} resizeMode="cover" />

                    {/* Heavy bottom gradient */}
                    <LinearGradient
                        colors={['transparent', 'transparent', 'rgba(0,0,0,0.95)']}
                        locations={[0, 0.4, 1]}
                        style={StyleSheet.absoluteFill}
                    />

                    {/* Top-right WREX badge */}
                    <View style={{ position: 'absolute', top: 20, right: 20, backgroundColor: 'rgba(245,245,220,0.15)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(245,245,220,0.2)' }}>
                        <Text style={{ color: '#F5F5DC', fontSize: 10, fontWeight: '800', letterSpacing: 3 }}>WREX</Text>
                    </View>

                    {/* Map overlay in lower-middle area */}
                    {session.points.length >= 2 && (
                        <View style={{ position: 'absolute', bottom: 140, left: 16, right: 16, height: 120, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
                            <ActivityMapView
                                points={session.points}
                                showUserLocation={false}
                                isDark={true}
                                style={{ height: 120, borderRadius: 16 }}
                            />
                        </View>
                    )}

                    {/* Bottom stats */}
                    <View style={{ position: 'absolute', bottom: 24, left: 20, right: 20 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'baseline', marginBottom: 8 }}>
                            <Text style={{ color: '#F5F5DC', fontSize: 40, fontWeight: '200', letterSpacing: -2 }}>{distKm}</Text>
                            <Text style={{ color: 'rgba(245,245,220,0.5)', fontSize: 14, fontWeight: '700', letterSpacing: 3, marginLeft: 8 }}>KM</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600' }}>{duration}</Text>
                            <Text style={{ color: 'rgba(255,255,255,0.3)' }}>|</Text>
                            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600' }}>{speed} km/h</Text>
                            <Text style={{ color: 'rgba(255,255,255,0.3)' }}>|</Text>
                            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600' }}>{session.calories} cal</Text>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={{ color: 'rgba(245,245,220,0.4)', fontSize: 10, fontWeight: '500', letterSpacing: 1 }}>{dateStr}</Text>
                            <Text style={{ color: 'rgba(245,245,220,0.3)', fontSize: 9, fontWeight: '700', letterSpacing: 3 }}>DVANGE</Text>
                        </View>
                    </View>

                    {renderChangePhotoBtn()}
                </View>
            ) : (
                renderPhotoPicker()
            )}
        </View>
    );

    // ---------- CARD STYLE 4: POSTER ----------
    const renderPosterCard = () => (
        <View style={[styles.shareCard, { backgroundColor: '#000', overflow: 'hidden', padding: 0 }]}>
            {filterPhoto ? (
                <View style={styles.filterContainer}>
                    <Image source={{ uri: filterPhoto }} style={[styles.filterPhoto, { opacity: 0.5 }]} resizeMode="cover" />

                    {/* Dark tint overlay */}
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.3)' }]} />

                    {/* Center-aligned poster layout */}
                    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ color: 'rgba(245,245,220,0.5)', fontSize: 10, fontWeight: '700', letterSpacing: 4, marginBottom: 20 }}>{activityLabel.toUpperCase()}</Text>
                        <Text style={{ color: '#F5F5DC', fontSize: 96, fontWeight: '100', letterSpacing: -4 }}>{distKm}</Text>
                        <Text style={{ color: 'rgba(245,245,220,0.5)', fontSize: 16, fontWeight: '700', letterSpacing: 6, marginTop: -8, marginBottom: 28 }}>KM</Text>
                        <View style={{ width: 40, height: 1, backgroundColor: 'rgba(245,245,220,0.3)', marginBottom: 20 }} />
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Text style={{ color: 'rgba(245,245,220,0.6)', fontSize: 12, fontWeight: '500' }}>{duration}</Text>
                            <Text style={{ color: 'rgba(245,245,220,0.3)', fontSize: 12 }}>--</Text>
                            <Text style={{ color: 'rgba(245,245,220,0.6)', fontSize: 12, fontWeight: '500' }}>{speed} km/h</Text>
                            <Text style={{ color: 'rgba(245,245,220,0.3)', fontSize: 12 }}>--</Text>
                            <Text style={{ color: 'rgba(245,245,220,0.6)', fontSize: 12, fontWeight: '500' }}>{session.calories} cal</Text>
                        </View>
                    </View>

                    {/* Top branding */}
                    <View style={{ position: 'absolute', top: 24, left: 0, right: 0, alignItems: 'center' }}>
                        <Text style={{ color: '#F5F5DC', fontSize: 16, fontWeight: '800', letterSpacing: 8, opacity: 0.8 }}>DVANGE</Text>
                    </View>

                    {/* Bottom branding */}
                    <View style={{ position: 'absolute', bottom: 24, left: 0, right: 0, alignItems: 'center' }}>
                        <Text style={{ color: 'rgba(245,245,220,0.4)', fontSize: 10, fontWeight: '600', letterSpacing: 3 }}>WREX -- {dateStr.toUpperCase()}</Text>
                    </View>

                    {renderChangePhotoBtn()}
                </View>
            ) : (
                renderPhotoPicker()
            )}
        </View>
    );

    // ---------- CARD STYLE 5: DARK ----------
    const renderDarkCard = () => (
        <View style={[styles.shareCard, { backgroundColor: '#000', overflow: 'hidden', padding: 0 }]}>
            {filterPhoto ? (
                <View style={styles.filterContainer}>
                    <Image source={{ uri: filterPhoto }} style={[styles.filterPhoto, { opacity: 0.25 }]} resizeMode="cover" />

                    {/* Heavy dark vignette */}
                    <LinearGradient
                        colors={['rgba(0,0,0,0.6)', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.8)']}
                        locations={[0, 0.5, 1]}
                        style={StyleSheet.absoluteFill}
                    />

                    {/* Corner WREX badge */}
                    <View style={{ position: 'absolute', top: 20, left: 20, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={{ width: 4, height: 20, backgroundColor: '#F5F5DC', borderRadius: 2 }} />
                        <View>
                            <Text style={{ color: '#F5F5DC', fontSize: 14, fontWeight: '800', letterSpacing: 4 }}>DVANGE</Text>
                            <Text style={{ color: 'rgba(245,245,220,0.5)', fontSize: 9, fontWeight: '600', letterSpacing: 3 }}>WREX</Text>
                        </View>
                    </View>

                    {/* Left-aligned content in lower area */}
                    <View style={{ position: 'absolute', bottom: 24, left: 20, right: 20 }}>
                        <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '600', letterSpacing: 1, marginBottom: 4 }}>{activityLabel}</Text>
                        <Text style={{ color: '#FFFFFF', fontSize: 52, fontWeight: '200', letterSpacing: -2, marginBottom: 4 }}>{distKm}</Text>
                        <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, fontWeight: '500', marginBottom: 20 }}>km</Text>

                        <View style={{ gap: 10 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Timer size={13} color="rgba(255,255,255,0.4)" />
                                <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600' }}>{duration}</Text>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <TrendingUp size={13} color="rgba(255,255,255,0.4)" />
                                <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600' }}>{speed} km/h</Text>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Flame size={13} color="rgba(255,255,255,0.4)" />
                                <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600' }}>{session.calories} cal</Text>
                            </View>
                            {session.elevationGain > 0 && (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <Mountain size={13} color="rgba(255,255,255,0.4)" />
                                    <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600' }}>{session.elevationGain.toFixed(0)}m</Text>
                                </View>
                            )}
                        </View>

                        <Text style={{ color: 'rgba(245,245,220,0.3)', fontSize: 10, fontWeight: '500', letterSpacing: 1, marginTop: 16 }}>{dateStr}</Text>
                    </View>

                    {renderChangePhotoBtn()}
                </View>
            ) : (
                renderPhotoPicker()
            )}
        </View>
    );

    const renderCard = () => {
        switch (selectedStyle) {
            case 'filter': return renderFilterCard();
            case 'minimal': return renderMinimalCard();
            case 'map': return renderMapCard();
            case 'poster': return renderPosterCard();
            case 'dark': return renderDarkCard();
        }
    };

    const STYLE_OPTIONS: { key: CardStyle; label: string }[] = [
        { key: 'filter', label: 'Filter' },
        { key: 'minimal', label: 'Minimal' },
        { key: 'map', label: 'Map' },
        { key: 'poster', label: 'Poster' },
        { key: 'dark', label: 'Dark' },
    ];

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                    <X size={22} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Share Card</Text>
                <TouchableOpacity onPress={handleShare} style={styles.shareBtn}>
                    <Share2 size={20} color={colors.text} />
                </TouchableOpacity>
            </View>

            {/* Card Preview */}
            <View style={styles.previewContainer}>
                {renderCard()}
            </View>

            {/* Style Selector */}
            <View style={styles.styleSelectorSection}>
                <Text style={[styles.styleSelectorLabel, { color: colors.textSecondary }]}>STYLE</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.styleRow}>
                    {STYLE_OPTIONS.map(opt => (
                        <TouchableOpacity
                            key={opt.key}
                            onPress={() => setSelectedStyle(opt.key)}
                            style={[
                                styles.stylePill,
                                { backgroundColor: selectedStyle === opt.key ? colors.accent : colors.accentSubtle }
                            ]}
                        >
                            <Text style={[
                                styles.stylePillText,
                                { color: selectedStyle === opt.key ? colors.background : colors.text }
                            ]}>{opt.label}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* Share Button */}
            <TouchableOpacity onPress={handleShare} style={[styles.shareAction, { backgroundColor: colors.accent }]}>
                <Share2 size={18} color={colors.background} />
                <Text style={[styles.shareActionText, { color: colors.background }]}>Share Activity</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 56,
        paddingBottom: 16,
    },
    closeBtn: { padding: 8 },
    shareBtn: { padding: 8 },
    headerTitle: {
        fontSize: 16,
        fontWeight: '600',
    },

    // Preview
    previewContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
    },

    // Share Card Base
    shareCard: {
        width: CARD_WIDTH,
        borderRadius: 24,
        padding: 28,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 8,
    },

    // Filter style
    filterContainer: {
        width: '100%',
        aspectRatio: 9 / 16,
        position: 'relative',
    },
    filterPhoto: {
        width: '100%',
        height: '100%',
        borderRadius: 24,
    },
    filterTopGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '30%',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
    },
    filterBottomGradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '45%',
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
    },
    filterBrandTop: {
        position: 'absolute',
        top: 24,
        left: 20,
        right: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    filterBrandText: {
        color: '#F5F5DC',
        fontSize: 18,
        fontWeight: '800',
        letterSpacing: 6,
        opacity: 0.9,
    },
    filterBrandSub: {
        color: 'rgba(245,245,220,0.6)',
        fontSize: 11,
        fontWeight: '600',
        letterSpacing: 4,
    },
    filterStatsOverlay: {
        position: 'absolute',
        bottom: 24,
        left: 20,
        right: 20,
    },
    filterActivityLabel: {
        color: 'rgba(245,245,220,0.5)',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 4,
        marginBottom: 4,
    },
    filterHeroRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginBottom: 12,
    },
    filterHeroValue: {
        color: '#F5F5DC',
        fontSize: 44,
        fontWeight: '200',
        letterSpacing: -2,
    },
    filterHeroUnit: {
        color: 'rgba(245,245,220,0.5)',
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: 3,
        marginLeft: 8,
    },
    filterMetricsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    filterMetric: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    filterMetricValue: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 12,
        fontWeight: '600',
    },
    filterMetricDivider: {
        width: 1,
        height: 10,
        backgroundColor: 'rgba(255,255,255,0.2)',
        marginHorizontal: 10,
    },
    filterElevationRow: {
        marginBottom: 6,
    },
    filterElevationText: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 10,
        fontWeight: '500',
    },
    filterDateText: {
        color: 'rgba(245,245,220,0.4)',
        fontSize: 10,
        fontWeight: '500',
        letterSpacing: 1,
    },
    filterChangeBtn: {
        position: 'absolute',
        top: 20,
        right: 20,
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'rgba(0,0,0,0.5)',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
    },

    // Filter picker (no photo)
    filterPickerContainer: {
        width: '100%',
        aspectRatio: 9 / 16,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
    filterPickerTitle: {
        color: '#F5F5DC',
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 6,
    },
    filterPickerSubtext: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 12,
        marginBottom: 28,
    },
    filterPickerButtons: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 32,
    },
    filterPickerBtn: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 80,
        height: 80,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
        gap: 6,
    },
    filterPickerBtnText: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 11,
        fontWeight: '600',
    },
    filterPreviewStats: {
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    filterPreviewLabel: {
        color: 'rgba(245,245,220,0.5)',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 3,
        marginBottom: 4,
    },
    filterPreviewValue: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 13,
        fontWeight: '600',
    },

    // Style selector
    styleSelectorSection: {
        paddingHorizontal: 24,
        paddingBottom: 20,
    },
    styleSelectorLabel: {
        fontSize: 10,
        fontWeight: '600',
        letterSpacing: 2,
        marginBottom: 12,
    },
    styleRow: {
        gap: 10,
    },
    stylePill: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 14,
    },
    stylePillText: {
        fontSize: 13,
        fontWeight: '600',
    },

    // Main share
    shareAction: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        marginHorizontal: 24,
        marginBottom: 40,
        paddingVertical: 18,
        borderRadius: 18,
    },
    shareActionText: {
        fontSize: 16,
        fontWeight: '600',
    },
});
