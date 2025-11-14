/**
 * Typography Components
 * Standardized text components using the glass design system scale
 * Ensures consistent typography across all screens
 */

import React from 'react';
import { Text as RNText, TextProps as RNTextProps, StyleSheet } from 'react-native';
import { GLASS_TOKENS } from '../../theme/glassTheme';

type TextVariant = keyof typeof GLASS_TOKENS.typography.scale;
type TextContrast = keyof typeof GLASS_TOKENS.textContrast;

interface TextComponentProps extends RNTextProps {
  /** Typography scale variant */
  variant?: TextVariant;
  /** Text contrast level (affects color) */
  contrast?: TextContrast;
}

/**
 * Apply typography scale to Text component
 * Maps variant to size, weight, and lineHeight from design tokens
 */
export const Text: React.FC<TextComponentProps> = ({
  variant = 'bodyM',
  contrast = 'high',
  style,
  children,
  ...props
}) => {
  const scale = GLASS_TOKENS.typography.scale[variant];
  const color = GLASS_TOKENS.textContrast[contrast];

  const textStyle = [
    {
      fontSize: scale.size,
      fontWeight: scale.weight as any,
      lineHeight: scale.lineHeight,
      color,
    },
    style,
  ];

  return (
    <RNText {...props} style={textStyle}>
      {children}
    </RNText>
  );
};

/**
 * Preset typography components for common use cases
 */

export const TitleL: React.FC<TextComponentProps> = (props) => (
  <Text variant="titleL" contrast="high" {...props} />
);

export const TitleM: React.FC<TextComponentProps> = (props) => (
  <Text variant="titleM" contrast="high" {...props} />
);

export const TitleS: React.FC<TextComponentProps> = (props) => (
  <Text variant="titleS" contrast="high" {...props} />
);

export const BodyM: React.FC<TextComponentProps> = (props) => (
  <Text variant="bodyM" contrast="medium" {...props} />
);

export const BodyS: React.FC<TextComponentProps> = (props) => (
  <Text variant="bodyS" contrast="medium" {...props} />
);

export const LabelM: React.FC<TextComponentProps> = (props) => (
  <Text variant="labelM" contrast="high" {...props} />
);

export const LabelS: React.FC<TextComponentProps> = (props) => (
  <Text variant="labelS" contrast="medium" {...props} />
);

export const Caption: React.FC<TextComponentProps> = (props) => (
  <Text variant="caption" contrast="low" {...props} />
);

const styles = StyleSheet.create({
  // Empty - all styling done inline to support dynamic theming
});
