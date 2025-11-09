"use client"

import { format, subDays, parseISO, startOfDay } from 'date-fns'
import { useWorkouts } from '../hooks/useWorkouts'
import { LoadingSpinner } from './LoadingSpinner'
import { useQuery } from '@tanstack/react-query'
import { getAthleteActivities, hasRefreshToken } from '../utils/StravaUtil'
import { getPlannedWorkouts, hasWahooRefreshToken } from '../utils/WahooUtil'
import { useEffect, useState } from 'react'
import dayjs from 'dayjs'

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

  const renderGymCard = (workout) => {
    const exerciseCount = workout.exercises?.length || 0
    const completedCount = workout.exercises?.filter(e => e.completed === e.sets).length || 0
    
    return (
      <div className="bg-purple-100 border-2 border-purple-400 rounded-lg p-2">
        <div className="flex items-center gap-2">
          <div className="text-sm font-semibold text-purple-800">
            💪 Gym
          </div>
          <div className="flex gap-2 text-[11px] text-purple-700">
            <span>{exerciseCount} exercises</span>
            {completedCount > 0 && (
              <span className="text-purple-600">
                {completedCount}/{exerciseCount} complete
              </span>
            )}
          </div>
        </div>
      </div>
    )
  }

  const renderRideCard = (activity) => {
    return (
      <a
        href={`https://strava.com/activities/${activity.id}`}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
      >
        <div className="bg-orange-100 border-2 border-orange-500 rounded-lg p-2">
          <div className="flex items-center gap-2">
            <div className="text-sm font-semibold text-orange-800 truncate">
              🚴 {activity.name}
            </div>
            <div className="flex gap-2 text-[11px] text-orange-700 whitespace-nowrap">
              <span>{Math.round(activity.distance / 1000)} km</span>
              <span>{Math.round(activity.total_elevation_gain)} m</span>
            </div>
          </div>
        </div>
      </a>
    )
  }

  const getIntervalColor = (powerMin, powerMax) => {
    const avgPower = (powerMin + powerMax) / 2
    if (avgPower < 100) return "rgba(156, 163, 175, 0.6)"
    if (avgPower < 150) return "rgba(96, 165, 250, 0.6)"
    if (avgPower < 200) return "rgba(52, 211, 153, 0.6)"
    if (avgPower < 250) return "rgba(251, 191, 36, 0.6)"
    if (avgPower < 300) return "rgba(251, 146, 60, 0.6)"
    return "rgba(220, 38, 38, 0.6)"
  }

  const renderPlannedCard = (workout) => {
    const minutes = workout.minutes || 0
    const hours = Math.floor(minutes / 60)
    const remainingMins = minutes % 60
    const duration = hours > 0 ? `${hours}h ${remainingMins}m` : `${remainingMins}m`
    
    const intervals = workout.intervals || []
    const totalDuration = intervals.reduce((sum, i) => sum + (i.exit_trigger_value || 0), 0)
    
    return (
      <div className="bg-white border border-gray-300 rounded-lg p-2">
        <div className="w-full h-12 bg-gray-50 rounded flex items-end overflow-hidden mb-1">
          {intervals.length > 0 ? (
            intervals.map((interval, idx) => {
              const width = totalDuration > 0 ? (interval.exit_trigger_value / totalDuration) * 100 : 0
              const powerMin = interval.targets?.[0]?.low || 0
              const powerMax = interval.targets?.[0]?.high || 0
              const maxPower = Math.max(...intervals.map(i => i.targets?.[0]?.high || 0), 300)
              const height = maxPower > 0 ? (powerMax / maxPower) * 100 : 0
              
              return (
                <div
                  key={idx}
                  style={{
                    width: `${width}%`,
                    height: `${height}%`,
                    backgroundColor: getIntervalColor(powerMin, powerMax),
                    borderRight: idx < intervals.length - 1 ? '1px solid rgba(0,0,0,0.1)' : 'none'
                  }}
                />
              )
            })
          ) : (
            <div className="w-full h-full bg-gray-200" />
          )}
        </div>
        <div className="flex justify-between items-center gap-2 text-[11px]">
          <div className="font-semibold text-gray-800 truncate">
            {workout.name}
          </div>
          <div className="text-gray-600 whitespace-nowrap">
            {duration}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-3 text-gray-600">
      <div className="flex flex-col gap-3">
        {dayCards.length === 0 && (
          <p className="text-center text-gray-500">No workouts yet. Add one!</p>
        )}
        {dayCards.map((dayCard) => {
          const { date, workouts, key } = dayCard
          const hasWorkouts = workouts.length > 0

          return (
            <div key={key} className={`rounded-lg p-3 ${hasWorkouts ? 'bg-white shadow-md' : 'bg-gray-300'}`}>
              <h2 className={`text-base font-bold ${hasWorkouts ? 'mb-2' : ''}`}>
                {format(date, 'MMMM do, yyyy')}
                {!hasWorkouts && <span className="font-normal text-gray-400"> - Rest</span>}
              </h2>
              
              {hasWorkouts && (
                <div className="flex flex-col gap-1.5">
                  {workouts.map((item, idx) => (
                    <div key={idx}>
                      {item.type === 'gym' && renderGymCard(item.workout)}
                      {item.type === 'ride' && renderRideCard(item.workout)}
                      {item.type === 'planned' && renderPlannedCard(item.workout)}
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

