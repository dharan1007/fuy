import React from 'react';
import { View, ViewStyle, Pressable } from 'react-native';
import { COLORS, SPACING, BORDER_RADIUS } from '../constants/index';

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  variant?: 'default' | 'outlined' | 'elevated';
  padding?: 'sm' | 'md' | 'lg';
}

const Card: React.FC<CardProps> = ({
  children,
  onPress,
  style,
  variant = 'default',
  padding = 'md',
}) => {
  const paddingValues = {
    sm: SPACING.sm,
    md: SPACING.md,
    lg: SPACING.lg,
  };

  const baseStyle: ViewStyle = {
    borderRadius: BORDER_RADIUS.lg,
    padding: paddingValues[padding],
  };

  const variantStyles = {
    default: {
    },
    outlined: {
      borderWidth: 1,
      borderColor: COLORS.gray200,
    },
    elevated: {
    },
  };

  const Component = onPress ? Pressable : View;

  return (
    <Component
      onPress={onPress}
      style={[baseStyle, variantStyles[variant], style]}
    >
      {children}
    </Component>
  );
};

export default Card;
