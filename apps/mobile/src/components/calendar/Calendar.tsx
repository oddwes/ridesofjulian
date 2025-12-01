import { ScrollView, View, StyleSheet, Dimensions, Text, Pressable } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState, useMemo } from 'react';
import dayjs from 'dayjs';
import advancedFormat from 'dayjs/plugin/advancedFormat';
import { Day } from './Day';
import { WeeklySummary } from '../WeeklySummary';
import { SlidingLoadingIndicator } from '../SlidingLoadingIndicator';
import { useWorkouts } from '../../hooks/useWorkouts';
import { useStravaActivitiesForDateRange } from '../../hooks/useStravaActivitiesForDateRange';
import { getFtp } from '../../utils/ftpUtil';
import { supabase } from '../../config/supabase';
import type { DateRange } from '../../screens/HomeScreen';

export type Interval = {
  id: string;
  name: string;
  duration: number;
  powerMin: number;
  powerMax: number;
};

export type RideWorkout = {
  id: number;
  workoutTitle: string;
  selectedDate: string;
  intervals: Interval[];
};

export type ScheduledRideWorkout = RideWorkout & {
  scheduleRowDate: string;
};

dayjs.extend(advancedFormat);

const SCREEN_HEIGHT = Dimensions.get('window').height;
const PULL_THRESHOLD = -SCREEN_HEIGHT / 6;

interface CalendarProps {
  onWorkoutPress?: (workoutId: string) => void;
  dateRange: DateRange;
  isLoadingDateRange?: boolean;
  onPlannedRidePress?: (workout: ScheduledRideWorkout) => void;
}

