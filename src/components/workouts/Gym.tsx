'use client'

import { useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { Exercise } from '@/types/exercise';
import { PlusIcon } from '@heroicons/react/24/solid';
import { formatISO, parseISO } from 'date-fns';
import { ExerciseList } from '@/components/ExerciseList';

export interface EditWorkoutHandle {
  save: () => Promise<void>;
  isSaving: boolean;
}

interface EditGymWorkoutProps {
  initialExercises?: Exercise[];
  initialDate?: string;
  onSave: (data: { exercises: Exercise[]; date: string }) => Promise<void>;
  onDelete?: () => Promise<void>;
  hideHeader?: boolean;
  disabled?: boolean;
}

const EditGymWorkout = forwardRef<EditWorkoutHandle, EditGymWorkoutProps>(({
  initialExercises = [],
  initialDate = new Date().toISOString(),
  onSave,
  onDelete,
  hideHeader = false,
  disabled = false,
}, ref) => {
  const [workoutDateTime, setWorkoutDateTime] = useState("");
  const [exercises, setExercises] = useState<Exercise[]>(initialExercises);
  const [focusExerciseId, setFocusExerciseId] = useState<string | undefined>();
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setExercises(initialExercises);
    try {
      if (initialDate) {
        setWorkoutDateTime(formatISO(parseISO(initialDate)).substring(0, 16));
      }
    } catch (e) {
      console.error("Error parsing date:", initialDate, e);
      setWorkoutDateTime("");
    }
  }, [initialExercises, initialDate]);

  useEffect(() => {
    if (focusExerciseId && !exercises.some(e => e.id === focusExerciseId)) {
      setFocusExerciseId(undefined);
    }
  }, [exercises, focusExerciseId]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const isoDateTime = new Date(workoutDateTime).toISOString();
      await onSave({ exercises, date: isoDateTime });
    } catch (error) {
      console.error("Error saving workout:", error);
    } finally {
      setIsSaving(false);
    }
  };

  useImperativeHandle(ref, () => ({
    save: handleSave,
    isSaving,
  }));

  const handleDateTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDateTime = e.target.value;
    setWorkoutDateTime(newDateTime);
  };

  const handleExercisesChange = (updatedExercises: Exercise[]) => {
    setExercises(updatedExercises);
  };

  const handleAddExercise = () => {
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
  };

  return (
    <>
      {!hideHeader && (
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Edit Gym Workout</h1>
          <div className="flex gap-3">
            {onDelete && (
              <button
                onClick={onDelete}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete Workout
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={isSaving || disabled}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? "Saving..." : "Save Workout"}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Workout Date & Time</label>
          <input
            type="datetime-local"
            value={workoutDateTime}
            onChange={handleDateTimeChange}
            disabled={disabled}
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm bg-white text-gray-900 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        <div className="border-t border-gray-200 pt-4">
          <ExerciseList
            exercises={exercises}
            onExercisesChange={handleExercisesChange}
            focusExerciseId={focusExerciseId}
            onFocusRequest={setFocusExerciseId}
          />
          <button
            onClick={handleAddExercise}
            disabled={disabled}
            className="mt-4 inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Exercise
          </button>
        </div>
      </div>
    </>
  );
});

EditGymWorkout.displayName = 'EditGymWorkout';

export default EditGymWorkout;

