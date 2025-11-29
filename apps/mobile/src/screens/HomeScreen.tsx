import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Header } from '../components/Header';
import { ProfileScreen } from './ProfileScreen';
import { WorkoutEditScreen } from './WorkoutEditScreen';
import { StatsScreen } from './StatsScreen';
import { Calendar } from '../components/calendar/Calendar';
import { createWorkout } from '@ridesofjulian/shared';
import { supabase } from '../config/supabase';

export function HomeScreen() {
  const [showProfile, setShowProfile] = useState(false);
  const [editingWorkoutId, setEditingWorkoutId] = useState<string | null>(null);
  const [isCreatingWorkout, setIsCreatingWorkout] = useState(false);
  const [activeTab, setActiveTab] = useState<'calendar' | 'stats'>('calendar');
  const queryClient = useQueryClient();

  const handleAddWorkout = async () => {
    try {
      setIsCreatingWorkout(true);
      const now = new Date().toISOString();
      const workout = await createWorkout(supabase, now);
      queryClient.invalidateQueries({ queryKey: ['workouts'] });
      setEditingWorkoutId(workout.id);
    } catch (error) {
      console.error('Error creating workout:', error);
    } finally {
      setIsCreatingWorkout(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Header 
        onProfilePress={() => setShowProfile(true)}
        onAddWorkoutPress={handleAddWorkout}
        isCreatingWorkout={isCreatingWorkout}
      />

      <View style={styles.tabBar}>
        <Pressable
          style={[styles.tab, activeTab === 'calendar' && styles.tabActive]}
          onPress={() => setActiveTab('calendar')}
        >
          <Text style={[styles.tabText, activeTab === 'calendar' && styles.tabTextActive]}>
            Calendar
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'stats' && styles.tabActive]}
          onPress={() => setActiveTab('stats')}
        >
          <Text style={[styles.tabText, activeTab === 'stats' && styles.tabTextActive]}>
            Stats
          </Text>
        </Pressable>
      </View>

      {activeTab === 'calendar' ? (
        <Calendar onWorkoutPress={(workoutId) => setEditingWorkoutId(workoutId)} />
      ) : (
        <StatsScreen />
      )}

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
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  tab: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginHorizontal: 4,
    backgroundColor: '#020617',
  },
  tabActive: {
    backgroundColor: '#3b82f6',
  },
  tabText: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#f9fafb',
  },
});

