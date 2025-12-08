import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { getAthleteActivities, ensureValidStravaToken } from '@ridesofjulian/shared/utils/StravaUtil/mobile';
import type { StravaActivity } from '@ridesofjulian/shared/utils/StravaUtil';

export const useStravaActivities = (year: number) => {
  return useQuery<StravaActivity[], Error>({
    queryKey: ['stravaActivities', year],
    queryFn: async () => {
      const ok = await ensureValidStravaToken();
      if (!ok) throw new Error('No Strava token');
      return getAthleteActivities(year);
    },
    retry: false,
  });
};

