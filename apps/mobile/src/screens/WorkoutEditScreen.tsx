import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { WorkoutEditScreen as SharedWorkoutEditScreen } from '@ridesofjulian/shared/src/mobile';
import { ExerciseList } from '../components/ExerciseList';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { supabase } from '../config/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface WorkoutEditScreenProps {
  workoutId: string;
  onClose: () => void;
}

export function WorkoutEditScreen({ workoutId, onClose }: WorkoutEditScreenProps) {
  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="light" />
      <SharedWorkoutEditScreen
        workoutId={workoutId}
        onClose={onClose}
        supabase={supabase}
        ExerciseList={ExerciseList}
        LoadingSpinner={LoadingSpinner}
        AsyncStorage={AsyncStorage}
      />
    </View>
  );
}

