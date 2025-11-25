import { Exercise } from './exercise';

export interface Workout {
  id: string;
  datetime: string;
  exercises: Exercise[];
  user_id?: string;
}

