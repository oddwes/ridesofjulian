import { ScrollView, View, StyleSheet, Animated, Dimensions } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import dayjs from 'dayjs';
import advancedFormat from 'dayjs/plugin/advancedFormat';
import { Day } from './Day';
import { useWorkouts } from '../../hooks/useWorkouts';
import { useStravaActivities } from '../../hooks/useStravaActivities';
import { getFtp } from '../../utils/ftpUtil';
import { supabase } from '../../config/supabase';

dayjs.extend(advancedFormat);

const SCREEN_HEIGHT = Dimensions.get('window').height;
const PULL_THRESHOLD = -SCREEN_HEIGHT / 6;

interface CalendarProps {
  onWorkoutPress?: (workoutId: string) => void;
}

export function Calendar({ onWorkoutPress }: CalendarProps) {
  const queryClient = useQueryClient();
  const currentYear = dayjs().year();
  const { data: workouts = [], isLoading: workoutsLoading } = useWorkouts();
  const { data: activities = [], isLoading: activitiesLoading } = useStravaActivities(currentYear);
  const isLoading = workoutsLoading || activitiesLoading;
  const [refreshing, setRefreshing] = useState(false);
  const scrollY = useRef(0);
  const isRefreshing = useRef(false);
  
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const showLoadingPill = isLoading || refreshing;

  useEffect(() => {
    if (showLoadingPill) {
      slideAnim.setValue(-100);
      Animated.loop(
        Animated.timing(slideAnim, {
          toValue: 400,
          duration: 1500,
          useNativeDriver: true,
        })
      ).start();
    }
  }, [showLoadingPill, slideAnim]);

  const onRefresh = async () => {
    if (isRefreshing.current) return;
    isRefreshing.current = true;
    setRefreshing(true);
    queryClient.setQueryData(['stravaActivities', currentYear], []);
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
  const yearStart = dayjs().startOf('year');
  
  const days = [];
  let currentDate = today;
  
  while (currentDate.isAfter(yearStart) || currentDate.isSame(yearStart, 'day')) {
    days.push(currentDate);
    currentDate = currentDate.subtract(1, 'day');
  }

  return (
    <View style={styles.container}>
      {showLoadingPill && (
        <View style={styles.loadingContainer}>
          <Animated.View 
            style={[
              styles.loadingPill,
              { transform: [{ translateX: slideAnim }] }
            ]} 
          />
        </View>
      )}
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.content}
        onScroll={handleScroll}
        onScrollEndDrag={handleScrollEndDrag}
        scrollEventThrottle={16}
        bounces={true}
      >
        {days.map((date) => {
          const isToday = date.isSame(today, 'day');
          const dateStr = date.format('YYYY-MM-DD');
          const dayWorkouts = workouts.filter(w => 
            dayjs(w.datetime).format('YYYY-MM-DD') === dateStr
          );
          const dayActivities = activities.filter(a => 
            dayjs(a.start_date).format('YYYY-MM-DD') === dateStr
          );
          return (
            <Day 
              key={date.format()} 
              date={date} 
              isToday={isToday} 
              workouts={dayWorkouts}
              activities={dayActivities}
              ftpHistory={ftpHistory}
              onWorkoutPress={onWorkoutPress}
            />
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
  loadingContainer: {
    height: 5,
    marginHorizontal: 16,
    marginVertical: 8,
    overflow: 'hidden',
  },
  loadingPill: {
    width: 36,
    height: 5,
    backgroundColor: '#4b5563',
    borderRadius: 3,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 12,
    gap: 12,
  },
});

