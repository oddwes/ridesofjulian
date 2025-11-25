import { useEffect, useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Exercise } from '@ridesofjulian/shared';

interface ExerciseListProps {
  exercises: Exercise[];
  onExercisesChange: (updatedExercises: Exercise[]) => void;
  focusExerciseId?: string;
  onFocusRequest: (exerciseId: string | undefined) => void;
  restDurationSeconds: number;
  weightUnit?: 'kg' | 'lb';
}

export function ExerciseList({ 
  exercises, 
  onExercisesChange, 
  focusExerciseId, 
  onFocusRequest, 
  restDurationSeconds,
  weightUnit = 'lb'
}: ExerciseListProps) {
  const [localExercises, setLocalExercises] = useState<Exercise[]>(exercises);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerExerciseId, setTimerExerciseId] = useState<string | null>(null);
  const [timerEndTime, setTimerEndTime] = useState<number | null>(null);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const longPressRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef(false);

  useEffect(() => {
    setLocalExercises(exercises);
  }, [exercises]);

  useEffect(() => {
    if (timerExerciseId && timerEndTime) {
      const updateTimer = () => {
        const now = Date.now();
        const remaining = Math.max(0, Math.ceil((timerEndTime - now) / 1000));
        
        if (remaining > 0) {
          setTimerSeconds(remaining);
          timerRef.current = setTimeout(updateTimer, 100);
        } else {
          setTimerSeconds(0);
          setTimerExerciseId(null);
          setTimerEndTime(null);
        }
      };

      updateTimer();

      return () => {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }
      };
    }
  }, [timerExerciseId, timerEndTime]);

  const startTimer = (exerciseId: string) => {
    const duration = restDurationSeconds && restDurationSeconds > 0 ? restDurationSeconds : 120;
    const endTime = Date.now() + duration * 1000;
    setTimerEndTime(endTime);
    setTimerSeconds(duration);
    setTimerExerciseId(exerciseId);
  };

  const lbsToKg = (lbs: number) => Math.round(lbs * 0.453592 * 10) / 10;
  const kgToLbs = (kg: number) => Math.round(kg * 2.20462 * 10) / 10;

  const getDisplayWeight = (weightInLbs: number) => {
    if (weightUnit === 'kg') {
      return lbsToKg(weightInLbs);
    }
    return weightInLbs;
  };

  const handleExerciseChange = (
    exerciseId: string, 
    field: 'name' | 'weight' | 'reps' | 'sets', 
    value: string | number
  ) => {
    let finalValue = value;
    
    // If changing weight and unit is kg, convert to lbs for storage
    if (field === 'weight' && weightUnit === 'kg' && typeof value === 'number') {
      finalValue = kgToLbs(value);
    }
    
    const updatedExercises = localExercises.map(ex =>
      ex.id === exerciseId ? { ...ex, [field]: finalValue || (field === 'name' ? '' : 0) } : ex
    );
    setLocalExercises(updatedExercises);
    onExercisesChange(updatedExercises);
  };

  const deleteExercise = (exerciseId: string) => {
    Alert.alert(
      'Delete Exercise',
      'Are you sure you want to delete this exercise?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const updatedExercises = localExercises.filter(ex => ex.id !== exerciseId);
            setLocalExercises(updatedExercises);
            onExercisesChange(updatedExercises);
          },
        },
      ]
    );
  };

  const incrementCompleted = (exerciseId: string) => {
    const target = localExercises.find(ex => ex.id === exerciseId);
    if (!target) return;
    const sets = target.sets || 0;
    const completed = target.completed || 0;
    if (sets === 0 || completed >= sets) return;

    const updatedExercises = localExercises.map(ex =>
      ex.id === exerciseId
        ? { ...ex, completed: (ex.completed || 0) + 1 }
        : ex
    );
    setLocalExercises(updatedExercises);
    onExercisesChange(updatedExercises);
    startTimer(exerciseId);
  };

  const decrementCompleted = (exerciseId: string) => {
    const updatedExercises = localExercises.map(ex =>
      ex.id === exerciseId && (ex.completed || 0) > 0
        ? { ...ex, completed: (ex.completed || 0) - 1 }
        : ex
    );
    setLocalExercises(updatedExercises);
    onExercisesChange(updatedExercises);
  };

  const handlePressIn = (exerciseId: string) => {
    isLongPressRef.current = false;
    longPressRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      decrementCompleted(exerciseId);
    }, 500);
  };

  const handlePressOut = (exerciseId: string) => {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }

    if (!isLongPressRef.current) {
      incrementCompleted(exerciseId);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      {localExercises.map((exercise) => {
        const exerciseId = exercise.id || '';
        const isSelected = selectedExerciseId === exerciseId;
        return (
        <TouchableOpacity 
          key={exerciseId} 
          style={[styles.exerciseCard, isSelected && styles.exerciseCardSelected]}
          onPress={() => setSelectedExerciseId(exerciseId)}
          activeOpacity={1}
        >
          <View style={styles.header}>
            {isSelected ? (
              <TextInput
                style={[
                  styles.nameInput,
                  focusedInput === `${exerciseId}-name` && styles.nameInputFocused
                ]}
                value={exercise.name}
                onChangeText={(text) => handleExerciseChange(exerciseId, 'name', text)}
                onFocus={() => setFocusedInput(`${exerciseId}-name`)}
                onBlur={() => setFocusedInput(null)}
                placeholder="Exercise name"
                placeholderTextColor="#9ca3af"
              />
            ) : (
              <Text style={styles.nameText}>{exercise.name}</Text>
            )}
            {isSelected && (
              <TouchableOpacity
                onPress={() => deleteExercise(exerciseId)}
                style={styles.deleteButton}
              >
                <Feather name="trash-2" size={20} color="#ef4444" />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.inputsRow}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Weight ({weightUnit})</Text>
              {isSelected ? (
                <TextInput
                  style={[
                    styles.input,
                    focusedInput === `${exerciseId}-weight` && styles.inputFocused
                  ]}
                  value={exercise.weight ? getDisplayWeight(exercise.weight).toString() : ''}
                  onChangeText={(text) => handleExerciseChange(exerciseId, 'weight', parseFloat(text) || 0)}
                  onFocus={() => setFocusedInput(`${exerciseId}-weight`)}
                  onBlur={() => setFocusedInput(null)}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor="#9ca3af"
                />
              ) : (
                <Text style={styles.valueText}>{exercise.weight ? getDisplayWeight(exercise.weight) : '0'}</Text>
              )}
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Sets</Text>
              {isSelected ? (
                <TextInput
                  style={[
                    styles.input,
                    focusedInput === `${exerciseId}-sets` && styles.inputFocused
                  ]}
                  value={exercise.sets?.toString() || ''}
                  onChangeText={(text) => handleExerciseChange(exerciseId, 'sets', parseInt(text) || 0)}
                  onFocus={() => setFocusedInput(`${exerciseId}-sets`)}
                  onBlur={() => setFocusedInput(null)}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#9ca3af"
                />
              ) : (
                <Text style={styles.valueText}>{exercise.sets || '0'}</Text>
              )}
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Reps</Text>
              {isSelected ? (
                <TextInput
                  style={[
                    styles.input,
                    focusedInput === `${exerciseId}-reps` && styles.inputFocused
                  ]}
                  value={exercise.reps?.toString() || ''}
                  onChangeText={(text) => handleExerciseChange(exerciseId, 'reps', parseInt(text) || 0)}
                  onFocus={() => setFocusedInput(`${exerciseId}-reps`)}
                  onBlur={() => setFocusedInput(null)}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#9ca3af"
                />
              ) : (
                <Text style={styles.valueText}>{exercise.reps || '0'}</Text>
              )}
            </View>
          </View>

          {(exercise.sets || 0) > 0 && (
            <TouchableOpacity
              style={styles.progressContainer}
              onPressIn={() => handlePressIn(exerciseId)}
              onPressOut={() => handlePressOut(exerciseId)}
              activeOpacity={0.7}
              disabled={!isSelected}
            >
              <View style={styles.progressDots}>
                {Array.from({ length: exercise.sets || 0 }).map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.dot,
                      index < (exercise.completed || 0) ? styles.dotCompleted : styles.dotIncomplete
                    ]}
                  />
                ))}
              </View>
            </TouchableOpacity>
          )}

          {timerExerciseId === exerciseId && (
            <View style={styles.timerContainer}>
              <Text style={styles.timerLabel}>Rest Timer</Text>
              <Text style={styles.timerTime}>{formatTime(timerSeconds)}</Text>
            </View>
          )}
        </TouchableOpacity>
      );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  exerciseCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  exerciseCardSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#ffffff',
  },
  nameText: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  valueText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginLeft: -8,
    marginRight: -8,
  },
  nameInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: 'transparent',
    borderRadius: 6,
    borderWidth: 0,
  },
  nameInputFocused: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#3b82f6',
  },
  deleteButton: {
    marginLeft: 8,
    padding: 4,
  },
  inputsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
    marginLeft: -8,
    marginRight: -8,
  },
  inputGroup: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: '#4b5563',
    marginBottom: 4,
    paddingHorizontal: 8,
  },
  input: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '500',
  },
  inputFocused: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#3b82f6',
  },
  progressContainer: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginLeft: -8,
    marginRight: -8,
  },
  progressDots: {
    flexDirection: 'row',
    gap: 4,
  },
  dot: {
    width: 20,
    height: 8,
    borderRadius: 4,
  },
  dotCompleted: {
    backgroundColor: '#10b981',
  },
  dotIncomplete: {
    backgroundColor: '#374151',
  },
  timerContainer: {
    marginTop: 12,
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  timerLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#ffffff',
    marginBottom: 4,
  },
  timerTime: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
});

