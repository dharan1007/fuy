import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, Alert, Dimensions, Animated, Easing } from 'react-native';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { X, Camera, CheckCircle, AlertCircle, Video as VideoIcon } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getApiUrl } from '../lib/api';
import { supabase } from '../lib/supabase';
import { uploadFileToR2 } from '../lib/upload-helper';

const API_URL = getApiUrl();
const { width } = Dimensions.get('window');

type Challenge = 'BLINK' | 'SMILE' | 'TURN_LEFT' | 'TURN_RIGHT' | 'NOD';

const CHALLENGE_INSTRUCTIONS: Record<Challenge, string> = {
    BLINK: 'Blink your eyes twice',
    SMILE: 'Give us a big smile',
    TURN_LEFT: 'Turn your head to the left',
    TURN_RIGHT: 'Turn your head to the right',
    NOD: 'Nod your head up and down',
};

interface FaceVerificationModalProps {
    visible: boolean;
    onClose: () => void;
    onVerified: () => void;
}

export function FaceVerificationModal({ visible, onClose, onVerified }: FaceVerificationModalProps) {
    const { session } = useAuth();
    const { showToast } = useToast();
    const [permission, requestPermission] = useCameraPermissions();
    const [micPermission, requestMicPermission] = useMicrophonePermissions();
    const cameraRef = useRef<CameraView>(null);

    const [step, setStep] = useState<'intro' | 'challenges' | 'processing' | 'success' | 'error'>('intro');
    const [challenges, setChallenges] = useState<Challenge[]>([]);
    const [currentChallengeIndex, setCurrentChallengeIndex] = useState(0);
    const [isRecording, setIsRecording] = useState(false);
    const [videoUri, setVideoUri] = useState<string | null>(null);
    const [countdown, setCountdown] = useState(3);
    const [errorMessage, setErrorMessage] = useState('');

    const [isStarting, setIsStarting] = useState(false);

    // Generate random challenges on start
    const startVerification = async () => {
        if (isStarting) return;
        setIsStarting(true);
        console.log("Starting verification...");

        try {
            if (!permission?.granted || !micPermission?.granted) {
                console.log("Requesting permissions...");
                const camStatus = await requestPermission();
                const micStatus = await requestMicPermission();

                if (!camStatus.granted || !micStatus.granted) {
                    Alert.alert('Permissions Required', 'Camera and Microphone access are needed for video verification.');
                    setIsStarting(false);
                    return;
                }
            }

            console.log("Fetching challenges...");
            // Add timeout for fetch
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const response = await fetch(`${API_URL}/api/verification/challenge`, {
                headers: { 'Authorization': `Bearer ${session?.access_token}` },
                signal: controller.signal
            }).catch(e => {
                console.warn("Fetch failed or timed out", e);
                throw e;
            });

            clearTimeout(timeoutId);
            const data = await response.json();

            if (data.challenges) {
                console.log("Challenges received", data.challenges);
                setChallenges(data.challenges);
                setCurrentChallengeIndex(0);
                setVideoUri(null);
                setStep('challenges');
                // Recording will start via onCameraReady prop
            }
        } catch (error) {
            console.log("Falling back to local challenges due to:", error);
            // Fallback: generate locally
            const allChallenges: Challenge[] = ['BLINK', 'SMILE', 'TURN_LEFT', 'TURN_RIGHT', 'NOD'];
            const shuffled = allChallenges.sort(() => Math.random() - 0.5).slice(0, 3);
            setChallenges(shuffled);
            setCurrentChallengeIndex(0);
            setVideoUri(null);
            setStep('challenges');
            // Recording will start via onCameraReady prop
        } finally {
            setIsStarting(false);
        }
    };

    const startRecording = async () => {
        if (!cameraRef.current) return;
        try {
            setIsRecording(true);
            const video = await cameraRef.current.recordAsync({
                maxDuration: 15, // 15 seconds max
            });
            if (video?.uri) {
                setVideoUri(video.uri);
                submitVerification(video.uri);
            }
        } catch (e) {
            console.error("Recording error", e);
            setIsRecording(false);
        }
    };

    const stopRecording = () => {
        if (cameraRef.current && isRecording) {
            cameraRef.current.stopRecording();
            setIsRecording(false);
        }
    };

    const startCountdown = () => {
        setCountdown(3);
    };

    useEffect(() => {
        if (step === 'challenges' && isRecording) {
            if (countdown > 0) {
                const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
                return () => clearTimeout(timer);
            } else {
                // Countdown finished for current challenge
                if (currentChallengeIndex < challenges.length - 1) {
                    setCurrentChallengeIndex(prev => prev + 1);
                    setCountdown(3); // Reset for next challenge
                } else {
                    // All challenges done
                    stopRecording();
                }
            }
        }
    }, [step, countdown, isRecording, currentChallengeIndex]);

    const submitVerification = async (uri: string) => {
        setStep('processing');

        try {
            console.log("Starting verification submission to R2...");
            const userId = session?.user?.id;
            if (!userId) throw new Error("No user ID found");

            // 1. Upload Video to Cloudflare R2 using helper
            console.log("Uploading to Cloudflare R2...");
            const publicUrl = await uploadFileToR2(uri, 'VIDEO', session?.access_token);
            console.log("R2 Upload success:", publicUrl);

            console.log("Notifying backend to update user profile...");

            // 2. Call Backend to Upgrade User (Bypassing RLS)
            const response = await fetch(`${API_URL}/api/verification/submit`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session?.access_token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    videoUrl: publicUrl,
                    challenges: challenges
                })
            });

            const data = await response.json();

            if (!response.ok || !data.verified) {
                throw new Error(data.error || 'Backend verification update failed');
            }

            console.log("User verified successfully via Backend");

            setStep('success');
            showToast('Identity verified successfully!', 'success');
            setTimeout(() => {
                onVerified();
                onClose();
            }, 2000);

        } catch (error: any) {
            console.error("Verification error:", error);
            setErrorMessage(error.message || 'Verification failed. Please check your connection.');
            setStep('error');
        } finally {
            setIsStarting(false);
        }
    };

    const resetAndClose = () => {
        setStep('intro');
        setChallenges([]);
        setCurrentChallengeIndex(0);
        setVideoUri(null);
        setIsRecording(false);
        setCountdown(3);
        setErrorMessage('');
        onClose();
    };

    const spinValue = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (step === 'processing') {
            Animated.loop(
                Animated.timing(spinValue, {
                    toValue: 1,
                    duration: 1000,
                    easing: Easing.linear,
                    useNativeDriver: true,
                })
            ).start();
        } else {
            spinValue.setValue(0);
        }
    }, [step]);

    const spin = spinValue.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={resetAndClose} style={styles.closeButton}>
                        <X color="#fff" size={24} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Identity Verification</Text>
                    <View style={{ width: 40 }} />
                </View>

                {/* Content */}
                <View style={styles.content}>
                    {step === 'intro' && (
                        <View style={styles.introContainer}>
                            <View style={styles.iconCircle}>
                                <VideoIcon color="#DC2626" size={48} />
                            </View>
                            <Text style={styles.title}>Video Verification</Text>
                            <Text style={styles.description}>
                                To get your verified badge, we need to confirm you are a real person.
                                You will be asked to perform 3 simple actions in front of the camera.
                            </Text>
                            <View style={styles.securityNote}>
                                <AlertCircle color="#F59E0B" size={16} />
                                <Text style={styles.securityText}>
                                    Photos, masks, and videos will not pass verification.
                                </Text>
                            </View>
                            <TouchableOpacity
                                style={[styles.startButton, isStarting && { opacity: 0.7 }]}
                                onPress={startVerification}
                                disabled={isStarting}
                            >
                                <Text style={styles.startButtonText}>
                                    {isStarting ? 'Starting...' : 'Start Verification'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {step === 'challenges' && (
                        <View style={styles.cameraContainer}>
                            <CameraView
                                ref={cameraRef}
                                style={styles.camera}
                                facing="front"
                                mode="video"
                                onCameraReady={startRecording}
                                onMountError={(e) => {
                                    console.error("Camera mount error", e);
                                    setErrorMessage("Camera failed to load");
                                    setStep('error');
                                }}
                            />
                            <View style={[styles.overlay, { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }]}>
                                <View style={styles.faceGuide} />
                                <View style={styles.challengeBox}>
                                    <Text style={styles.challengeStep}>
                                        Step {currentChallengeIndex + 1} of {challenges.length}
                                    </Text>
                                    <Text style={styles.challengeText}>
                                        {CHALLENGE_INSTRUCTIONS[challenges[currentChallengeIndex]]}
                                    </Text>
                                    {countdown > 0 && (
                                        <Text style={styles.countdown}>{countdown}</Text>
                                    )}
                                </View>
                            </View>
                        </View>
                    )}

                    {step === 'processing' && (
                        <View style={styles.processingContainer}>
                            <Animated.View style={[styles.spinner, { transform: [{ rotate: spin }] }]} />
                            <Text style={styles.processingText}>Verifying your identity...</Text>
                            <Text style={styles.processingSubtext}>This may take a few seconds</Text>
                        </View>
                    )}

                    {step === 'success' && (
                        <View style={styles.successContainer}>
                            <View style={styles.successCircle}>
                                <CheckCircle color="#22C55E" size={64} />
                            </View>
                            <Text style={styles.successTitle}>Verified!</Text>
                            <Text style={styles.successText}>
                                Your identity has been confirmed. You now have the verified badge.
                            </Text>
                        </View>
                    )}

                    {step === 'error' && (
                        <View style={styles.errorContainer}>
                            <View style={styles.errorCircle}>
                                <AlertCircle color="#DC2626" size={64} />
                            </View>
                            <Text style={styles.errorTitle}>Verification Failed</Text>
                            <Text style={styles.errorText}>{errorMessage}</Text>
                            <TouchableOpacity style={styles.retryButton} onPress={startVerification}>
                                <Text style={styles.retryButtonText}>Try Again</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 60 },
    closeButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { color: '#fff', fontSize: 18, fontWeight: '600' },
    content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },

    // Intro
    introContainer: { alignItems: 'center', maxWidth: 320 },
    iconCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(220, 38, 38, 0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
    title: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 12, textAlign: 'center' },
    description: { fontSize: 16, color: 'rgba(255,255,255,0.6)', textAlign: 'center', lineHeight: 24, marginBottom: 24 },
    securityNote: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(245, 158, 11, 0.1)', padding: 12, borderRadius: 12, marginBottom: 32 },
    securityText: { color: '#F59E0B', fontSize: 13, marginLeft: 8, flex: 1 },
    startButton: { backgroundColor: '#DC2626', paddingVertical: 16, paddingHorizontal: 48, borderRadius: 12 },
    startButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },

    // Camera
    cameraContainer: { width: width, height: width * 1.33, overflow: 'hidden' },
    camera: { flex: 1 },
    overlay: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    faceGuide: { width: 220, height: 280, borderRadius: 110, borderWidth: 3, borderColor: '#DC2626', borderStyle: 'dashed' },
    challengeBox: { position: 'absolute', bottom: 60, backgroundColor: 'rgba(0,0,0,0.8)', padding: 20, borderRadius: 16, alignItems: 'center' },
    challengeStep: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 8 },
    challengeText: { color: '#fff', fontSize: 18, fontWeight: '600', textAlign: 'center' },
    countdown: { fontSize: 48, fontWeight: 'bold', color: '#DC2626', marginTop: 12 },

    // Processing
    processingContainer: { alignItems: 'center' },
    spinner: { width: 48, height: 48, borderRadius: 24, borderWidth: 3, borderColor: '#DC2626', borderTopColor: 'transparent', marginBottom: 24 },
    processingText: { color: '#fff', fontSize: 18, fontWeight: '600' },
    processingSubtext: { color: 'rgba(255,255,255,0.5)', fontSize: 14, marginTop: 8 },

    // Success
    successContainer: { alignItems: 'center' },
    successCircle: { marginBottom: 24 },
    successTitle: { fontSize: 32, fontWeight: 'bold', color: '#22C55E', marginBottom: 12 },
    successText: { fontSize: 16, color: 'rgba(255,255,255,0.6)', textAlign: 'center', maxWidth: 280 },

    // Error
    errorContainer: { alignItems: 'center' },
    errorCircle: { marginBottom: 24 },
    errorTitle: { fontSize: 24, fontWeight: 'bold', color: '#DC2626', marginBottom: 12 },
    errorText: { fontSize: 16, color: 'rgba(255,255,255,0.6)', textAlign: 'center', maxWidth: 280, marginBottom: 24 },
    retryButton: { backgroundColor: '#DC2626', paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12 },
    retryButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

export default FaceVerificationModal;
