import { useEffect, useMemo, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, TouchableOpacity, Text, ScrollView, Animated, Alert } from 'react-native';
import { Linking } from 'react-native';
import dayjs from 'dayjs';
import type { StravaActivity } from '@ridesofjulian/shared/utils/StravaUtil';
import { formatDistance, formatElevation, formatDuration } from '../utils/formatUtil';
import { useStravaActivity } from '../hooks/useStravaActivity';
import { useStravaActivitiesForDateRange } from '@ridesofjulian/shared';
import { getAthleteActivities, ensureValidStravaToken } from '@ridesofjulian/shared/utils/StravaUtil/mobile';
import { useUser } from '../hooks/useUser';
import { useSchedule } from '../hooks/useSchedule';
import { TRAINING_PLAN_API_BASE_URL } from '../config/api';
import { supabase } from '../config/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface RideAnalysisScreenProps {
  activity: StravaActivity;
  onClose: () => void;
}

const renderMarkdown = (markdown: string) => {
  const lines = markdown.split('\n');
  return lines.map((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) {
      return <Text key={idx} style={styles.analysisText}>{'\u00A0'}</Text>;
    }

    let content = trimmed;
    let isBullet = false;
    if (content.startsWith('- ')) {
      isBullet = true;
      content = content.slice(2);
    }

    const parts = content.split('**');
    return (
      <Text key={idx} style={styles.analysisText}>
        {isBullet && '• '}
        {parts.map((part, i) => (
          <Text
            key={i}
            style={i % 2 === 1 ? styles.analysisBold : undefined}
          >
            {part}
          </Text>
        ))}
      </Text>
    );
  });
};

