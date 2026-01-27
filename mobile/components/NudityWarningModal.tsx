// mobile/components/NudityWarningModal.tsx
// Styled modal component for nudity/NSFW content warnings

import React from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { NudityAnalysisResult } from '../lib/nudity-detection';

const { width } = Dimensions.get('window');

interface NudityWarningModalProps {
    visible: boolean;
    result: NudityAnalysisResult | null;
    onClose: () => void;
    onProceed?: () => void; // Only available for SUGGESTIVE content
    isSubmitting?: boolean;
}

export default function NudityWarningModal({
    visible,
    result,
    onClose,
    onProceed,
    isSubmitting = false,
}: NudityWarningModalProps) {
    if (!result) return null;

    const isExplicit = result.classification === 'EXPLICIT';
    const iconName = isExplicit ? 'alert-circle' : 'warning';
    const iconColor = isExplicit ? '#FF3B30' : '#FF9500';
    const gradientColors: readonly [string, string] = isExplicit
        ? ['#1a0000', '#2d0a0a']
        : ['#1a1400', '#2d2000'];

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <LinearGradient
                    colors={gradientColors}
                    style={styles.container}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={[styles.iconCircle, { backgroundColor: isExplicit ? 'rgba(255, 59, 48, 0.2)' : 'rgba(255, 149, 0, 0.2)' }]}>
                            <Ionicons name={iconName} size={40} color={iconColor} />
                        </View>
                        <Text style={[styles.title, { color: iconColor }]}>
                            {isExplicit ? 'Content Blocked' : 'Content Warning'}
                        </Text>
                    </View>

                    {/* Message */}
                    <Text style={styles.message}>
                        {result.message}
                    </Text>

                    {/* Detected Issues */}
                    {result.detectedCategories.length > 0 && (
                        <View style={styles.issuesContainer}>
                            <Text style={styles.issuesTitle}>What we detected:</Text>
                            <ScrollView style={styles.issuesList} nestedScrollEnabled>
                                {result.detectedCategories.map((category, index) => (
                                    <View key={index} style={styles.issueItem}>
                                        <Ionicons
                                            name="ellipse"
                                            size={8}
                                            color={iconColor}
                                            style={styles.issueBullet}
                                        />
                                        <Text style={styles.issueText}>{category}</Text>
                                    </View>
                                ))}
                            </ScrollView>
                        </View>
                    )}

                    {/* Info Box */}
                    <View style={[styles.infoBox, { borderColor: iconColor + '40' }]}>
                        <Ionicons name="information-circle" size={20} color="#8E8E93" />
                        <Text style={styles.infoText}>
                            {isExplicit
                                ? 'Explicit content is strictly prohibited. Repeated violations may result in account suspension.'
                                : 'If you proceed, your post will be flagged for review and may be removed if it violates our guidelines.'}
                        </Text>
                    </View>

                    {/* Buttons */}
                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={onClose}
                            disabled={isSubmitting}
                        >
                            <Text style={styles.cancelButtonText}>
                                {isExplicit ? 'Go Back' : 'Cancel'}
                            </Text>
                        </TouchableOpacity>

                        {!isExplicit && onProceed && (
                            <TouchableOpacity
                                style={[styles.proceedButton, isSubmitting && styles.buttonDisabled]}
                                onPress={onProceed}
                                disabled={isSubmitting}
                            >
                                <LinearGradient
                                    colors={['#FF9500', '#FF6B00']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.proceedGradient}
                                >
                                    <Text style={styles.proceedButtonText}>
                                        {isSubmitting ? 'Posting...' : 'Post Anyway'}
                                    </Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        )}
                    </View>
                </LinearGradient>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    container: {
        width: width - 40,
        maxWidth: 400,
        borderRadius: 20,
        padding: 24,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    header: {
        alignItems: 'center',
        marginBottom: 20,
    },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
        textAlign: 'center',
    },
    message: {
        fontSize: 15,
        color: '#E5E5E7',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 20,
    },
    issuesContainer: {
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        maxHeight: 150,
    },
    issuesTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#8E8E93',
        marginBottom: 10,
    },
    issuesList: {
        maxHeight: 100,
    },
    issueItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    issueBullet: {
        marginRight: 10,
        marginTop: 5,
    },
    issueText: {
        flex: 1,
        fontSize: 14,
        color: '#E5E5E7',
        lineHeight: 20,
    },
    infoBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: 'rgba(142, 142, 147, 0.1)',
        borderRadius: 10,
        padding: 12,
        marginBottom: 20,
        borderWidth: 1,
    },
    infoText: {
        flex: 1,
        marginLeft: 10,
        fontSize: 13,
        color: '#8E8E93',
        lineHeight: 18,
    },
    buttonContainer: {
        flexDirection: 'row',
        gap: 12,
    },
    cancelButton: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    cancelButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    proceedButton: {
        flex: 1,
        borderRadius: 12,
        overflow: 'hidden',
    },
    proceedGradient: {
        paddingVertical: 14,
        alignItems: 'center',
    },
    proceedButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    buttonDisabled: {
        opacity: 0.6,
    },
});
