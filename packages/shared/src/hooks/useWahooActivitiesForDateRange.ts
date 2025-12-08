import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useEffect } from 'react';
import dayjs from 'dayjs';
import { WahooWorkout } from '../types/wahoo';
import { getWahooWorkouts } from '../utils/WahooUtil';

export const useWahooActivitiesForDateRange = (
  startDate: string,
  endDate: string,
  ensureValidToken: () => Promise<string | null>
) => {
  const queryClient = useQueryClient();
  
  const startsAfter = useMemo(() => {
    return dayjs(startDate).subtract(1, 'day').format('YYYY-MM-DD');
  }, [startDate]);

  const startsBefore = useMemo(() => {
    return dayjs(endDate).add(1, 'day').format('YYYY-MM-DD');
  }, [endDate]);

  const queryKey = useMemo(() => ['wahooWorkouts', startsAfter, startsBefore], [startsAfter, startsBefore]);

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const token = await ensureValidToken();
      if (!token) throw new Error('No Wahoo token');
      
      let accumulatedWorkouts: WahooWorkout[] = [];
      
      await getWahooWorkouts(token, startsAfter, startsBefore, (workouts, page, totalPages) => {
        accumulatedWorkouts = [...accumulatedWorkouts, ...workouts];
        
        queryClient.setQueryData(queryKey, accumulatedWorkouts);
      });
      
      return accumulatedWorkouts;
    },
    retry: false,
  });

  const workouts = useMemo(
    () =>
      (query.data || []).filter((w) => {
        const date = dayjs(w.starts);
        return (
          date.isAfter(dayjs(startDate).subtract(1, 'day')) &&
          date.isBefore(dayjs(endDate).add(1, 'day'))
        );
      }),
    [query.data, startDate, endDate]
  );

  return { workouts, isLoading: query.isLoading };
};

