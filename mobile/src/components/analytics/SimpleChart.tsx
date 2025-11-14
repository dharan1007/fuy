import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { GlassSurface } from '../glass';
import { BodyS, Caption } from '../typography';
import { GLASS_TOKENS } from '../../theme';

interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

interface SimpleChartProps {
  data: ChartDataPoint[];
  title?: string;
  subtitle?: string;
  height?: number;
  type?: 'bar' | 'line';
  showValues?: boolean;
}

export function SimpleChart({
  data,
  title,
  subtitle,
  height = 200,
  type = 'bar',
  showValues = true,
}: SimpleChartProps) {
  if (!data || data.length === 0) {
    return (
      <GlassSurface variant="card" style={{ height }}>
        <Caption contrast="low">No data available</Caption>
      </GlassSurface>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.value));
  const width = Dimensions.get('window').width - GLASS_TOKENS.spacing[8];
  const barWidth = Math.max(20, width / (data.length * 2));

  return (
    <GlassSurface variant="card" style={styles.container}>
      {title && <BodyS style={styles.title}>{title}</BodyS>}
      {subtitle && <Caption contrast="low" style={styles.subtitle}>{subtitle}</Caption>}

      <View style={[styles.chartContainer, { height }]}>
        <View style={styles.yAxis}>
          {[100, 75, 50, 25, 0].map((percentage) => (
            <Caption
              key={percentage}
              contrast="low"
              style={[styles.yLabel, { height: height / 4 }]}
            >
              {(maxValue * percentage) / 100}
            </Caption>
          ))}
        </View>

        <View style={styles.chartArea}>
          {/* Grid Lines */}
          {[0, 1, 2, 3, 4].map((i) => (
            <View
              key={`grid-${i}`}
              style={[
                styles.gridLine,
                { bottom: (height / 4) * i, width: '100%' },
              ]}
            />
          ))}

          {/* Data Visualization */}
          <View style={styles.barsContainer}>
            {data.map((point, index) => {
              const barHeight = (point.value / maxValue) * height;
              return (
                <View
                  key={`bar-${index}`}
                  style={[
                    styles.barWrapper,
                    { flex: 1, justifyContent: 'flex-end' },
                  ]}
                >
                  <View
                    style={[
                      styles.bar,
                      {
                        height: barHeight,
                        backgroundColor: point.color || '#6AA8FF',
                        opacity: 0.8,
                      },
                    ]}
                  >
                    {showValues && barHeight > 30 && (
                      <Caption
                        contrast="low"
                        style={{
                          fontSize: 10,
                          color: '#FFFFFF',
                          fontWeight: '600',
                          position: 'absolute',
                          top: -20,
                        }}
                      >
                        {point.value}
                      </Caption>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </View>

      {/* Labels */}
      <View style={styles.labelsContainer}>
        {data.map((point, index) => (
          <View key={`label-${index}`} style={styles.labelItem}>
            <BodyS contrast="low" style={styles.label}>
              {point.label}
            </BodyS>
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
    marginBottom: GLASS_TOKENS.spacing[1],
  },

  subtitle: {
    marginBottom: GLASS_TOKENS.spacing[3],
  },

  chartContainer: {
    flexDirection: 'row',
    marginBottom: GLASS_TOKENS.spacing[3],
    gap: GLASS_TOKENS.spacing[2],
  },

  yAxis: {
    width: 40,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingRight: GLASS_TOKENS.spacing[2],
  },

  yLabel: {
    fontSize: 10,
    color: '#E8E8F070',
    justifyContent: 'flex-start',
  },

  chartArea: {
    flex: 1,
    position: 'relative',
  },

  gridLine: {
    height: 1,
    backgroundColor: '#FFFFFF10',
    position: 'absolute',
  },

  barsContainer: {
    flexDirection: 'row',
    height: '100%',
    gap: GLASS_TOKENS.spacing[1],
    position: 'relative',
    zIndex: 1,
  },

  barWrapper: {
    alignItems: 'center',
  },

  bar: {
    width: '100%',
    borderRadius: GLASS_TOKENS.spacing[1],
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: GLASS_TOKENS.spacing[1],
  },

  labelsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: GLASS_TOKENS.spacing[2],
  },

  labelItem: {
    flex: 1,
    alignItems: 'center',
  },

  label: {
    fontSize: 11,
    fontWeight: '500',
  },
});
