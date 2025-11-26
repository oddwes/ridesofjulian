'use client';

import { WorkoutEditScreen } from '@ridesofjulian/shared/mobile';
import { ExerciseList } from './ExerciseList';
import { LoadingSpinner } from './LoadingSpinner';
import { useSupabase } from '@/contexts/SupabaseContext';

interface WorkoutEditScreenWebProps {
  workoutId: string;
  onClose: () => void;
}

const WebStorage = {
  getItem: async (key: string) => {
    if (typeof window !== 'undefined') {
      return window.localStorage.getItem(key);
    }
    return null;
  },
  setItem: async (key: string, value: string) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(key, value);
    }
  },
  removeItem: async (key: string) => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(key);
    }
  },
};

export function WorkoutEditScreenWeb({ workoutId, onClose }: WorkoutEditScreenWebProps) {
  const { supabase } = useSupabase();

  const handleConfirmDelete = (onConfirm: () => void) => {
    if (window.confirm('Are you sure you want to delete this workout?')) {
      onConfirm();
    }
  };

  return (
    <WorkoutEditScreen
      workoutId={workoutId}
      onClose={onClose}
      supabase={supabase}
      ExerciseList={ExerciseList}
      LoadingSpinner={LoadingSpinner}
      AsyncStorage={WebStorage}
      confirmDelete={handleConfirmDelete}
    />
  );
}

