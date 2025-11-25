"use client"

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getAthleteActivities, hasRefreshToken } from '../utils/StravaUtil'
import { getPlannedWorkouts, hasWahooRefreshToken } from '../utils/WahooUtil'
import { useWorkouts } from './useWorkouts'

export const useWorkoutData = (selectedYear: number) => {
  const [hasWahooToken, setHasWahooToken] = useState(false)
  const [hasStravaToken, setHasStravaToken] = useState(false)

  useEffect(() => {
    setHasWahooToken(hasWahooRefreshToken())
    setHasStravaToken(hasRefreshToken())
  }, [])

  const { data: activities = [], isLoading: activitiesLoading } = useQuery({
    queryKey: ['activities', selectedYear],
    queryFn: () => getAthleteActivities(selectedYear),
    enabled: hasStravaToken,
  })

  const { data: plannedWorkouts = [], isLoading: workoutsLoading } = useQuery({
    queryKey: ['plannedWorkouts'],
    queryFn: () => getPlannedWorkouts(),
    enabled: hasWahooToken,
  })

  const { data: gymWorkouts = [], isLoading: gymWorkoutsLoading } = useWorkouts()

  const loading = activitiesLoading || workoutsLoading || gymWorkoutsLoading

  return { activities, plannedWorkouts, gymWorkouts, loading }
}

