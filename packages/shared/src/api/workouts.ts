import { SupabaseClient } from '@supabase/supabase-js';
import { Exercise, Workout } from '../types';

export const fetchWorkouts = async (supabase: SupabaseClient): Promise<Workout[]> => {
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    throw new Error('Unauthorized');
  }

  const { data: workoutsData, error: workoutsError } = await supabase
    .from('workouts')
    .select('id, datetime')
    .eq('user_id', userData.user.id);

  if (workoutsError) {
    throw workoutsError;
  }

  const workoutsWithExercises = await Promise.all(
    (workoutsData || []).map(async (workout) => {
      const { data: exercisesData, error: exercisesError } = await supabase
        .from('exercises')
        .select('id, name, weight, sets, reps, completed')
        .eq('workout_id', workout.id);

      if (exercisesError) {
        throw exercisesError;
      }

      return {
        ...workout,
        exercises: exercisesData || [],
      };
    })
  );

  return workoutsWithExercises;
};

export const fetchWorkout = async (supabase: SupabaseClient, workoutId: string): Promise<Workout> => {
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    throw new Error('Unauthorized');
  }

  const { data: workoutData, error: workoutError } = await supabase
    .from('workouts')
    .select('id, datetime')
    .eq('id', workoutId)
    .eq('user_id', userData.user.id)
    .single();

  if (workoutError || !workoutData) {
    throw new Error('Workout not found');
  }

  const { data: exercisesData, error: exercisesError } = await supabase
    .from('exercises')
    .select('id, name, weight, sets, reps, completed')
    .eq('workout_id', workoutId);

  if (exercisesError) {
    throw exercisesError;
  }

  return {
    ...workoutData,
    exercises: exercisesData || [],
  };
};

export const createWorkout = async (supabase: SupabaseClient, datetime: string): Promise<Workout> => {
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    throw new Error('Unauthorized');
  }

  const { data: workoutData, error } = await supabase
    .from('workouts')
    .insert({
      datetime,
      user_id: userData.user.id,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return {
    ...workoutData,
    exercises: [],
  };
};

export const updateWorkout = async (
  supabase: SupabaseClient,
  workoutId: string,
  datetime: string,
  exercises: Exercise[]
): Promise<void> => {
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    throw new Error('Unauthorized');
  }

  const { error: workoutError } = await supabase
    .from('workouts')
    .update({ datetime })
    .eq('id', workoutId)
    .eq('user_id', userData.user.id);

  if (workoutError) {
    throw workoutError;
  }

  const { error: deleteError } = await supabase
    .from('exercises')
    .delete()
    .eq('workout_id', workoutId);

  if (deleteError) {
    throw deleteError;
  }

  if (exercises && exercises.length > 0) {
    const exercisesToInsert = exercises.map((exercise) => ({
      workout_id: workoutId,
      name: exercise.name,
      weight: exercise.weight || 0,
      sets: exercise.sets || 0,
      reps: exercise.reps || 0,
      completed: exercise.completed || 0,
    }));

    const { error: insertError } = await supabase
      .from('exercises')
      .insert(exercisesToInsert);

    if (insertError) {
      throw insertError;
    }
  }
};

export const deleteWorkout = async (supabase: SupabaseClient, workoutId: string): Promise<void> => {
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    throw new Error('Unauthorized');
  }

  const { error: deleteExercisesError } = await supabase
    .from('exercises')
    .delete()
    .eq('workout_id', workoutId);

  if (deleteExercisesError) {
    throw deleteExercisesError;
  }

  const { error: deleteWorkoutError } = await supabase
    .from('workouts')
    .delete()
    .eq('id', workoutId)
    .eq('user_id', userData.user.id);

  if (deleteWorkoutError) {
    throw deleteWorkoutError;
  }
};

