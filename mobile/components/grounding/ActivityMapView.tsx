import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import type { GPSPoint } from '../../services/ActivityTrackingService';

interface ActivityMapViewProps {
    points: GPSPoint[];
    showUserLocation?: boolean;
    interactive?: boolean;
    style?: any;
    isDark?: boolean;
}

function pointsToSVG(
    points: GPSPoint[],
    width: number,
    height: number,
    padding: number = 24
): { path: string; svgPoints: { x: number; y: number }[] } | null {
    if (points.length < 2) return null;

    const lats = points.map(p => p.latitude);
    const lngs = points.map(p => p.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const latRange = maxLat - minLat || 0.001;
    const lngRange = maxLng - minLng || 0.001;

    const drawW = width - padding * 2;
    const drawH = height - padding * 2;
    const scale = Math.min(drawW / lngRange, drawH / latRange);

    const offsetX = (drawW - lngRange * scale) / 2 + padding;
    const offsetY = (drawH - latRange * scale) / 2 + padding;

    const svgPoints = points.map(p => ({
        x: (p.longitude - minLng) * scale + offsetX,
        y: drawH - (p.latitude - minLat) * scale + offsetY + padding,
    }));

    const path = svgPoints
        .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`)
        .join(' ');

    return { path, svgPoints };
}

function singlePointToSVG(
    point: GPSPoint,
    width: number,
    height: number,
): { x: number; y: number } {
    // Center the single point in the view
    return { x: width / 2, y: height / 2 };
}

export default function ActivityMapView({
    points,
    showUserLocation = true,
    interactive = false,
    style,
    isDark = true,
}: ActivityMapViewProps) {
    const [dimensions, setDimensions] = useState({ width: 300, height: 200 });

    const colors = isDark
        ? { bg: '#0F0F0F', road: '#1C1C1C', route: '#FFFFFF', dot: '#FFFFFF', grid: '#141414', pulse: 'rgba(255,255,255,0.12)' }
        : { bg: '#F0F0F0', road: '#E0E0E0', route: '#000000', dot: '#000000', grid: '#E8E8E8', pulse: 'rgba(0,0,0,0.10)' };

    const svgData = points.length >= 2
        ? pointsToSVG(points, dimensions.width, dimensions.height)
        : null;

    const lastPoint = points.length > 0 ? points[points.length - 1] : null;

    // Calculate last point position in SVG coordinates
    let lastPtSvg: { x: number; y: number } | null = null;

    if (showUserLocation && lastPoint) {
        if (points.length >= 2 && svgData) {
            // Use the last point of the computed SVG path
            lastPtSvg = svgData.svgPoints[svgData.svgPoints.length - 1];
        } else if (points.length === 1) {
            // Single point: show in center
            lastPtSvg = singlePointToSVG(lastPoint, dimensions.width, dimensions.height);
        }
    }

    let Svg: any, Path: any, Circle: any, Line: any;
    try {
        const svgModule = require('react-native-svg');
        Svg = svgModule.Svg;
        Path = svgModule.Path;
        Circle = svgModule.Circle;
        Line = svgModule.Line;
    } catch {
        return <View style={[styles.container, style, { backgroundColor: colors.bg }]} />;
    }

    return (
        <View
            style={[styles.container, style, { backgroundColor: colors.bg }]}
            onLayout={(e) => {
                const { width, height } = e.nativeEvent.layout;
                setDimensions({ width, height });
            }}
        >
            <Svg width={dimensions.width} height={dimensions.height}>
                {/* Grid lines */}
                {Array.from({ length: 8 }).map((_, i) => {
                    const x = (dimensions.width / 8) * (i + 1);
                    return (
                        <Line
                            key={`vg${i}`}
                            x1={x} y1={0} x2={x} y2={dimensions.height}
                            stroke={colors.grid}
                            strokeWidth={0.5}
                        />
                    );
                })}
                {Array.from({ length: 6 }).map((_, i) => {
                    const y = (dimensions.height / 6) * (i + 1);
                    return (
                        <Line
                            key={`hg${i}`}
                            x1={0} y1={y} x2={dimensions.width} y2={y}
                            stroke={colors.grid}
                            strokeWidth={0.5}
                        />
                    );
                })}

                {/* Route polyline (only when >= 2 points) */}
                {svgData && (
                    <Path
                        d={svgData.path}
                        fill="none"
                        stroke={colors.route}
                        strokeWidth={2.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity={0.9}
                    />
                )}

                {/* Start point marker */}
                {svgData && svgData.svgPoints.length >= 2 && (
                    <Circle
                        cx={svgData.svgPoints[0].x}
                        cy={svgData.svgPoints[0].y}
                        r={5}
                        fill={colors.route}
                        opacity={0.5}
                    />
                )}

                {/* Current position dot (shows after first GPS fix, even with 1 point) */}
                {showUserLocation && lastPtSvg && (
                    <>
                        {/* Outer pulse ring */}
                        <Circle
                            cx={lastPtSvg.x}
                            cy={lastPtSvg.y}
                            r={12}
                            fill={colors.pulse}
                        />
                        {/* Inner solid dot */}
                        <Circle
                            cx={lastPtSvg.x}
                            cy={lastPtSvg.y}
                            r={5}
                            fill={colors.dot}
                        />
                    </>
                )}
            </Svg>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        borderRadius: 20,
        overflow: 'hidden',
    },
});
