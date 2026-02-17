import React from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, Image } from 'react-native';
import { X, Users } from 'lucide-react-native';

interface TaggedUser {
    id: string;
    name: string;
    avatar?: string;
}

interface TaggedUsersModalProps {
    visible: boolean;
    users: TaggedUser[];
    onClose: () => void;
    onUserPress?: (userId: string) => void;
}

export default function TaggedUsersModal({ visible, users, onClose, onUserPress }: TaggedUsersModalProps) {
    if (!visible) return null;

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
                style={{
                    flex: 1,
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: 24,
                }}
            >
                <TouchableOpacity
                    activeOpacity={1}
                    style={{
                        width: '100%',
                        maxWidth: 320,
                        backgroundColor: '#1a1a1a',
                        borderRadius: 16,
                        overflow: 'hidden',
                        borderWidth: 1,
                        borderColor: 'rgba(255,255,255,0.1)',
                    }}
                >
                    {/* Header */}
                    <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingHorizontal: 16,
                        paddingVertical: 14,
                        borderBottomWidth: 1,
                        borderBottomColor: 'rgba(255,255,255,0.1)',
                    }}>
                        <Users size={18} color="#fff" />
                        <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600', marginLeft: 10, flex: 1 }}>
                            Tagged People ({users.length})
                        </Text>
                        <TouchableOpacity onPress={onClose}>
                            <X size={20} color="rgba(255,255,255,0.5)" />
                        </TouchableOpacity>
                    </View>

                    {/* User List */}
                    <ScrollView style={{ maxHeight: 300 }}>
                        {users.map((user, index) => (
                            <TouchableOpacity
                                key={user.id}
                                onPress={() => onUserPress?.(user.id)}
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    padding: 12,
                                    borderBottomWidth: index < users.length - 1 ? 1 : 0,
                                    borderBottomColor: 'rgba(255,255,255,0.05)',
                                }}
                            >
                                <View style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 20,
                                    backgroundColor: 'rgba(255,255,255,0.1)',
                                    overflow: 'hidden',
                                    marginRight: 12,
                                }}>
                                    {user.avatar ? (
                                        <Image source={{ uri: user.avatar }} style={{ width: '100%', height: '100%' }} />
                                    ) : (
                                        <View style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                                            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
                                                {user.name?.charAt(0)?.toUpperCase()}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                                <Text style={{ color: '#fff', fontSize: 14, fontWeight: '500' }}>{user.name}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    {users.length === 0 && (
                        <View style={{ padding: 24, alignItems: 'center' }}>
                            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>No tagged people</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </TouchableOpacity>
        </Modal>
    );
}
