import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { getAthleteActivities, ensureValidStravaToken, StravaActivity } from '../utils/StravaUtil';

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

