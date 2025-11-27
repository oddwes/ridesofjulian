import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { WorkoutEditScreen as SharedWorkoutEditScreen } from '@ridesofjulian/shared/mobile';
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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={32}
    >
      <StatusBar style="light" />
      <View style={styles.modalHandle} />
      <SharedWorkoutEditScreen
        workoutId={workoutId}
        onClose={onClose}
        supabase={supabase}
        ExerciseList={ExerciseList}
        LoadingSpinner={LoadingSpinner}
        AsyncStorage={AsyncStorage}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e293b',
  },
  modalHandle: {
    width: 36,
    height: 5,
    backgroundColor: '#4b5563',
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: 16,
    marginBottom: 16,
  },
});

