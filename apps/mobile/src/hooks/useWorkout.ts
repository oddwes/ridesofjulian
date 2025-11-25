import { useQuery } from '@tanstack/react-query';
import { fetchWorkout, Workout } from '@ridesofjulian/shared';
import { supabase } from '../config/supabase';

export const useWorkout = (workoutId: string) => {
  return useQuery<Workout, Error>({
    queryKey: ['workout', workoutId],
    queryFn: () => fetchWorkout(supabase, workoutId),
    enabled: !!workoutId,
    retry: false,
  });
};

