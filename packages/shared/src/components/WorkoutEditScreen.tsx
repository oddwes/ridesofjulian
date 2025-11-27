'use client';

import { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { Exercise } from '../types/exercise';
import { formatISO, parseISO, format } from 'date-fns';
import { updateWorkout, deleteWorkout, fetchWorkout } from '../api/workouts';
import type { SupabaseClient } from '@supabase/supabase-js';

interface WorkoutEditScreenProps {
  workoutId: string;
  onClose: () => void;
  supabase: SupabaseClient;
  ExerciseList: React.ComponentType<any>;
  LoadingSpinner: React.ComponentType<any>;
  AsyncStorage: any;
  confirmDelete?: (onConfirm: () => void) => void;
}

export function WorkoutEditScreen({ 
  workoutId, 
  onClose, 
  supabase,
  ExerciseList,
  LoadingSpinner,
  AsyncStorage,
  confirmDelete
}: WorkoutEditScreenProps) {
  const queryClient = useQueryClient();
  const [workout, setWorkout] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<Error | null>(null);

  const [workoutDateTime, setWorkoutDateTime] = useState("");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [focusExerciseId, setFocusExerciseId] = useState<string | undefined>();
  const [pageError, setPageError] = useState<string | null>(null);
  const [restMinutes, setRestMinutes] = useState<number>(2);
  const [restInput, setRestInput] = useState<string>("2");
  const [restInputSelection, setRestInputSelection] = useState<{ start: number; end: number } | undefined>(undefined);
  const [restInputFocused, setRestInputFocused] = useState(false);
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lb'>('lb');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const scrollViewRef = useRef<any>(null);

  useEffect(() => {
    const loadWorkout = async () => {
      try {
        setIsLoading(true);
        const data = await fetchWorkout(supabase, workoutId);
        setWorkout(data);
        setFetchError(null);
      } catch (err) {
        setFetchError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (workoutId) {
      loadWorkout();
    }
  }, [workoutId, supabase]);

  useEffect(() => {
    AsyncStorage.getItem('rest_timer_minutes').then((saved: string | null) => {
      const n = saved ? parseInt(saved, 10) : NaN;
      const effective = !Number.isNaN(n) && n > 0 ? n : 2;
      setRestMinutes(effective);
      setRestInput(String(effective));
    });
    AsyncStorage.getItem('weight_unit').then((saved: string | null) => {
      setWeightUnit((saved as 'kg' | 'lb') || 'lb');
    });
  }, [AsyncStorage]);

  const handleRestInputChange = (text: string) => {
    setRestInput(text);
    setRestInputSelection(undefined);
  };

  const handleRestInputBlur = () => {
    const trimmed = restInput.trim();
    if (!trimmed) {
      setRestMinutes(2);
      setRestInput("2");
      AsyncStorage.setItem('rest_timer_minutes', "2");
      return;
    }
    const value = parseInt(trimmed, 10);
    if (Number.isNaN(value) || value <= 0) {
      setRestInput(String(restMinutes));
      return;
    }
    setRestMinutes(value);
    setRestInput(String(value));
    AsyncStorage.setItem('rest_timer_minutes', String(value));
  };

  useEffect(() => {
    if (workout) {
      setPageError(null);
      AsyncStorage.getItem(`workout_${workoutId}`).then((savedState: string | null) => {
        if (savedState) {
          const { datetime, exercises: savedExercises } = JSON.parse(savedState);
          setWorkoutDateTime(formatISO(parseISO(datetime)).substring(0, 16));
          setExercises(savedExercises);
        } else {
          const currentExercises = workout.exercises || [];
          setExercises(currentExercises);
          try {
            if (workout.datetime && typeof workout.datetime === 'string') {
              setWorkoutDateTime(formatISO(parseISO(workout.datetime)).substring(0, 16));
            } else {
              console.warn("Workout datetime is missing or invalid:", workout.datetime);
              setWorkoutDateTime("");
            }
          } catch (e) {
            console.error("Error parsing date:", workout.datetime, e);
            setWorkoutDateTime("");
            setPageError("Failed to parse workout date.");
          }
        }
      });
    } else if (fetchError) {
      setPageError(fetchError.message);
    }
  }, [workout, fetchError, workoutId, AsyncStorage]);

  useEffect(() => {
    if (focusExerciseId && !exercises.some(e => e.id === focusExerciseId)) {
      setFocusExerciseId(undefined);
    }
  }, [exercises, focusExerciseId]);

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <LoadingSpinner />
      </View>
    );
  }

  if (pageError && !workout) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{pageError}</Text>
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <Text style={styles.backButtonText}>Back to workouts</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!workout && !isLoading && !pageError) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Workout not found or invalid ID.</Text>
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <Text style={styles.backButtonText}>Back to workouts</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!workout) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Something went wrong. Workout data is unavailable.</Text>
      </View>
    );
  }

  const handleDateTimeChange = (text: string) => {
    setWorkoutDateTime(text);
    if (workout) {
      const hasChanges = workout.datetime !== new Date(text).toISOString();
      if (hasChanges) {
        AsyncStorage.setItem(`workout_${workoutId}`, JSON.stringify({
          datetime: text,
          exercises
        }));
      }
    }
  };

  const handleExercisesChange = (updatedExercises: Exercise[]) => {
    setExercises(updatedExercises);
    if (workout) {
      const hasChanges = JSON.stringify(workout.exercises) !== JSON.stringify(updatedExercises);
      if (hasChanges) {
        AsyncStorage.setItem(`workout_${workoutId}`, JSON.stringify({
          datetime: workoutDateTime,
          exercises: updatedExercises
        }));
      }
    }
  };

  const handleAddExercise = () => {
    if (!workoutId) return;
    const tempId = `temp_${Date.now()}`;
    const newExercisePlaceholder: Exercise = {
      id: tempId,
      name: "New Exercise",
      weight: 0,
      sets: 0,
      reps: 0,
      completed: 0,
    };
    const updatedExercises = [...exercises, newExercisePlaceholder];
    setExercises(updatedExercises);
    setFocusExerciseId(tempId);

    if (workout) {
      AsyncStorage.setItem(`workout_${workoutId}`, JSON.stringify({
        datetime: workoutDateTime,
        exercises: updatedExercises
      }));
    }
  };

  const handleSaveWorkout = async () => {
    if (!workout || !workoutId) return;

    let isoDateTime;
    try {
      isoDateTime = new Date(workoutDateTime).toISOString();
    } catch (e) {
      console.error("Invalid date format for saving:", workoutDateTime, e);
      setPageError("Invalid date format. Please check the date and time.");
      return;
    }

    setIsSaving(true);
    try {
      await updateWorkout(supabase, workoutId, isoDateTime, exercises);
      await AsyncStorage.removeItem(`workout_${workoutId}`);
      queryClient.invalidateQueries({ queryKey: ['workouts'] });
      queryClient.invalidateQueries({ queryKey: ['workout', workoutId] });
      setPageError(null);
      onClose();
    } catch (err) {
      console.error("Error saving workout:", err);
      const message = err instanceof Error ? err.message : 'Unknown error during save';
      setPageError(`Error saving workout: ${message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteWorkout = async () => {
    if (!workout) return;
    
    const performDelete = async () => {
      setIsDeleting(true);
      try {
        await deleteWorkout(supabase, workout.id);
        await AsyncStorage.removeItem(`workout_${workoutId}`);
        queryClient.invalidateQueries({ queryKey: ['workouts'] });
        queryClient.invalidateQueries({ queryKey: ['workout', workout.id] });
        onClose();
      } catch (err) {
        console.error("Error deleting workout:", err);
        const message = err instanceof Error ? err.message : 'Unknown error during delete';
        setPageError(`Error deleting workout: ${message}`);
      } finally {
        setIsDeleting(false);
      }
    };

    if (confirmDelete) {
      confirmDelete(performDelete);
    } else {
      Alert.alert(
        'Delete Workout',
        'Are you sure you want to delete this workout?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: performDelete,
          },
        ]
      );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.headerButton}>
          <Text style={styles.headerButtonText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerRight}>
          <View style={styles.unitToggle}>
            <TouchableOpacity 
              onPress={() => {
                setWeightUnit('lb');
                AsyncStorage.setItem('weight_unit', 'lb');
              }}
              style={[styles.unitOption, weightUnit === 'lb' && styles.unitOptionSelected]}
            >
              <Text style={[styles.unitOptionText, weightUnit === 'lb' && styles.unitOptionTextSelected]}>lb</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => {
                setWeightUnit('kg');
                AsyncStorage.setItem('weight_unit', 'kg');
              }}
              style={[styles.unitOption, weightUnit === 'kg' && styles.unitOptionSelected]}
            >
              <Text style={[styles.unitOptionText, weightUnit === 'kg' && styles.unitOptionTextSelected]}>kg</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.separator} />
          <View style={styles.restTimerContainer}>
            <Text style={styles.restTimerLabel}>Rest Timer</Text>
            <TextInput
              style={[
                styles.restTimerInput,
                restInputFocused && styles.restTimerInputFocused
              ]}
              value={restInput}
              onChangeText={handleRestInputChange}
              onBlur={() => {
                handleRestInputBlur();
                setRestInputFocused(false);
              }}
              onFocus={() => {
                const len = restInput.length;
                setRestInputSelection({ start: len, end: len });
                setRestInputFocused(true);
              }}
              selection={restInputSelection}
              keyboardType="numeric"
            />
          </View>
        </View>
      </View>

      {pageError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{pageError}</Text>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        ref={scrollViewRef}
      >
        <View style={styles.form}>
          <View style={styles.dateTimeContainer}>
            <Text style={styles.dateTimeLabel}>Workout Date & Time</Text>
            <Text style={styles.dateTimeDisplay}>
              {workoutDateTime ? format(parseISO(workoutDateTime), 'EEEE, MMMM d, yyyy \'at\' h:mm a') : 'Not set'}
            </Text>
          </View>

          <View style={styles.exercisesSection}>
            {workoutId && (
              <ExerciseList
                exercises={exercises}
                onExercisesChange={handleExercisesChange}
                focusExerciseId={focusExerciseId}
                onFocusRequest={setFocusExerciseId}
                restDurationSeconds={restMinutes * 60}
                weightUnit={weightUnit}
                onRequestScrollToEnd={() => {
                  scrollViewRef.current?.scrollToEnd({ animated: true });
                }}
              />
            )}
            
            <TouchableOpacity
              onPress={handleAddExercise}
              style={styles.addButton}
            >
              <Text style={styles.addButtonText}>+ Add Exercise</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              onPress={handleDeleteWorkout}
              style={[
                styles.button, 
                styles.deleteButton,
                (isSaving || isDeleting) && styles.deleteButtonDisabled
              ]}
              disabled={isSaving || isDeleting}
            >
              {isDeleting ? (
                <LoadingSpinner size="small" />
              ) : (
                <Text style={styles.deleteButtonText}>Delete Workout</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSaveWorkout}
              style={[
                styles.button, 
                styles.saveButton,
                (isSaving || isDeleting) && styles.saveButtonDisabled
              ]}
              disabled={isSaving || isDeleting}
            >
              {isSaving ? (
                <LoadingSpinner size="small" />
              ) : (
                <Text style={styles.saveButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e293b',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1e293b',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: '#1e293b',
  },
  headerButton: {
    padding: 8,
  },
  headerButtonText: {
    color: '#3b82f6',
    fontSize: 16,
    fontWeight: '600',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  unitToggle: {
    flexDirection: 'row',
    backgroundColor: '#374151',
    borderRadius: 6,
    padding: 2,
    gap: 2,
  },
  separator: {
    width: 1,
    height: 24,
    backgroundColor: '#4b5563',
    alignSelf: 'center',
  },
  unitOption: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 4,
  },
  unitOptionSelected: {
    backgroundColor: '#3b82f6',
  },
  unitOptionText: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'lowercase',
  },
  unitOptionTextSelected: {
    color: '#ffffff',
  },
  restTimerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  restTimerLabel: {
    color: '#d1d5db',
    fontSize: 14,
  },
  restTimerInput: {
    width: 15,
    padding: 2,
    borderWidth: 0,
    borderRadius: 6,
    backgroundColor: 'transparent',
    color: '#f3f4f6',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'right',
  },
  restTimerInputFocused: {
    backgroundColor: '#374151',
    borderWidth: 2,
    borderColor: '#3b82f6',
  },
  errorContainer: {
    padding: 24,
    alignItems: 'center',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  backButton: {
    padding: 12,
    backgroundColor: '#3b82f6',
    borderRadius: 8,
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorBanner: {
    backgroundColor: '#fee2e2',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  errorBannerText: {
    color: '#dc2626',
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 60,
  },
  form: {
    gap: 16,
  },
  dateTimeContainer: {
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  dateTimeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dateTimeDisplay: {
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '500',
  },
  exercisesSection: {
    gap: 12,
  },
  addButton: {
    backgroundColor: '#10b981',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteButton: {
    borderWidth: 1,
    borderColor: '#ef4444',
    backgroundColor: 'transparent',
  },
  deleteButtonText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButtonDisabled: {
    opacity: 0.5,
  },
  saveButton: {
    backgroundColor: '#3b82f6',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

