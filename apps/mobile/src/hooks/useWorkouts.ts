import { useQuery } from '@tanstack/react-query';
import { fetchWorkouts, Workout } from '@ridesofjulian/shared';
import { supabase } from '../config/supabase';

export const useWorkouts = () => {
  return useQuery<Workout[], Error>({
    queryKey: ['workouts'],
    queryFn: () => fetchWorkouts(supabase),
    retry: false,
  });
};

