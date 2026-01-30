import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

interface AudioWaveformProps {
    waveformData: number[];
    duration: number;
    currentTime?: number;
    height?: number;
    barWidth?: number;
    barGap?: number;
    activeColor?: string;
    inactiveColor?: string;
    style?: any;
}

export default function AudioWaveform({
    waveformData,
    duration,
    currentTime = 0,
    height = 48,
    barWidth = 3,
    barGap = 1,
    activeColor = '#fff',
    inactiveColor = 'rgba(255,255,255,0.3)',
    style,
}: AudioWaveformProps) {
    const progress = duration > 0 ? currentTime / duration : 0;
    const activeBarCount = Math.floor(waveformData.length * progress);

    const bars = useMemo(() => {
        return waveformData.map((amplitude, index) => {
            const isActive = index < activeBarCount;
            const barHeight = Math.max(4, amplitude * height);
            const x = index * (barWidth + barGap);
            const y = (height - barHeight) / 2;

            return {
                x,
                y,
                width: barWidth,
                height: barHeight,
                fill: isActive ? activeColor : inactiveColor,
            };
        });
    }, [waveformData, height, barWidth, barGap, activeBarCount, activeColor, inactiveColor]);

    const totalWidth = waveformData.length * (barWidth + barGap);

    return (
        <View style={[styles.container, { height }, style]}>
            <Svg width={totalWidth} height={height}>
                {bars.map((bar, index) => (
                    <Rect
                        key={index}
                        x={bar.x}
                        y={bar.y}
                        width={bar.width}
                        height={bar.height}
                        fill={bar.fill}
                        rx={bar.width / 2}
                    />
                ))}
            </Svg>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        overflow: 'hidden',
    },
});
