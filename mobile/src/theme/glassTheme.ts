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
      start: '#000000',
      end: '#000000',
    },
    secondary: {
      start: '#000000',
      end: '#111111',
    },
    tertiary: {
      start: '#000000',
      end: '#000000',
    },
  },

  // ============================================
  // GLASS SURFACE EFFECTS
  // ============================================
  glass: {
    // Blur radius for backdrop filter (px)
    blur: {
      light: 10,
      medium: 20,
      heavy: 30,
    },
    // Border radius for glass surfaces
    radius: {
      small: 8,
      medium: 16,
      large: 24,
      xl: 32,
      full: 999,
    },
    // Backdrop tint color (rgba base for white/black overlay)
    tint: {
      light: 'rgba(255, 255, 255, 0.05)',
      medium: 'rgba(255, 255, 255, 0.08)',
      heavy: 'rgba(255, 255, 255, 0.12)',
    },
    // Glass border colors
    border: {
      light: 'rgba(255, 255, 255, 0.15)',
      medium: 'rgba(255, 255, 255, 0.2)',
      dark: 'rgba(255, 255, 255, 0.3)',
    },
  },

  // ============================================
  // ELEVATION & SHADOW SYSTEM
  // ============================================
  shadow: {
    // iOS-style subtle shadows
    xs: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.18,
      shadowRadius: 1.00,
      elevation: 1,
    },
    sm: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
    md: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.30,
      shadowRadius: 4.65,
      elevation: 8,
    },
    lg: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.37,
      shadowRadius: 7.49,
      elevation: 12,
    },
  },

  // ============================================
  // COLOR PALETTE
  // ============================================
  colors: {
    // Primary brand colors
    primary: '#FFFFFF',      // White for primary actions in dark mode
    secondary: 'rgba(255, 255, 255, 0.7)',    // Translucent white

    // Semantic colors
    success: '#34C759',      // iOS Green
    warning: '#FF9500',      // iOS Orange
    danger: '#FF3B30',       // iOS Red
    info: '#007AFF',         // iOS Blue

    // Mood colors (for Canvas/journal)
    mood: {
      joy: '#FFD60A',        // Yellow
      calm: '#64D2FF',       // Light Blue
      reflect: '#BF5AF2',    // Purple
    },

    // Text & foreground
    text: {
      primary: '#FFFFFF',    // White - main text
      secondary: 'rgba(255, 255, 255, 0.7)',  // Translucent white
      tertiary: 'rgba(255, 255, 255, 0.5)',   // More translucent
      muted: 'rgba(255, 255, 255, 0.3)',      // Muted text
      inverse: '#000000',    // Black on light
    },

    // Backgrounds & surfaces
    background: {
      primary: '#000000',
      secondary: '#000000',
      tertiary: '#000000',
    },

    // Borders
    border: {
      light: 'rgba(255, 255, 255, 0.1)',
      lighter: 'rgba(255, 255, 255, 0.05)',
      dark: 'rgba(255, 255, 255, 0.2)',
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
      sm: 13,
      base: 15,
      lg: 17,
      xl: 20,
      '2xl': 22,
      '3xl': 28,
      '4xl': 34,
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
      titleL: { size: 34, weight: '700', lineHeight: 41 },      // Large Title
      titleM: { size: 28, weight: '700', lineHeight: 34 },      // Title 1
      titleS: { size: 22, weight: '600', lineHeight: 28 },      // Title 2
      bodyM: { size: 17, weight: '400', lineHeight: 22 },       // Body
      bodyS: { size: 15, weight: '400', lineHeight: 20 },       // Callout
      labelM: { size: 15, weight: '600', lineHeight: 20 },      // Headline
      labelS: { size: 13, weight: '500', lineHeight: 18 },      // Footnote
      caption: { size: 11, weight: '400', lineHeight: 13 },     // Caption 2
    },
  },

  // ============================================
  // MOTION & ANIMATIONS
  // ============================================
  motion: {
    // Durations (ms)
    duration: {
      short: 200,
      base: 300,
      long: 500,
      extraLong: 800,
    },
    // Easing curves
    easing: {
      easeOut: [0.25, 0.1, 0.25, 1],     // iOS ease out
      easeInOut: [0.42, 0, 0.58, 1],
      linear: [0, 0, 1, 1],
    },
  },

  // ============================================
  // OPACITY SCALE
  // ============================================
  opacity: {
    disabled: 0.5,
    hover: 0.8,
    pressed: 0.7,
    focus: 0.8,
    divider: 0.1,
  },

  // ============================================
  // TEXT CONTRAST LEVELS (on glass backgrounds)
  // ============================================
  textContrast: {
    high: '#FFFFFF',      // Primary text - titles, important labels
    medium: 'rgba(255, 255, 255, 0.7)',    // Secondary text - labels, descriptions
    low: 'rgba(255, 255, 255, 0.5)',       // Tertiary text - metadata, timestamps
    muted: 'rgba(255, 255, 255, 0.3)',     // Muted text - disabled, hints
    inverse: '#000000',   // Dark text - on light glass
  },

  // ============================================
  // ICON & DIVIDER OPACITY
  // ============================================
  iconOpacity: {
    primary: 1,
    secondary: 0.7,
    tertiary: 0.5,
    disabled: 0.3,
  },
  dividerOpacity: {
    subtle: 0.05,
    light: 0.1,
    medium: 0.2,
  },

  // ============================================
  // GLASS ELEVATION SYSTEM
  // ============================================
  glassElevation: {
    surfaceBase: { blur: 0, opacity: 1 },
    surfaceRaised: { blur: 10, opacity: 1 },
    surfaceElevated: { blur: 20, opacity: 1 },
  },

  // ============================================
  // CONTENT SPACING RHYTHM
  // ============================================
  spacing_rhythm: {
    listItemGap: 16,        // Space between list items
    sectionGap: 32,         // Space between major sections
    cardMargin: 20,         // Margin around large cards/components
    innerPadding: 16,       // Padding inside components
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
    blur: GLASS_TOKENS.glass.blur.heavy,
    tint: 'rgba(0, 0, 0, 0.5)', // Darker tint for header
    radius: 0,
    border: true,
    borderColor: GLASS_TOKENS.glass.border.light,
    shadow: GLASS_TOKENS.shadow.sm,
  },

  // Card containers
  card: {
    blur: GLASS_TOKENS.glass.blur.medium,
    tint: GLASS_TOKENS.glass.tint.medium,
    radius: GLASS_TOKENS.glass.radius.large,
    border: true,
    borderColor: GLASS_TOKENS.glass.border.light,
    shadow: GLASS_TOKENS.shadow.sm,
  },

  // Bottom sheets/modals
  sheet: {
    blur: GLASS_TOKENS.glass.blur.heavy,
    tint: 'rgba(20, 20, 20, 0.8)', // Dark sheet
    radius: GLASS_TOKENS.glass.radius.xl,
    border: true,
    borderColor: GLASS_TOKENS.glass.border.light,
    shadow: GLASS_TOKENS.shadow.lg,
  },

  // Floating buttons & interactive elements
  interactive: {
    blur: GLASS_TOKENS.glass.blur.medium,
    tint: 'rgba(255, 255, 255, 0.1)',
    radius: GLASS_TOKENS.glass.radius.full,
    border: true,
    borderColor: GLASS_TOKENS.glass.border.medium,
    shadow: GLASS_TOKENS.shadow.md,
  },

  // Thin separators/dividers
  divider: {
    blur: 0,
    tint: 'transparent',
    radius: 0,
    border: true,
    borderColor: GLASS_TOKENS.glass.border.light,
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
    borderOpacity: 0.5,
    tintOpacity: 0.2,
    textContrast: 1,
  },
} as const;

/**
 * Default theme configuration
 */
export const DEFAULT_THEME_CONFIG = {
  mode: 'dark' as const, // Default to dark mode
  glassBlur: 20,
  glassOpacity: 1,
  enableGradient: false, // Solid black background preferred
  enableNoise: false,
  noiseOpacity: 0,
  enableParallax: false,
  motionReduced: false,
} as const;

export type ThemeConfig = typeof DEFAULT_THEME_CONFIG;
export type GlassTokens = typeof GLASS_TOKENS;
export type GlassSurfaces = typeof GLASS_SURFACES;
