import { useQuery } from '@tanstack/react-query';
import { supabase } from '../config/supabase';
import type { RideWorkout } from '../components/calendar/Calendar';

export type ScheduleRow = { date: string; plan: RideWorkout[]; type: string };

export const useSchedule = (userId?: string) => {
  return useQuery<ScheduleRow[], Error>({
    queryKey: ['schedule', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('schedule')
        .select('date, plan, type')
        .eq('user_id', userId)
        .eq('type', 'cycling')
        .order('date', { ascending: true });
      if (error) throw error;
      return data as ScheduleRow[];
    },
    enabled: !!userId,
  });
};


