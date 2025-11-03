import React from 'react';
import { View, StyleSheet, ViewStyle, Pressable } from 'react-native';
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
      backgroundColor: COLORS.white,
      shadowColor: COLORS.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    outlined: {
      backgroundColor: COLORS.white,
      borderWidth: 1,
      borderColor: COLORS.gray200,
    },
    elevated: {
      backgroundColor: COLORS.white,
      shadowColor: COLORS.black,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 5,
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
