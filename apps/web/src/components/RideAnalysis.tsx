'use client'

import { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import type { StravaActivity } from '@ridesofjulian/shared'
import { formatDistance, formatElevation } from '@/utils/FormatUtil'
import { formatDuration } from '@/utils/TimeUtil'
import { useStravaActivity } from '@/hooks/useStravaActivity'
import { useStravaActivitiesForDateRange } from '@ridesofjulian/shared'
import { stravaApiCall, ensureValidToken } from '@ridesofjulian/shared/utils/StravaUtil/web'
import { useSupabase } from '@/contexts/SupabaseContext'
import { useQuery } from '@tanstack/react-query'
import type { RideWorkout } from '@/types/workout'

interface RideAnalysisProps {
  activity: StravaActivity
}

interface ExtendedLap {
  id?: number
  lap_index?: number
  elapsed_time: number
  moving_time?: number
  distance?: number
  average_speed?: number
  total_elevation_gain?: number
  average_cadence?: number
  average_watts?: number
  average_heartrate?: number
  max_heartrate?: number
}

interface ExtendedActivity {
  elapsed_time?: number
  average_speed?: number
  average_cadence?: number
  average_temp?: number
  laps?: ExtendedLap[]
}

interface SupabaseError {
  code?: string
  message?: string
}

const renderMarkdown = (markdown: string) => {
  const lines = markdown.split('\n')
  return lines.map((line, idx) => {
    const trimmed = line.trim()
    if (!trimmed) {
      return <p key={idx} className="text-gray-200 text-sm leading-relaxed">&nbsp;</p>
    }

    let content = trimmed
    let isBullet = false
    if (content.startsWith('- ')) {
      isBullet = true
      content = content.slice(2)
    }

    const parts = content.split('**')
    return (
      <p key={idx} className="text-gray-200 text-sm leading-relaxed">
        {isBullet && '• '}
        {parts.map((part, i) => (
          <span key={i} className={i % 2 === 1 ? 'font-bold' : ''}>
            {part}
          </span>
        ))}
      </p>
    )
  })
}

export function RideAnalysis({ activity }: RideAnalysisProps) {
  const { data: detailed, isLoading } = useStravaActivity(activity.id)
  const laps = detailed?.laps || []
  const { supabase, user } = useSupabase()
  const [userNote, setUserNote] = useState('')

  const rideDate = useMemo(
    () => (activity.start_date ? dayjs(activity.start_date) : null),
    [activity.start_date]
  )

  const historyStart = useMemo(
    () => (rideDate || dayjs()).subtract(1, 'month').format('YYYY-MM-DD'),
    [rideDate]
  )
  const historyEnd = useMemo(
    () => (rideDate || dayjs()).format('YYYY-MM-DD'),
    [rideDate]
  )

  const { activities: rideHistory, isLoading: historyLoading } =
    useStravaActivitiesForDateRange(historyStart, historyEnd, ensureValidToken, stravaApiCall)

  const { data: scheduleRows = [] } = useQuery<Array<{ date: string; plan: RideWorkout[] | null }>>({
    queryKey: ['schedule', user?.id],
    queryFn: async () => {
      if (!user) return []
      const { data, error } = await supabase
        .from('schedule')
        .select('date, plan')
        .eq('user_id', user.id)
        .eq('type', 'cycling')
        .order('date', { ascending: true })
      if (error) throw error
      return data as Array<{ date: string; plan: RideWorkout[] | null }>
    },
    enabled: !!user,
  })

  const trainingPlan = useMemo(() => {
    if (!scheduleRows.length) return null
    const dates = scheduleRows.map((r) => r.date).sort()
    return {
      startDate: dates[0],
      endDate: dates[dates.length - 1],
      schedule: scheduleRows,
    }
  }, [scheduleRows])

  const workoutPlan = useMemo(() => {
    if (!rideDate) return null
    const targetDate = rideDate.format('YYYY-MM-DD')
    for (const row of scheduleRows) {
      const match = row.plan?.find((w) => w.selectedDate === targetDate)
      if (match) return match
    }
    return null
  }, [scheduleRows, rideDate])

  const [analysis, setAnalysis] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [isQueued, setIsQueued] = useState(false)
  const [isCheckingAnalysis, setIsCheckingAnalysis] = useState(true)
  const [loadingOpacity, setLoadingOpacity] = useState(1)

  const toKmh = (mps?: number) => (mps == null ? undefined : mps * 3.6)

  useEffect(() => {
    const loadExistingAnalysis = async () => {
      if (!user?.id) {
        setIsCheckingAnalysis(false)
        return
      }
      setIsCheckingAnalysis(true)
      try {
        const { data, error } = await supabase
          .from('ride_analysis')
          .select('analysis')
          .eq('user_id', user.id)
          .eq('strava_id', activity.id)
          .single<{ analysis: string | null }>()

        if (error) {
          const supabaseError = error as SupabaseError
          if (supabaseError.code === 'PGRST116') {
            setIsQueued(false)
          } else {
            console.error('Error loading ride_analysis:', error)
          }
          return
        }

        if (data.analysis) {
          setAnalysis(data.analysis)
          setIsQueued(false)
        } else {
          setIsQueued(true)
        }
      } catch (e) {
        console.error('Error loading ride_analysis:', e)
      } finally {
        setIsCheckingAnalysis(false)
      }
    }

    loadExistingAnalysis()
  }, [user?.id, activity.id, supabase])

  useEffect(() => {
    if (!isQueued || analysis) {
      setLoadingOpacity(1)
      return
    }
    const interval = setInterval(() => {
      setLoadingOpacity((prev) => (prev === 1 ? 0.2 : 1))
    }, 700)
    return () => {
      clearInterval(interval)
      setLoadingOpacity(1)
    }
  }, [isQueued, analysis])

  const handleViewOnStrava = () => {
    window.open(`https://strava.com/activities/${activity.id}`, '_blank')
  }

  const handleAnalyzeRide = async () => {
    if (!detailed || !user?.id) return
    const isDebug = process.env.NEXT_PUBLIC_DEBUG === 'true'
    if (!isDebug && (analysis || isQueued)) return

    const openaiApiKey = localStorage.getItem('openai_api_key')
    if (!openaiApiKey) {
      alert('Please set your OpenAI API key in Profile settings.')
      return
    }

    setIsAnalyzing(true)
    setAnalysisError(null)
    try {
      setIsQueued(true)

      const slimLaps =
        (detailed.laps || []).map((lap, index) => {
          const extendedLap = lap as ExtendedLap
          return {
            lap_index: extendedLap.lap_index ?? index + 1,
            elapsed_time: lap.elapsed_time,
            moving_time: extendedLap.moving_time,
            distance: extendedLap.distance,
            average_speed: toKmh(extendedLap.average_speed),
            total_elevation_gain: extendedLap.total_elevation_gain,
            average_cadence: lap.average_cadence,
            average_watts: lap.average_watts,
            average_heartrate: lap.average_heartrate,
            max_heartrate: extendedLap.max_heartrate,
          }
        }) || []

      const slimRideHistory = rideHistory.map((a) => {
        const extendedActivity = a as StravaActivity & ExtendedActivity
        return {
          distance: a.distance,
          moving_time: a.moving_time,
          elapsed_time: extendedActivity.elapsed_time,
          total_elevation_gain: a.total_elevation_gain,
          average_speed: toKmh(extendedActivity.average_speed),
          average_heartrate: a.average_heartrate,
          average_watts: a.average_watts,
          average_cadence: extendedActivity.average_cadence,
          average_temp: extendedActivity.average_temp,
          laps:
            extendedActivity.laps &&
            extendedActivity.laps.map((lap: ExtendedLap, index: number) => ({
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
        }
      })

      const extendedDetailed = detailed as StravaActivity & ExtendedActivity
      const slimActivity = {
        distance: detailed.distance,
        moving_time: detailed.moving_time,
        elapsed_time: extendedDetailed.elapsed_time,
        total_elevation_gain: detailed.total_elevation_gain,
        average_speed: toKmh(extendedDetailed.average_speed),
        average_heartrate: detailed.average_heartrate,
        average_watts: detailed.average_watts,
        average_cadence: extendedDetailed.average_cadence,
        average_temp: extendedDetailed.average_temp,
        laps: slimLaps,
      }

      const body: {
        ride_history?: unknown[]
        training_plan?: unknown
        current_activity?: unknown
        workout_plan?: unknown
        user_id: string
        strava_id: number
        openaiApiKey: string
        user_note?: string
      } = {
        ride_history: slimRideHistory,
        training_plan: trainingPlan,
        current_activity: slimActivity,
        user_id: user.id,
        strava_id: activity.id,
        openaiApiKey,
      }
      if (workoutPlan) {
        body.workout_plan = workoutPlan
      }
      if (userNote) {
        body.user_note = userNote
      }

      const response = await fetch('/api/analyze-ride', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        setAnalysisError('Failed to analyze ride')
        setIsQueued(false)
        return
      }

      const json = await response.json()
      if (json.analysis) {
        setAnalysis(json.analysis)
        setIsQueued(false)
      }
    } catch {
      setAnalysisError('Failed to analyze ride')
      setIsQueued(false)
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between gap-3 mb-4">
        <p className="text-sm text-gray-400 ml-3">
          {formatDistance(activity.distance)} · {formatElevation(activity.total_elevation_gain)} ·{' '}
          {formatDuration(Math.round(activity.moving_time / 60))}
        </p>
        <button
          onClick={handleViewOnStrava}
          className="px-4 py-2 bg-[#fc4c02] rounded-lg hover:bg-[#e04402] transition-colors text-white text-sm font-semibold whitespace-nowrap"
        >
          View on Strava
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading && <p className="text-gray-200 text-sm">Loading intervals...</p>}
        {!isLoading && laps.length === 0 && <p className="text-gray-200 text-sm">No interval data.</p>}
        {!isLoading && laps.length > 0 && (
          <div className="border border-slate-700 rounded-lg overflow-hidden mb-4">
            <div className="bg-slate-950 px-2 py-2 flex">
              <div className="w-8 text-gray-400 text-xs font-semibold text-left"></div>
              <div className="flex-1 text-gray-400 text-xs font-semibold text-right">Duration</div>
              <div className="flex-1 text-gray-400 text-xs font-semibold text-right">Avg Power</div>
              <div className="flex-1 text-gray-400 text-xs font-semibold text-right">Avg HR</div>
              <div className="flex-1 text-gray-400 text-xs font-semibold text-right">Avg Cadence</div>
            </div>
            {laps.map((lap, index) => (
              <div key={lap.id || index} className="border-t border-slate-800 px-2 py-2 flex">
                <div className="w-8 text-gray-200 text-xs text-left">{index + 1}</div>
                <div className="flex-1 text-gray-200 text-xs text-right">
                  {formatDuration(Math.round(lap.elapsed_time / 60))}
                </div>
                <div className="flex-1 text-gray-200 text-xs text-right">
                  {lap.average_watts != null ? Math.round(lap.average_watts) : '-'}
                </div>
                <div className="flex-1 text-gray-200 text-xs text-right">
                  {lap.average_heartrate != null ? Math.round(lap.average_heartrate) : '-'}
                </div>
                <div className="flex-1 text-gray-200 text-xs text-right">
                  {lap.average_cadence != null ? Math.round(lap.average_cadence) : '-'}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="border-t border-slate-700 pt-4 mt-4">
          {(!isQueued && !analysis) || process.env.NEXT_PUBLIC_DEBUG === 'true' ? (
            <>
              <div className="mb-2">
                <label htmlFor="user-note" className="block text-sm font-medium text-gray-300 mb-2">
                  Notes/Comments (optional)
                </label>
                <div className="px-2">
                  <textarea
                    id="user-note"
                    value={userNote}
                    onChange={(e) => setUserNote(e.target.value)}
                    placeholder="Add any notes about how you felt, what went well, or what you'd like feedback on..."
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    rows={3}
                  />
                </div>
              </div>
              <button
                onClick={handleAnalyzeRide}
                disabled={isCheckingAnalysis || isLoading || historyLoading || !detailed || isAnalyzing}
                className={`mb-4 mx-auto block px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors text-white text-sm font-semibold ${
                  isCheckingAnalysis || isLoading || historyLoading || !detailed || isAnalyzing
                    ? 'opacity-50 cursor-not-allowed'
                    : ''
                }`}
              >
                {isAnalyzing ? 'Analyzing...' : 'Analyze Ride'}
              </button>
            </>
          ) : null}
          {analysisError && <p className="text-orange-500 text-xs text-center mt-2">{analysisError}</p>}
          {isQueued && !analysis && !analysisError && (
            <p
              className="text-gray-200 text-sm text-center mt-2 transition-opacity duration-700"
              style={{ opacity: loadingOpacity }}
            >
              ride analysis loading...
            </p>
          )}
          {analysis && (
            <div className="p-3 rounded-lg border border-slate-800 bg-slate-950">
              {renderMarkdown(analysis)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