export function Calendar({ onWorkoutPress, dateRange, isLoadingDateRange, onPlannedRidePress }: CalendarProps) {
  const queryClient = useQueryClient();

  const { data: allWorkouts = [], isLoading: workoutsLoading } = useWorkouts();
  const workouts = useMemo(() => 
    allWorkouts.filter(w => {
      const date = dayjs(w.datetime);
      return date.isAfter(dayjs(dateRange.start).subtract(1, 'day')) && 
             date.isBefore(dayjs(dateRange.end).add(1, 'day'));
    }),
    [allWorkouts, dateRange]
  );

  const { data: activities, isLoading: activitiesLoading } = useStravaActivitiesForDateRange(
    dateRange.start,
    dateRange.end
  );

  const isLoading = workoutsLoading || activitiesLoading;
  const [refreshing, setRefreshing] = useState(false);
  const scrollY = useRef(0);
  const isRefreshing = useRef(false);
  const showLoadingPill = isLoading || refreshing || isLoadingDateRange;

  const onRefresh = async () => {
    if (isRefreshing.current) return;
    isRefreshing.current = true;
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['workouts'] }),
      queryClient.invalidateQueries({ queryKey: ['stravaActivities'] }),
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
  
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user;
    },
  });

  const { data: ftpHistory } = useQuery({
    queryKey: ['ftpHistory', user?.id],
    queryFn: async () => {
      if (!user) return null;
      return await getFtp(supabase, user.id);
    },
    enabled: !!user,
  });

  const { data: scheduleRows = [] } = useQuery({
    queryKey: ['schedule', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('schedule')
        .select('date, plan, type')
        .eq('user_id', user.id)
        .eq('type', 'cycling')
        .order('date', { ascending: true });
      if (error) throw error;
      return data as { date: string; plan: RideWorkout[]; type: string }[];
    },
    enabled: !!user,
  });

  const formatDurationMinutes = (intervals: Interval[]) =>
    intervals.reduce((sum, interval) => sum + interval.duration / 60, 0);

  const getIntervalColor = (powerMin: number, powerMax: number) => {
    const avgPower = (powerMin + powerMax) / 2;
    if (avgPower < 100) return 'rgba(156, 163, 175, 0.8)';
    if (avgPower < 150) return 'rgba(96, 165, 250, 0.8)';
    if (avgPower < 200) return 'rgba(52, 211, 153, 0.8)';
    if (avgPower < 250) return 'rgba(251, 191, 36, 0.8)';
    if (avgPower < 300) return 'rgba(251, 146, 60, 0.8)';
    return 'rgba(220, 38, 38, 0.85)';
  };

  const today = dayjs().startOf('day');
  const rangeStart = dayjs(dateRange.start);
  const rangeEnd = dayjs(dateRange.end);
  const futureLimit = today.add(7, 'day');

  const scheduledByDate: Record<string, ScheduledRideWorkout[]> = {};

  scheduleRows.forEach((row) => {
    if (!row.plan) return;
    row.plan.forEach((workout) => {
      const d = dayjs(workout.selectedDate);
      if (d.isBefore(today, 'day') || d.isAfter(futureLimit, 'day')) return;
      const key = d.format('YYYY-MM-DD');
      if (!scheduledByDate[key]) scheduledByDate[key] = [];
      scheduledByDate[key].push({ ...workout, scheduleRowDate: row.date });
    });
  });
  
  const days = [];
  const endForDays = rangeEnd.isBefore(today, 'day') ? rangeEnd : futureLimit;
  let currentDate = endForDays;

  while (currentDate.isAfter(rangeStart) || currentDate.isSame(rangeStart, 'day')) {
    days.push(currentDate);
    currentDate = currentDate.subtract(1, 'day');
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
        {days.map((date) => {
          const weekStart = date.startOf('week');
          const weekKey = weekStart.format('YYYY-MM-DD');
          const isNewWeek = weekKey !== lastWeekKey;
          lastWeekKey = weekKey;

          const isToday = date.isSame(today, 'day');
          const dateStr = date.format('YYYY-MM-DD');
          const scheduledWorkouts = scheduledByDate[dateStr] ?? [];
          const dayWorkouts = workouts.filter(w => 
            dayjs(w.datetime).format('YYYY-MM-DD') === dateStr
          );
          const dayActivities = activities.filter(a => 
            dayjs(a.start_date).format('YYYY-MM-DD') === dateStr
          );

          return (
            <View key={date.format()}>
              {isNewWeek && (
                <WeeklySummary
                  activities={activities}
                  ftpHistory={ftpHistory}
                  weekStart={weekStart}
                />
              )}
              {scheduledWorkouts.map((workout) => {
                const totalMinutes = formatDurationMinutes(workout.intervals);
                const maxPower =
                  workout.intervals.length > 0
                    ? Math.max(
                        300,
                        ...workout.intervals.map((i) => i.powerMax || 0)
                      )
                    : 0;

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
                      <Text style={styles.workoutTitle}>
                        {workout.workoutTitle}
                      </Text>
                    </View>
                    <Text style={styles.workoutMeta}>
                      {dayjs(workout.selectedDate).format('YYYY-MM-DD')} |{' '}
                      {Math.floor(totalMinutes / 60)}h{' '}
                      {Math.round(totalMinutes % 60)}m
                    </Text>

                    {workout.intervals.length > 0 && maxPower > 0 && (
                      <View style={styles.workoutChart}>
                        <View style={styles.workoutChartRow}>
                          {workout.intervals.map((interval) => {
                            if (!interval.duration) return null;
                            const barHeight =
                              (interval.powerMax / maxPower) * 72 || 4;
                            return (
                              <View
                                key={interval.id}
                                style={[
                                  styles.workoutChartSegment,
                                  { flex: interval.duration },
                                ]}
                              >
                                <View
                                  style={[
                                    styles.workoutChartBar,
                                    {
                                      height: Math.max(barHeight, 4),
                                      backgroundColor: getIntervalColor(
                                        interval.powerMin,
                                        interval.powerMax
                                      ),
                                    },
                                  ]}
                                />
                              </View>
                            );
                          })}
                        </View>
                      </View>
                    )}

                    {workout.intervals.map((interval) => (
                      <View key={interval.id} style={styles.intervalRow}>
                        <Text style={styles.intervalName}>{interval.name}</Text>
                        <Text style={styles.intervalMeta}>
                          {interval.duration / 60}m | {interval.powerMin}-
                          {interval.powerMax}W
                        </Text>
                      </View>
                    ))}
                  </Pressable>
                );
              })}
              {!(scheduledWorkouts.length > 0 &&
                dayWorkouts.length === 0 &&
                dayActivities.length === 0) && (
                <Day
                  date={date}
                  isToday={isToday}
                  workouts={dayWorkouts}
                  activities={dayActivities}
                  ftpHistory={ftpHistory}
                  onWorkoutPress={onWorkoutPress}
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

