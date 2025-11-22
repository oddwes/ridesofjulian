import { useQuery } from '@tanstack/react-query';
import { Workout } from '@/types/workout';

const fetchWorkoutById = async (workoutId: string): Promise<Workout> => {
  if (!workoutId) {
    throw new Error('Workout ID is required');
  }
  const response = await fetch(`/api/workouts/${workoutId}`);
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Workout not found');
    }
    const errorData = await response.json().catch(() => ({ message: 'Failed to fetch workout data' }));
    throw new Error(errorData.message || 'Failed to fetch workout');
  }
  return response.json();
};

export const useWorkout = (workoutId: string) => {
  return useQuery<Workout, Error>({
    queryKey: ['workout', workoutId],
    queryFn: () => fetchWorkoutById(workoutId),
    enabled: !!workoutId,
    retry: false,
  });
};

