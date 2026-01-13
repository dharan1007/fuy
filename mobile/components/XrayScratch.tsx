import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, PanResponder, Dimensions, Image } from 'react-native';
import Svg, { Mask, Rect, Path, Defs, Image as SvgImage } from 'react-native-svg';
import { Video, ResizeMode } from 'expo-av';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');

interface XrayScratchProps {
    coverUrl: string;
    contentUrl: string;
    coverType: string;
    contentType: string;
    isActive: boolean;
    onToggleScroll: (enabled: boolean) => void;
}

export default function XrayScratch({ coverUrl, contentUrl, coverType, contentType, isActive, onToggleScroll }: XrayScratchProps) {
    const maskId = useRef(`mask-${Math.random().toString(36).substr(2, 9)}`).current;
    const [revealed, setRevealed] = useState(false);
    const [dims, setDims] = useState({ w: width, h: width }); // Default to window width to prevent 0-size invisible start
    const [paths, setPaths] = useState<string[]>([]);
    const currentPath = useRef<string>("");

    // Reset when active changes or item changes
    useEffect(() => {
        if (!isActive) {
            setRevealed(false);
            setPaths([]);
            currentPath.current = "";
        }
    }, [isActive, coverUrl]); // Removed dims dependence to prevent loop

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => !revealed,
            onStartShouldSetPanResponderCapture: () => !revealed, // Capture touch immediately
            onMoveShouldSetPanResponder: () => !revealed,
            onMoveShouldSetPanResponderCapture: () => !revealed,

            // Critical: Prevent parent from taking over gesture
            onPanResponderTerminationRequest: () => false,

            onPanResponderGrant: (evt) => {
                if (revealed) return;
                onToggleScroll(false);
                const { locationX, locationY } = evt.nativeEvent;
                currentPath.current = `M ${locationX.toFixed(1)},${locationY.toFixed(1)} `;
                setPaths(prev => [...prev, currentPath.current]);
            },

            onPanResponderMove: (evt) => {
                if (revealed) return;
                // Force update to prevent batching lag
                const { locationX, locationY } = evt.nativeEvent;
                const point = `${locationX.toFixed(1)},${locationY.toFixed(1)} `;

                if (currentPath.current === "") {
                    currentPath.current = `M ${point} `;
                } else {
                    currentPath.current += ` L ${point} `;
                }

                setPaths(prev => {
                    const next = [...prev];
                    if (next.length > 0) {
                        next[next.length - 1] = currentPath.current;
                    }
                    return next;
                });
            },

            onPanResponderRelease: () => {
                onToggleScroll(true);
                currentPath.current = "";
            },

            onPanResponderTerminate: () => {
                onToggleScroll(true);
                currentPath.current = "";
            }
        })
    ).current;

    const renderMedia = (url: string, type: string, play: boolean, isCover: boolean) => {
        if (type === 'VIDEO' && url && url.length > 5) {
            return (
                <Video
                    source={{ uri: url }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode={ResizeMode.COVER}
                    shouldPlay={play}
                    isLooping
                    isMuted={isCover}
                    useNativeControls={false}
                    onError={(e) => console.log("Video Error Xray:", e)}
                />
            );
        }
        return (
            <Image
                source={{ uri: url }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
            />
        );
    };

    return (
        <View
            style={{ width: '100%', height: '100%', position: 'relative', backgroundColor: 'black' }}
            onLayout={(e) => setDims({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
        >
            {/* Bottom Layer (Hidden Content) */}
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10, elevation: 1 }}>
                {renderMedia(contentUrl, contentType, isActive && revealed, false)}
            </View>

            {/* Top Layer (Scratch Cover) */}
            {!revealed && (
                <View
                    style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999, elevation: 10, backgroundColor: 'rgba(255,255,255,0.01)' }} // Transparent touch layer
                    {...panResponder.panHandlers}
                >
                    <Svg width={dims.w} height={dims.h} style={{ position: 'absolute' }}>
                        <Defs>
                            <Mask id={maskId}>
                                <Rect width={dims.w} height={dims.h} fill="white" />
                                {paths.map((p, i) => (
                                    <Path
                                        key={i}
                                        d={p}
                                        stroke="black"
                                        strokeWidth={60}
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        fill="none"
                                    />
                                ))}
                            </Mask>
                        </Defs>

                        {(coverType?.toUpperCase() === 'IMAGE') ? (
                            <SvgImage
                                href={{ uri: coverUrl }}
                                width={dims.w}
                                height={dims.h}
                                preserveAspectRatio="xMidYMid slice"
                                mask={`url(#${maskId})`}
                            />
                        ) : (
                            <Rect width={dims.w} height={dims.h} fill="black" mask={`url(#${maskId})`} />
                        )}

                        {/* DEBUG: Red Line to confirm touch registration (commented out but ready) */}
                        {/* {paths.map((p, i) => (
                             <Path key={`debug-${i}`} d={p} stroke="red" strokeWidth={5} fill="none" />
                        ))} */}
                    </Svg>
                </View>
            )}

            {/* Buttons */}
            {!revealed && (
                <View style={{ position: 'absolute', bottom: 16, left: 0, right: 0, zIndex: 1100, elevation: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', gap: 8 }} pointerEvents="box-none">
                    <View style={{ backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}>
                        <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 7, textTransform: 'uppercase', letterSpacing: 2 }}>Scratch</Text>
                    </View>

                    <TouchableOpacity
                        onPress={() => setRevealed(true)}
                        style={{ backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', overflow: 'hidden' }}
                    >
                        <BlurView intensity={20} style={{ position: 'absolute', inset: 0 }} tint="dark" />
                        <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 7, textTransform: 'uppercase', letterSpacing: 2 }}>Reveal</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}
