import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View, Pressable, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TRAINING_PLAN_API_BASE_URL } from '../config/api';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../config/supabase';
import { DatePickerModal } from '../components/DatePickerModal';
import { SlidingLoadingIndicator } from '../components/SlidingLoadingIndicator';
import { WorkoutChart, type Interval } from '../components/WorkoutChart';
import { useSchedule } from '../hooks/useSchedule';

type RideWorkout = {
  id: number;
  workoutTitle: string;
  selectedDate: string;
  intervals: Interval[];
};

const PLAN_KEY = 'generated_training_plan';
const INPUTS_KEY = 'training_plan_inputs';
const PLAN_TITLE_KEY = 'generated_plan_title';

export function CoachScreen() {
  const { session } = useAuth();
  const { data: scheduleData } = useSchedule(session?.user?.id);
  const [userPrompt, setUserPrompt] = useState('');
  const [ftp, setFtp] = useState<number>(200);
  const [blockDuration, setBlockDuration] = useState<number>(7);
  const [weeklyHours, setWeeklyHours] = useState<number>(10);
  const [planTitle, setPlanTitle] = useState<string>('Your Training Plan');
  const formatLocalDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [startDate, setStartDate] = useState<string>(formatLocalDate(new Date()));
  const [endDate, setEndDate] = useState<string>(
    formatLocalDate(new Date(Date.now() + 6 * 24 * 60 * 60 * 1000))
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<RideWorkout[]>([]);
  const [activeDatePicker, setActiveDatePicker] = useState<'start' | 'end' | null>(null);

  useEffect(() => {
    const loadStored = async () => {
      try {
        const [planStr, inputsStr, titleStr] = await Promise.all([
          AsyncStorage.getItem(PLAN_KEY),
          AsyncStorage.getItem(INPUTS_KEY),
          AsyncStorage.getItem(PLAN_TITLE_KEY),
        ]);

        if (planStr) {
          const parsed = JSON.parse(planStr) as RideWorkout[];
          setGeneratedPlan(parsed);
        }

        if (titleStr) {
          setPlanTitle(titleStr);
        }

        if (inputsStr) {
          const inputs = JSON.parse(inputsStr) as {
            userPrompt?: string;
            ftp?: number;
            blockDuration?: number;
            weeklyHours?: number;
            startDate?: string;
            endDate?: string;
          };
          if (inputs.userPrompt) setUserPrompt(inputs.userPrompt);
          if (inputs.ftp) setFtp(inputs.ftp);
          if (inputs.blockDuration) setBlockDuration(inputs.blockDuration);
          if (inputs.weeklyHours) setWeeklyHours(inputs.weeklyHours);
          if (inputs.startDate) setStartDate(inputs.startDate);
          if (inputs.endDate) setEndDate(inputs.endDate);
        }
      } catch (e) {
        console.error('Error loading stored plan', e);
      }
    };

    loadStored();
  }, []);

  const loadFtpDefault = async () => {
    try {
      if (!session?.user?.id) {
        setFtp(200);
        return;
      }

      const { data, error } = await supabase
        .from('stats')
        .select('data')
        .eq('user_id', session.user.id)
        .single();

      if (!error && data?.data) {
        const statsData = data.data as { ftp?: Record<string, number> };

        if (statsData.ftp) {
          const ftpEntries = Object.entries(statsData.ftp)
            .map(([date, value]) => ({ date, value }))
            .sort(
              (a, b) =>
                new Date(b.date).getTime() - new Date(a.date).getTime()
            );

          if (ftpEntries.length > 0) {
            const latest = Number(ftpEntries[0].value) || 0;
            setFtp(latest > 0 ? latest : 200);
            return;
          }
        }
      }

      setFtp(200);
    } catch (e) {
      console.error('Error loading FTP', e);
      setFtp(200);
    }
  };

  useEffect(() => {
    loadFtpDefault();
  }, [session?.user?.id]);

  useEffect(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const msPerDay = 1000 * 60 * 60 * 24;
    const diffMs = end.getTime() - start.getTime();
    const days = diffMs >= 0 ? Math.floor(diffMs / msPerDay) + 1 : 1;
    setBlockDuration(days);
  }, [startDate, endDate]);

  const savePlanAndInputs = async (workouts: RideWorkout[]) => {
    try {
      await Promise.all([
        AsyncStorage.setItem(PLAN_KEY, JSON.stringify(workouts)),
        AsyncStorage.setItem(
          INPUTS_KEY,
          JSON.stringify({
            userPrompt,
            ftp,
            blockDuration,
            weeklyHours,
            startDate,
            endDate,
          })
        ),
      ]);
    } catch (e) {
      console.error('Error saving plan', e);
    }
  };

  const generatePlan = async () => {
    if (!userPrompt.trim()) {
      Alert.alert('Missing goal', 'Please enter a training goal.');
      return;
    }

    const openaiApiKey = await AsyncStorage.getItem('openai_api_key');
    if (!openaiApiKey) {
      Alert.alert('Missing API Key', 'Please set your OpenAI API key in Profile settings.');
      return;
    }

    setIsGenerating(true);
    setGeneratedPlan([]);
    setPlanTitle('Your Training Plan'); // Reset title at start of generation

    return new Promise<void>((resolve, reject) => {
      const workouts: RideWorkout[] = [];
      const url = `${TRAINING_PLAN_API_BASE_URL}/api/generate-plan`;
      let processedLength = 0;
      let buffer = '';
      let receivedPlanTitle = false;

      const xhr = new XMLHttpRequest();
      xhr.open('POST', url, true);
      xhr.setRequestHeader('Content-Type', 'application/json');

      xhr.onprogress = () => {
        const responseText = xhr.responseText;
        const newChunk = responseText.substring(processedLength);
        processedLength = responseText.length;

        buffer += newChunk;
        
        // Process complete SSE events (separated by \n\n)
        while (true) {
          const eventEnd = buffer.indexOf('\n\n');
          if (eventEnd === -1) break;
          
          const event = buffer.substring(0, eventEnd);
          buffer = buffer.substring(eventEnd + 2);
          
          const lines = event.split('\n');
          let dataContent = '';
          
          // Extract data: content from SSE event
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              dataContent = line.slice(6).trim();
              break;
            }
          }

          if (!dataContent || dataContent === '[DONE]') {
            continue;
          }

          try {
            const parsed = JSON.parse(dataContent);
            
            // Handle plan title metadata - check both formats (always check, not just if not received)
            if (parsed.type === 'planTitle' && parsed.planTitle && !receivedPlanTitle) {
              setPlanTitle(parsed.planTitle);
              AsyncStorage.setItem(PLAN_TITLE_KEY, parsed.planTitle);
              receivedPlanTitle = true;
              continue;
            } else if (parsed.planTitle && !parsed.workoutTitle && !parsed.selectedDate && !parsed.intervals && !parsed.id && !receivedPlanTitle) {
              // Fallback: if it has planTitle but no workout fields, treat as title
              setPlanTitle(parsed.planTitle);
              AsyncStorage.setItem(PLAN_TITLE_KEY, parsed.planTitle);
              receivedPlanTitle = true;
              continue;
            }
            
            // Handle workout objects (only if not a plan title)
            if (parsed.id && (parsed.workoutTitle || parsed.selectedDate || parsed.intervals)) {
              workouts.push(parsed as RideWorkout);
              setGeneratedPlan([...workouts]);
            }
          } catch (e) {
            // JSON might be incomplete, ignore for now and wait for next chunk
            // Don't log incomplete JSON errors as they're expected during streaming
          }
        }
      };

      xhr.onload = async () => {
        try {
          if (xhr.status >= 200 && xhr.status < 300) {
            // Process any remaining buffer
            if (buffer.trim()) {
              // Try to process remaining buffer as complete events
              while (true) {
                const eventEnd = buffer.indexOf('\n\n');
                if (eventEnd === -1) break;
                
                const event = buffer.substring(0, eventEnd);
                buffer = buffer.substring(eventEnd + 2);
                
                const lines = event.split('\n');
                let dataContent = '';
                
                for (const line of lines) {
                  if (line.startsWith('data: ')) {
                    dataContent = line.slice(6).trim();
                    break;
                  }
                }
                
                if (dataContent && dataContent !== '[DONE]') {
                  try {
                    const parsed = JSON.parse(dataContent);
                    
                    // Handle plan title metadata first
                    if (parsed.type === 'planTitle' && parsed.planTitle && !receivedPlanTitle) {
                      setPlanTitle(parsed.planTitle);
                      AsyncStorage.setItem(PLAN_TITLE_KEY, parsed.planTitle);
                      receivedPlanTitle = true;
                      continue;
                    } else if (parsed.planTitle && !parsed.workoutTitle && !parsed.selectedDate && !parsed.intervals && !parsed.id && !receivedPlanTitle) {
                      setPlanTitle(parsed.planTitle);
                      AsyncStorage.setItem(PLAN_TITLE_KEY, parsed.planTitle);
                      receivedPlanTitle = true;
                      continue;
                    }
                    
                    // Handle workout objects (only if not a plan title)
                    if (parsed.id && (parsed.workoutTitle || parsed.selectedDate || parsed.intervals)) {
                      workouts.push(parsed as RideWorkout);
                      setGeneratedPlan([...workouts]);
                    }
                  } catch (e) {
                    console.error('Failed to parse final data:', e);
                  }
                }
              }
              
              // Handle any remaining single event without trailing \n\n
              if (buffer.trim()) {
                const lines = buffer.split('\n');
                for (const line of lines) {
                  if (line.startsWith('data: ')) {
                    const dataContent = line.slice(6).trim();
                    if (dataContent && dataContent !== '[DONE]') {
                      try {
                        const parsed = JSON.parse(dataContent);
                        // Handle plan title metadata first
                        if (parsed.type === 'planTitle' && parsed.planTitle && !receivedPlanTitle) {
                          setPlanTitle(parsed.planTitle);
                          AsyncStorage.setItem(PLAN_TITLE_KEY, parsed.planTitle);
                          receivedPlanTitle = true;
                        } else if (parsed.planTitle && !parsed.workoutTitle && !parsed.selectedDate && !parsed.intervals && !parsed.id && !receivedPlanTitle) {
                          setPlanTitle(parsed.planTitle);
                          AsyncStorage.setItem(PLAN_TITLE_KEY, parsed.planTitle);
                          receivedPlanTitle = true;
                        }
                        // Handle workout objects (only if not a plan title)
                        if (parsed.id && (parsed.workoutTitle || parsed.selectedDate || parsed.intervals)) {
                          workouts.push(parsed as RideWorkout);
                          setGeneratedPlan([...workouts]);
                        }
                      } catch (e) {
                        console.error('Failed to parse remaining buffer:', e);
                      }
                    }
                  }
                }
              }
            }
            await savePlanAndInputs(workouts);
            resolve();
          } else {
            throw new Error(`Failed to generate plan: ${xhr.status}`);
          }
        } catch (error) {
          console.error('Error processing plan:', error);
          Alert.alert('Error', 'Failed to generate training plan.');
          reject(error);
        } finally {
          setIsGenerating(false);
        }
      };

      xhr.onerror = () => {
        console.error('Network error');
        Alert.alert('Error', 'Failed to generate training plan.');
        setIsGenerating(false);
        reject(new Error('Network error'));
      };

      xhr.send(
        JSON.stringify({
          userPrompt,
          ftp,
          weeklyHours,
          startDate,
          endDate,
          openaiApiKey,
        })
      );
    });
  };

  const clearPlan = async () => {
    await AsyncStorage.removeItem(PLAN_KEY);
    await AsyncStorage.removeItem(PLAN_TITLE_KEY);
    setGeneratedPlan([]);
    setPlanTitle('Your Training Plan');
  };

  const handleDeleteWorkout = (workout: RideWorkout) => {
    Alert.alert(
      'Delete workout',
      `Delete "${workout.workoutTitle}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updated = generatedPlan.filter((w) => w.id !== workout.id);
            setGeneratedPlan(updated);
            await AsyncStorage.setItem(PLAN_KEY, JSON.stringify(updated));
          },
        },
      ],
      { cancelable: true }
    );
  };

  const parseLocalDate = (dateString: string) => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const getISOWeekAndYear = (date: Date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const day = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - day);
    const isoYear = d.getUTCFullYear();
    const yearStart = new Date(Date.UTC(isoYear, 0, 1));
    const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    return { isoYear, week };
  };

  const groupWorkoutsByWeek = (workouts: RideWorkout[]) => {
    const weeks: { [key: string]: RideWorkout[] } = {};

    workouts.forEach((workout) => {
      const date = parseLocalDate(workout.selectedDate);
      const { isoYear, week } = getISOWeekAndYear(date);
      const weekKey = `${isoYear}-W${String(week).padStart(2, '0')}`;

      if (!weeks[weekKey]) {
        weeks[weekKey] = [];
      }
      weeks[weekKey].push(workout);
    });

    return Object.entries(weeks).sort(([a], [b]) => a.localeCompare(b));
  };

  const formatDurationMinutes = (intervals: Interval[]) =>
    intervals.reduce((sum, interval) => sum + interval.duration / 60, 0);

  const hasMatchingPlan = !!scheduleData?.some(
    (row) =>
      row.date === startDate &&
      JSON.stringify(row.plan) === JSON.stringify(generatedPlan)
  );

  const handleSavePlan = async () => {
    try {
      await savePlanAndInputs(generatedPlan);

      const { error } = await supabase.from('schedule').insert({
        date: startDate,
        plan: generatedPlan,
        type: 'cycling',
        user_id: session!.user!.id,
      });

      if (error) {
        console.error('Error saving plan to schedule', error);
        Alert.alert('Error', 'Failed to save plan to schedule.');
      } else {
        Alert.alert('Success', 'Training plan saved to your schedule.');
      }
    } catch (e) {
      console.error('Error saving plan', e);
      Alert.alert('Error', 'Failed to save training plan.');
    }
  };

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>AI Training Plan Builder</Text>
          {!isGenerating && (
            <Pressable style={styles.clearButton} onPress={clearPlan}>
              <Text style={styles.clearButtonText}>Clear</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Training Goal</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            multiline
            editable={!isGenerating}
            value={userPrompt}
            onChangeText={setUserPrompt}
            placeholder="e.g., Build base fitness with polarized training approach, focusing on endurance and high intensity intervals"
            placeholderTextColor="#6b7280"
          />

          <View style={styles.row}>
            <View style={styles.field}>
              <Text style={styles.label}>FTP</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                editable={!isGenerating}
                value={String(ftp)}
                onChangeText={(text) => {
                  const val = text.replace(/[^0-9]/g, '');
                  setFtp(val ? parseInt(val, 10) : 0);
                }}
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Weekly Hours</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                editable={!isGenerating}
                value={String(weeklyHours)}
                onChangeText={(text) => {
                  const val = text.replace(/[^0-9]/g, '');
                  setWeeklyHours(val ? parseInt(val, 10) : 0);
                }}
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.field}>
              <Text style={styles.label}>Start Date</Text>
              <Pressable
                style={styles.input}
                disabled={isGenerating}
                onPress={() => !isGenerating && setActiveDatePicker('start')}
              >
                <Text style={styles.inputText}>{startDate}</Text>
              </Pressable>
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>End Date</Text>
              <Pressable
                style={styles.input}
                disabled={isGenerating}
                onPress={() => !isGenerating && setActiveDatePicker('end')}
              >
                <Text style={styles.inputText}>{endDate}</Text>
              </Pressable>
            </View>
          </View>

          <Pressable
            style={[styles.button, isGenerating && styles.buttonDisabled]}
            onPress={generatePlan}
            disabled={isGenerating}
          >
            <Text style={styles.buttonText}>
              {isGenerating ? 'Generating Plan...' : 'Generate Training Plan'}
            </Text>
          </Pressable>
        </View>
        <SlidingLoadingIndicator isLoading={isGenerating} />

        {generatedPlan.length > 0 && (
          <View style={styles.planSection}>
            <View style={styles.planHeader}>
              <Text style={styles.planTitle} numberOfLines={2} ellipsizeMode="tail">
                {planTitle}
              </Text>
              {!hasMatchingPlan && (
                <Pressable
                  style={styles.saveButton}
                  onPress={handleSavePlan}
                  disabled={isGenerating || !generatedPlan.length}
                >
                  <Text style={styles.saveButtonText}>Save</Text>
                </Pressable>
              )}
            </View>

            {groupWorkoutsByWeek(generatedPlan).map(([weekKey, workouts]) => {
              const firstDate = parseLocalDate(workouts[0].selectedDate);
              const lastDate = parseLocalDate(
                workouts[workouts.length - 1].selectedDate
              );
              const weekTotal = workouts.reduce(
                (total, workout) =>
                  total + formatDurationMinutes(workout.intervals),
                0
              );

              return (
                <View key={weekKey} style={styles.weekBlock}>
                  <View style={styles.weekHeader}>
                    <Text style={styles.weekTitle}>
                      {weekKey}
                    </Text>
                    <Text style={styles.weekSubtitle}>
                      {firstDate.toLocaleDateString()} - {lastDate.toLocaleDateString()}
                    </Text>
                    <Text style={styles.weekSubtitle}>
                      Total: {Math.floor(weekTotal / 60)}h{' '}
                      {Math.round(weekTotal % 60)}m
                    </Text>
                  </View>

                  {workouts.map((workout) => {
                    const totalMinutes = formatDurationMinutes(
                      workout.intervals
                    );
                    const date = parseLocalDate(workout.selectedDate);

                    return (
                      <View key={workout.id} style={styles.workoutCard}>
                        <View style={styles.workoutHeader}>
                          <Text style={styles.workoutTitle}>
                            {workout.workoutTitle}
                          </Text>
                          <Pressable
                            onPress={() => handleDeleteWorkout(workout)}
                            style={styles.deleteButton}
                          >
                            <Feather name="trash-2" size={18} color="#ef4444" />
                          </Pressable>
                        </View>
                        <Text style={styles.workoutMeta}>
                          {date.toLocaleDateString()} |{' '}
                          {Math.floor(totalMinutes / 60)}h{' '}
                          {Math.round(totalMinutes % 60)}m
                        </Text>

                        <WorkoutChart intervals={workout.intervals} />
                      </View>
                    );
                  })}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      <DatePickerModal
        visible={!!activeDatePicker}
        date={parseLocalDate(activeDatePicker === 'end' ? endDate : startDate)}
        onChange={(date) => {
          if (activeDatePicker === 'end') {
            setEndDate(formatLocalDate(date));
          } else {
            setStartDate(formatLocalDate(date));
          }
        }}
        onClose={() => setActiveDatePicker(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e293b',
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f9fafb',
    marginTop: 16,
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#020617',
    borderRadius: 12,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#1f2937',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e5e7eb',
    marginBottom: 6,
  },
  input: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#374151',
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: '#f9fafb',
    fontSize: 14,
    backgroundColor: '#020617',
    marginBottom: 12,
  },
  inputText: {
    color: '#f9fafb',
    fontSize: 14,
  },
  textArea: {
    height: 70,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  field: {
    flex: 1,
  },
  button: {
    marginTop: 4,
    borderRadius: 8,
    paddingVertical: 12,
    backgroundColor: '#2563eb',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  planSection: {
    marginTop: 8,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    gap: 12,
  },
  planTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f9fafb',
    flex: 1,
    marginRight: 8,
  },
  saveButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#16a34a',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  clearButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#dc2626',
  },
  clearButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  weekBlock: {
    marginBottom: 16,
    justifyContent: 'space-between',
  },
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 6,
  },
  weekTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f9fafb',
  },
  weekSubtitle: {
    fontSize: 12,
    color: '#e5e7eb',
  },
  workoutCard: {
    backgroundColor: '#020617',
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#1f2937',
    padding: 12,
    marginBottom: 8,
  },
  workoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  workoutTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#f9fafb',
    flex: 1,
    marginRight: 8,
  },
  deleteButton: {
    paddingVertical: 4,
  },
  deleteButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fee2e2',
  },
  workoutMeta: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
    color: '#f9fafb',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomColor: '#334155',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f9fafb',
  },
  modalClose: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f9fafb',
  },
  datePickerContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    color: '#f9fafb',
  },
});
