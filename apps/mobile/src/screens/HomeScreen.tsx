import { Modal, Pressable, StyleSheet, Text, View, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useState, useMemo, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { Header } from '../components/Header';
import { ProfileScreen } from './ProfileScreen';
import { WorkoutEditScreen } from './WorkoutEditScreen';
import { StatsScreen } from './StatsScreen';
import { Calendar } from '../components/calendar/Calendar';
import { createWorkout } from '@ridesofjulian/shared';
import { supabase } from '../config/supabase';

export type DateRange = {
  start: string;
  end: string;
  label: string;
};

export function HomeScreen() {
  const [showProfile, setShowProfile] = useState(false);
  const [editingWorkoutId, setEditingWorkoutId] = useState<string | null>(null);
  const [isCreatingWorkout, setIsCreatingWorkout] = useState(false);
  const [activeTab, setActiveTab] = useState<'calendar' | 'stats'>('calendar');
  const [selectedRange, setSelectedRange] = useState('3months');
  const [isLoadingDateRange, setIsLoadingDateRange] = useState(false);
  const [showDateRangePicker, setShowDateRangePicker] = useState(false);
  const queryClient = useQueryClient();

  const dateRangeOptions = useMemo(() => {
    const now = dayjs();
    const options = [
      { value: '3months', label: '3 Months', start: now.subtract(3, 'month').format('YYYY-MM-DD'), end: now.format('YYYY-MM-DD') },
      { value: '6months', label: '6 Months', start: now.subtract(6, 'month').format('YYYY-MM-DD'), end: now.format('YYYY-MM-DD') },
      { value: '12months', label: '12 Months', start: now.subtract(12, 'month').format('YYYY-MM-DD'), end: now.format('YYYY-MM-DD') },
    ];
    
    const currentYear = now.year();
    for (let year = currentYear; year >= 2009; year--) {
      options.push({
        value: `year-${year}`,
        label: year.toString(),
        start: `${year}-01-01`,
        end: `${year}-12-31`,
      });
    }
    
    return options;
  }, []);

  const currentDateRange = useMemo(() => 
    dateRangeOptions.find(opt => opt.value === selectedRange) || dateRangeOptions[2],
    [selectedRange, dateRangeOptions]
  );

  useEffect(() => {
    setIsLoadingDateRange(true);
    const timer = setTimeout(() => {
      setIsLoadingDateRange(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [selectedRange]);

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

      <Pressable 
        style={styles.pickerContainer}
        onPress={() => setShowDateRangePicker(true)}
      >
        <Text style={styles.pickerLabel}>Date Range:</Text>
        <Text style={styles.pickerSelectedValue}>{currentDateRange.label}</Text>
        <Text style={styles.chevron}>›</Text>
      </Pressable>

      {activeTab === 'calendar' ? (
        <Calendar 
          dateRange={currentDateRange}
          isLoadingDateRange={isLoadingDateRange}
          onWorkoutPress={(workoutId) => setEditingWorkoutId(workoutId)} 
        />
      ) : (
        <StatsScreen dateRange={currentDateRange} />
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

      <Modal
        visible={showDateRangePicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDateRangePicker(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setShowDateRangePicker(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Date Range</Text>
              <Pressable onPress={() => setShowDateRangePicker(false)}>
                <Text style={styles.modalClose}>Done</Text>
              </Pressable>
            </View>
            <ScrollView style={styles.optionsList}>
              {dateRangeOptions.map(opt => (
                <Pressable
                  key={opt.value}
                  style={[
                    styles.optionItem,
                    selectedRange === opt.value && styles.optionItemSelected
                  ]}
                  onPress={() => {
                    setSelectedRange(opt.value);
                    setShowDateRangePicker(false);
                  }}
                >
                  <Text style={[
                    styles.optionText,
                    selectedRange === opt.value && styles.optionTextSelected
                  ]}>
                    {opt.label}
                  </Text>
                  {selectedRange === opt.value && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
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
  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#020617',
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#1f2937',
  },
  pickerLabel: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '600',
  },
  pickerSelectedValue: {
    flex: 1,
    color: '#f9fafb',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  chevron: {
    color: '#9ca3af',
    fontSize: 24,
    fontWeight: '300',
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
    minHeight: '60%',
    maxHeight: '80%',
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#334155',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f9fafb',
  },
  modalClose: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3b82f6',
  },
  optionsList: {
    flex: 1,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#334155',
  },
  optionItemSelected: {
    backgroundColor: '#1e3a5f',
  },
  optionText: {
    fontSize: 16,
    color: '#f9fafb',
  },
  optionTextSelected: {
    fontWeight: '600',
    color: '#3b82f6',
  },
  checkmark: {
    fontSize: 18,
    fontWeight: '600',
    color: '#3b82f6',
  },
});

