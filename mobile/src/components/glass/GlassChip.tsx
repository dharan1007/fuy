/**
 * Glass Chip Component
 * For filters, tabs, and pill-shaped selections
 * Follows design spec with optional selected state
 */

import React from 'react';
import {
  Pressable,
  ViewStyle,
  View,
} from 'react-native';
import { GLASS_TOKENS } from '../../theme/glassTheme';
import { LabelS } from '../typography';

interface GlassChipProps {
  /** Chip label */
  label: string;
  /** Is selected */
  selected?: boolean;
  /** On press handler */
  onPress?: () => void;
  /** Left icon/element */
  leftIcon?: React.ReactNode;
  /** Custom style */
  style?: ViewStyle;
  /** Disabled state */
  disabled?: boolean;
}

export const GlassChip: React.FC<GlassChipProps> = ({
  label,
  selected = false,
  onPress,
  leftIcon,
  style,
  disabled = false,
}) => {
  const containerStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    gap: GLASS_TOKENS.spacing[1],
    paddingHorizontal: GLASS_TOKENS.spacing[3],
    paddingVertical: GLASS_TOKENS.spacing[1],
    borderRadius: GLASS_TOKENS.glass.radius.full,
    ...(selected ? {
      borderWidth: 0,
    } : {
      borderWidth: 1,
      borderColor: GLASS_TOKENS.glass.border.light,
    }),
    ...(disabled && { opacity: GLASS_TOKENS.opacity.disabled }),
  };

  const textColor = selected
    ? '#FFFFFF'
    : GLASS_TOKENS.textContrast.high;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        containerStyle,
        pressed && { opacity: GLASS_TOKENS.opacity.pressed },
        style,
      ]}
    >
      {leftIcon && <View>{leftIcon}</View>}
      <LabelS style={{ color: textColor }}>
        {label}
      </LabelS>
    </Pressable>
  );
};
