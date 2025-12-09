import { View, Text, StyleSheet } from 'react-native';

export type Interval = {
  id: string;
  name: string;
  duration: number;
  powerMin: number;
  powerMax: number;
};

interface WorkoutChartProps {
  intervals: Interval[];
  showIntervals?: boolean;
}

const getIntervalColor = (powerMin: number, powerMax: number) => {
  const avgPower = (powerMin + powerMax) / 2;
  if (avgPower < 100) return 'rgba(156, 163, 175, 0.8)';
  if (avgPower < 150) return 'rgba(96, 165, 250, 0.8)';
  if (avgPower < 200) return 'rgba(52, 211, 153, 0.8)';
  if (avgPower < 250) return 'rgba(251, 191, 36, 0.8)';
  if (avgPower < 300) return 'rgba(251, 146, 60, 0.8)';
  return 'rgba(220, 38, 38, 0.85)';
};

export function WorkoutChart({ intervals, showIntervals = true }: WorkoutChartProps) {
  if (intervals.length === 0) return null;

  const maxPower = Math.max(300, ...intervals.map((i) => i.powerMax || 0));

  return (
    <>
      {maxPower > 0 && (
        <View style={styles.workoutChart}>
          <View style={styles.workoutChartRow}>
            {intervals.map((interval) => {
              if (!interval.duration) return null;
              const barHeight = (interval.powerMax / maxPower) * 72 || 4;
              return (
                <View
                  key={interval.id}
                  style={[styles.workoutChartSegment, { flex: interval.duration }]}
                >
                  <View
                    style={[
                      styles.workoutChartBar,
                      {
                        height: Math.max(barHeight, 4),
                        backgroundColor: getIntervalColor(interval.powerMin, interval.powerMax),
                      },
                    ]}
                  />
                </View>
              );
            })}
          </View>
        </View>
      )}

      {showIntervals &&
        intervals.map((interval) => (
          <View key={interval.id} style={styles.intervalRow}>
            <Text style={styles.intervalName}>{interval.name}</Text>
            <Text style={styles.intervalMeta}>
              {interval.duration / 60}m | {interval.powerMin}-{interval.powerMax}W
            </Text>
          </View>
        ))}
    </>
  );
}

const styles = StyleSheet.create({
  workoutChart: {
    marginBottom: 6,
    paddingVertical: 4,
    backgroundColor: '#020617',
  },
  workoutChartRow: {
    height: 80,
    flexDirection: 'row',
    alignItems: 'flex-end',
    overflow: 'hidden',
  },
  workoutChartSegment: {
    flex: 1,
    marginHorizontal: 1,
    justifyContent: 'flex-end',
  },
  workoutChartBar: {
    width: '100%',
    borderRadius: 3,
  },
  intervalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  intervalName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#e5e7eb',
    flex: 1,
    marginRight: 8,
  },
  intervalMeta: {
    fontSize: 12,
    color: '#9ca3af',
  },
});

