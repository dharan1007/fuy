import React from 'react';
import { View, Text, Modal, TouchableOpacity } from 'react-native';
import { BlurView } from 'expo-blur';
import { X } from 'lucide-react-native';

interface ConfirmModalProps {
    visible: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    confirmText?: string;
    cancelText?: string;
    isDestructive?: boolean;
}

export default function ConfirmModal({
    visible,
    title,
    message,
    onConfirm,
    onCancel,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    isDestructive = false
}: ConfirmModalProps) {
    return (
        <Modal visible={visible} transparent animationType="fade">
            <View className="flex-1 items-center justify-center bg-black/80 p-6">
                <BlurView intensity={80} tint="dark" className="w-full max-w-sm rounded-3xl overflow-hidden border border-white/10">
                    <View className="bg-black/40 p-6">
                        <Text className="text-white text-xl font-bold text-center mb-2">{title}</Text>
                        <Text className="text-white/60 text-center mb-6">{message}</Text>

                        <View className="flex-row gap-3">
                            <TouchableOpacity
                                onPress={onCancel}
                                className="flex-1 py-4 rounded-xl bg-white/5 border border-white/10"
                            >
                                <Text className="text-white font-bold text-center">{cancelText}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={onConfirm}
                                className={`flex-1 py-4 rounded-xl ${isDestructive ? 'bg-red-500/20 border-red-500/50' : 'bg-white'}`}
                            >
                                <Text className={`text-center font-bold ${isDestructive ? 'text-red-400' : 'text-black'}`}>
                                    {confirmText}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </BlurView>
            </View>
        </Modal>
    );
}
