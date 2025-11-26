'use client';

import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { StravaActivity } from '../types/strava';

interface RideCardProps {
  activity: StravaActivity;
  onPress?: (activityId: number) => void;
  ftpForActivity?: number | null;
  getTSS?: (activity: StravaActivity, ftp: number) => number;
  formatDistance: (distance: number) => string;
  formatElevation: (elevation: number) => string;
  formatDuration: (minutes: number) => string;
}

export function RideCard({
  activity,
  onPress,
  ftpForActivity,
  getTSS,
  formatDistance,
  formatElevation,
  formatDuration,
}: RideCardProps) {
  const emoji = activity.type === 'Run' || activity.sport_type === 'Run' ? '🏃' : '🚴';
  const isCycling = activity.type !== 'Run' && activity.sport_type !== 'Run';
  const tss = ftpForActivity && activity.weighted_average_watts && getTSS 
    ? getTSS(activity, ftpForActivity) 
    : 0;
  const hasSecondaryStats = (isCycling && (activity.average_watts || activity.kilojoules)) || activity.average_heartrate || tss > 0;

  return (
    <TouchableOpacity 
      style={styles.container}
      onPress={() => onPress?.(activity.id)}
      activeOpacity={0.7}
    >
      <Text style={styles.title}>
        {emoji} {activity.name}
      </Text>
      <View style={styles.statsRow}>
        <Text style={styles.statText}>{formatDistance(activity.distance)}</Text>
        <Text style={styles.statText}>{formatElevation(activity.total_elevation_gain)}</Text>
        {activity.moving_time && (
          <Text style={styles.statText}>{formatDuration(Math.round(activity.moving_time / 60))}</Text>
        )}
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
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffedd5',
    borderWidth: 2,
    borderColor: '#f97316',
    borderRadius: 8,
    padding: 8,
  },
  title: {
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
});

