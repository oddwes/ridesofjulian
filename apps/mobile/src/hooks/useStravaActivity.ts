import { useQuery } from '@tanstack/react-query';
import { ensureValidStravaToken, getActivityById, StravaDetailedActivity } from '../utils/StravaUtil';

export const useStravaActivity = (activityId: number | null) => {
  return useQuery<StravaDetailedActivity, Error>({
    queryKey: ['stravaActivity', activityId],
    enabled: !!activityId,
    queryFn: async () => {
      const ok = await ensureValidStravaToken();
      if (!ok) throw new Error('No Strava token');
      return getActivityById(activityId as number);
    },
    retry: false,
  });
};


