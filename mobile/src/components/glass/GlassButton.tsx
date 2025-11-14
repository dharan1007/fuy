/**
 * Glass Button Component
 * Multiple variants: primary (accent), secondary (glass), tertiary (text)
 * Follows design spec for pill-shaped interactive controls
 */

import React from 'react';
import {
  Pressable,
  StyleSheet,
  ViewStyle,
  ActivityIndicator,
  View,
} from 'react-native';
import { GLASS_TOKENS } from '../../theme/glassTheme';
import { Text, LabelM } from '../typography';

type ButtonVariant = 'primary' | 'secondary' | 'tertiary';

interface GlassButtonProps {
  /** Button variant */
  variant?: ButtonVariant;
  /** Button label */
  label: string;
  /** On press handler */
  onPress: () => void;
  /** Is loading */
  loading?: boolean;
  /** Is disabled */
  disabled?: boolean;
  /** Left icon element */
  leftIcon?: React.ReactNode;
  /** Right icon element */
  rightIcon?: React.ReactNode;
  /** Custom style */
  style?: ViewStyle;
  /** Full width */
  fullWidth?: boolean;
  /** Size variant */
  size?: 'small' | 'medium' | 'large';
}

export const GlassButton: React.FC<GlassButtonProps> = ({
  variant = 'primary',
  label,
  onPress,
  loading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  style,
  fullWidth = false,
  size = 'medium',
}) => {
  const isDisabled = disabled || loading;

  // Size mappings
  const sizeMap = {
    small: {
      paddingHorizontal: GLASS_TOKENS.spacing[3],
      paddingVertical: GLASS_TOKENS.spacing[1],
      minHeight: 32,
      borderRadius: GLASS_TOKENS.glass.radius.full,
    },
    medium: {
      paddingHorizontal: GLASS_TOKENS.spacing[4],
      paddingVertical: GLASS_TOKENS.spacing[2],
      minHeight: 44,
      borderRadius: GLASS_TOKENS.glass.radius.full,
    },
    large: {
      paddingHorizontal: GLASS_TOKENS.spacing[5],
      paddingVertical: GLASS_TOKENS.spacing[3],
      minHeight: 52,
      borderRadius: GLASS_TOKENS.glass.radius.full,
    },
  };

  // Variant styles
  const variantStyles: Record<ButtonVariant, any> = {
    primary: {
      borderWidth: 0,
    },
    secondary: {
      borderWidth: 1,
      borderColor: GLASS_TOKENS.glass.border.light,
    },
    tertiary: {
      borderWidth: 0,
    },
  };

  const textColorMap: Record<ButtonVariant, string> = {
    primary: '#FFFFFF',
    secondary: GLASS_TOKENS.textContrast.high,
    tertiary: GLASS_TOKENS.colors.primary,
  };

  const containerStyle: ViewStyle = {
    ...sizeMap[size],
    ...variantStyles[variant],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: GLASS_TOKENS.spacing[2],
    ...(fullWidth && { width: '100%' }),
    ...(isDisabled && { opacity: GLASS_TOKENS.opacity.disabled }),
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        containerStyle,
        pressed && {
          opacity: GLASS_TOKENS.opacity.pressed,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={textColorMap[variant]}
        />
      ) : (
        <>
          {leftIcon && <View>{leftIcon}</View>}
          <LabelM style={{ color: textColorMap[variant] }}>
            {label}
          </LabelM>
          {rightIcon && <View>{rightIcon}</View>}
        </>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  // Styles handled inline for dynamic theming
});
