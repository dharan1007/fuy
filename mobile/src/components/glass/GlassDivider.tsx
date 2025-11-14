/**
 * Glass Divider Component
 * Subtle 1px dividers with opacity levels
 * No hard separators - uses opacity and spacing per spec
 */

import React from 'react';
import { View, ViewStyle } from 'react-native';
import { GLASS_TOKENS } from '../../theme/glassTheme';

type DividerVariant = 'subtle' | 'light' | 'medium';

interface GlassDividerProps {
  /** Divider opacity level */
  variant?: DividerVariant;
  /** Vertical divider */
  vertical?: boolean;
  /** Custom style */
  style?: ViewStyle;
}

export const GlassDivider: React.FC<GlassDividerProps> = ({
  variant = 'light',
  vertical = false,
  style,
}) => {
  const opacity = GLASS_TOKENS.dividerOpacity[variant];

  const containerStyle: ViewStyle = vertical
    ? {
        width: 1,
        height: '100%',
        opacity,
      }
    : {
        width: '100%',
        height: 1,
        opacity,
      };

  return <View style={[containerStyle, style]} />;
};
