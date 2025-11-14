import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { GlassSurface } from '../glass';
import { TitleM, BodyM, BodyS, Caption } from '../typography';
import { GLASS_TOKENS } from '../../theme';

interface AnalyticsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: string;
  trend?: {
    value: number;
    label: string;
    positive: boolean;
  };
  color?: string;
  size?: 'small' | 'medium' | 'large';
}

export function AnalyticsCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  color = '#6AA8FF',
  size = 'medium',
}: AnalyticsCardProps) {
  const sizeStyles = {
    small: styles.cardSmall,
    medium: styles.cardMedium,
    large: styles.cardLarge,
  };

  const containerWidth = {
    small: (Dimensions.get('window').width - GLASS_TOKENS.spacing[8] - GLASS_TOKENS.spacing[4]) / 2,
    medium: (Dimensions.get('window').width - GLASS_TOKENS.spacing[8]),
    large: (Dimensions.get('window').width - GLASS_TOKENS.spacing[8]),
  };

  return (
    <GlassSurface
      variant="card"
      style={[
        sizeStyles[size],
        { width: containerWidth[size] },
      ]}
    >
      <View style={styles.header}>
        {icon && (
          <View style={[styles.iconContainer, { backgroundColor: `${color}20` }]}>
            <BodyM style={{ fontSize: 24 }}>{icon}</BodyM>
          </View>
        )}
        <Caption contrast="low">{title}</Caption>
      </View>

      <View style={styles.content}>
        <TitleM style={{ marginBottom: GLASS_TOKENS.spacing[2] }}>
          {value}
        </TitleM>

        {trend && (
          <View style={styles.trendContainer}>
            <BodyS
              style={[
                styles.trendValue,
                { color: trend.positive ? '#2ECC71' : '#FF6B6B' },
              ]}
            >
              {trend.positive ? '↑' : '↓'} {Math.abs(trend.value)}%
            </BodyS>
            <Caption contrast="low" style={{ marginLeft: GLASS_TOKENS.spacing[1] }}>
              {trend.label}
            </Caption>
          </View>
        )}

        {subtitle && (
          <Caption contrast="low" style={{ marginTop: GLASS_TOKENS.spacing[2] }}>
            {subtitle}
          </Caption>
        )}
      </View>
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  cardSmall: {
    padding: GLASS_TOKENS.spacing[3],
  },

  cardMedium: {
    padding: GLASS_TOKENS.spacing[4],
  },

  cardLarge: {
    padding: GLASS_TOKENS.spacing[4],
  },

  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: GLASS_TOKENS.spacing[2],
    marginBottom: GLASS_TOKENS.spacing[3],
  },

  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: GLASS_TOKENS.spacing[2],
    justifyContent: 'center',
    alignItems: 'center',
  },

  content: {
    flex: 1,
  },

  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  trendValue: {
    fontWeight: '700',
    fontSize: 14,
  },
});
