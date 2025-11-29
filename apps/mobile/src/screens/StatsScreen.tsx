import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useStravaActivitiesForDateRange } from '../hooks/useStravaActivitiesForDateRange';
import { useWorkouts } from '../hooks/useWorkouts';
import { getFtp, type FtpData, getFtpForDate } from '../utils/ftpUtil';
import { supabase } from '../config/supabase';
import { getTSS, type StravaActivity } from '../utils/StravaUtil';
import { FTPGraph } from '../components/FTPGraph';
import type { DateRange } from './HomeScreen';

interface StatsScreenProps {
  dateRange: DateRange;
}

export function StatsScreen({ dateRange }: StatsScreenProps) {
  const { data: activities = [], isLoading: activitiesLoading } = useStravaActivitiesForDateRange(
    dateRange.start,
    dateRange.end
  );

  const { data: allWorkouts = [], isLoading: workoutsLoading } = useWorkouts();
  const workouts = useMemo(() => 
    allWorkouts.filter(w => {
      const date = dayjs(w.datetime);
      return date.isAfter(dayjs(dateRange.start).subtract(1, 'day')) && 
             date.isBefore(dayjs(dateRange.end).add(1, 'day'));
    }),
    [allWorkouts, dateRange]
  );

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user;
    },
  });

  const { data: ftpHistory, isLoading: ftpLoading } = useQuery<FtpData | null>({
    queryKey: ['ftpHistory', user?.id],
    queryFn: async () => {
      if (!user) return null;
      return await getFtp(supabase, user.id);
    },
    enabled: !!user,
  });

  const cyclingActivities = useMemo(
    () =>
      activities.filter((a: StravaActivity) => {
        const sport = (a.sport_type || a.type || '').toLowerCase();
        return sport.includes('ride');
      }),
    [activities]
  );

  const weeklyData = useMemo(() => {
    const byWeek: Record<
      string,
      { start: dayjs.Dayjs; timeSeconds: number; tss: number }
    > = {};

    // Generate all weeks in the date range
    let current = dayjs(dateRange.start).startOf('week');
    const end = dayjs(dateRange.end).endOf('week');
    
    while (current.isBefore(end) || current.isSame(end, 'week')) {
      const key = current.format('YYYY-MM-DD');
      byWeek[key] = { start: current, timeSeconds: 0, tss: 0 };
      current = current.add(1, 'week');
    }

    // Fill in data for weeks with activities
    for (const a of cyclingActivities) {
      const d = dayjs(a.start_date);
      const weekStart = d.startOf('week');
      const key = weekStart.format('YYYY-MM-DD');
      if (byWeek[key]) {
        byWeek[key].timeSeconds += a.moving_time || 0;
        const ftpForActivity = getFtpForDate(ftpHistory ?? null, a.start_date);
        if (ftpForActivity) {
          byWeek[key].tss += getTSS(a, ftpForActivity);
        }
      }
    }

    return Object.entries(byWeek)
      .map(([key, w]) => ({
        key,
        start: w.start,
        label: w.start.format('D MMM'),
        timeHours: w.timeSeconds / 3600,
        tss: w.tss,
      }))
      .sort((a, b) => a.start.valueOf() - b.start.valueOf());
  }, [cyclingActivities, ftpHistory, dateRange]);

  const maxTime = useMemo(
    () => Math.max(1, ...weeklyData.map((w) => w.timeHours || 0)),
    [weeklyData]
  );
  const maxTss = useMemo(
    () => Math.max(1, ...weeklyData.map((w) => w.tss || 0)),
    [weeklyData]
  );

  const loading = activitiesLoading || ftpLoading;

  const gymWeeklyData = useMemo(() => {
    const byWeek: Record<
      string,
      { start: dayjs.Dayjs; workouts: number; exercises: number }
    > = {};

    // Generate all weeks in the date range
    let current = dayjs(dateRange.start).startOf('week');
    const end = dayjs(dateRange.end).endOf('week');
    
    while (current.isBefore(end) || current.isSame(end, 'week')) {
      const key = current.format('YYYY-MM-DD');
      byWeek[key] = { start: current, workouts: 0, exercises: 0 };
      current = current.add(1, 'week');
    }

    // Fill in data for weeks with workouts
    for (const w of workouts) {
      const d = dayjs(w.datetime);
      const weekStart = d.startOf('week');
      const key = weekStart.format('YYYY-MM-DD');
      if (byWeek[key]) {
        byWeek[key].workouts += 1;
        byWeek[key].exercises += w.exercises?.length || 0;
      }
    }

    return Object.entries(byWeek)
      .map(([key, v]) => ({
        key,
        start: v.start,
        label: v.start.format('D MMM'),
        workouts: v.workouts,
        avgExercises: v.workouts ? v.exercises / v.workouts : 0,
      }))
      .sort((a, b) => a.start.valueOf() - b.start.valueOf());
  }, [workouts, dateRange]);

  const maxGymWorkouts = useMemo(
    () => Math.max(1, ...gymWeeklyData.map((w) => w.workouts || 0)),
    [gymWeeklyData]
  );
  const maxGymExercises = useMemo(
    () => Math.max(1, ...gymWeeklyData.map((w) => w.avgExercises || 0)),
    [gymWeeklyData]
  );

  const gymLoading = workoutsLoading;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* <View style={styles.section}>
          <Text style={styles.sectionTitle}>FTP History</Text>
          <View style={styles.card}>
            <FTPGraph ftpHistory={ftpHistory} isLoading={ftpLoading} />
          </View>
        </View> */}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cycling</Text>
          <View style={styles.card}>
            {loading ? (
              <Text style={styles.mutedText}>Loading cycling stats...</Text>
            ) : !weeklyData.length ? (
              <Text style={styles.mutedText}>No cycling data for this year.</Text>
            ) : (
              <>
                <Text style={styles.metricTitle}>Time (h per week)</Text>
                <View style={styles.chartRow}>
                  {weeklyData.map((w) => (
                    <View key={w.key} style={styles.barContainer}>
                      <View
                        style={[
                          styles.bar,
                          styles.timeBar,
                          { height: Math.max((w.timeHours / maxTime) * 80, 2) },
                        ]}
                      />
                    </View>
                  ))}
                </View>

                <Text style={[styles.metricTitle, { marginTop: 16 }]}>
                  TSS (per week)
                </Text>
                <View style={styles.chartRow}>
                  {weeklyData.map((w) => (
                    <View key={w.key} style={styles.barContainer}>
                      <View
                        style={[
                          styles.bar,
                          styles.tssBar,
                          { height: Math.max((w.tss / maxTss) * 80, 2) },
                        ]}
                      />
                    </View>
                  ))}
                </View>
              </>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Gym</Text>
          <View style={styles.card}>
            {gymLoading ? (
              <Text style={styles.mutedText}>Loading gym stats...</Text>
            ) : !gymWeeklyData.length ? (
              <Text style={styles.mutedText}>No gym workouts for this year.</Text>
            ) : (
              <>
                <Text style={styles.metricTitle}>Workouts (per week)</Text>
                <View style={styles.chartRow}>
                  {gymWeeklyData.map((w) => (
                    <View key={w.key} style={styles.barContainer}>
                      <View
                        style={[
                          styles.bar,
                          styles.timeBar,
                          { height: Math.max((w.workouts / maxGymWorkouts) * 80, 2) },
                        ]}
                      />
                    </View>
                  ))}
                </View>

                <Text style={[styles.metricTitle, { marginTop: 16 }]}>
                  Exercises per workout (avg)
                </Text>
                <View style={styles.chartRow}>
                  {gymWeeklyData.map((w) => (
                    <View key={w.key} style={styles.barContainer}>
                      <View
                        style={[
                          styles.bar,
                          styles.tssBar,
                          { height: Math.max((w.avgExercises / maxGymExercises) * 80, 2) },
                        ]}
                      />
                    </View>
                  ))}
                </View>
              </>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  content: {
    paddingBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f9fafb',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#9ca3af',
  },
  section: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e5e7eb',
    marginBottom: 8,
  },
  card: {
    borderRadius: 12,
    backgroundColor: '#020617',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#1f2937',
    padding: 12,
  },
  mutedText: {
    fontSize: 12,
    color: '#6b7280',
  },
  metricTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#d1d5db',
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 6,
    height: 80,
    gap: 3,
  },
  barContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '80%',
    maxWidth: 12,
    borderRadius: 4,
  },
  timeBar: {
    backgroundColor: '#3b82f6',
  },
  tssBar: {
    backgroundColor: '#22c55e',
  },
});


