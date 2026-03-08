import React from 'react';
import { View, StyleProp, ViewStyle, Image, ImageSourcePropType } from 'react-native';
import Svg, { Polygon, Defs, ClipPath, Image as SvgImage } from 'react-native-svg';

interface SeptagonAvatarProps {
    source?: ImageSourcePropType;
    size: number;
    color?: string; // fallback color
    borderWidth?: number;
    borderColor?: string;
    style?: StyleProp<ViewStyle>;
    children?: React.ReactNode;
}

export default function SeptagonAvatar({
    source,
    size,
    color = '#222',
    borderWidth = 0,
    borderColor = 'transparent',
    style,
    children
}: SeptagonAvatarProps) {
    // Math for a regular heptagon (7 sides)
    // Points are calculated on a circle of radius `r`
    const r = size / 2;
    const cx = size / 2;
    const cy = size / 2;

    const points = Array.from({ length: 7 }).map((_, i) => {
        // Start from top (-PI/2) and go clockwise
        const angle = -Math.PI / 2 + (i * 2 * Math.PI) / 7;
        const px = cx + r * Math.cos(angle);
        const py = cy + r * Math.sin(angle);
        return `${px},${py}`;
    }).join(' ');

    // For the inner image/content, we need to account for the border width
    const innerSize = Math.max(0, size - borderWidth * 2);
    const innerR = innerSize / 2;

    const innerPoints = Array.from({ length: 7 }).map((_, i) => {
        const angle = -Math.PI / 2 + (i * 2 * Math.PI) / 7;
        const px = cx + innerR * Math.cos(angle);
        const py = cy + innerR * Math.sin(angle);
        return `${px},${py}`;
    }).join(' ');

    return (
        <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
            <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                <Defs>
                    {/* Clip path for the image to be septagon shaped */}
                    <ClipPath id="septagonClip">
                        <Polygon points={innerPoints} />
                    </ClipPath>
                </Defs>

                {/* Outer Border (filled polygon spanning full size) */}
                {borderWidth > 0 && (
                    <Polygon
                        points={points}
                        fill={borderColor}
                    />
                )}

                {/* Inner Background / Image Area */}
                <Polygon
                    points={innerPoints}
                    fill={color}
                />

                {/* The actual image masked to the septagon */}
                {source && (
                    <SvgImage
                        x={borderWidth}
                        y={borderWidth}
                        width={innerSize}
                        height={innerSize}
                        preserveAspectRatio="xMidYMid slice"
                        href={source as any}
                        clipPath="url(#septagonClip)"
                    />
                )}
            </Svg>

            {/* Render children (like icons) centered over the SVG */}
            {children && (
                <View style={{ position: 'absolute' }}>
                    {children}
                </View>
            )}
        </View>
    );
}
