import { ScrollView, View, StyleSheet, Dimensions } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState, useMemo } from 'react';
import dayjs from 'dayjs';
import advancedFormat from 'dayjs/plugin/advancedFormat';
import isoWeek from 'dayjs/plugin/isoWeek';
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
  wahooId?: number;
};

export type ScheduledRideWorkout = RideWorkout & {
  scheduleRowDate: string;
};

dayjs.extend(advancedFormat);
dayjs.extend(isoWeek);

const SCREEN_HEIGHT = Dimensions.get('window').height;
const PULL_THRESHOLD = -SCREEN_HEIGHT / 6;

interface CalendarProps {
  onWorkoutPress?: (workoutId: string) => void;
  dateRange: DateRange;
  isLoadingDateRange?: boolean;
}

export function Calendar({ onWorkoutPress, dateRange, isLoadingDateRange }: CalendarProps) {
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

  const today = dayjs().startOf('day');
  const rangeStart = dayjs(dateRange.start);
  const rangeEnd = dayjs(dateRange.end);
  
  const days = [];
  const endForDays = rangeEnd.isBefore(today, 'day') ? rangeEnd : today;
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
          const weekStart = date.startOf('isoWeek');
          const weekKey = weekStart.format('YYYY-MM-DD');
          const isNewWeek = weekKey !== lastWeekKey;
          lastWeekKey = weekKey;

          const isToday = date.isSame(today, 'day');
          const dateStr = date.format('YYYY-MM-DD');
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
              <Day
                date={date}
                isToday={isToday}
                workouts={dayWorkouts}
                activities={dayActivities}
                ftpHistory={ftpHistory}
                onWorkoutPress={onWorkoutPress}
              />
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

