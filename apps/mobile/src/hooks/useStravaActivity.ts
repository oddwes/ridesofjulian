import { useStravaActivity as useStravaActivityShared } from '@ridesofjulian/shared';
import { ensureValidStravaToken, stravaApiCall } from '@ridesofjulian/shared/utils/StravaUtil/mobile';

export const useStravaActivity = (activityId: number | null) => {
  return useStravaActivityShared(activityId, ensureValidStravaToken, stravaApiCall);
};


