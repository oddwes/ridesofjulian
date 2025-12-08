import dayjs from 'dayjs';
import { StravaActivity } from '../../types/strava';

type StravaApiCall = (url: string, params: Record<string, any>) => Promise<any>;

export const getAthleteActivities = async (
  year: number,
  apiCall: StravaApiCall,
  page = 1
): Promise<StravaActivity[]> => {
  const perPage = 100;
  const firstDayOfYear = dayjs(`${year}-01-01`).valueOf() / 1000;
  const lastDayOfYear = dayjs(`${year}-12-31`).valueOf() / 1000;

  const activities = await apiCall('https://www.strava.com/api/v3/athlete/activities', {
    after: firstDayOfYear,
    before: lastDayOfYear,
    page,
    per_page: perPage,
  });

  if (activities.length === perPage) {
    const nextPage = await getAthleteActivities(year, apiCall, page + 1);
    return activities.concat(nextPage);
  }

  return activities;
};

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

