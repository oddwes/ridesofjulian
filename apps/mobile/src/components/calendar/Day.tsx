import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Dayjs } from 'dayjs';
import { Workout } from '@ridesofjulian/shared';
import { StravaActivity, getTSS } from '../../utils/StravaUtil';
import { formatDistance, formatElevation, formatDuration } from '../../utils/formatUtil';
import { FtpData, getFtpForDate } from '../../utils/ftpUtil';

interface DayProps {
  date: Dayjs;
  isToday: boolean;
  workouts?: Workout[];
  activities?: StravaActivity[];
  ftpHistory?: FtpData | null;
  onWorkoutPress?: (workoutId: string) => void;
}

export function Day({ date, isToday, workouts = [], activities = [], ftpHistory, onWorkoutPress }: DayProps) {
  const hasWorkouts = workouts.length > 0 || activities.length > 0;
  const formattedDate = date.format('MMMM Do, YYYY');

  const handleActivityPress = (activityId: number) => {
    Linking.openURL(`https://strava.com/activities/${activityId}`);
  };

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
          {activities.map((activity) => {
            const emoji = activity.type === 'Run' || activity.sport_type === 'Run' ? '🏃' : '🚴';
            const isCycling = activity.type !== 'Run' && activity.sport_type !== 'Run';
            const ftpForActivity = getFtpForDate(ftpHistory, activity.start_date);
            const tss = ftpForActivity && activity.weighted_average_watts ? getTSS(activity, ftpForActivity) : 0;
            const hasSecondaryStats = (isCycling && (activity.average_watts || activity.kilojoules)) || activity.average_heartrate || tss > 0;
            
            return (
              <TouchableOpacity 
                key={activity.id} 
                style={styles.stravaActivity}
                onPress={() => handleActivityPress(activity.id)}
              >
                <Text style={styles.stravaTitle}>
                  {emoji} {activity.name}
                </Text>
                <View style={styles.statsRow}>
                  <Text style={styles.statText}>{formatDistance(activity.distance)}</Text>
                  <Text style={styles.statText}>{formatElevation(activity.total_elevation_gain)}</Text>
                  <Text style={styles.statText}>{formatDuration(Math.round(activity.moving_time / 60))}</Text>
                  {hasSecondaryStats && (
                    <>
                      <View style={styles.separator} />
                      {isCycling && activity.average_watts && (
                        <Text style={styles.statText}>{Math.round(activity.average_watts)}W</Text>
                      )}
                      {activity.average_heartrate && (
                        <Text style={styles.statText}>{Math.round(activity.average_heartrate)}bpm</Text>
                      )}
                      {isCycling && activity.kilojoules && (
                        <Text style={styles.statText}>{Math.round(activity.kilojoules)}kJ</Text>
                      )}
                      {tss > 0 && (
                        <Text style={styles.statText}>{tss}TSS</Text>
                      )}
                    </>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
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
  stravaActivity: {
    backgroundColor: '#ffedd5',
    borderWidth: 2,
    borderColor: '#f97316',
    borderRadius: 8,
    padding: 8,
  },
  stravaTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9a3412',
    marginBottom: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 2,
    alignItems: 'center',
  },
  separator: {
    width: 1,
    height: 12,
    backgroundColor: '#f97316',
    marginHorizontal: 2,
  },
  statText: {
    fontSize: 10,
    color: '#c2410c',
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

