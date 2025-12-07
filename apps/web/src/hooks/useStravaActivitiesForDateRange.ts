import { useQueries } from '@tanstack/react-query';
import { useMemo } from 'react';
import dayjs from 'dayjs';
import { getAthleteActivities, ensureValidToken } from '../utils/StravaUtil';

export const useStravaActivitiesForDateRange = (startDate: string, endDate: string) => {
  const yearsToFetch = useMemo(() => {
    const start = dayjs(startDate);
    const end = dayjs(endDate);
    const years: number[] = [];
    for (let year = start.year(); year <= end.year(); year++) {
      years.push(year);
    }
    return years;
  }, [startDate, endDate]);

  const queries = useQueries({
    queries: yearsToFetch.map((year) => ({
      queryKey: ['stravaActivities', year],
      queryFn: async () => {
        const ok = await ensureValidToken();
        if (!ok) throw new Error('No Strava token');
        return getAthleteActivities(year);
      },
      retry: false,
    })),
  });

  const isLoading = queries.some((q) => q.isLoading);
  const allActivities = queries.flatMap((q) => q.data || []);

  const activities = useMemo(
    () =>
      allActivities.filter((a) => {
        const date = dayjs((a as { start_date: string }).start_date);
        return (
          date.isAfter(dayjs(startDate).subtract(1, 'day')) &&
          date.isBefore(dayjs(endDate).add(1, 'day'))
        );
      }),
    [allActivities, startDate, endDate]
  );

  return { activities, isLoading };
};


