import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { X, Send, MapPin, Navigation } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';

const { width, height } = Dimensions.get('window');

interface LocationPickerProps {
    onSend: (location: { latitude: number; longitude: number; address?: string }) => void;
    onClose: () => void;
}

export default function LocationPicker({ onSend, onClose }: LocationPickerProps) {
    const { colors } = useTheme();
    const [region, setRegion] = useState<any>(null);
    const [marker, setMarker] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [address, setAddress] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            try {
                let { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    setErrorMsg('Permission to access location was denied');
                    setLoading(false);
                    return;
                }

                let location = await Location.getCurrentPositionAsync({});
                const initialRegion = {
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                    latitudeDelta: 0.005,
                    longitudeDelta: 0.005,
                };
                setRegion(initialRegion);
                setMarker(location.coords);

                // Reverse geocode
                const addresses = await Location.reverseGeocodeAsync({
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude
                });

                if (addresses && addresses.length > 0) {
                    const addr = addresses[0];
                    setAddress(`${addr.name || ''} ${addr.street || ''}, ${addr.city || ''}`);
                }

                setLoading(false);
            } catch (error) {
                setErrorMsg('Could not fetch location');
                setLoading(false);
            }
        })();
    }, []);

    const handleSend = () => {
        if (marker) {
            onSend({
                latitude: marker.latitude,
                longitude: marker.longitude,
                address: address || undefined
            });
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                    <X size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: colors.text }]}>Share Location</Text>
                <TouchableOpacity
                    onPress={handleSend}
                    disabled={!marker}
                    style={[styles.sendBtn, { opacity: marker ? 1 : 0.5 }]}
                >
                    <Send size={24} color="#3B82F6" />
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#3B82F6" />
                    <Text style={{ color: colors.textSecondary, marginTop: 10 }}>Locating...</Text>
                </View>
            ) : errorMsg ? (
                <View style={styles.center}>
                    <Text style={{ color: 'red' }}>{errorMsg}</Text>
                </View>
            ) : (
                <View style={styles.mapContainer}>
                    <MapView
                        provider={PROVIDER_DEFAULT}
                        style={styles.map}
                        region={region}
                        onRegionChangeComplete={(r) => {
                            setRegion(r);
                            setMarker({ latitude: r.latitude, longitude: r.longitude });
                            // Optional: Debounce reverse geocode here on drag
                        }}
                    >
                        {marker && <Marker coordinate={marker} />}
                    </MapView>

                    {/* Center Pin Indicator */}
                    <View style={styles.centerPin}>
                        <MapPin size={40} color="#3B82F6" fill={colors.background} />
                    </View>

                    {address && (
                        <View style={[styles.addressBar, { backgroundColor: colors.card }]}>
                            <Text style={[styles.addressText, { color: colors.text }]}>{address}</Text>
                        </View>
                    )}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        paddingTop: 60, // Safe area
    },
    closeBtn: {
        padding: 8,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    sendBtn: {
        padding: 8,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    mapContainer: {
        flex: 1,
        position: 'relative',
    },
    map: {
        width: '100%',
        height: '100%',
    },
    centerPin: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        marginLeft: -20,
        marginTop: -40,
        zIndex: 10,
    },
    addressBar: {
        position: 'absolute',
        bottom: 40,
        left: 20,
        right: 20,
        padding: 12,
        borderRadius: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    addressText: {
        fontSize: 14,
        fontWeight: '500',
        textAlign: 'center',
    }
});
