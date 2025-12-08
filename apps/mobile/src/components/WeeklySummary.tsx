import { View, Text, StyleSheet } from 'react-native';
import dayjs, { Dayjs } from 'dayjs';
import type { StravaActivity } from '@ridesofjulian/shared/utils/StravaUtil';
import type { FtpData } from '../utils/ftpUtil';
import { getFtpForDate } from '../utils/ftpUtil';
import { getTSS } from '@ridesofjulian/shared/utils/StravaUtil';

type WeeklySummaryProps = {
  activities: StravaActivity[];
  ftpHistory?: FtpData | null;
  weekStart: Dayjs;
};

export function WeeklySummary({ activities, ftpHistory, weekStart }: WeeklySummaryProps) {
  const weekEnd = weekStart.endOf('week');

  const weekActivities = activities.filter((a) => {
    const d = dayjs(a.start_date);
    return !d.isBefore(weekStart, 'day') && !d.isAfter(weekEnd, 'day');
  });

  const totals = weekActivities.reduce(
    (acc, a) => {
      acc.distance += a.distance || 0;
      acc.elevation += a.total_elevation_gain || 0;
      acc.time += a.moving_time || 0;
      const ftpForActivity = getFtpForDate(ftpHistory ?? null, a.start_date);
      if (ftpForActivity) {
        acc.tss += getTSS(a, ftpForActivity);
      }
      return acc;
    },
    { distance: 0, elevation: 0, time: 0, tss: 0 }
  );

  const distanceKm = Math.round(totals.distance / 1000);
  const elevationM = Math.round(totals.elevation);
  const timeHours = Math.round(totals.time / 3600);
  const totalTss = Math.round(totals.tss);

  let dateRange: string;
  if (weekStart.isSame(weekEnd, 'month')) {
    dateRange = `${weekStart.format('D')}-${weekEnd.format('D')} ${weekEnd.format('MMM')}`;
  } else {
    dateRange = `${weekStart.format('D')} ${weekStart.format('MMM')}-${weekEnd.format('D')} ${weekEnd.format('MMM')}`;
  }

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={[styles.label, styles.week]}>{dateRange}</Text>
        <Text style={styles.value}>{distanceKm} km</Text>
        <Text style={styles.value}>{elevationM} m</Text>
        <Text style={styles.value}>{timeHours} h</Text>
        <Text style={styles.value}>{totalTss} TSS</Text>
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


