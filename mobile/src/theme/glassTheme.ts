/**
 * Glass Morphic Design System - Global Theme & Tokens
 * Designed for Apple iOS-style glassmorphic UI
 * Supports light/dark modes with dynamic theming
 */

export const GLASS_TOKENS = {
  // ============================================
  // GRADIENT BACKGROUNDS (Full-screen)
  // ============================================
  gradient: {
    primary: {
      start: '#FFFFFF',
      end: '#FFFFFF',
    },
    secondary: {
      start: '#FFFFFF',
      end: '#FFFFFF',
    },
    tertiary: {
      start: '#FFFFFF',
      end: '#FFFFFF',
    },
  },

  // ============================================
  // GLASS SURFACE EFFECTS
  // ============================================
  glass: {
    // Blur radius for backdrop filter (px)
    blur: {
      light: 0,
      medium: 0,
      heavy: 0,
    },
    // Border radius for glass surfaces
    radius: {
      small: 8,
      medium: 12,
      large: 16,
      xl: 20,
      full: 999,
    },
    // Backdrop tint color (rgba base for white/black overlay)
    tint: {
      light: '#FFFFFF',
      medium: '#FFFFFF',
      heavy: '#FFFFFF',
    },
    // Glass border colors
    border: {
      light: '#E5D7D0',
      medium: '#D0D0D0',
      dark: '#B0B0B0',
    },
  },

  // ============================================
  // ELEVATION & SHADOW SYSTEM
  // ============================================
  shadow: {
    // iOS-style subtle shadows
    xs: {},
    sm: {},
    md: {},
    lg: {},
  },

  // ============================================
  // COLOR PALETTE
  // ============================================
  colors: {
    // Primary brand colors
    primary: '#FF7A5C',      // Warm coral/orange-red
    secondary: '#FFB3A7',    // Soft peachy pink

    // Semantic colors
    success: '#FFD4C5',      // Very light peach
    warning: '#FFB3A7',      // Peachy pink
    danger: '#FF6464',       // Coral red
    info: '#6A6AFF',         // Soft purple

    // Mood colors (for Canvas/journal)
    mood: {
      joy: '#FFB3A7',        // Peachy pink
      calm: '#FFD4C5',       // Very light peach
      reflect: '#FFE5DB',    // Pale rose
    },

    // Text & foreground
    text: {
      primary: '#000000',    // Black - main text
      secondary: '#666666',  // Dark gray - secondary text
      tertiary: '#999999',   // Medium gray - tertiary text
      muted: '#999999',      // Muted text
      inverse: '#FFFFFF',    // White on dark
    },

    // Backgrounds & surfaces
    background: {
      primary: '#FFFFFF',
      secondary: '#FAFAF8',
      tertiary: '#FFF5F0',
    },

    // Borders
    border: {
      light: '#E5D7D0',
      lighter: '#F0F0F0',
      dark: '#D0D0D0',
    },
  },

  // ============================================
  // SPACING SYSTEM (8px base)
  // ============================================
  spacing: {
    0: 0,
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    8: 32,
    10: 40,
    12: 48,
    16: 64,
  },

  // ============================================
  // TYPOGRAPHY
  // ============================================
  typography: {
    // Font sizes
    size: {
      xs: 11,
      sm: 12,
      base: 14,
      lg: 16,
      xl: 18,
      '2xl': 20,
      '3xl': 24,
      '4xl': 32,
    },
    // Font weights
    weight: {
      light: '300',
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
    // Typography scale mappings
    scale: {
      titleL: { size: 32, weight: '500', lineHeight: 40 },      // Screen titles
      titleM: { size: 24, weight: '500', lineHeight: 32 },      // Section headers
      titleS: { size: 20, weight: '500', lineHeight: 28 },      // Card titles
      bodyM: { size: 16, weight: '400', lineHeight: 24 },       // Body text, labels
      bodyS: { size: 14, weight: '400', lineHeight: 20 },       // Secondary text
      labelM: { size: 14, weight: '500', lineHeight: 20 },      // Button labels, chips
      labelS: { size: 12, weight: '500', lineHeight: 16 },      // Metadata, small labels
      caption: { size: 11, weight: '400', lineHeight: 14 },     // Timestamps, helpers
    },
  },

  // ============================================
  // MOTION & ANIMATIONS
  // ============================================
  motion: {
    // Durations (ms)
    duration: {
      short: 150,
      base: 250,
      long: 350,
      extraLong: 500,
    },
    // Easing curves
    easing: {
      easeOut: [0.25, 0.46, 0.45, 0.94],     // cubic-bezier
      easeInOut: [0.42, 0, 0.58, 1],
      linear: [0, 0, 1, 1],
    },
  },

  // ============================================
  // OPACITY SCALE
  // ============================================
  opacity: {
    disabled: 1,
    hover: 1,
    pressed: 1,
    focus: 1,
    divider: 1,
  },

  // ============================================
  // TEXT CONTRAST LEVELS (on glass backgrounds)
  // ============================================
  textContrast: {
    high: '#000000',      // Primary text - titles, important labels
    medium: '#666666',    // Secondary text - labels, descriptions
    low: '#999999',       // Tertiary text - metadata, timestamps
    muted: '#AAAAAA',     // Muted text - disabled, hints
    inverse: '#FFFFFF',   // Light text - on dark glass
  },

  // ============================================
  // ICON & DIVIDER OPACITY
  // ============================================
  iconOpacity: {
    primary: 1,
    secondary: 1,
    tertiary: 1,
    disabled: 1,
  },
  dividerOpacity: {
    subtle: 1,
    light: 1,
    medium: 1,
  },

  // ============================================
  // GLASS ELEVATION SYSTEM
  // ============================================
  glassElevation: {
    surfaceBase: { blur: 0, opacity: 1 },
    surfaceRaised: { blur: 0, opacity: 1 },
    surfaceElevated: { blur: 0, opacity: 1 },
  },

  // ============================================
  // CONTENT SPACING RHYTHM
  // ============================================
  spacing_rhythm: {
    listItemGap: 16,        // Space between list items
    sectionGap: 24,         // Space between major sections
    cardMargin: 32,         // Margin around large cards/components
    innerPadding: 12,       // Padding inside components
  },

  // ============================================
  // Z-INDEX SCALE
  // ============================================
  zIndex: {
    hide: -1,
    base: 0,
    dropdown: 1000,
    sticky: 1100,
    fixed: 1200,
    modalBackdrop: 1300,
    modal: 1400,
    popover: 1500,
    tooltip: 1600,
    notification: 1700,
  },
} as const;

/**
 * Glass Surface Presets
 * Pre-configured combinations for common UI patterns
 */
export const GLASS_SURFACES = {
  // Full-screen background with gradient
  background: {
    blur: GLASS_TOKENS.glass.blur.medium,
    tint: GLASS_TOKENS.glass.tint.light,
    radius: 0,
    borderless: true,
    shadow: GLASS_TOKENS.shadow.xs,
  },

  // Header/Navigation bars
  header: {
    blur: GLASS_TOKENS.glass.blur.medium,
    tint: GLASS_TOKENS.glass.tint.light,
    radius: 0,
    border: true,
    borderColor: GLASS_TOKENS.glass.border.light,
    shadow: GLASS_TOKENS.shadow.xs,
  },

  // Card containers
  card: {
    blur: GLASS_TOKENS.glass.blur.light,
    tint: GLASS_TOKENS.glass.tint.medium,
    radius: GLASS_TOKENS.glass.radius.large,
    border: true,
    borderColor: GLASS_TOKENS.glass.border.light,
    shadow: GLASS_TOKENS.shadow.sm,
  },

  // Bottom sheets/modals
  sheet: {
    blur: GLASS_TOKENS.glass.blur.heavy,
    tint: GLASS_TOKENS.glass.tint.heavy,
    radius: GLASS_TOKENS.glass.radius.xl,
    border: true,
    borderColor: GLASS_TOKENS.glass.border.light,
    shadow: GLASS_TOKENS.shadow.lg,
  },

  // Floating buttons & interactive elements
  interactive: {
    blur: GLASS_TOKENS.glass.blur.medium,
    tint: GLASS_TOKENS.glass.tint.medium,
    radius: GLASS_TOKENS.glass.radius.full,
    border: true,
    borderColor: GLASS_TOKENS.glass.border.light,
    shadow: GLASS_TOKENS.shadow.md,
  },

  // Thin separators/dividers
  divider: {
    blur: GLASS_TOKENS.glass.blur.light,
    tint: GLASS_TOKENS.glass.tint.light,
    radius: 0,
    border: true,
    borderColor: GLASS_TOKENS.glass.border.medium,
    borderless: true,
    shadow: GLASS_TOKENS.shadow.xs,
  },

  // Custom variant for flexible usage
  custom: {
    blur: GLASS_TOKENS.glass.blur.medium,
    tint: GLASS_TOKENS.glass.tint.medium,
    radius: GLASS_TOKENS.glass.radius.medium,
    border: true,
    borderColor: GLASS_TOKENS.glass.border.light,
    shadow: GLASS_TOKENS.shadow.md,
  },
} as const;

/**
 * Accessibility helpers
 */
export const A11Y = {
  // Minimum contrast ratios for WCAG AA
  minContrast: 4.5, // 4.5:1 for normal text, 3:1 for large text

  // Reduced motion fallback
  motionDisabledDuration: 0, // Instant animations

  // High contrast mode overrides
  highContrast: {
    borderOpacity: 0.3,
    tintOpacity: 0.4,
    textContrast: 0.95,
  },
} as const;

/**
 * Default theme configuration
 */
export const DEFAULT_THEME_CONFIG = {
  mode: 'light' as const,
  glassBlur: 0, // Disabled - expo-blur native module not compiled in Android build
  glassOpacity: 1,
  enableGradient: true,
  enableNoise: true,
  noiseOpacity: 0.15,
  enableParallax: true,
  motionReduced: false,
} as const;

export type ThemeConfig = typeof DEFAULT_THEME_CONFIG;
export type GlassTokens = typeof GLASS_TOKENS;
export type GlassSurfaces = typeof GLASS_SURFACES;
