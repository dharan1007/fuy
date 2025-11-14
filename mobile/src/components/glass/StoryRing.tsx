/**
 * Story Ring Component
 * Circular avatar with optional gradient ring border
 * Used for active friends and story indicators
 */

import React from 'react';
import {
  View,
  ViewStyle,
  Image,
  ImageSourcePropType,
  Pressable,
  Text,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { GLASS_TOKENS } from '../../theme/glassTheme';

interface StoryRingProps {
  /** Size of the ring (diameter in pixels) */
  size?: number;
  /** Ring border width */
  ringWidth?: number;
  /** Has active story indicator */
  hasStory?: boolean;
  /** Avatar image source */
  imageSource?: ImageSourcePropType;
  /** Avatar initials/placeholder text */
  initial?: string;
  /** Placeholder background color */
  placeholderColor?: string;
  /** Custom style */
  style?: ViewStyle;
  /** Gradient ring colors */
  gradientColors?: [string, string];
  /** On press handler */
  onPress?: () => void;
}

export const StoryRing: React.FC<StoryRingProps> = ({
  size = 56,
  ringWidth = 2,
  hasStory = false,
  imageSource,
  initial = '?',
  placeholderColor = GLASS_TOKENS.colors.primary,
  style,
  gradientColors = [GLASS_TOKENS.colors.primary, GLASS_TOKENS.colors.secondary],
  onPress,
}) => {
  const containerSize = size + (hasStory ? ringWidth * 2 : 0);

  // Gradient ring (only if hasStory)
  const GradientRing = hasStory ? (
    <LinearGradient
      colors={gradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        {
          width: containerSize,
          height: containerSize,
          borderRadius: containerSize / 2,
          padding: ringWidth,
          justifyContent: 'center',
          alignItems: 'center',
        },
      ]}
    >
      {/* Inner avatar */}
      <AvatarContent
        size={size}
        imageSource={imageSource}
        initial={initial}
        placeholderColor={placeholderColor}
      />
    </LinearGradient>
  ) : (
    <AvatarContent
      size={size}
      imageSource={imageSource}
      initial={initial}
      placeholderColor={placeholderColor}
    />
  );

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        {
          width: containerSize,
          height: containerSize,
          justifyContent: 'center',
          alignItems: 'center',
          opacity: pressed ? GLASS_TOKENS.opacity.pressed : 1,
        },
        style,
      ]}
    >
      {GradientRing}
    </Pressable>
  );
};

/**
 * Avatar content component
 */
const AvatarContent: React.FC<{
  size: number;
  imageSource?: ImageSourcePropType;
  initial: string;
  placeholderColor: string;
}> = ({ size, imageSource, initial }) => {
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          justifyContent: 'center',
          alignItems: 'center',
          overflow: 'hidden',
        },
      ]}
    >
      {imageSource ? (
        <Image
          source={imageSource}
          style={{ width: size, height: size }}
          resizeMode="cover"
        />
      ) : (
        <Text style={{ fontSize: size * 0.4, fontWeight: '600', color: '#FFFFFF' }}>
          {initial}
        </Text>
      )}
    </View>
  );
};
