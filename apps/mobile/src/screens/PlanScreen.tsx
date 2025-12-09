import { ScrollView, View, StyleSheet, Dimensions, Text, Pressable } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState, useRef as useMutableRef } from 'react';
import dayjs, { Dayjs } from 'dayjs';
import advancedFormat from 'dayjs/plugin/advancedFormat';
import isoWeek from 'dayjs/plugin/isoWeek';
import { SlidingLoadingIndicator } from '../components/SlidingLoadingIndicator';
import { Day } from '../components/calendar/Day';
import { WorkoutChart } from '../components/WorkoutChart';
import { getFtpForDate, type FtpData } from '../utils/ftpUtil';
import { PlanWeeklySummary } from '../components/PlanWeeklySummary';
import { useSchedule } from '../hooks/useSchedule';
import { useUser } from '../hooks/useUser';
import { useFtpHistory } from '../hooks/useFtpHistory';
import type { DateRange } from './HomeScreen';
import type { Interval, RideWorkout, ScheduledRideWorkout } from '../components/calendar/Calendar';

dayjs.extend(advancedFormat);
dayjs.extend(isoWeek);

const SCREEN_HEIGHT = Dimensions.get('window').height;
const PULL_THRESHOLD = -SCREEN_HEIGHT / 6;

interface PlanScreenProps {
  dateRange: DateRange;
  isLoadingDateRange?: boolean;
  onPlannedRidePress?: (workout: ScheduledRideWorkout) => void;
}

const formatDurationMinutes = (intervals: Interval[]) =>
  intervals.reduce((sum, interval) => sum + interval.duration / 60, 0);

const computeWorkoutTss = (workout: RideWorkout, ftpHistory: FtpData | null | undefined): number => {
  const ftpForWorkout = getFtpForDate(ftpHistory ?? null, workout.selectedDate);
  if (!ftpForWorkout) return 0;

  let numerator = 0;
  workout.intervals.forEach((interval) => {
    if (!interval.duration) return;
    const avgPower = (interval.powerMin + interval.powerMax) / 2;
    const intensityFactor = avgPower / ftpForWorkout;
    numerator += interval.duration * avgPower * intensityFactor;
  });

  if (!numerator || !ftpForWorkout) return 0;
  return Math.round((numerator / (ftpForWorkout * 3600)) * 100);
};

