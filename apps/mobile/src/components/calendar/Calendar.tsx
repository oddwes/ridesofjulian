import { ScrollView, View, StyleSheet } from 'react-native';
import dayjs from 'dayjs';
import advancedFormat from 'dayjs/plugin/advancedFormat';
import { Day } from './Day';
import { useWorkouts } from '../../hooks/useWorkouts';
import { LoadingSpinner } from '../LoadingSpinner';

dayjs.extend(advancedFormat);

interface CalendarProps {
  onWorkoutPress?: (workoutId: string) => void;
}

export function Calendar({ onWorkoutPress }: CalendarProps) {
  const { data: workouts = [], isLoading } = useWorkouts();
  const today = dayjs().startOf('day');
  const yearStart = dayjs().startOf('year');
  
  if (isLoading) {
    return <LoadingSpinner />;
  }
  
  const days = [];
  let currentDate = today;
  
  while (currentDate.isAfter(yearStart) || currentDate.isSame(yearStart, 'day')) {
    days.push(currentDate);
    currentDate = currentDate.subtract(1, 'day');
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {days.map((date) => {
          const isToday = date.isSame(today, 'day');
          const dateStr = date.format('YYYY-MM-DD');
          const dayWorkouts = workouts.filter(w => 
            dayjs(w.datetime).format('YYYY-MM-DD') === dateStr
          );
          return (
            <Day 
              key={date.format()} 
              date={date} 
              isToday={isToday} 
              workouts={dayWorkouts}
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 12,
    gap: 12,
  },
});

