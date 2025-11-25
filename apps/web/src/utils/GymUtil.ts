import { Exercise } from "@/types/exercise";

export const updateGymWorkout = async (workoutId: string, exercises: Exercise[], date: string) => {
  const response = await fetch(`/api/workouts/${workoutId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      datetime: new Date(date).toISOString(),
      exercises
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to update gym workout');
  }

  return response.json();
};

export const deleteGymWorkout = async (workoutId: string) => {
  const response = await fetch(`/api/workouts/${workoutId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to delete gym workout');
  }

  return response.json();
};

