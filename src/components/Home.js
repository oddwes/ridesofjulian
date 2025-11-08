"use client"

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getAthleteActivities, hasRefreshToken } from '../utils/StravaUtil'
import { getPlannedWorkouts, hasWahooRefreshToken } from '../utils/WahooUtil'
import { useWorkouts } from '../hooks/useWorkouts'
import Calendar from './calendar/Calendar'
import ReactSelect from 'react-select'
import dayjs from 'dayjs'
import { FTPInput } from './FTP'
import { LoadingSpinner } from './LoadingSpinner'

const Home = () => {
  const [selectedYear, setSelectedYear] = useState(dayjs().year())
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

  if (loading) return (
    <div className="flex items-center justify-center mt-8">
      <LoadingSpinner />
    </div>
  )

  const yearOptions = Array.from({ length: 5 }, (_, i) => ({
    value: dayjs().year() - i,
    label: dayjs().year() - i
  }))

  const start = selectedYear === dayjs().year() ? dayjs() : dayjs(`${selectedYear}-12-31`);

  return (
    <div className="flex flex-col items-center gap-4">
      <ReactSelect
        value={yearOptions.find(option => option.value === selectedYear)}
        onChange={(option) => setSelectedYear(option.value)}
        options={yearOptions}
        className="w-48"
      />
      <FTPInput />
      <Calendar 
        start={start} 
        activities={activities} 
        plannedWorkouts={selectedYear === dayjs().year() ? plannedWorkouts : []}
        gymWorkouts={selectedYear === dayjs().year() ? gymWorkouts : []}
      />
    </div>
  )
}

export default Home
