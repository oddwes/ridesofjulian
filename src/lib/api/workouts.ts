import { Exercise } from "@/types/exercise";
import { Workout } from "@/types/workout";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createServerAction = async (url: string, data: any) => {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'An error occurred');
  }

  return await response.json();
};

export const addWorkoutAPI = async (workoutData: Pick<Workout, 'datetime'>): Promise<string> => {
  const workoutResponse = await createServerAction('/api/workouts', {
    datetime: workoutData.datetime
  });
  return workoutResponse.id;
};

export const updateWorkoutAPI = async (workoutId: string, updates: Partial<Pick<Workout, 'datetime'>> & { exercises?: Exercise[] }): Promise<void> => {
  await createServerAction(`/api/workouts/${workoutId}`, updates);
};

export const deleteWorkoutAPI = async (workoutId: string): Promise<void> => {
  const response = await fetch(`/api/workouts/${workoutId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Failed to delete workout' }));
    throw new Error(errorData.message || `Failed to delete workout: ${response.statusText}`);
  }
};

