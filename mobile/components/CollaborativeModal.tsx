import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { X, Palette, MapPin, Dumbbell } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';

interface CollaborativeModalProps {
    visible: boolean;
    onClose: () => void;
    partnerId?: string;
    partnerName?: string;
}

const COLLAB_OPTIONS = [
    {
        id: 'canvas',
        name: 'Canvas',
        description: 'Draw and create together',
        icon: Palette,
        color: '#3B82F6',
        route: '/canvas'
    },
    {
        id: 'hopin',
        name: 'Hopin',
        description: 'Plan meetups and locations',
        icon: MapPin,
        color: '#00D68F',
        route: '/hopin'
    },
    {
        id: 'wrex',
        name: 'Wrex',
        description: 'Workout challenges together',
        icon: Dumbbell,
        color: '#FF8B3D',
        route: '/wrex'
    }
];

export default function CollaborativeModal({ visible, onClose, partnerId, partnerName }: CollaborativeModalProps) {
    const router = useRouter();
    const { colors, mode } = useTheme();

    const handleOptionPress = (option: typeof COLLAB_OPTIONS[0]) => {
        onClose();
        router.push({
            pathname: option.route as any,
            params: { partnerId, partnerName }
        });
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableOpacity
                activeOpacity={1}
                onPress={onClose}
                style={styles.overlay}
            >
                <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />

                <View style={[styles.container, { backgroundColor: '#12121A' }]}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.title}>Collaborate</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <X size={24} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    {partnerName && (
                        <Text style={styles.subtitle}>
                            with {partnerName}
                        </Text>
                    )}

                    {/* Options */}
                    <View style={styles.optionsContainer}>
                        {COLLAB_OPTIONS.map((option) => {
                            const IconComponent = option.icon;
                            return (
                                <TouchableOpacity
                                    key={option.id}
                                    style={[styles.optionCard, { borderColor: option.color + '30' }]}
                                    onPress={() => handleOptionPress(option)}
                                    activeOpacity={0.7}
                                >
                                    <View style={[styles.iconContainer, { backgroundColor: option.color + '20' }]}>
                                        <IconComponent size={28} color={option.color} />
                                    </View>
                                    <View style={styles.optionContent}>
                                        <Text style={styles.optionName}>{option.name}</Text>
                                        <Text style={styles.optionDescription}>{option.description}</Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>
            </TouchableOpacity>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)'
    },
    container: {
        width: '85%',
        maxWidth: 360,
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)'
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: '#fff'
    },
    subtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.5)',
        marginBottom: 24
    },
    closeButton: {
        padding: 4
    },
    optionsContainer: {
        gap: 12
    },
    optionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderWidth: 1
    },
    iconContainer: {
        width: 52,
        height: 52,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16
    },
    optionContent: {
        flex: 1
    },
    optionName: {
        fontSize: 17,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 4
    },
    optionDescription: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.5)'
    }
});
