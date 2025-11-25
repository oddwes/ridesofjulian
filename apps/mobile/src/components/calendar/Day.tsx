import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Dayjs } from 'dayjs';
import { Workout } from '@ridesofjulian/shared';

interface DayProps {
  date: Dayjs;
  isToday: boolean;
  workouts?: Workout[];
  onWorkoutPress?: (workoutId: string) => void;
}

export function Day({ date, isToday, workouts = [], onWorkoutPress }: DayProps) {
  const hasWorkouts = workouts.length > 0;
  const formattedDate = date.format('MMMM Do, YYYY');

  return (
    <View style={[
      styles.container,
      hasWorkouts ? styles.hasWorkouts : styles.rest,
      isToday && styles.today
    ]}>
      <Text style={styles.dateText}>
        {formattedDate}
        {!hasWorkouts && <Text style={styles.restText}> - Rest</Text>}
      </Text>
      {hasWorkouts && (
        <View style={styles.workoutsContainer}>
          {workouts.map((workout) => (
            <TouchableOpacity 
              key={workout.id} 
              style={styles.gymWorkout}
              onPress={() => onWorkoutPress?.(workout.id)}
            >
              <Text style={styles.gymTitle}>💪 Gym</Text>
              <Text style={styles.exerciseText}>
                {workout.exercises.map(e => e.name).join(', ')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    padding: 12,
  },
  hasWorkouts: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  rest: {
    backgroundColor: '#9ca3af',
  },
  today: {
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  dateText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4b5563',
    marginBottom: 8,
  },
  restText: {
    fontWeight: '400',
    color: '#9ca3af',
  },
  workoutsContainer: {
    gap: 6,
  },
  gymWorkout: {
    backgroundColor: '#e9d5ff',
    borderWidth: 2,
    borderColor: '#c084fc',
    borderRadius: 8,
    padding: 8,
  },
  gymTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b21a8',
    marginBottom: 4,
  },
  exerciseText: {
    fontSize: 10,
    color: '#7c3aed',
  },
});

