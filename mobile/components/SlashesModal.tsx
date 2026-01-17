import React from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { X, Slash, ChevronRight } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';

const { width, height } = Dimensions.get('window');

interface SlashesModalProps {
    visible: boolean;
    onClose: () => void;
    slashes: { tag: string; count?: number }[];
}

export default function SlashesModal({ visible, onClose, slashes }: SlashesModalProps) {
    const router = useRouter();

    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={{ flex: 1, justifyContent: 'flex-end' }}>
                {/* Backdrop - Tap to close */}
                <TouchableOpacity
                    activeOpacity={1}
                    onPress={onClose}
                    style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)' }}
                />

                {/* Modal Content */}
                <BlurView
                    intensity={40}
                    tint="dark"
                    style={{
                        borderTopLeftRadius: 32,
                        borderTopRightRadius: 32,
                        overflow: 'hidden',
                        maxHeight: height * 0.6,
                        borderTopWidth: 1,
                        borderColor: 'rgba(255,255,255,0.15)'
                    }}
                >
                    <View style={{ backgroundColor: 'rgba(10,10,10,0.85)', paddingBottom: 40 }}>
                        {/* Header */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' }}>
                                    <Slash size={20} color="white" />
                                </View>
                                <View>
                                    <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>Slashes</Text>
                                    <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>{slashes.length} tags</Text>
                                </View>
                            </View>

                            <TouchableOpacity onPress={onClose} style={{ padding: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20 }}>
                                <X size={20} color="white" />
                            </TouchableOpacity>
                        </View>

                        {/* List */}
                        <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
                            {slashes && slashes.length > 0 ? (
                                slashes.map((slash, index) => (
                                    <TouchableOpacity
                                        key={index}
                                        onPress={() => {
                                            onClose();
                                            router.push({ pathname: '/search', params: { q: slash.tag } });
                                        }}
                                        style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: 16,
                                            backgroundColor: 'rgba(255,255,255,0.03)',
                                            borderRadius: 16,
                                            borderWidth: 1,
                                            borderColor: 'rgba(255,255,255,0.05)'
                                        }}
                                    >
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 16, fontWeight: '600' }}>/</Text>
                                            <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>{slash.tag}</Text>
                                        </View>
                                        <ChevronRight size={16} color="rgba(255,255,255,0.3)" />
                                    </TouchableOpacity>
                                ))
                            ) : (
                                <View style={{ padding: 20, alignItems: 'center' }}>
                                    <Text style={{ color: 'rgba(255,255,255,0.4)' }}>No slashes found.</Text>
                                </View>
                            )}
                        </ScrollView>
                    </View>
                </BlurView>
            </View>
        </Modal>
    );
}
