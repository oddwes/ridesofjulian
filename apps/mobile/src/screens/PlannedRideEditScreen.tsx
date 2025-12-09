import { useMemo, useState } from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../config/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Interval, RideWorkout, ScheduledRideWorkout } from '../components/calendar/Calendar';
import { DatePickerModal } from '../components/DatePickerModal';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { formatDuration } from '../utils/formatUtil';
import { connectWahoo, createWahooWorkout, deleteWahooWorkout, ensureValidWahooToken } from '../utils/WahooUtil';
import { deleteWorkoutFromSchedule } from '@ridesofjulian/shared';

interface PlannedRideEditScreenProps {
  workout: ScheduledRideWorkout;
  onClose: () => void;
}

type PlanRow = {
  id: number;
  plan: RideWorkout[];
};

export function PlannedRideEditScreen({ workout, onClose }: PlannedRideEditScreenProps) {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  const [workoutTitle, setWorkoutTitle] = useState(workout.workoutTitle);
  const [selectedDate, setSelectedDate] = useState(workout.selectedDate);
  const [intervals, setIntervals] = useState<Interval[]>(workout.intervals || []);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isPushingToWahoo, setIsPushingToWahoo] = useState(false);
  const [wahooId, setWahooId] = useState<number | null>(workout.wahooId ?? null);

  const totalDurationMinutes = useMemo(
    () => intervals.reduce((sum, interval) => sum + interval.duration / 60, 0),
    [intervals]
  );

  const maxPower = useMemo(
    () =>
      intervals.length > 0
        ? Math.max(300, ...intervals.map((i) => i.powerMax || 0))
        : 0,
    [intervals]
  );

  const getIntervalColor = (powerMin: number, powerMax: number) => {
    const avgPower = (powerMin + powerMax) / 2;
    if (avgPower < 100) return 'rgba(156, 163, 175, 0.8)';
    if (avgPower < 150) return 'rgba(96, 165, 250, 0.8)';
    if (avgPower < 200) return 'rgba(52, 211, 153, 0.8)';
    if (avgPower < 250) return 'rgba(251, 191, 36, 0.8)';
    if (avgPower < 300) return 'rgba(251, 146, 60, 0.8)';
    return 'rgba(220, 38, 38, 0.85)';
  };

  const updateSchedule = async (updater: (plan: RideWorkout[]) => RideWorkout[]) => {
    if (!session?.user?.id) return;

    const { data, error } = await supabase
      .from('schedule')
      .select('id, plan')
      .eq('user_id', session.user.id)
      .eq('type', 'cycling')
      .eq('date', workout.scheduleRowDate)
      .single<PlanRow>();

    if (error || !data) {
      console.error('Failed to load schedule row', error);
      return;
    }

    const currentPlan = data.plan || [];
    const nextPlan = updater(currentPlan);

    const { error: updateError } = await supabase
      .from('schedule')
      .update({ plan: nextPlan })
      .eq('id', data.id);

    if (updateError) {
      console.error('Failed to update schedule row', updateError);
      return;
    }

    queryClient.invalidateQueries({ queryKey: ['schedule', session.user.id] });
  };

  const addInterval = () => {
    const newInterval: Interval = {
      id: Date.now().toString(),
      name: '',
      duration: 300,
      powerMin: 100,
      powerMax: 150,
    };
    setIntervals([...intervals, newInterval]);
  };

  const updateInterval = (id: string, field: keyof Interval, value: string | number) => {
    setIntervals((prev) =>
      prev.map((interval) =>
        interval.id === id ? { ...interval, [field]: value } : interval
      )
    );
  };

  const deleteInterval = (id: string) => {
    setIntervals((prev) => prev.filter((interval) => interval.id !== id));
  };

  const duplicateInterval = (id: string) => {
    const index = intervals.findIndex((interval) => interval.id === id);
    if (index === -1) return;

    const intervalToDupe = intervals[index];
    const newInterval: Interval = { ...intervalToDupe, id: Date.now().toString() };
    const next = [...intervals];
    next.splice(index + 1, 0, newInterval);
    setIntervals(next);
  };

  const handleSave = async () => {
    if (!session?.user?.id) return;
    setIsSaving(true);
    try {
      await updateSchedule((plan) =>
        plan.map((w) =>
          w.id === workout.id
            ? { ...w, workoutTitle, selectedDate, intervals }
            : w
        )
      );
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!session?.user?.id) return;
    setIsDeleting(true);
    try {
      await deleteWorkoutFromSchedule(supabase, session.user.id, workout.id, workout.scheduleRowDate);
      queryClient.invalidateQueries({ queryKey: ['schedule', session.user.id] });
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  const handleWahooPress = async () => {
    if (!session?.user?.id) return;
    if (isSaving || isDeleting || isPushingToWahoo) return;

    setIsPushingToWahoo(true);
    try {
      if (wahooId) {
        await deleteWahooWorkout(wahooId);
        await updateSchedule((plan) =>
          plan.map((w) =>
            w.id === workout.id ? { ...w, wahooId: undefined } : w
          )
        );
        setWahooId(null);
        return;
      }

      if (!intervals.length) return;

      const token = await ensureValidWahooToken();
      let hasToken = !!token;

      if (!hasToken) {
        const ok = await connectWahoo();
        if (!ok) {
          return;
        }
        hasToken = true;
      }

      if (!hasToken) return;

      const result = await createWahooWorkout({
        id: workout.id,
        workoutTitle,
        selectedDate,
        intervals,
      });

      await updateSchedule((plan) =>
        plan.map((w) =>
          w.id === workout.id ? { ...w, wahooId: result.workoutId } : w
        )
      );
      setWahooId(result.workoutId);
    } catch (error) {
      console.error('Failed to sync workout with Wahoo:', error);
    } finally {
      setIsPushingToWahoo(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.modalHandle} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={true}
      >
          <View style={styles.header}>
            {/* <View style={styles.headerMain}> */}
              <TextInput
                value={workoutTitle}
                onChangeText={setWorkoutTitle}
                style={styles.headerTitle}
                placeholder="Workout title"
                placeholderTextColor="#9ca3af"
                editable={!isSaving && !isDeleting}
              />
              <View style={styles.headerSubtitleContainer}>
                <TouchableOpacity
                  onPress={() => !isSaving && !isDeleting && setShowDatePicker(true)}
                  disabled={isSaving || isDeleting}
                  style={isSaving || isDeleting ? styles.disabledOpacity : undefined}
                >
                  <Text style={styles.headerSubtitle}>
                    {dayjs(selectedDate).format('dddd, MMMM D, YYYY')}
                  </Text>
                </TouchableOpacity>
                <Text style={styles.headerSubtitle}>
                  {formatDuration(Math.round(totalDurationMinutes))}
                </Text>
              </View>
            {/* </View> */}
          </View>
          <View style={styles.pushWorkoutContainer}>
            <TouchableOpacity
              style={[
                styles.pushWahooButton,
                wahooId ? styles.pushWahooButtonRemove : styles.pushWahooButtonPush,
                (isSaving || isDeleting || isPushingToWahoo || (!intervals.length && !wahooId)) &&
                  styles.disabledOpacity,
              ]}
              onPress={handleWahooPress}
              disabled={isSaving || isDeleting || isPushingToWahoo || (!intervals.length && !wahooId)}
            >
              <Text style={styles.pushWahooText}>
                {isPushingToWahoo
                  ? 'Working...'
                  : wahooId
                  ? 'Remove from Wahoo'
                  : 'Push to Wahoo'}
              </Text>
            </TouchableOpacity>
          </View>

          {intervals.length > 0 && maxPower > 0 && (
            <View style={styles.chartCard}>
              <View style={styles.chartRow}>
                {intervals.map((interval) => {
                  if (!interval.duration) return null;
                  const barHeight = (interval.powerMax / maxPower) * 160 || 4;
                  return (
                    <View
                      key={interval.id}
                      style={[styles.chartSegment, { flex: interval.duration }]}
                    >
                      <View
                        style={[
                          styles.chartBar,
                          {
                            height: Math.max(barHeight, 4),
                            backgroundColor: getIntervalColor(
                              interval.powerMin,
                              interval.powerMax
                            ),
                          },
                        ]}
                      />
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {intervals.map((interval) => (
            <View key={interval.id} style={styles.intervalCard}>
              <View style={styles.intervalField}>
                <Text style={styles.intervalLabel}>Name</Text>
                <TextInput
                  value={interval.name}
                  onChangeText={(text) => updateInterval(interval.id, 'name', text)}
                  style={styles.intervalInput}
                  placeholder="Interval name"
                  placeholderTextColor="#9ca3af"
                editable={!isSaving && !isDeleting}
                />
              </View>

              <View style={styles.intervalFieldSmall}>
                <Text style={styles.intervalLabel}>Duration</Text>
                <TextInput
                  value={String(interval.duration / 60)}
                  keyboardType="numeric"
                  onChangeText={(text) => {
                    const val = text.replace(/[^0-9]/g, '');
                    updateInterval(
                      interval.id,
                      'duration',
                      val ? parseInt(val, 10) * 60 : 0
                    );
                  }}
                  style={styles.intervalInput}
                editable={!isSaving && !isDeleting}
                />
              </View>

              <View style={styles.intervalPowerField}>
                <Text style={styles.intervalLabel}>Power Range (W)</Text>
                <View style={styles.powerRow}>
                  <TextInput
                    value={String(interval.powerMin)}
                    keyboardType="numeric"
                    onChangeText={(text) => {
                      const val = text.replace(/[^0-9]/g, '');
                      updateInterval(
                        interval.id,
                        'powerMin',
                        val ? parseInt(val, 10) : 0
                      );
                    }}
                    style={styles.powerInput}
                    editable={!isSaving && !isDeleting}
                  />
                  <Text style={styles.powerDash}>-</Text>
                  <TextInput
                    value={String(interval.powerMax)}
                    keyboardType="numeric"
                    onChangeText={(text) => {
                      const val = text.replace(/[^0-9]/g, '');
                      updateInterval(
                        interval.id,
                        'powerMax',
                        val ? parseInt(val, 10) : 0
                      );
                    }}
                    style={styles.powerInput}
                editable={!isSaving && !isDeleting}
                  />
                </View>
              </View>

                
              <TouchableOpacity
                onPress={() => duplicateInterval(interval.id)}
                style={[
                  styles.iconButton,
                  (isSaving || isDeleting) && styles.disabledOpacity,
                ]}
                disabled={isSaving || isDeleting}
              >
                <Feather name="copy" size={20} color="#2563eb" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => deleteInterval(interval.id)}
                style={[
                  styles.iconButton,
                  (isSaving || isDeleting) && styles.disabledOpacity,
                ]}
                disabled={isSaving || isDeleting}
              >
                <Feather name="trash-2" size={20} color="#ef4444" />
              </TouchableOpacity>
            </View>
          ))}

          <TouchableOpacity
            style={[
              styles.addButton,
              (isSaving || isDeleting) && styles.disabledOpacity,
            ]}
            onPress={addInterval}
            disabled={isSaving || isDeleting}
          >
            <Text style={styles.addButtonText}>Add Interval</Text>
          </TouchableOpacity>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.deleteButton,
                (isDeleting || isSaving) && styles.disabledOpacity,
              ]}
              onPress={handleDelete}
              disabled={isDeleting || isSaving}
              >
              <Text style={styles.deleteButtonText}>
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Text>
            </TouchableOpacity>
            <View style={styles.footerButtons}>
              <TouchableOpacity
                style={[
                  styles.footerCancel,
                  (isSaving || isDeleting) && styles.disabledOpacity,
                ]}
                onPress={onClose}
                disabled={isSaving || isDeleting}
              >
                <Text style={styles.footerCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.footerSave,
                  (isSaving || isDeleting) && styles.disabledOpacity,
                ]}
                onPress={handleSave}
                disabled={isSaving || isDeleting}
              >
                {isSaving ? (
                  <View style={styles.saveContent}>
                    <LoadingSpinner size="small" />
                    <Text style={styles.footerSaveText}>Saving...</Text>
                  </View>
                ) : (
                  <Text style={styles.footerSaveText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
      </ScrollView>
      <DatePickerModal
        visible={showDatePicker}
        date={dayjs(selectedDate || dayjs().format('YYYY-MM-DD')).toDate()}
        onChange={(date) => {
          setSelectedDate(dayjs(date).format('YYYY-MM-DD'));
        }}
        onClose={() => setShowDatePicker(false)}
      />
    </View>
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
    marginBottom: 8,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  headerSubtitleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#ffffff',
    marginTop: 4,
  },
  pushWorkoutContainer: {
    marginBottom: 16,
  },
  pushWahooButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  pushWahooButtonPush: {
    backgroundColor: '#2563eb',
  },
  pushWahooButtonRemove: {
    backgroundColor: '#ef4444',
  },
  pushWahooText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  durationText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  deleteButton: {
    backgroundColor: '#ef4444',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  deleteButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  chartCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  chartRow: {
    height: 180,
    flexDirection: 'row',
    alignItems: 'flex-end',
    overflow: 'hidden',
  },
  chartSegment: {
    flex: 1,
    marginHorizontal: 1,
    justifyContent: 'flex-end',
  },
  chartBar: {
    width: '100%',
    borderRadius: 3,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  summaryField: {
    flex: 1,
    marginHorizontal: 4,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4b5563',
    marginBottom: 4,
    textAlign: 'center',
  },
  summaryInput: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#ffffff',
    fontSize: 14,
    color: '#111827',
  },
  durationBox: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  intervalCard: {
    color: '#ffffff',
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  intervalField: {
    flex: 1,
    marginRight: 8,
  },
  intervalFieldSmall: {
    width: 60,
    marginRight: 8,
  },
  intervalPowerField: {
    marginRight: 8,
  },
  intervalLabel: {
    fontSize: 11,
    color: '#ffffff',
    marginBottom: 2,
  },
  intervalInput: {
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 13,
    color: '#111827',
    backgroundColor: '#ffffff',
  },
  powerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  powerInput: {
    width: 45,
    borderRadius: 6,
    borderWidth: 1,
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 6,
    paddingVertical: 8,
    fontSize: 13,
    color: '#111827',
  },
  powerDash: {
    marginHorizontal: 4,
    color: '#ffffff',
  },
  iconButton: {
    paddingLeft: 6,
    paddingVertical: 6,
    marginTop: 12,
  },
  iconDeleteText: {
    fontSize: 16,
    color: '#ef4444',
  },
  addButton: {
    marginTop: 4,
    backgroundColor: '#2563eb',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 20,
    alignSelf: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    marginTop: 32,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  footerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  footerCancel: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#374151',
    backgroundColor: '#ffffff',
  },
  footerCancelText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  footerSave: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#2563eb',
  },
  disabledOpacity: {
    opacity: 0.5,
  },
  saveContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  footerSaveText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
  },
});


