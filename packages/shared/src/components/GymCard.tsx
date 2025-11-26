'use client';

import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Workout } from '../types/workout';

interface GymCardProps {
  workout: Workout;
  onPress?: (workoutId: string) => void;
}

export function GymCard({ workout, onPress }: GymCardProps) {
  return (
    <TouchableOpacity 
      style={styles.container}
      onPress={() => workout.id && onPress?.(workout.id)}
    >
      <Text style={styles.title}>💪 Gym</Text>
      <Text style={styles.exerciseText}>
        {workout.exercises.map(e => e.name).join(', ')}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#e9d5ff',
    borderWidth: 2,
    borderColor: '#c084fc',
    borderRadius: 8,
    padding: 8,
  },
  title: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b21a8',
    marginBottom: 4,
  },
  exerciseText: {
    fontSize: 10,
    color: '#7c3aed',
  },
});

