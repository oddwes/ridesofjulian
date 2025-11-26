import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { getAthleteActivities, ensureValidStravaToken, StravaActivity } from '../utils/StravaUtil';

export const useStravaActivities = (year: number) => {
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    ensureValidStravaToken().then(setHasToken);
  }, []);

  return useQuery<StravaActivity[], Error>({
    queryKey: ['stravaActivities', year],
    queryFn: () => getAthleteActivities(year),
    enabled: hasToken,
    retry: false,
  });
};

