"use client"

import { useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { useWorkoutData } from '../hooks/useWorkoutData'
import { useStravaActivitiesForDateRange, useWahooActivitiesForDateRange } from '@ridesofjulian/shared'
import { stravaApiCall, ensureValidToken } from '@ridesofjulian/shared/utils/StravaUtil/web'
import { ensureValidWahooToken } from '@ridesofjulian/shared/utils/WahooUtil/web'
import Calendar from './calendar/Calendar'
import { SlidingLoadingIndicator } from './SlidingLoadingIndicator'
import { DateRangeDropdown } from './DateRangeDropdown'
import TabNavigation from './TabNavigation'

const DesktopHome = () => {
  const [selectedRange, setSelectedRange] = useState('3months')

  const dateRangeOptions = useMemo(() => {
    const now = dayjs()
    const options = [
      { value: '3months', label: '3 Months', start: now.subtract(3, 'month').format('YYYY-MM-DD'), end: now.format('YYYY-MM-DD') },
      { value: '6months', label: '6 Months', start: now.subtract(6, 'month').format('YYYY-MM-DD'), end: now.format('YYYY-MM-DD') },
      { value: '12months', label: '12 Months', start: now.subtract(12, 'month').format('YYYY-MM-DD'), end: now.format('YYYY-MM-DD') },
    ]

    const currentYear = now.year()
    for (let year = currentYear; year >= 2009; year--) {
      options.push({
        value: `year-${year}`,
        label: year.toString(),
        start: `${year}-01-01`,
        end: `${year}-12-31`,
      })
    }

    return options
  }, [])

  const currentDateRange = useMemo(
    () => dateRangeOptions.find(opt => opt.value === selectedRange) || dateRangeOptions[2],
    [selectedRange, dateRangeOptions]
  )

  const { plannedWorkouts, gymWorkouts, loading } = useWorkoutData(dayjs(currentDateRange.start).year())
  const { activities: stravaActivities, isLoading: activitiesLoading } = useStravaActivitiesForDateRange(
    currentDateRange.start,
    currentDateRange.end,
    ensureValidToken,
    stravaApiCall
  )
  const { workouts: wahooWorkouts, isLoading: wahooLoading } = useWahooActivitiesForDateRange(
    currentDateRange.start,
    currentDateRange.end,
    ensureValidWahooToken
  )

  const activities = useMemo(() => {
    const strava = (stravaActivities || []).map(a => ({ ...a, source: 'strava' }))
    const wahoo = (wahooWorkouts || [])
      .filter(w => w.workout_summary)
      .map(w => ({
        id: w.id,
        name: w.name,
        distance: parseFloat(w.workout_summary.distance_accum) || 0,
        total_elevation_gain: parseFloat(w.workout_summary.ascent_accum) || 0,
        moving_time: parseFloat(w.workout_summary.duration_active_accum) || 0,
        start_date: w.workout_summary.started_at || w.starts,
        type: 'Ride',
        sport_type: 'Ride',
        average_watts: w.workout_summary.power_avg ? parseFloat(w.workout_summary.power_avg) : undefined,
        kilojoules: w.workout_summary.work_accum ? parseFloat(w.workout_summary.work_accum) / 1000 : undefined,
        average_heartrate: w.workout_summary.heart_rate_avg ? parseFloat(w.workout_summary.heart_rate_avg) : undefined,
        source: 'wahoo'
      }))
    
    return [...strava, ...wahoo].sort((a, b) => 
      new Date(b.start_date || b.starts).getTime() - new Date(a.start_date || a.starts).getTime()
    )
  }, [stravaActivities, wahooWorkouts])

  const isCurrentYearRange = dayjs(currentDateRange.end).year() === dayjs().year()
  const isLoading = loading || activitiesLoading || wahooLoading

  return (
    <div className="flex flex-col items-center gap-2 w-full justify-center">
      <TabNavigation />
      <div className="mt-2">
        <DateRangeDropdown
          value={dateRangeOptions.find(option => option.value === selectedRange)}
          options={dateRangeOptions}
          onChange={(option) => setSelectedRange(option.value)}
          className="w-35"
        />
      </div>
      <div className="w-full">
        <SlidingLoadingIndicator isLoading={isLoading} />
        <Calendar 
          dateRange={currentDateRange}
          activities={activities}
          plannedWorkouts={isCurrentYearRange ? plannedWorkouts : []}
          gymWorkouts={isCurrentYearRange ? gymWorkouts : []}
        />
      </div>
    </div>
  )
}

export default DesktopHome
