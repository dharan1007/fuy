/**
 * GlassSurface Component
 * Reusable glassmorphic surface for cards, containers, and UI elements
 * Configurable blur, tint, borders, and shadows
 */

import React from 'react';
import { View, ViewStyle, AccessibilityRole } from 'react-native';
import { GLASS_TOKENS, GLASS_SURFACES } from '../../theme/glassTheme';

type SurfaceVariant = 'card' | 'header' | 'sheet' | 'interactive' | 'divider' | 'custom';

interface GlassSurfaceProps {
  /** Surface variant preset (card, header, sheet, interactive, divider) */
  variant?: SurfaceVariant;
  /** Content to render inside the surface */
  children?: React.ReactNode;
  /** Border radius */
  radius?: number;
  /** Padding */
  padding?: number | { horizontal?: number; vertical?: number };
  /** Custom style overrides */
  style?: ViewStyle;
  /** Accessibility role */
  accessibilityRole?: AccessibilityRole;
  /** Accessibility label */
  accessibilityLabel?: string;
  /** Is interactive */
  interactive?: boolean;
  /** On press handler */
  onPress?: () => void;
}

export const GlassSurface: React.FC<GlassSurfaceProps> = ({
  variant = 'card',
  children,
  radius,
  padding,
  style,
  accessibilityRole = 'button',
  accessibilityLabel,
  interactive = false,
  onPress,
}) => {
  // Get preset configuration
  const preset = GLASS_SURFACES[variant];

  // Resolve radius
  const finalRadius = radius ?? preset.radius ?? GLASS_TOKENS.glass.radius.large;

  // Parse padding
  let paddingStyle: any = {};
  if (padding) {
    if (typeof padding === 'number') {
      paddingStyle = { padding };
    } else {
      if (padding.horizontal !== undefined) {
        paddingStyle.paddingHorizontal = padding.horizontal;
      }
      if (padding.vertical !== undefined) {
        paddingStyle.paddingVertical = padding.vertical;
      }
    }
  }

  // Container styles
  const containerStyle: ViewStyle = {
    borderRadius: finalRadius,
    overflow: 'hidden',
    ...paddingStyle,
  };

  return (
    <View
      style={[containerStyle, style]}
      accessible={interactive}
      accessibilityRole={interactive ? accessibilityRole : 'none'}
      accessibilityLabel={accessibilityLabel}
      onTouchEnd={onPress}
    >
      {children}
    </View>
  );
};

/**
 * Preset configurations for quick implementation
 */
export const GLASS_SURFACE_VARIANTS = {
  // Card containers - moderate blur with subtle tint
  card: {
    variant: 'card' as const,
    withBorder: true,
    shadow: 'sm' as const,
    radius: GLASS_TOKENS.glass.radius.large,
    padding: GLASS_TOKENS.spacing[3],
  },

  // Header/Nav bars - lighter blur, top border accent
  header: {
    variant: 'header' as const,
    withBorder: true,
    shadow: 'xs' as const,
    radius: 0,
    disableBlur: false,
  },

  // Bottom sheets - heavy blur, large radius
  sheet: {
    variant: 'sheet' as const,
    withBorder: true,
    shadow: 'lg' as const,
    radius: GLASS_TOKENS.glass.radius.xl,
  },

  // Interactive buttons/controls - medium blur, full radius
  button: {
    variant: 'interactive' as const,
    withBorder: true,
    shadow: 'md' as const,
    radius: GLASS_TOKENS.glass.radius.full,
    interactive: true,
  },

  // List items - minimal blur, slight padding
  listItem: {
    variant: 'card' as const,
    withBorder: false,
    shadow: 'xs' as const,
    radius: GLASS_TOKENS.glass.radius.medium,
    padding: GLASS_TOKENS.spacing[3],
  },

  // Thin dividers/separators
  divider: {
    variant: 'divider' as const,
    withBorder: true,
    borderWidth: 0.5,
    disableBlur: true,
    padding: 0,
  },

  // Minimal - no blur, subtle tint only
  minimal: {
    variant: 'card' as const,
    withBorder: true,
    shadow: undefined,
    disableBlur: true,
    radius: GLASS_TOKENS.glass.radius.medium,
  },

  // Maximum blur and depth
  maximum: {
    variant: 'sheet' as const,
    withBorder: true,
    shadow: 'lg' as const,
    radius: GLASS_TOKENS.glass.radius.xl,
    blurIntensity: GLASS_TOKENS.glass.blur.heavy,
  },
} as const;

/**
 * Utility component for consistent glass list items
 */
export const GlassListItem: React.FC<GlassSurfaceProps> = (props) => (
  <GlassSurface
    variant="card"
    radius={GLASS_TOKENS.glass.radius.medium}
    padding={{ horizontal: GLASS_TOKENS.spacing[3], vertical: GLASS_TOKENS.spacing[2] }}
    {...props}
  />
);

/**
 * Utility component for glass buttons/interactive elements
 */
export const GlassButton: React.FC<GlassSurfaceProps> = (props) => (
  <GlassSurface
    variant="interactive"
    radius={GLASS_TOKENS.glass.radius.full}
    interactive={true}
    accessibilityRole="button"
    {...props}
  />
);

/**
 * Utility component for glass modal/sheet backgrounds
 */
export const GlassSheet: React.FC<GlassSurfaceProps> = (props) => (
  <GlassSurface
    variant="sheet"
    radius={GLASS_TOKENS.glass.radius.xl}
    {...props}
  />
);
