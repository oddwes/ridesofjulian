import { useQuery } from '@tanstack/react-query';
import { Workout } from '@/types/workout';

const fetchWorkouts = async (): Promise<Workout[]> => {
  const response = await fetch(`/api/workouts`);
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Workout not found');
    }
    const errorData = await response.json().catch(() => ({ message: 'Failed to fetch workout data' }));
    throw new Error(errorData.message || 'Failed to fetch workout');
  }
  return response.json();
};

export const useWorkouts = () => {
  return useQuery<Workout[], Error>({
    queryKey: ['workouts'],
    queryFn: () => fetchWorkouts(),
    enabled: true,
    retry: false,
  });
};


