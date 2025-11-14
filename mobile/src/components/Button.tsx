import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES } from '../constants/index';

interface ButtonProps {
  onPress: () => void;
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  onPress,
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  style,
  textStyle,
  icon,
}) => {
  const styles = createStyles(variant, size);

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      style={[
        styles.button,
        disabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={styles.text.color} size="small" />
      ) : (
        <>
          {icon}
          <Text style={[styles.text, textStyle]}>
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const createStyles = (variant: string, size: string) => {
  const baseButtonStyle: ViewStyle = {
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.lg,
  };

  const sizeStyles = {
    sm: { paddingVertical: SPACING.sm, minHeight: 32 },
    md: { paddingVertical: SPACING.md, minHeight: 44 },
    lg: { paddingVertical: SPACING.lg, minHeight: 56 },
  };

  const variantStyles = {
    primary: {
      button: {
        ...baseButtonStyle,
        ...sizeStyles[size as keyof typeof sizeStyles],
      },
      text: { color: COLORS.white, fontSize: FONT_SIZES.base, fontWeight: '600' as const },
      disabled: {},
    },
    secondary: {
      button: {
        ...baseButtonStyle,
        ...sizeStyles[size as keyof typeof sizeStyles],
      },
      text: { color: COLORS.white, fontSize: FONT_SIZES.base, fontWeight: '600' as const },
      disabled: {},
    },
    outline: {
      button: {
        ...baseButtonStyle,
        ...sizeStyles[size as keyof typeof sizeStyles],
        borderWidth: 1,
        borderColor: COLORS.primary,
      },
      text: { color: COLORS.primary, fontSize: FONT_SIZES.base, fontWeight: '600' as const },
      disabled: { borderColor: COLORS.gray400 },
    },
    ghost: {
      button: {
        ...baseButtonStyle,
        ...sizeStyles[size as keyof typeof sizeStyles],
      },
      text: { color: COLORS.primary, fontSize: FONT_SIZES.base, fontWeight: '600' as const },
      disabled: {},
    },
  };

  const selected = variantStyles[variant as keyof typeof variantStyles] || variantStyles.primary;

  return {
    button: selected.button,
    text: selected.text,
    disabled: selected.disabled,
  };
};

export default Button;
