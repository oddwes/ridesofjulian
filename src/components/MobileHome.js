"use client"

import { format, subDays, parseISO, startOfDay } from 'date-fns'
import { useWorkouts } from '../hooks/useWorkouts'
import { LoadingSpinner } from './LoadingSpinner'
import { useQuery } from '@tanstack/react-query'
import { getAthleteActivities, hasRefreshToken } from '../utils/StravaUtil'
import { getPlannedWorkouts, hasWahooRefreshToken } from '../utils/WahooUtil'
import { useEffect, useState } from 'react'
import dayjs from 'dayjs'
import { RideCard, PlannedRideCard } from './calendar/RideCard'
import { GymCard } from './calendar/GymCard'

const MobileHome = () => {
  const [hasWahooToken, setHasWahooToken] = useState(false)
  const [hasStravaToken, setHasStravaToken] = useState(false)

  useEffect(() => {
    setHasWahooToken(hasWahooRefreshToken())
    setHasStravaToken(hasRefreshToken())
  }, [])

  const { data: activities = [], isLoading: activitiesLoading } = useQuery({
    queryKey: ['activities', dayjs().year()],
    queryFn: () => getAthleteActivities(dayjs().year()),
    enabled: hasStravaToken,
  })

  const { data: plannedWorkouts = [], isLoading: workoutsLoading } = useQuery({
    queryKey: ['plannedWorkouts'],
    queryFn: () => getPlannedWorkouts(),
    enabled: hasWahooToken,
  })

  const { data: gymWorkouts = [], isLoading: gymWorkoutsLoading } = useWorkouts()

  const loading = activitiesLoading || workoutsLoading || gymWorkoutsLoading

  if (loading) return (
    <div className="flex items-center justify-center mt-8">
      <LoadingSpinner />
    </div>
  )

  const generateDayCards = () => {
    const today = startOfDay(new Date())
    const todayStr = format(today, 'yyyy-MM-dd')
    const fourDaysFromNow = startOfDay(new Date(today.getTime() + 4 * 24 * 60 * 60 * 1000))
    const fourDaysFromNowStr = format(fourDaysFromNow, 'yyyy-MM-dd')
    
    // Find the earliest date with any workout
    let earliestDate = today
    
    if (gymWorkouts.length > 0) {
      const earliestGym = gymWorkouts.reduce((earliest, w) => {
        const date = startOfDay(parseISO(w.datetime))
        return date < earliest ? date : earliest
      }, today)
      if (earliestGym < earliestDate) earliestDate = earliestGym
    }
    
    if (activities.length > 0) {
      const earliestActivity = activities.reduce((earliest, a) => {
        const date = startOfDay(parseISO(a.start_date))
        return date < earliest ? date : earliest
      }, today)
      if (earliestActivity < earliestDate) earliestDate = earliestActivity
    }

    // Find the latest date (either today or latest planned workout within 4 days)
    let latestDate = today
    if (plannedWorkouts.length > 0) {
      plannedWorkouts.forEach(w => {
        const plannedDate = startOfDay(parseISO(w.starts))
        if (plannedDate > latestDate && plannedDate <= fourDaysFromNow) {
          latestDate = plannedDate
        }
      })
    }

    const dayCards = []
    let currentDate = latestDate

    // Generate all days from latest date back to earliest workout
    while (currentDate >= earliestDate) {
      const dateKey = format(currentDate, 'yyyy-MM-dd')
      const dayWorkouts = []

      // Gym workouts
      gymWorkouts.forEach(workout => {
        if (format(startOfDay(parseISO(workout.datetime)), 'yyyy-MM-dd') === dateKey) {
          dayWorkouts.push({ type: 'gym', workout, time: new Date(workout.datetime) })
        }
      })

      // Activities (rides)
      activities.forEach(activity => {
        if (format(startOfDay(parseISO(activity.start_date)), 'yyyy-MM-dd') === dateKey) {
          dayWorkouts.push({ type: 'ride', workout: activity, time: new Date(activity.start_date) })
        }
      })

      // Planned workouts (only within next 4 days)
      plannedWorkouts.forEach(planned => {
        const plannedDate = format(startOfDay(parseISO(planned.starts)), 'yyyy-MM-dd')
        if (plannedDate === dateKey && plannedDate >= todayStr && plannedDate <= fourDaysFromNowStr) {
          // Don't show planned workout if there's already a ride activity that day
          const hasRide = dayWorkouts.some(w => w.type === 'ride')
          if (!hasRide) {
            dayWorkouts.push({ type: 'planned', workout: planned, time: new Date(planned.starts) })
          }
        }
      })

      // Sort by time
      dayWorkouts.sort((a, b) => a.time - b.time)

      dayCards.push({
        date: currentDate,
        workouts: dayWorkouts,
        key: dateKey
      })

      currentDate = subDays(currentDate, 1)
    }

    return dayCards
  }

  const dayCards = generateDayCards()

  return (
    <div className="max-w-4xl mx-auto p-3 text-gray-600">
      <div className="flex flex-col gap-3">
        {dayCards.length === 0 && (
          <p className="text-center text-gray-500">No workouts yet. Add one!</p>
        )}
        {dayCards.map((dayCard) => {
          const { date, workouts, key } = dayCard
          const hasWorkouts = workouts.length > 0
          const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')

          return (
            <div key={key} className={`rounded-lg p-3 ${hasWorkouts ? 'bg-white shadow-md' : 'bg-gray-300'} ${isToday ? 'border-l-4 border-blue-500' : ''}`}>
              <h2 className={`text-base font-bold ${hasWorkouts ? 'mb-2' : ''}`}>
                {format(date, 'MMMM do, yyyy')}
                {!hasWorkouts && <span className="font-normal text-gray-400"> - Rest</span>}
              </h2>
              
              {hasWorkouts && (
                <div className="flex flex-col gap-1.5">
                  {workouts.map((item, idx) => (
                    <div key={idx}>
                      {item.type === 'gym' && <GymCard workout={item.workout} variant="mobile" />}
                      {item.type === 'ride' && <RideCard activity={item.workout} variant="mobile" />}
                      {item.type === 'planned' && <PlannedRideCard workout={item.workout} variant="mobile" />}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default MobileHome

