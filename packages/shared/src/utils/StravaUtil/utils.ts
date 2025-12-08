import { StravaActivity } from '../../types/strava';

export const getTSS = (activity: StravaActivity, ftp: number): number => {
  if (!activity.weighted_average_watts) {
    return 0;
  }
  const intensityFactor = activity.weighted_average_watts / ftp;
  return Math.round(
    ((activity.moving_time * activity.weighted_average_watts * intensityFactor) / (ftp * 3600)) * 100
  );
};

export const getTotalTss = (activities: StravaActivity[], ftp: number): number => {
  return activities.reduce((partialSum, activity) => partialSum + getTSS(activity, ftp), 0);
};

export const getTotalDistance = (activities: StravaActivity[]): number => {
  return Math.round(activities.reduce((partialSum, a) => partialSum + a.distance, 0) / 1000);
};

export const getTotalElevation = (activities: StravaActivity[]): number => {
  return Math.round(activities.reduce((partialSum, a) => partialSum + a.total_elevation_gain, 0));
};

export const getTotalTime = (activities: StravaActivity[]): number => {
  return Math.round(activities.reduce((partialSum, a) => partialSum + a.moving_time, 0) / 3600);
};

