import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { GlassSurface } from '../glass';
import { TitleM, BodyM, BodyS, Caption } from '../typography';
import { GLASS_TOKENS } from '../../theme';

interface StatItem {
  label: string;
  value: string | number;
  change?: number;
  positive?: boolean;
  icon?: string;
  color?: string;
}

interface GrowthStatsProps {
  title?: string;
  stats: StatItem[];
  columns?: 1 | 2 | 3;
}

export function GrowthStats({
  title,
  stats,
  columns = 2,
}: GrowthStatsProps) {
  const width = Dimensions.get('window').width - GLASS_TOKENS.spacing[8];
  const itemWidth = (width - GLASS_TOKENS.spacing[2] * (columns - 1)) / columns;

  return (
    <GlassSurface variant="card" style={styles.container}>
      {title && <BodyM style={[styles.title, { marginBottom: GLASS_TOKENS.spacing[4] }]}>{title}</BodyM>}

      <View style={styles.grid}>
        {stats.map((stat, index) => (
          <View
            key={index}
            style={[
              styles.statItem,
              { width: itemWidth, marginBottom: GLASS_TOKENS.spacing[3] },
              index % columns !== columns - 1 && { marginRight: GLASS_TOKENS.spacing[2] },
            ]}
          >
            <View style={styles.statHeader}>
              {stat.icon && (
                <View
                  style={[
                    styles.statIcon,
                    { backgroundColor: `${stat.color || '#6AA8FF'}20` },
                  ]}
                >
                  <BodyM style={{ fontSize: 20 }}>{stat.icon}</BodyM>
                </View>
              )}
              <Caption contrast="low" style={{ flex: 1 }}>
                {stat.label}
              </Caption>
            </View>

            <TitleM style={{ marginTop: GLASS_TOKENS.spacing[2], marginBottom: GLASS_TOKENS.spacing[1] }}>
              {stat.value}
            </TitleM>

            {stat.change !== undefined && (
              <View style={styles.changeContainer}>
                <BodyS
                  style={[
                    styles.changeValue,
                    {
                      color: stat.positive ? '#2ECC71' : '#FF6B6B',
                    },
                  ]}
                >
                  {stat.positive ? '↑' : '↓'} {Math.abs(stat.change)}%
                </BodyS>
                <Caption contrast="low" style={{ marginLeft: GLASS_TOKENS.spacing[1] }}>
                  vs last period
                </Caption>
              </View>
            )}
          </View>
        ))}
      </View>
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: GLASS_TOKENS.spacing[4],
  },

  title: {
    fontWeight: '600',
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  statItem: {
    paddingHorizontal: GLASS_TOKENS.spacing[3],
    paddingVertical: GLASS_TOKENS.spacing[3],
    backgroundColor: '#FFFFFF05',
    borderRadius: GLASS_TOKENS.spacing[2],
    borderWidth: 1,
    borderColor: '#FFFFFF10',
  },

  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: GLASS_TOKENS.spacing[2],
  },

  statIcon: {
    width: 36,
    height: 36,
    borderRadius: GLASS_TOKENS.spacing[2],
    justifyContent: 'center',
    alignItems: 'center',
  },

  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  changeValue: {
    fontWeight: '700',
    fontSize: 13,
  },
});
