import { View, Text, StyleSheet } from 'react-native';
import dayjs, { Dayjs } from 'dayjs';

type PlanWeeklySummaryProps = {
  weekStart: Dayjs;
  totalMinutes: number;
  totalTss: number;
};

export function PlanWeeklySummary({ weekStart, totalMinutes, totalTss }: PlanWeeklySummaryProps) {
  const weekEnd = weekStart.endOf('isoWeek');

  let dateRange: string;
  if (weekStart.isSame(weekEnd, 'month')) {
    dateRange = `${weekStart.format('D')}-${weekEnd.format('D')} ${weekEnd.format('MMM')}`;
  } else {
    dateRange = `${weekStart.format('D')} ${weekStart.format('MMM')}-${weekEnd.format('D')} ${weekEnd.format(
      'MMM'
    )}`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60);
  const roundedTss = Math.round(totalTss);

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={[styles.label, styles.week]}>{dateRange}</Text>
        <Text style={styles.value}>
          {hours}h {minutes}m
        </Text>
        <Text style={styles.value}>{roundedTss} TSS</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#020617',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#1f2937',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 12,
    color: '#9ca3af',
  },
  week: {
    fontWeight: '700',
    color: '#e5e7eb',
  },
  value: {
    fontSize: 12,
    fontWeight: '600',
    color: '#f9fafb',
  },
});


