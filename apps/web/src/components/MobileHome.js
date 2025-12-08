"use client"

import { format, subDays, parseISO, startOfDay } from 'date-fns'
import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useWorkoutData } from '../hooks/useWorkoutData'
import { useStravaActivitiesForDateRange, useWahooActivitiesForDateRange, combineAndDeduplicateActivities } from '@ridesofjulian/shared'
import { stravaApiCall, ensureValidToken } from '@ridesofjulian/shared/utils/StravaUtil/web'
import { ensureValidWahooToken } from '@ridesofjulian/shared/utils/WahooUtil/web'
import { formatDateKey, isDateMatch } from '../utils/DateUtil'
import { PlannedRideCard } from './calendar/RideCard'
import { RideCardWeb } from './calendar/RideCardWeb'
import { GymCardWeb } from './calendar/GymCardWeb'
import { WeeklySummary } from './WeeklySummary'
import { SlidingLoadingIndicator } from './SlidingLoadingIndicator'
import { useSupabase } from '@/contexts/SupabaseContext'
import { getFtp } from '@/utils/FtpUtil'
import { DateRangeDropdown } from './DateRangeDropdown'

dayjs.extend(isoWeek)

const MobileHome = () => {
  const { supabase, user } = useSupabase()

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

  const { plannedWorkouts, gymWorkouts, loading: workoutDataLoading } = useWorkoutData(
    dayjs(currentDateRange.start).year()
  )
  
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

  const activities = useMemo(() => 
    combineAndDeduplicateActivities(stravaActivities, wahooWorkouts),
    [stravaActivities, wahooWorkouts]
  )

  const loading = workoutDataLoading || activitiesLoading || wahooLoading

  const { data: ftpHistory } = useQuery({
    queryKey: ['ftpHistory', user?.id],
    queryFn: async () => {
      if (!user) return null
      return await getFtp(supabase, user.id)
    },
    enabled: !!user,
  })

  const today = startOfDay(new Date())
  const rangeStartDate = startOfDay(new Date(currentDateRange.start))
  const rangeEndDate = startOfDay(new Date(currentDateRange.end))
  const todayStr = formatDateKey(today)
  const fourDaysFromNow = startOfDay(new Date(today.getTime() + 4 * 24 * 60 * 60 * 1000))
  const fourDaysFromNowStr = formatDateKey(fourDaysFromNow)
  
  let earliestDate = rangeStartDate
  let latestDate = rangeEndDate

  const dayCards = []
  let currentDate = latestDate

  while (currentDate >= earliestDate) {
    const dateKey = formatDateKey(currentDate)
    const dayWorkouts = []

    gymWorkouts.forEach(workout => {
      if (isDateMatch(workout.datetime, dateKey)) {
        dayWorkouts.push({ type: 'gym', workout, time: new Date(workout.datetime) })
      }
    })

    activities.forEach(activity => {
      if (isDateMatch(activity.start_date, dateKey)) {
        dayWorkouts.push({ type: 'ride', workout: activity, time: new Date(activity.start_date) })
      }
    })

    plannedWorkouts.forEach(planned => {
      const plannedDate = formatDateKey(startOfDay(parseISO(planned.starts)))
      if (plannedDate === dateKey && plannedDate >= todayStr && plannedDate <= fourDaysFromNowStr) {
        const hasRide = dayWorkouts.some(w => w.type === 'ride')
        if (!hasRide) {
          dayWorkouts.push({ type: 'planned', workout: planned, time: new Date(planned.starts) })
        }
      }
    })

    dayWorkouts.sort((a, b) => a.time - b.time)

    dayCards.push({
      date: currentDate,
      workouts: dayWorkouts,
      key: dateKey
    })

    currentDate = subDays(currentDate, 1)
  }

  let lastWeekKey = null

  return (
    <div className="max-w-4xl mx-auto px-3 text-gray-600">
      <div className="flex flex-col gap-3">
        <div className="flex justify-center">
          <DateRangeDropdown
            value={dateRangeOptions.find(option => option.value === selectedRange)}
            options={dateRangeOptions}
            onChange={(option) => setSelectedRange(option.value)}
          />
        </div>
        <SlidingLoadingIndicator isLoading={loading} />
        {dayCards.length === 0 && (
          <p className="text-center text-gray-500">No workouts yet. Add one!</p>
        )}
        {dayCards.map((dayCard) => {
          const { date, workouts, key } = dayCard
          const hasWorkouts = workouts.length > 0
          const isToday = formatDateKey(date) === formatDateKey(new Date())

          const weekStart = dayjs(date).startOf('isoWeek')
          const weekKey = weekStart.format('YYYY-MM-DD')
          const isNewWeek = weekKey !== lastWeekKey
          if (isNewWeek) {
            lastWeekKey = weekKey
          }

          return (
            <div key={key}>
              {isNewWeek && (
                <WeeklySummary
                  activities={activities}
                  ftpHistory={ftpHistory}
                  weekStart={weekStart}
                />
              )}
              <div className={`rounded-lg p-3 ${hasWorkouts ? 'bg-white shadow-md' : 'bg-gray-300'} ${isToday ? 'border-2 border-blue-500' : ''}`}>
                <h2 className={`text-base font-bold ${hasWorkouts ? 'mb-2' : ''}`}>
                  {format(date, 'MMMM do, yyyy')}
                  {!hasWorkouts && <span className="font-normal text-gray-400"> - Rest</span>}
                </h2>
                
                {hasWorkouts && (
                  <div className="flex flex-col gap-1.5">
                    {workouts.map((item, idx) => (
                      <div key={idx}>
                        {item.type === 'gym' && <GymCardWeb workout={item.workout} />}
                        {item.type === 'ride' && <RideCardWeb activity={item.workout} />}
                        {item.type === 'planned' && <PlannedRideCard workout={item.workout} variant="mobile" />}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default MobileHome

