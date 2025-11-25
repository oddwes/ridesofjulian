'use client'

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Exercise } from '@ridesofjulian/shared';
import Link from 'next/link';
import { ArrowLeftIcon, PlusIcon } from '@heroicons/react/24/solid';
import { formatISO, parseISO } from 'date-fns';
import { ExerciseList } from '@/components/ExerciseList';
import { useWorkout } from '@/hooks/useWorkout';
import { updateWorkoutAPI } from '@/lib/api/workouts';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { deleteWorkoutAPI } from '@/lib/api/workouts';
import { Button } from '@/components/Button';

export default function WorkoutFormPage() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const workoutIdParam = params.id as string;

  const { data: workout, isLoading, error: fetchError } = useWorkout(workoutIdParam);

  const [workoutDateTime, setWorkoutDateTime] = useState("");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [focusExerciseId, setFocusExerciseId] = useState<string | undefined>();
  const [pageError, setPageError] = useState<string | null>(null);
  const [restMinutes, setRestMinutes] = useState<number>(2);
  const [restInput, setRestInput] = useState<string>("2");

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem('rest_timer_minutes');
    const n = saved ? parseInt(saved, 10) : NaN;
    const effective = !Number.isNaN(n) && n > 0 ? n : 2;
    setRestMinutes(effective);
    setRestInput(String(effective));
  }, []);

  const handleRestInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRestInput(e.target.value);
  };

  const handleRestInputBlur = () => {
    const trimmed = restInput.trim();
    if (!trimmed) {
      setRestMinutes(2);
      setRestInput("2");
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('rest_timer_minutes', "2");
      }
      return;
    }
    const value = parseInt(trimmed, 10);
    if (Number.isNaN(value) || value <= 0) {
      setRestInput(String(restMinutes));
      return;
    }
    setRestMinutes(value);
    setRestInput(String(value));
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('rest_timer_minutes', String(value));
    }
  };

  useEffect(() => {
    if (workout) {
      setPageError(null);
      const savedState = localStorage.getItem(`workout_${workoutIdParam}`);

      if (savedState) {
        const { datetime, exercises: savedExercises } = JSON.parse(savedState);
        setWorkoutDateTime(formatISO(parseISO(datetime)).substring(0, 16));
        setExercises(savedExercises);
      } else {
        const currentExercises = workout.exercises || [];
        setExercises(currentExercises);
        try {
          if (workout.datetime && typeof workout.datetime === 'string') {
            setWorkoutDateTime(formatISO(parseISO(workout.datetime)).substring(0, 16));
          } else {
            console.warn("Workout datetime is missing or invalid:", workout.datetime);
            setWorkoutDateTime("");
          }
        } catch (e) {
          console.error("Error parsing date:", workout.datetime, e);
          setWorkoutDateTime("");
          setPageError("Failed to parse workout date.");
        }
      }
    } else if (fetchError) {
      setPageError(fetchError.message);
    }
  }, [workout, fetchError, workoutIdParam]);

  useEffect(() => {
    if (focusExerciseId && !exercises.some(e => e.id === focusExerciseId)) {
      setFocusExerciseId(undefined);
    }
  }, [exercises, focusExerciseId]);

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen"><LoadingSpinner /></div>
  }

  if (pageError && !workout) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-500 mb-4">{pageError}</p>
        <Link href="/" className="text-blue-500">Back to workouts</Link>
      </div>
    );
  }

  if (!workout && !isLoading && !pageError) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-500 mb-4">Workout not found or invalid ID.</p>
        <Link href="/" className="text-blue-500">Back to workouts</Link>
      </div>
    );
  }

  if (!workout) {
    return <div className="p-6 text-center">Something went wrong. Workout data is unavailable.</div>;
  }

  const handleDateTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDateTime = e.target.value;
    setWorkoutDateTime(newDateTime);
    if (workout) {
      const hasChanges = workout.datetime !== new Date(newDateTime).toISOString();
      if (hasChanges) {
        localStorage.setItem(`workout_${workoutIdParam}`, JSON.stringify({
          datetime: newDateTime,
          exercises
        }));
      }
    }
  };

  const handleExercisesChange = (updatedExercises: Exercise[]) => {
    setExercises(updatedExercises);
    if (workout) {
      const hasChanges = JSON.stringify(workout.exercises) !== JSON.stringify(updatedExercises);
      if (hasChanges) {
        localStorage.setItem(`workout_${workoutIdParam}`, JSON.stringify({
          datetime: workoutDateTime,
          exercises: updatedExercises
        }));
      }
    }
  };

  const handleAddExercise = () => {
    if (!workoutIdParam) return;
    const tempId = `temp_${Date.now()}`;
    const newExercisePlaceholder: Exercise = {
      id: tempId,
      name: "New Exercise",
      weight: 0,
      sets: 0,
      reps: 0,
      completed: 0,
    };
    const updatedExercises = [...exercises, newExercisePlaceholder];
    setExercises(updatedExercises);
    setFocusExerciseId(tempId);

    if (workout) {
      localStorage.setItem(`workout_${workoutIdParam}`, JSON.stringify({
        datetime: workoutDateTime,
        exercises: updatedExercises
      }));
    }
  };

  const handleSaveWorkout = async () => {
    if (!workout || !workoutIdParam) return;

    let isoDateTime;
    try {
      isoDateTime = new Date(workoutDateTime).toISOString();
    } catch (e) {
      console.error("Invalid date format for saving:", workoutDateTime, e);
      setPageError("Invalid date format. Please check the date and time.");
      return;
    }

    try {
      await updateWorkoutAPI(workoutIdParam, { datetime: isoDateTime, exercises: exercises });
      localStorage.removeItem(`workout_${workoutIdParam}`);
      queryClient.invalidateQueries({ queryKey: ['workouts'] });
      queryClient.invalidateQueries({ queryKey: ['workout', workoutIdParam] });
      setPageError(null);
      router.push('/');
    } catch (err) {
      console.error("Error saving workout:", err);
      const message = err instanceof Error ? err.message : 'Unknown error during save';
      setPageError(`Error saving workout: ${message}`);
    }
  };

  const handleDeleteWorkout = async () => {
    if (!workout) return;
    if (confirm(`Are you sure you want to delete this workout?`)) {
      try {
        await deleteWorkoutAPI(workout.id);
        queryClient.invalidateQueries({ queryKey: ['workouts'] });
        queryClient.invalidateQueries({ queryKey: ['workout', workout.id] });
        router.push('/');
      } catch (err) {
        console.error("Error deleting workout:", err);
        const message = err instanceof Error ? err.message : 'Unknown error during delete';
        setPageError(`Error deleting workout: ${message}`);
      }
    }
  };

  return (
    <div className="min-h-screen overflow-y-auto max-w-2xl mx-auto p-4">
      <div className="flex items-center justify-between gap-3">
        <Button variant="primary" className="flex items-center gap-2" onClick={() => router.push('/')}>
          <ArrowLeftIcon className="h-4 w-4" />
          Back
        </Button>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-300">Rest Timer</span>
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={1}
              value={restInput}
              onChange={handleRestInputChange}
              onBlur={handleRestInputBlur}
              className="w-8 p-1 border border-gray-500 rounded bg-gray-800 text-sm text-gray-100 text-right"
            />
          </div>
        </div>
      </div>

      {pageError && (
        <div className="mt-4 p-3 bg-red-100 text-red-700 border border-red-300 rounded-md">
          <p>{pageError}</p>
        </div>
      )}

      <form className="space-y-2 mt-4">
        <div>
          <input
            type="datetime-local"
            id="datetime"
            name="datetime"
            value={workoutDateTime}
            onChange={handleDateTimeChange}
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm bg-white text-gray-900 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        <div className="border-t border-gray-200 pt-2">
          {workoutIdParam && <ExerciseList
            exercises={exercises}
            onExercisesChange={handleExercisesChange}
            focusExerciseId={focusExerciseId}
            onFocusRequest={setFocusExerciseId}
            restDurationSeconds={restMinutes * 60}
          />}
          <Button
            variant="primary"
            onClick={handleAddExercise}
            className="mt-2 inline-flex items-center bg-green-600"
            resetOnClick={true}
          >
            <PlusIcon className="h-5 w-5" />
            Add Exercise
          </Button>
        </div>

        <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-gray-200">
          <Button
            variant="danger"
            onClick={handleDeleteWorkout}
          >
            Delete Workout
          </Button>
          <Button
            variant="primary"
            onClick={handleSaveWorkout}
          >
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}

