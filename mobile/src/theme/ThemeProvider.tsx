/**
 * Glass Theme Provider
 * Provides theme configuration and utilities throughout the app
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import { useColorScheme, AccessibilityInfo } from 'react-native';
import { GLASS_TOKENS, DEFAULT_THEME_CONFIG, type ThemeConfig } from './glassTheme';

interface ThemeContextType {
  config: ThemeConfig;
  tokens: typeof GLASS_TOKENS;
  updateConfig: (partial: Partial<ThemeConfig>) => void;
  resetConfig: () => void;
  // Utility functions
  getBlurIntensity: (intensity: 'light' | 'medium' | 'heavy') => number;
  getGlassTint: (density: 'light' | 'medium' | 'heavy') => string;
  getShadow: (elevation: 'xs' | 'sm' | 'md' | 'lg') => any;
  isAccessibilityEnabled: boolean;
  isMotionReduced: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  initialConfig?: Partial<ThemeConfig>;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  initialConfig = {},
}) => {
  const colorScheme = useColorScheme();
  const [config, setConfig] = useState<ThemeConfig>({
    ...DEFAULT_THEME_CONFIG,
    mode: colorScheme === 'dark' ? 'dark' : 'light',
    ...initialConfig,
  });

  const [isAccessibilityEnabled, setIsAccessibilityEnabled] = React.useState(false);
  const [isMotionReduced, setIsMotionReduced] = React.useState(false);

  // Check accessibility settings on mount
  React.useEffect(() => {
    const checkAccessibility = async () => {
      try {
        const enabled = await AccessibilityInfo.isScreenReaderEnabled();
        setIsAccessibilityEnabled(enabled);
      } catch (error) {
        console.warn('Could not check accessibility settings:', error);
      }
    };
    checkAccessibility();
  }, []);

  const updateConfig = useCallback((partial: Partial<ThemeConfig>) => {
    setConfig((prev) => ({ ...prev, ...partial }));
  }, []);

  const resetConfig = useCallback(() => {
    setConfig({
      ...DEFAULT_THEME_CONFIG,
      mode: colorScheme === 'dark' ? 'dark' : 'light',
    });
  }, [colorScheme]);

  const getBlurIntensity = useCallback(
    (intensity: 'light' | 'medium' | 'heavy'): number => {
      if (config.motionReduced || !config.enableGradient) return 0;
      return GLASS_TOKENS.glass.blur[intensity];
    },
    [config.motionReduced, config.enableGradient]
  );

  const getGlassTint = useCallback(
    (density: 'light' | 'medium' | 'heavy'): string => {
      return GLASS_TOKENS.glass.tint[density];
    },
    []
  );

  const getShadow = useCallback(
    (elevation: 'xs' | 'sm' | 'md' | 'lg'): any => {
      return GLASS_TOKENS.shadow[elevation];
    },
    []
  );

  const value: ThemeContextType = {
    config,
    tokens: GLASS_TOKENS,
    updateConfig,
    resetConfig,
    getBlurIntensity,
    getGlassTint,
    getShadow,
    isAccessibilityEnabled,
    isMotionReduced,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

/**
 * Hook to use theme in components
 */
export const useGlassTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useGlassTheme must be used within ThemeProvider');
  }
  return context;
};

/**
 * Hook to use just the tokens
 */
export const useGlassTokens = () => {
  const { tokens } = useGlassTheme();
  return tokens;
};

/**
 * Hook to use just the config
 */
export const useThemeConfig = () => {
  const { config, updateConfig, resetConfig } = useGlassTheme();
  return { config, updateConfig, resetConfig };
};

/**
 * Hook to toggle features
 */
export const useThemeFeatures = () => {
  const { config, updateConfig } = useGlassTheme();

  return {
    toggleBlur: (enabled: boolean) => updateConfig({ enableGradient: enabled }),
    toggleGradient: (enabled: boolean) => updateConfig({ enableGradient: enabled }),
    toggleNoise: (enabled: boolean) => updateConfig({ enableNoise: enabled }),
    toggleParallax: (enabled: boolean) => updateConfig({ enableParallax: enabled }),
    toggleMotionReduction: (enabled: boolean) => updateConfig({ motionReduced: enabled }),
    setBlurIntensity: (blur: number) => updateConfig({ glassBlur: blur }),
    setOpacity: (opacity: number) => updateConfig({ glassOpacity: opacity }),
  };
};
