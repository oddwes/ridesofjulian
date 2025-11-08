import React, { useState, forwardRef, useImperativeHandle, useRef } from "react";
import EditWorkout, { Interval, EditWorkoutHandle } from "./Edit";
import { Exercise } from "@/types/exercise";
import dayjs from "dayjs";

type RideWorkout = {
  type: 'ride';
  id: number;
  workoutTitle: string;
  selectedDate: string;
  intervals: Interval[];
};

type GymWorkout = {
  type: 'gym';
  id: string;
  workoutTitle: string;
  selectedDate: string;
  exercises: Exercise[];
};

interface WorkoutModalProps {
  workout: (RideWorkout | GymWorkout) | null;
  onClose: () => void;
  onSave: (data: { intervals?: Interval[]; exercises?: Exercise[]; title?: string; date: string }) => Promise<void>;
}

export interface WorkoutModalHandle {
  save: () => void;
}

export const WorkoutModal = forwardRef<WorkoutModalHandle, WorkoutModalProps>(
  ({ workout, onClose, onSave }, ref) => {
    const [isSaving, setIsSaving] = useState(false);
    const editWorkoutRef = useRef<EditWorkoutHandle>(null);

    useImperativeHandle(ref, () => ({
      save: () => editWorkoutRef.current?.save(),
    }));

    const handleSave = async (data: { intervals?: Interval[]; exercises?: Exercise[]; title?: string; date: string }) => {
      setIsSaving(true);
      try {
        await onSave(data);
      } catch (error) {
        console.error("Save failed:", error);
      } finally {
        setIsSaving(false);
      }
    };

    const handleClose = () => {
      if (!isSaving) {
        onClose();
      }
    };

    if (!workout) return null;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 z-10">
            <h2 className="text-xl font-semibold">{workout.workoutTitle}</h2>
            <p className="text-sm text-gray-600 mt-1">
              {dayjs(workout.selectedDate).format('dddd, MMMM D, YYYY')}
            </p>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            {workout.type === 'gym' ? (
              <EditWorkout
                ref={editWorkoutRef}
                type="gym"
                initialExercises={workout.exercises}
                initialDate={workout.selectedDate}
                onSave={handleSave}
                hideHeader={true}
                disabled={isSaving}
              />
            ) : (
              <EditWorkout
                ref={editWorkoutRef}
                type="ride"
                initialIntervals={workout.intervals}
                initialTitle={workout.workoutTitle}
                initialDate={workout.selectedDate}
                onSave={handleSave}
                hideHeader={true}
                disabled={isSaving}
              />
            )}
          </div>
          <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end items-center gap-3 z-10">
            <button
              onClick={handleClose}
              disabled={isSaving}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={() => editWorkoutRef.current?.save()}
              disabled={isSaving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    );
  }
);

WorkoutModal.displayName = 'WorkoutModal';

