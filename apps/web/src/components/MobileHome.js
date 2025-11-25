"use client"

import { format, subDays, parseISO, startOfDay } from 'date-fns'
import dayjs from 'dayjs'
import { useRouter } from 'next/navigation'
import { useWorkoutData } from '../hooks/useWorkoutData'
import { LoadingSpinner } from './LoadingSpinner'
import { formatDateKey, isDateMatch } from '../utils/DateUtil'
import { RideCard, PlannedRideCard } from './calendar/RideCard'
import { GymCard } from './calendar/GymCard'

const MobileHome = () => {
  const router = useRouter()
  const { activities, plannedWorkouts, gymWorkouts, loading } = useWorkoutData(dayjs().year())

  if (loading) {
    return (
      <div className="flex items-center justify-center mt-8">
        <LoadingSpinner />
      </div>
    )
  }

  const today = startOfDay(new Date())
  const todayStr = formatDateKey(today)
  const fourDaysFromNow = startOfDay(new Date(today.getTime() + 4 * 24 * 60 * 60 * 1000))
  const fourDaysFromNowStr = formatDateKey(fourDaysFromNow)
  
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

  return (
    <div className="max-w-4xl mx-auto p-3 text-gray-600">
      <div className="flex flex-col gap-3">
        {dayCards.length === 0 && (
          <p className="text-center text-gray-500">No workouts yet. Add one!</p>
        )}
        {dayCards.map((dayCard) => {
          const { date, workouts, key } = dayCard
          const hasWorkouts = workouts.length > 0
          const isToday = formatDateKey(date) === formatDateKey(new Date())

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
                      {item.type === 'gym' && <GymCard workout={item.workout} variant="mobile" onClick={() => router.push(`/workout/${item.workout.id}`)} />}
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