export function RideAnalysisScreen({ activity }: RideAnalysisScreenProps) {
  const { data: detailed, isLoading } = useStravaActivity(activity.id);
  const laps = detailed?.laps || [];

  const rideDate = useMemo(
    () => (activity.start_date ? dayjs(activity.start_date) : null),
    [activity.start_date]
  );

  const historyStart = useMemo(
    () =>
      (rideDate || dayjs()).subtract(1, 'month').format('YYYY-MM-DD'),
    [rideDate]
  );
  const historyEnd = useMemo(
    () => (rideDate || dayjs()).format('YYYY-MM-DD'),
    [rideDate]
  );

  const { activities, isLoading: historyLoading } =
    useStravaActivitiesForDateRange(historyStart, historyEnd, ensureValidStravaToken, getAthleteActivities);
  const rideHistory = activities;

  const { data: user } = useUser();
  const { data: scheduleRows = [] } = useSchedule(user?.id);

  const trainingPlan = useMemo(() => {
    if (!scheduleRows.length) return null;
    const dates = scheduleRows.map((r) => r.date).sort();
    return {
      startDate: dates[0],
      endDate: dates[dates.length - 1],
      schedule: scheduleRows,
    };
  }, [scheduleRows]);

  const workoutPlan = useMemo(() => {
    if (!rideDate) return null;
    const targetDate = rideDate.format('YYYY-MM-DD');
    for (const row of scheduleRows) {
      const match = row.plan?.find((w) => w.selectedDate === targetDate);
      if (match) return match;
    }
    return null;
  }, [scheduleRows, rideDate]);

  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [hasAnalysisRow, setHasAnalysisRow] = useState(false);
  const [isQueued, setIsQueued] = useState(false);
  const [isCheckingAnalysis, setIsCheckingAnalysis] = useState(true);
  const loadingOpacity = useRef(new Animated.Value(1)).current;

  const toKmh = (mps?: number) =>
    mps == null ? undefined : mps * 3.6;

  useEffect(() => {
    const loadExistingAnalysis = async () => {
      if (!user?.id) {
        setIsCheckingAnalysis(false);
        return;
      }
      setIsCheckingAnalysis(true);
      try {
        const { data, error } = await supabase
          .from('ride_analysis')
          .select('analysis')
          .eq('user_id', user.id)
          .eq('strava_id', activity.id)
          .single<{ analysis: string | null }>();

        if (error) {
          if ((error as any).code === 'PGRST116') {
            setHasAnalysisRow(false);
            setIsQueued(false);
          } else {
            console.error('Error loading ride_analysis:', error);
          }
          return;
        }

        setHasAnalysisRow(true);
        if (data.analysis) {
          setAnalysis(data.analysis);
          setIsQueued(false);
        } else {
          setIsQueued(true);
        }
      } catch (e) {
        console.error('Error loading ride_analysis:', e);
      } finally {
        setIsCheckingAnalysis(false);
      }
    };

    loadExistingAnalysis();
  }, [user?.id, activity.id]);

  useEffect(() => {
    if (!isQueued || analysis) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(loadingOpacity, {
          toValue: 0.2,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(loadingOpacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => {
      loop.stop();
      loadingOpacity.setValue(1);
    };
  }, [isQueued, analysis, loadingOpacity]);

  const handleViewOnStrava = async () => {
    const appUrl = `strava://activities/${activity.id}`;
    const webUrl = `https://strava.com/activities/${activity.id}`;

    try {
      const canOpen = await Linking.canOpenURL(appUrl);
      if (canOpen) {
        await Linking.openURL(appUrl);
      } else {
        await Linking.openURL(webUrl);
      }
    } catch {
      await Linking.openURL(webUrl);
    }
  };

  const handleAnalyzeRide = async () => {
    if (!detailed || !user?.id) return;
    if (analysis || isQueued) return;
    
    const openaiApiKey = await AsyncStorage.getItem('openai_api_key');
    if (!openaiApiKey) {
      Alert.alert('Missing API Key', 'Please set your OpenAI API key in Profile settings.');
      return;
    }
    
    setIsAnalyzing(true);
    setAnalysisError(null);
    try {
      setIsQueued(true);

      const slimLaps =
        (detailed.laps || []).map((lap, index) => ({
          lap_index: (lap as any).lap_index ?? index + 1,
          elapsed_time: lap.elapsed_time,
          moving_time: (lap as any).moving_time,
          distance: (lap as any).distance,
          average_speed: toKmh((lap as any).average_speed),
          total_elevation_gain: (lap as any).total_elevation_gain,
          average_cadence: lap.average_cadence,
          average_watts: lap.average_watts,
          average_heartrate: lap.average_heartrate,
          max_heartrate: (lap as any).max_heartrate,
        })) || [];

      const slimRideHistory = rideHistory.map((a) => ({
        distance: a.distance,
        moving_time: a.moving_time,
        elapsed_time: (a as any).elapsed_time,
        total_elevation_gain: a.total_elevation_gain,
        average_speed: toKmh((a as any).average_speed),
        average_heartrate: a.average_heartrate,
        average_watts: a.average_watts,
        average_cadence: (a as any).average_cadence,
        average_temp: (a as any).average_temp,
        laps:
          (a as any).laps &&
          (a as any).laps.map((lap: any, index: number) => ({
            lap_index: lap.lap_index ?? index + 1,
            elapsed_time: lap.elapsed_time,
            moving_time: lap.moving_time,
            distance: lap.distance,
            average_speed: toKmh(lap.average_speed),
            total_elevation_gain: lap.total_elevation_gain,
            average_cadence: lap.average_cadence,
            average_watts: lap.average_watts,
            average_heartrate: lap.average_heartrate,
            max_heartrate: lap.max_heartrate,
          })),
      }));

      const slimActivity = {
        distance: detailed.distance,
        moving_time: detailed.moving_time,
        elapsed_time: (detailed as any).elapsed_time,
        total_elevation_gain: detailed.total_elevation_gain,
        average_speed: toKmh((detailed as any).average_speed),
        average_heartrate: detailed.average_heartrate,
        average_watts: detailed.average_watts,
        average_cadence: (detailed as any).average_cadence,
        average_temp: (detailed as any).average_temp,
        laps: slimLaps,
      };

      const body: any = {
        ride_history: slimRideHistory,
        training_plan: trainingPlan,
        current_activity: slimActivity,
        user_id: user.id,
        strava_id: activity.id,
        openaiApiKey,
      };
      if (workoutPlan) {
        body.workout_plan = workoutPlan;
      }

      const response = await fetch(
        `${TRAINING_PLAN_API_BASE_URL}/api/analyze-ride`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) {
        setAnalysisError('Failed to analyze ride');
        setIsQueued(false);
        return;
      }

      const json = await response.json();
      if (json.analysis) {
        setAnalysis(json.analysis);
        setIsQueued(false);
      }
    } catch (e) {
      setAnalysisError('Failed to analyze ride');
      setIsQueued(false);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.modalHandle} />
      <View style={styles.header}>
        <View style={styles.headerTextContainer}>
          <Text numberOfLines={2} style={styles.title}>
            {activity.name}
          </Text>
          <Text style={styles.subtitle}>
            {formatDistance(activity.distance)} ·{' '}
            {formatElevation(activity.total_elevation_gain)} ·{' '}
            {formatDuration(Math.round(activity.moving_time / 60))}
          </Text>
        </View>
        <TouchableOpacity style={styles.stravaButton} onPress={handleViewOnStrava}>
          <Text style={styles.stravaButtonText}>View on Strava</Text>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {isLoading && <Text style={styles.loadingText}>Loading intervals...</Text>}
        {!isLoading && laps.length === 0 && (
          <Text style={styles.loadingText}>No interval data.</Text>
        )}
        {!isLoading && laps.length > 0 && (
            <View style={styles.table}>
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.tableHeaderCell, styles.cellCount, styles.headerCountCell]}></Text>
              <Text style={[styles.tableHeaderCell, styles.cellDuration]}>Duration</Text>
              <Text style={styles.tableHeaderCell}>Avg Power</Text>
              <Text style={styles.tableHeaderCell}>Avg HR</Text>
              <Text style={styles.tableHeaderCell}>Avg Cadence</Text>
            </View>
            {laps.map((lap, index) => (
              <View key={lap.id || index} style={styles.tableRow}>
                <Text style={[styles.tableCell, styles.cellCount, styles.headerCountCell]}>{index + 1}</Text>
                <Text style={[styles.tableCell, styles.cellDuration]}>
                  {formatDuration(Math.round(lap.elapsed_time / 60))}
                </Text>
                <Text style={styles.tableCell}>
                  {lap.average_watts != null ? Math.round(lap.average_watts) : '-'}
                </Text>
                <Text style={styles.tableCell}>
                  {lap.average_heartrate != null ? Math.round(lap.average_heartrate) : '-'}
                </Text>
                <Text style={styles.tableCell}>
                  {lap.average_cadence != null ? Math.round(lap.average_cadence) : '-'}
                </Text>
              </View>
            ))}
          </View>
        )}
        <View style={styles.analysisSection}>
          {!isQueued && !analysis && (
            <TouchableOpacity
              style={[
                styles.analyzeButton,
                (isCheckingAnalysis || isLoading || historyLoading || !detailed || isAnalyzing) &&
                  styles.disabledButton,
              ]}
              disabled={isCheckingAnalysis || isLoading || historyLoading || !detailed || isAnalyzing}
              onPress={handleAnalyzeRide}
            >
              <Text style={styles.analyzeButtonText}>
                {isAnalyzing ? 'Analyzing...' : 'Analyze Ride'}
              </Text>
            </TouchableOpacity>
          )}
          {analysisError && (
            <Text style={styles.errorText}>{analysisError}</Text>
          )}
          {isQueued && !analysis && !analysisError && (
            <Animated.Text
              style={[
                styles.loadingAnalysisText,
                { opacity: loadingOpacity },
              ]}
            >
              ride analysis loading...
            </Animated.Text>
          )}
          {analysis && (
            <View style={styles.analysisCard}>
              {renderMarkdown(analysis)}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e293b',
    paddingTop: 8,
  },
  modalHandle: {
    width: 36,
    height: 5,
    backgroundColor: '#4b5563',
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  header: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 8,
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f9fafb',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#9ca3af',
  },
  stravaButton: {
    backgroundColor: '#fc4c02',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  stravaButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  analysisSection: {
    marginTop: 16,
    gap: 8,
  },
  loadingText: {
    color: '#e5e7eb',
    fontSize: 14,
  },
  analyzeButton: {
    alignSelf: 'center',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  analyzeButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
  analysisCard: {
    padding: 12,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#1f2937',
    backgroundColor: '#020617',
  },
  analysisText: {
    color: '#e5e7eb',
    fontSize: 13,
    lineHeight: 18,
  },
  analysisBold: {
    fontWeight: '700',
  },
  errorText: {
    color: '#f97316',
    fontSize: 12,
    textAlign: 'center',
  },
  loadingAnalysisText: {
    marginTop: 8,
    textAlign: 'center',
    color: '#e5e7eb',
    fontSize: 13,
  },
  table: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#020617',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  tableHeaderCell: {
    flex: 1,
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'right',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#1f2937',
  },
  tableCell: {
    flex: 1,
    color: '#e5e7eb',
    fontSize: 12,
    textAlign: 'right',
  },
  headerCountCell: {
    textAlign: 'left',
  },
  cellCount: {
    flex: 0.1,
  },
  cellDuration: {
    flex: 1.3,
  },
});


