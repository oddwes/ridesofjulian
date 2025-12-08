import { StravaActivity } from '../types/strava';
import { WahooWorkout } from '../types/wahoo';
import dayjs from 'dayjs';

export type UnifiedActivity = StravaActivity & {
  source?: 'strava' | 'wahoo';
};

const TIME_THRESHOLD_MINUTES = 5;
const DISTANCE_THRESHOLD_METERS = 500;

const transformWahooWorkout = (w: WahooWorkout): UnifiedActivity | null => {
  if (!w.workout_summary) return null;

  return {
    id: w.id,
    name: w.name,
    distance: parseFloat(w.workout_summary.distance_accum) || 0,
    total_elevation_gain: parseFloat(w.workout_summary.ascent_accum) || 0,
    moving_time: parseFloat(w.workout_summary.duration_active_accum) || 0,
    start_date: w.workout_summary.started_at || w.starts,
    type: 'Ride',
    sport_type: 'Ride',
    average_watts: w.workout_summary.power_avg ? parseFloat(w.workout_summary.power_avg) : undefined,
    weighted_average_watts: w.workout_summary.power_bike_np_last ? parseFloat(w.workout_summary.power_bike_np_last) : undefined,
    kilojoules: w.workout_summary.work_accum ? parseFloat(w.workout_summary.work_accum) / 1000 : undefined,
    average_heartrate: w.workout_summary.heart_rate_avg ? parseFloat(w.workout_summary.heart_rate_avg) : undefined,
    source: 'wahoo',
  };
};

const areActivitiesDuplicate = (a1: UnifiedActivity, a2: UnifiedActivity): boolean => {
  const time1 = dayjs(a1.start_date);
  const time2 = dayjs(a2.start_date);
  const timeDiff = Math.abs(time1.diff(time2, 'minute'));

  const distanceDiff = Math.abs((a1.distance || 0) - (a2.distance || 0));

  return timeDiff <= TIME_THRESHOLD_MINUTES && distanceDiff <= DISTANCE_THRESHOLD_METERS;
};

export const combineAndDeduplicateActivities = (
  stravaActivities: StravaActivity[] | undefined,
  wahooWorkouts: WahooWorkout[] | undefined
): UnifiedActivity[] => {
  const strava = (stravaActivities || []).map(a => ({ ...a, source: 'strava' as const }));
  const wahoo = (wahooWorkouts || [])
    .map(transformWahooWorkout)
    .filter((w): w is UnifiedActivity => w !== null);

  const allActivities = [...strava, ...wahoo];
  const deduplicated: UnifiedActivity[] = [];

  for (const activity of allActivities) {
    const duplicate = deduplicated.find(existing => areActivitiesDuplicate(existing, activity));
    
    if (!duplicate) {
      deduplicated.push(activity);
    } else {
      if (activity.source === 'strava' && duplicate.source === 'wahoo') {
        const index = deduplicated.indexOf(duplicate);
        deduplicated[index] = activity;
      }
    }
  }

  return deduplicated.sort((a, b) => 
    new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
  );
};

