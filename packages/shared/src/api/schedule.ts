import type { SupabaseClient } from '@supabase/supabase-js';

export interface RideWorkout {
  id: number;
  workoutTitle: string;
  selectedDate: string;
  intervals: Array<{
    id: string;
    name: string;
    duration: number;
    powerMin: number;
    powerMax: number;
  }>;
  wahooId?: number;
}

type ScheduleRow = {
  id: number;
  plan: RideWorkout[];
};

export const deleteWorkoutFromSchedule = async (
  supabase: SupabaseClient,
  userId: string,
  workoutId: number,
  workoutSelectedDate: string
): Promise<void> => {
  const { data, error } = await supabase
    .from('schedule')
    .select('id, plan')
    .eq('user_id', userId)
    .eq('type', 'cycling')
    .eq('date', workoutSelectedDate)
    .single<ScheduleRow>();

  if (error || !data) {
    console.error('Failed to load schedule row', error);
    throw new Error('Failed to load schedule row');
  }

  const currentPlan = data.plan || [];
  const nextPlan = currentPlan.filter((w) => w.id !== workoutId);

  const { error: updateError } = await supabase
    .from('schedule')
    .update({ plan: nextPlan })
    .eq('id', data.id);

  if (updateError) {
    console.error('Failed to update schedule row', updateError);
    throw new Error('Failed to update schedule row');
  }
};

