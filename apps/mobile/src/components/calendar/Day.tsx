import { View, Text, StyleSheet, Linking } from 'react-native';
import { Dayjs } from 'dayjs';
import { Workout, RideCard, GymCard } from '@ridesofjulian/shared/mobile';
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

  const handleActivityPress = async (activityId: number) => {
    const appUrl = `strava://activities/${activityId}`;
    const webUrl = `https://strava.com/activities/${activityId}`;
    
    try {
      const canOpen = await Linking.canOpenURL(appUrl);
      if (canOpen) {
        await Linking.openURL(appUrl);
      } else {
        await Linking.openURL(webUrl);
      }
    } catch (error) {
      await Linking.openURL(webUrl);
    }
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
            const ftpForActivity = getFtpForDate(ftpHistory, activity.start_date);
            return (
              <RideCard
                key={activity.id}
                activity={activity}
                onPress={handleActivityPress}
                ftpForActivity={ftpForActivity}
                getTSS={getTSS}
                formatDistance={formatDistance}
                formatElevation={formatElevation}
                formatDuration={formatDuration}
              />
            );
          })}
          {workouts.map((workout) => (
            <GymCard
              key={workout.id}
              workout={workout}
              onPress={onWorkoutPress}
            />
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
    borderWidth: 2,
    borderColor: '#3b82f6',
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
});

