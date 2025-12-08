import { useQuery } from '@tanstack/react-query';
import { ensureValidStravaToken, getActivityById } from '@ridesofjulian/shared/utils/StravaUtil/mobile';
import type { StravaDetailedActivity } from '@ridesofjulian/shared/utils/StravaUtil';

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


