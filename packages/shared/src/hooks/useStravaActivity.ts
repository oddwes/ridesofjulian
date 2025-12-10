import { useQuery } from '@tanstack/react-query';
import type { StravaDetailedActivity } from '../types/strava';

type StravaApiCall = (url: string, params?: Record<string, any>) => Promise<any>;

export const useStravaActivity = (
  activityId: number | null,
  ensureValidToken: () => Promise<boolean>,
  apiCall: StravaApiCall
) => {
  return useQuery<StravaDetailedActivity, Error>({
    queryKey: ['stravaActivity', activityId],
    enabled: !!activityId,
    queryFn: async () => {
      const ok = await ensureValidToken();
      if (!ok) throw new Error('No Strava token');
      return apiCall(`https://www.strava.com/api/v3/activities/${activityId}`);
    },
    retry: false,
  });
};
