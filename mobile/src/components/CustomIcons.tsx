import React from 'react';
import { View, StyleSheet } from 'react-native';

const COLORS = {
  primary: '#6AA8FF',
  joy: '#FFB366',
  calm: '#38D67A',
  reflect: '#B88FFF',
  text: '#E8E8F0',
  textMuted: '#E8E8F0',
};

interface IconProps {
  size?: number;
  color?: string;
}

// Home Icon - House shape
export const HomeIcon: React.FC<IconProps> = ({ size = 24, color = COLORS.primary }) => (
  <View style={[styles.iconContainer, { width: size, height: size }]}>
    <View
      style={{
        width: size * 0.6,
        height: size * 0.5,
        borderWidth: 2,
        borderColor: color,
        borderTopWidth: 0,
        borderRadius: 2,
        position: 'relative',
      }}
    >
      <View
        style={{
          position: 'absolute',
          top: -size * 0.35,
          left: size * 0.05,
          width: 0,
          height: 0,
          borderLeftWidth: size * 0.3,
          borderRightWidth: size * 0.3,
          borderBottomWidth: size * 0.35,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderBottomColor: color,
        }}
      />
    </View>
  </View>
);

// Messages Icon - Speech bubbles
export const MessagesIcon: React.FC<IconProps> = ({ size = 24, color = COLORS.primary }) => (
  <View style={[styles.iconContainer, { width: size, height: size }]}>
    <View
      style={{
        position: 'absolute',
        top: size * 0.1,
        left: size * 0.1,
        width: size * 0.7,
        height: size * 0.5,
        borderWidth: 1.5,
        borderColor: color,
        borderRadius: size * 0.1,
      }}
    />
    <View
      style={{
        position: 'absolute',
        top: size * 0.4,
        right: size * 0.15,
        width: size * 0.5,
        height: size * 0.35,
        borderWidth: 1.5,
        borderColor: color,
        borderRadius: size * 0.08,
      }}
    />
  </View>
);

// Discover Icon - Magnifying glass
export const DiscoverIcon: React.FC<IconProps> = ({ size = 24, color = COLORS.primary }) => (
  <View style={[styles.iconContainer, { width: size, height: size }]}>
    {/* Circle */}
    <View
      style={{
        width: size * 0.55,
        height: size * 0.55,
        borderWidth: 2,
        borderColor: color,
        borderRadius: size * 0.275,
        position: 'absolute',
        top: size * 0.05,
        left: size * 0.05,
      }}
    />
    {/* Handle */}
    <View
      style={{
        position: 'absolute',
        bottom: size * 0.08,
        right: size * 0.08,
        width: 2,
        height: size * 0.35,
        backgroundColor: color,
        transform: [{ rotate: '-45deg' }],
      }}
    />
  </View>
);

// Profile Icon - User silhouette
export const ProfileIcon: React.FC<IconProps> = ({ size = 24, color = COLORS.primary }) => (
  <View style={[styles.iconContainer, { width: size, height: size }]}>
    {/* Head */}
    <View
      style={{
        width: size * 0.35,
        height: size * 0.35,
        borderRadius: size * 0.175,
        borderWidth: 2,
        borderColor: color,
        position: 'absolute',
        top: size * 0.08,
        left: size * 0.325,
      }}
    />
    {/* Body */}
    <View
      style={{
        width: size * 0.6,
        height: size * 0.35,
        borderWidth: 2,
        borderColor: color,
        borderTopWidth: 0,
        borderRadius: size * 0.12,
        position: 'absolute',
        bottom: size * 0.05,
        left: size * 0.2,
      }}
    />
  </View>
);

// Notification Icon - Bell with dot
export const NotificationIcon: React.FC<IconProps> = ({ size = 24, color = COLORS.primary }) => (
  <View style={[styles.iconContainer, { width: size, height: size }]}>
    {/* Bell */}
    <View
      style={{
        width: size * 0.55,
        height: size * 0.5,
        borderWidth: 2,
        borderColor: color,
        borderRadius: size * 0.15,
        position: 'absolute',
        top: size * 0.1,
        left: size * 0.225,
      }}
    />
    {/* Clapper */}
    <View
      style={{
        width: size * 0.3,
        height: 2,
        backgroundColor: color,
        position: 'absolute',
        bottom: size * 0.15,
        left: size * 0.35,
      }}
    />
    {/* Notification dot */}
    <View
      style={{
        width: size * 0.25,
        height: size * 0.25,
        borderRadius: size * 0.125,
        backgroundColor: '#FF6B6B',
        position: 'absolute',
        top: size * 0.05,
        right: size * 0.05,
      }}
    />
  </View>
);

// Canvas Icon - Palette with brush
export const CanvasIcon: React.FC<IconProps> = ({ size = 24, color = COLORS.primary }) => (
  <View style={[styles.iconContainer, { width: size, height: size }]}>
    {/* Palette */}
    <View
      style={{
        width: size * 0.6,
        height: size * 0.5,
        borderWidth: 2,
        borderColor: color,
        borderRadius: size * 0.15,
        position: 'absolute',
        top: size * 0.2,
        left: size * 0.2,
      }}
    />
    {/* Brush stroke */}
    <View
      style={{
        position: 'absolute',
        top: size * 0.15,
        right: size * 0.15,
        width: size * 0.25,
        height: 2,
        backgroundColor: color,
        transform: [{ rotate: '-45deg' }],
      }}
    />
  </View>
);

