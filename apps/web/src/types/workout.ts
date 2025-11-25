import { Exercise } from "./exercise";

export interface Interval {
  id: string;
  name: string;
  duration: number;
  powerMin: number;
  powerMax: number;
}

export interface RideWorkout {
  id: number;
  workoutTitle: string;
  selectedDate: string;
  intervals: Interval[];
}

export interface Workout {
  id: string;
  datetime: string;
  exercises: Exercise[];
  user_id?: string;
}

export interface ScheduledWorkout {
  id: number;
  date: string;
  plan: Array<{
    name: string;
    sets: string;
    reps: string;
  }>;
  user_id: string;
}


