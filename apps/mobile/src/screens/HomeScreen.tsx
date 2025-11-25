import { Modal, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Header } from '../components/Header';
import { ProfileScreen } from './ProfileScreen';
import { WorkoutEditScreen } from './WorkoutEditScreen';
import { Calendar } from '../components/calendar/Calendar';
import { createWorkout } from '@ridesofjulian/shared';
import { supabase } from '../config/supabase';

export function HomeScreen() {
  const [showProfile, setShowProfile] = useState(false);
  const [editingWorkoutId, setEditingWorkoutId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const handleAddWorkout = async () => {
    try {
      const now = new Date().toISOString();
      const workout = await createWorkout(supabase, now);
      queryClient.invalidateQueries({ queryKey: ['workouts'] });
      setEditingWorkoutId(workout.id);
    } catch (error) {
      console.error('Error creating workout:', error);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Header 
        onProfilePress={() => setShowProfile(true)}
        onAddWorkoutPress={handleAddWorkout}
      />
      
      <Calendar onWorkoutPress={(workoutId) => setEditingWorkoutId(workoutId)} />

      <Modal
        visible={showProfile}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowProfile(false)}
      >
        <ProfileScreen onClose={() => setShowProfile(false)} />
      </Modal>

      <Modal
        visible={!!editingWorkoutId}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditingWorkoutId(null)}
      >
        {editingWorkoutId && (
          <WorkoutEditScreen 
            workoutId={editingWorkoutId} 
            onClose={() => setEditingWorkoutId(null)} 
          />
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e293b',
  },
});