// Hopln Icon - Rocket
export const HoplnIcon: React.FC<IconProps> = ({ size = 24, color = COLORS.primary }) => (
  <View style={[styles.iconContainer, { width: size, height: size }]}>
    {/* Body */}
    <View
      style={{
        width: size * 0.25,
        height: size * 0.6,
        backgroundColor: color,
        position: 'absolute',
        top: size * 0.15,
        left: size * 0.375,
        borderRadius: size * 0.125,
      }}
    />
    {/* Tip */}
    <View
      style={{
        position: 'absolute',
        top: size * 0.08,
        left: size * 0.35,
        width: 0,
        height: 0,
        borderLeftWidth: size * 0.15,
        borderRightWidth: size * 0.15,
        borderBottomWidth: size * 0.15,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderBottomColor: color,
      }}
    />
    {/* Left fin */}
    <View
      style={{
        position: 'absolute',
        bottom: size * 0.1,
        left: size * 0.15,
        width: size * 0.2,
        height: size * 0.2,
        borderWidth: 2,
        borderColor: color,
        borderRadius: size * 0.1,
      }}
    />
    {/* Right fin */}
    <View
      style={{
        position: 'absolute',
        bottom: size * 0.1,
        right: size * 0.15,
        width: size * 0.2,
        height: size * 0.2,
        borderWidth: 2,
        borderColor: color,
        borderRadius: size * 0.1,
      }}
    />
  </View>
);

// Essenz Icon - Star
export const EssenzIcon: React.FC<IconProps> = ({ size = 24, color = COLORS.primary }) => (
  <View style={[styles.iconContainer, { width: size, height: size }]}>
    <View
      style={{
        position: 'absolute',
        top: size * 0.1,
        left: size * 0.5,
        width: 0,
        height: 0,
        borderLeftWidth: size * 0.15,
        borderRightWidth: size * 0.15,
        borderBottomWidth: size * 0.15,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderBottomColor: color,
        marginLeft: -size * 0.15,
      }}
    />
    <View
      style={{
        position: 'absolute',
        top: size * 0.35,
        left: size * 0.15,
        width: 0,
        height: 0,
        borderRightWidth: size * 0.15,
        borderBottomWidth: size * 0.15,
        borderLeftColor: color,
        borderBottomColor: color,
        borderRightColor: 'transparent',
      }}
    />
    <View
      style={{
        position: 'absolute',
        top: size * 0.35,
        right: size * 0.15,
        width: 0,
        height: 0,
        borderLeftWidth: size * 0.15,
        borderBottomWidth: size * 0.15,
        borderLeftColor: color,
        borderBottomColor: color,
        borderRightColor: 'transparent',
      }}
    />
    <View
      style={{
        position: 'absolute',
        bottom: size * 0.1,
        left: size * 0.2,
        width: 0,
        height: 0,
        borderRightWidth: size * 0.13,
        borderTopWidth: size * 0.13,
        borderRightColor: color,
        borderTopColor: 'transparent',
        borderLeftColor: color,
      }}
    />
    <View
      style={{
        position: 'absolute',
        bottom: size * 0.1,
        right: size * 0.2,
        width: 0,
        height: 0,
        borderLeftWidth: size * 0.13,
        borderTopWidth: size * 0.13,
        borderLeftColor: color,
        borderTopColor: 'transparent',
        borderRightColor: color,
      }}
    />
  </View>
);

// Shop Icon - Shopping bag
export const ShopIcon: React.FC<IconProps> = ({ size = 24, color = COLORS.primary }) => (
  <View style={[styles.iconContainer, { width: size, height: size }]}>
    {/* Bag body */}
    <View
      style={{
        width: size * 0.6,
        height: size * 0.55,
        borderWidth: 2,
        borderColor: color,
        borderTopWidth: 0,
        position: 'absolute',
        top: size * 0.25,
        left: size * 0.2,
        borderRadius: 2,
      }}
    />
    {/* Handle left */}
    <View
      style={{
        position: 'absolute',
        top: size * 0.05,
        left: size * 0.3,
        width: 2,
        height: size * 0.25,
        backgroundColor: color,
      }}
    />
    {/* Handle right */}
    <View
      style={{
        position: 'absolute',
        top: size * 0.05,
        right: size * 0.3,
        width: 2,
        height: size * 0.25,
        backgroundColor: color,
      }}
    />
    {/* Handle curve */}
    <View
      style={{
        position: 'absolute',
        top: size * 0.08,
        left: size * 0.3,
        right: size * 0.3,
        height: size * 0.15,
        borderWidth: 2,
        borderColor: color,
        borderBottomWidth: 0,
        borderRadius: size * 0.1,
      }}
    />
  </View>
);

// Create/Plus Icon
export const CreateIcon: React.FC<IconProps> = ({ size = 24, color = COLORS.primary }) => (
  <View style={[styles.iconContainer, { width: size, height: size }]}>
    {/* Vertical line */}
    <View
      style={{
        position: 'absolute',
        left: size * 0.45,
        top: size * 0.1,
        width: 2,
        height: size * 0.8,
        backgroundColor: color,
      }}
    />
    {/* Horizontal line */}
    <View
      style={{
        position: 'absolute',
        top: size * 0.45,
        left: size * 0.1,
        width: size * 0.8,
        height: 2,
        backgroundColor: color,
      }}
    />
  </View>
);

const styles = StyleSheet.create({
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
