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
  if (!activity || typeof activity.id !== 'number' || !activity.name) {
    return null;
  }
  
  const emoji = activity.type === 'Run' || activity.sport_type === 'Run' ? '🏃' : '🚴';
  const isCycling = activity.type !== 'Run' && activity.sport_type !== 'Run';
  const tss = ftpForActivity && activity.weighted_average_watts && getTSS 
    ? getTSS(activity, ftpForActivity) 
    : 0;
  const hasSecondaryStats = (isCycling && (activity.average_watts || activity.kilojoules)) || activity.average_heartrate || tss > 0;

  const distance = typeof activity.distance === 'number' ? activity.distance : 0;
  const elevation = typeof activity.total_elevation_gain === 'number' ? activity.total_elevation_gain : 0;
  const movingTime = typeof activity.moving_time === 'number' ? activity.moving_time : 0;

  return (
    <TouchableOpacity 
      style={styles.container}
      onPress={() => onPress?.(activity.id)}
      activeOpacity={0.7}
    >
      <Text style={styles.title}>
        {emoji} {String(activity.name || 'Untitled Ride')}
      </Text>
      <View style={styles.statsRow}>
        <Text style={styles.statText}>{formatDistance(distance)}</Text>
        <Text style={styles.statText}>{formatElevation(elevation)}</Text>
        {movingTime > 0 ? (
          <Text style={styles.statText}>{formatDuration(Math.round(movingTime / 60))}</Text>
        ) : null}
        {hasSecondaryStats ? (
          <>
            <View style={styles.separator} />
            {isCycling && typeof activity.average_watts === 'number' && activity.average_watts > 0 ? (
              <Text style={styles.statText}>{Math.round(activity.average_watts)}W</Text>
            ) : null}
            {typeof activity.average_heartrate === 'number' && activity.average_heartrate > 0 ? (
              <Text style={styles.statText}>{Math.round(activity.average_heartrate)}bpm</Text>
            ) : null}
            {isCycling && typeof activity.kilojoules === 'number' && activity.kilojoules > 0 ? (
              <Text style={styles.statText}>{Math.round(activity.kilojoules)}kJ</Text>
            ) : null}
            {tss > 0 ? (
              <Text style={styles.statText}>{tss}TSS</Text>
            ) : null}
          </>
        ) : null}
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

