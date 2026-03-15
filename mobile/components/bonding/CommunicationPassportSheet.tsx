import React from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet } from 'react-native';

interface CommunicationPassportSheetProps {
    visible: boolean;
    onClose: () => void;
    passport: {
        responseTime?: string;
        formatPreference?: string;
        depth?: string;
        availability?: string;
    } | null;
    partnerName: string;
}

const fields: { key: string; label: string }[] = [
    { key: 'responseTime', label: 'response time' },
    { key: 'formatPreference', label: 'format preference' },
    { key: 'depth', label: 'depth' },
    { key: 'availability', label: 'availability' },
];

const CommunicationPassportSheet: React.FC<CommunicationPassportSheetProps> = ({
    visible,
    onClose,
    passport,
    partnerName,
}) => {
    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <TouchableOpacity
                style={s.overlay}
                activeOpacity={1}
                onPress={onClose}
            >
                <View style={s.sheet} onStartShouldSetResponder={() => true}>
                    <View style={s.handle} />
                    <Text style={s.title}>{partnerName}'s communication passport</Text>

                    <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
                        {passport ? (
                            fields.map(({ key, label }) => {
                                const value = (passport as any)?.[key];
                                return (
                                    <View key={key} style={s.row}>
                                        <Text style={s.rowLabel}>{label}</Text>
                                        <Text style={s.rowValue}>
                                            {value ?? 'not set'}
                                        </Text>
                                    </View>
                                );
                            })
                        ) : (
                            <Text style={s.emptyText}>no passport data available</Text>
                        )}
                    </ScrollView>

                    <TouchableOpacity style={s.closeBtn} onPress={onClose}>
                        <Text style={s.closeBtnText}>close</Text>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        </Modal>
    );
};

const s = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: '#0e0e0e',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        padding: 20,
        maxHeight: 400,
    },
    handle: {
        width: 32,
        height: 3,
        backgroundColor: '#2e2e2e',
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 12,
        fontWeight: '700',
        color: '#eee',
        marginBottom: 16,
    },
    scroll: {
        marginBottom: 16,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 0.5,
        borderBottomColor: '#141414',
    },
    rowLabel: {
        fontSize: 10,
        color: '#555',
    },
    rowValue: {
        fontSize: 10,
        color: '#eee',
        fontWeight: '600',
    },
    emptyText: {
        fontSize: 9,
        color: '#2e2e2e',
        textAlign: 'center',
        paddingVertical: 20,
    },
    closeBtn: {
        backgroundColor: '#141414',
        borderRadius: 7,
        padding: 10,
        alignItems: 'center',
    },
    closeBtnText: {
        fontSize: 10,
        color: '#555',
        fontWeight: '600',
    },
});

export default CommunicationPassportSheet;
