"use client";

import { forwardRef } from "react";
import { Exercise } from '@ridesofjulian/shared';
import EditRideWorkout, { Interval } from "./Ride";
import EditGymWorkout from "./Gym";

export interface EditWorkoutHandle {
  save: () => Promise<void>;
  isSaving: boolean;
}

type RideWorkoutData = {
  type: 'ride';
  initialIntervals?: Interval[];
  initialTitle?: string;
  initialDate?: string;
  onSave: (data: { intervals: Interval[]; title: string; date: string }) => Promise<void>;
};

type GymWorkoutData = {
  type: 'gym';
  initialExercises?: Exercise[];
  initialDate?: string;
  onSave: (data: { exercises: Exercise[]; date: string }) => Promise<void>;
};

type EditWorkoutProps = (RideWorkoutData | GymWorkoutData) & {
  onDelete?: () => Promise<void>;
  saveButtonText?: string;
  deleteButtonText?: string;
  disabled?: boolean;
};

const EditWorkout = forwardRef<EditWorkoutHandle, EditWorkoutProps>((props, ref) => {
  if (props.type === 'gym') {
    const { initialExercises, initialDate, onSave, disabled } = props;
    return (
      <EditGymWorkout
        ref={ref}
        initialExercises={initialExercises}
        initialDate={initialDate}
        onSave={onSave}
        disabled={disabled}
      />
    );
  } else {
    const { initialIntervals, initialTitle, initialDate, onSave, disabled } = props;
    return (
      <EditRideWorkout
        ref={ref}
        initialIntervals={initialIntervals}
        initialTitle={initialTitle}
        initialDate={initialDate}
        onSave={onSave}
        disabled={disabled}
      />
    );
  }
});

EditWorkout.displayName = 'EditWorkout';

export default EditWorkout;
export type { Interval };
