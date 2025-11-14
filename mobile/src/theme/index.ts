/**
 * Theme Export
 * Central export for theme system
 */

export {
  GLASS_TOKENS,
  GLASS_SURFACES,
  A11Y,
  DEFAULT_THEME_CONFIG,
  type ThemeConfig,
  type GlassTokens,
  type GlassSurfaces,
} from './glassTheme';

export {
  ThemeProvider,
  useGlassTheme,
  useGlassTokens,
  useThemeConfig,
  useThemeFeatures,
} from './ThemeProvider';
