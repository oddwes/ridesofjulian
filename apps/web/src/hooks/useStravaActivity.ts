import { useStravaActivity as useStravaActivityShared } from '@ridesofjulian/shared';
import { ensureValidToken, stravaApiCall } from '@ridesofjulian/shared/utils/StravaUtil/web';

export const useStravaActivity = (activityId: number | null) => {
  return useStravaActivityShared(activityId, ensureValidToken, stravaApiCall);
};
