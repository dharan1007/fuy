/**
 * DeviceAuthorization — Fix 6: QR-Based Device Auth Flow
 *
 * Existing Device: Displays QR code with encrypted welcome package.
 * New Device: Scans QR to register and receive authorization.
 */

import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ActivityIndicator,
    ScrollView,
    TextInput,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
    ChevronLeft,
    Smartphone,
    QrCode,
    ShieldCheck,
    Trash2,
    Plus,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import {
    getDeviceKeys,
    listActiveDevices,
    generateDeviceAuthQR,
    deactivateDevice,
    QRAuthPayload,
} from '../lib/MultiDeviceEncryption';

export default function DeviceAuthorizationScreen() {
    const router = useRouter();
    const { colors, mode } = useTheme();
    const { session } = useAuth();

    const [devices, setDevices] = useState<Array<{
        deviceId: string;
        publicKey: string;
        deviceName: string | null;
        createdAt: string;
    }>>([]);
    const [loading, setLoading] = useState(true);
    const [currentDeviceId, setCurrentDeviceId] = useState<string | null>(null);
    const [qrPayload, setQrPayload] = useState<QRAuthPayload | null>(null);
    const [newDevicePubKey, setNewDevicePubKey] = useState('');
    const [showAddDevice, setShowAddDevice] = useState(false);

    useEffect(() => {
        loadDevices();
    }, []);

    const loadDevices = async () => {
        try {
            setLoading(true);
            if (!session?.user?.id) return;

            const deviceKeys = await getDeviceKeys();
            if (deviceKeys) {
                setCurrentDeviceId(deviceKeys.deviceId);
            }

            const activeDevices = await listActiveDevices(session.user.id);
            setDevices(activeDevices);
        } catch (e) {
            console.error('[DeviceAuth] Load failed:', e);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateQR = async () => {
        try {
            if (!newDevicePubKey.trim()) {
                Alert.alert('Error', 'Please enter the new device public key.');
                return;
            }

            const deviceKeys = await getDeviceKeys();
            if (!deviceKeys) {
                Alert.alert('Error', 'Current device keys not found.');
                return;
            }

            const payload = generateDeviceAuthQR(
                deviceKeys.privateKey,
                deviceKeys.publicKey,
                newDevicePubKey.trim(),
                {
                    userId: session?.user?.id,
                    authorizedAt: new Date().toISOString(),
                    authorizedBy: deviceKeys.deviceId,
                }
            );

            setQrPayload(payload);
        } catch (e) {
            console.error('[DeviceAuth] QR generation failed:', e);
            Alert.alert('Error', 'Failed to generate authorization code.');
        }
    };

    const handleRemoveDevice = async (deviceId: string) => {
        Alert.alert(
            'Remove Device',
            'This device will no longer be able to decrypt new messages. Continue?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                        await deactivateDevice(deviceId);
                        setDevices((prev) => prev.filter((d) => d.deviceId !== deviceId));
                    },
                },
            ]
        );
    };

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <LinearGradient
                colors={
                    mode === 'light'
                        ? ['#ffffff', '#f0f0f0']
                        : mode === 'eye-care'
                            ? ['#F5E6D3', '#E6D5C0']
                            : ['#0f172a', '#1e293b']
                }
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            />
            <SafeAreaView style={{ flex: 1 }}>
                {/* Header */}
                <View style={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                    <TouchableOpacity
                        onPress={() => router.back()}
                        style={{ padding: 8, borderRadius: 20, backgroundColor: colors.card }}
                    >
                        <ChevronLeft color={colors.text} size={24} />
                    </TouchableOpacity>
                    <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>
                        Linked Devices
                    </Text>
                </View>

                <ScrollView
                    contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Info Banner */}
                    <View
                        style={{
                            backgroundColor: 'rgba(16,185,129,0.08)',
                            borderWidth: 1,
                            borderColor: 'rgba(16,185,129,0.15)',
                            borderRadius: 16,
                            padding: 16,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 12,
                            marginBottom: 24,
                        }}
                    >
                        <ShieldCheck size={24} color="#10b981" />
                        <Text style={{ color: colors.text, fontSize: 12, flex: 1, lineHeight: 18 }}>
                            Each device has its own encryption key. Messages are encrypted separately for every linked device.
                        </Text>
                    </View>

                    {loading ? (
                        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
                    ) : (
                        <>
                            {/* Device List */}
                            {devices.map((device) => (
                                <View
                                    key={device.deviceId}
                                    style={{
                                        backgroundColor: colors.card,
                                        borderWidth: 1,
                                        borderColor: colors.border,
                                        borderRadius: 16,
                                        padding: 16,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        gap: 12,
                                        marginBottom: 12,
                                    }}
                                >
                                    <View
                                        style={{
                                            width: 44,
                                            height: 44,
                                            borderRadius: 12,
                                            backgroundColor: 'rgba(255,255,255,0.06)',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        <Smartphone size={22} color={colors.secondary} />
                                    </View>

                                    <View style={{ flex: 1 }}>
                                        <Text style={{ color: colors.text, fontWeight: '600', fontSize: 14 }}>
                                            {device.deviceName || 'Unknown Device'}
                                            {device.deviceId === currentDeviceId && (
                                                <Text style={{ color: '#10b981', fontSize: 11 }}> (This Device)</Text>
                                            )}
                                        </Text>
                                        <Text style={{ color: colors.secondary, fontSize: 11, marginTop: 2 }}>
                                            Linked {formatDate(device.createdAt)}
                                        </Text>
                                        <Text style={{ color: colors.secondary, fontSize: 9, marginTop: 2, fontFamily: 'monospace' }}>
                                            {device.publicKey.substring(0, 16)}...
                                        </Text>
                                    </View>

                                    {device.deviceId !== currentDeviceId && (
                                        <TouchableOpacity
                                            onPress={() => handleRemoveDevice(device.deviceId)}
                                            style={{ padding: 8 }}
                                        >
                                            <Trash2 size={18} color="#ef4444" />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            ))}

                            {devices.length === 0 && (
                                <Text style={{ color: colors.secondary, textAlign: 'center', marginTop: 24 }}>
                                    No devices linked yet.
                                </Text>
                            )}

                            {/* Add New Device */}
                            <TouchableOpacity
                                onPress={() => setShowAddDevice(!showAddDevice)}
                                style={{
                                    backgroundColor: colors.card,
                                    borderWidth: 1,
                                    borderColor: colors.border,
                                    borderRadius: 16,
                                    padding: 16,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 12,
                                    marginTop: 12,
                                }}
                            >
                                <View
                                    style={{
                                        width: 44,
                                        height: 44,
                                        borderRadius: 12,
                                        backgroundColor: 'rgba(255,255,255,0.06)',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <Plus size={22} color={colors.primary} />
                                </View>
                                <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 14 }}>
                                    Link New Device
                                </Text>
                            </TouchableOpacity>

                            {showAddDevice && (
                                <View
                                    style={{
                                        backgroundColor: colors.card,
                                        borderWidth: 1,
                                        borderColor: colors.border,
                                        borderRadius: 16,
                                        padding: 16,
                                        marginTop: 12,
                                    }}
                                >
                                    <Text style={{ color: colors.text, fontWeight: '600', fontSize: 14, marginBottom: 8 }}>
                                        Authorize New Device
                                    </Text>
                                    <Text style={{ color: colors.secondary, fontSize: 12, marginBottom: 16, lineHeight: 18 }}>
                                        Enter the new device's public key (shown on the new device during setup). This will generate an authorization code.
                                    </Text>

                                    <TextInput
                                        value={newDevicePubKey}
                                        onChangeText={setNewDevicePubKey}
                                        placeholder="New device public key..."
                                        placeholderTextColor="#52525b"
                                        style={{
                                            backgroundColor: '#09090b',
                                            borderWidth: 1,
                                            borderColor: '#27272a',
                                            borderRadius: 12,
                                            padding: 12,
                                            color: '#fff',
                                            fontSize: 12,
                                            fontFamily: 'monospace',
                                            marginBottom: 12,
                                        }}
                                    />

                                    <TouchableOpacity
                                        onPress={handleGenerateQR}
                                        style={{
                                            backgroundColor: '#fff',
                                            paddingVertical: 14,
                                            borderRadius: 12,
                                            alignItems: 'center',
                                            flexDirection: 'row',
                                            justifyContent: 'center',
                                            gap: 8,
                                        }}
                                    >
                                        <QrCode size={18} color="#000" />
                                        <Text style={{ color: '#000', fontWeight: '700', fontSize: 14 }}>
                                            Generate Auth Code
                                        </Text>
                                    </TouchableOpacity>

                                    {qrPayload && (
                                        <View
                                            style={{
                                                backgroundColor: '#09090b',
                                                borderWidth: 1,
                                                borderColor: '#27272a',
                                                borderRadius: 12,
                                                padding: 16,
                                                marginTop: 16,
                                                alignItems: 'center',
                                            }}
                                        >
                                            <Text style={{ color: '#10b981', fontWeight: '600', fontSize: 13, marginBottom: 8 }}>
                                                Authorization Code Generated
                                            </Text>
                                            <Text
                                                style={{
                                                    color: '#fff',
                                                    fontSize: 10,
                                                    fontFamily: 'monospace',
                                                    textAlign: 'center',
                                                }}
                                                selectable
                                            >
                                                {JSON.stringify(qrPayload).substring(0, 120)}...
                                            </Text>
                                            <Text style={{ color: colors.secondary, fontSize: 10, marginTop: 8, textAlign: 'center' }}>
                                                Enter this on the new device to complete authorization.
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            )}

                            {/* Metadata Disclosure */}
                            <View style={{ marginTop: 32, paddingHorizontal: 8 }}>
                                <Text style={{ color: colors.secondary, fontSize: 11, textAlign: 'center', lineHeight: 16 }}>
                                    End-to-End Encrypted contents. Metadata (who you message and when) is visible to Fuy servers.
                                </Text>
                            </View>
                        </>
                    )}
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}