export function PlanScreen({ dateRange, isLoadingDateRange, onPlannedRidePress }: PlanScreenProps) {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const scrollY = useRef(0);
  const isRefreshing = useRef(false);
  const [collapsedWeeks, setCollapsedWeeks] = useState<string[]>([]);

  const { data: user } = useUser();
  const { data: ftpHistory } = useFtpHistory(user?.id);

  const { data: scheduleRows = [], isLoading: scheduleLoading } = useSchedule(user?.id);

  const isLoading = scheduleLoading;
  const showLoadingPill = isLoading || refreshing || isLoadingDateRange;

  const initializedCollapsed = useMutableRef(false);

  useEffect(() => {
    if (!scheduleRows.length || initializedCollapsed.current) return;
    const currentWeekStart = dayjs().startOf('isoWeek');
    const weekKeys = new Set<string>();

    scheduleRows.forEach((row) => {
      if (!row.plan) return;
      row.plan.forEach((workout) => {
        const d = dayjs(workout.selectedDate);
        const weekStart = d.startOf('isoWeek');
        if (weekStart.isBefore(currentWeekStart, 'day')) {
          weekKeys.add(weekStart.format('YYYY-MM-DD'));
        }
      });
    });

    if (weekKeys.size > 0) {
      setCollapsedWeeks(Array.from(weekKeys));
      initializedCollapsed.current = true;
    }
  }, [scheduleRows]);

  const onRefresh = async () => {
    if (isRefreshing.current) return;
    isRefreshing.current = true;
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['schedule'] }),
      queryClient.invalidateQueries({ queryKey: ['ftpHistory'] }),
    ]);
    setRefreshing(false);
    isRefreshing.current = false;
  };

  const handleScroll = (event: any) => {
    scrollY.current = event.nativeEvent.contentOffset.y;
  };

  const handleScrollEndDrag = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    if (offsetY < PULL_THRESHOLD && !isRefreshing.current) {
      onRefresh();
    }
  };

  const today = dayjs().startOf('day');
  const scheduledByDate: Record<string, ScheduledRideWorkout[]> = {};
  const weekTotals: Record<string, { minutes: number; tss: number }> = {};
  let minTime: number | null = null;
  let maxTime: number | null = null;

  scheduleRows.forEach((row) => {
    if (!row.plan) return;
    row.plan.forEach((workout) => {
      const d = dayjs(workout.selectedDate);
      const time = d.toDate().getTime();
      if (minTime === null || time < minTime) minTime = time;
      if (maxTime === null || time > maxTime) maxTime = time;

      const dateKey = d.format('YYYY-MM-DD');
      const weekStart = d.startOf('isoWeek');
      const weekKey = weekStart.format('YYYY-MM-DD');

      const minutes = formatDurationMinutes(workout.intervals);
      const tss = computeWorkoutTss(workout, ftpHistory);

      if (!scheduledByDate[dateKey]) {
        scheduledByDate[dateKey] = [];
      }
      scheduledByDate[dateKey].push({ ...workout, scheduleRowDate: row.date });

      if (!weekTotals[weekKey]) {
        weekTotals[weekKey] = { minutes: 0, tss: 0 };
      }
      weekTotals[weekKey].minutes += minutes;
      weekTotals[weekKey].tss += tss;
    });
  });

  const days: Dayjs[] = [];
  if (minTime !== null && maxTime !== null) {
    let currentDate: Dayjs = dayjs(minTime).startOf('day');
    const lastDate = dayjs(maxTime).startOf('day');
    while (currentDate.toDate().getTime() <= lastDate.toDate().getTime()) {
      days.push(currentDate);
      currentDate = currentDate.add(1, 'day');
    }
  }

  let lastWeekKey: string | null = null;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        onScroll={handleScroll}
        onScrollEndDrag={handleScrollEndDrag}
        scrollEventThrottle={16}
        bounces={true}
      >
        <SlidingLoadingIndicator isLoading={!!showLoadingPill} />
        {!isLoading && days.map((date) => {
          const weekStart = date.startOf('isoWeek');
          const weekKey = weekStart.format('YYYY-MM-DD');
          const isNewWeek = weekKey !== lastWeekKey;
          lastWeekKey = weekKey;
          const isCollapsed = collapsedWeeks.includes(weekKey);

          const dateStr = date.format('YYYY-MM-DD');
          const scheduledWorkouts = scheduledByDate[dateStr] ?? [];
          const totalsForWeek = weekTotals[weekKey];
          const isToday = date.isSame(today, 'day');

          if (isCollapsed && !isNewWeek) {
            return null;
          }

          return (
            <View key={date.format()}>
              {isNewWeek && totalsForWeek && (
                <Pressable
                  onPress={() =>
                    setCollapsedWeeks(prev =>
                      prev.includes(weekKey)
                        ? prev.filter(k => k !== weekKey)
                        : [...prev, weekKey]
                    )
                  }
                >
                  <PlanWeeklySummary
                    weekStart={weekStart}
                    totalMinutes={totalsForWeek.minutes}
                    totalTss={totalsForWeek.tss}
                  />
                </Pressable>
              )}
              {!isCollapsed && scheduledWorkouts.map((workout) => {
                const totalMinutes = formatDurationMinutes(workout.intervals);

                return (
                  <Pressable
                    key={`scheduled-${workout.id}`}
                    style={[
                      styles.workoutCard,
                      isToday && styles.workoutCardToday,
                    ]}
                    onPress={() => onPlannedRidePress && onPlannedRidePress(workout)}
                  >
                    <View style={styles.workoutHeader}>
                      <Text style={styles.workoutTitle}>{workout.workoutTitle}</Text>
                    </View>
                    <Text style={styles.workoutMeta}>
                      {dayjs(workout.selectedDate).format('YYYY-MM-DD')} |{' '}
                      {Math.floor(totalMinutes / 60)}h {Math.round(totalMinutes % 60)}m
                    </Text>

                    <WorkoutChart intervals={workout.intervals} />
                  </Pressable>
                );
              })}
              {!isCollapsed && scheduledWorkouts.length === 0 && (
                <Day
                  date={date}
                  isToday={isToday}
                  workouts={[]}
                  activities={[]}
                  ftpHistory={ftpHistory ?? null}
                />
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e293b',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 12,
    gap: 12,
  },
  workoutCard: {
    backgroundColor: '#020617',
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#1f2937',
    padding: 12,
  },
  workoutCardToday: {
    borderColor: '#3b82f6',
    borderWidth: 2,
  },
  workoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  workoutTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#f9fafb',
    flex: 1,
    marginRight: 8,
  },
  workoutMeta: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 6,
  },
});


