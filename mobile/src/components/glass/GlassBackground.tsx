/**
 * GlassBackground Component
 * Simple container that renders content without any background styling
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';

interface GlassBackgroundProps {
  /** Content to render */
  children?: React.ReactNode;
  /** Custom style overrides */
  style?: any;
}

export const GlassBackground: React.FC<GlassBackgroundProps> = ({
  children,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
