"use client"

import { useState } from 'react'
import { useWorkoutData } from '../hooks/useWorkoutData'
import Calendar from './calendar/Calendar'
import ReactSelect from 'react-select'
import dayjs from 'dayjs'
import { LoadingSpinner } from './LoadingSpinner'

const DesktopHome = () => {
  const [selectedYear, setSelectedYear] = useState(dayjs().year())
  const { activities, plannedWorkouts, gymWorkouts, loading } = useWorkoutData(selectedYear)

  if (loading) {
    return (
      <div className="flex items-center justify-center mt-8">
        <LoadingSpinner />
      </div>
    )
  }

  const yearOptions = Array.from({ length: 5 }, (_, i) => ({
    value: dayjs().year() - i,
    label: dayjs().year() - i
  }))

  const start = selectedYear === dayjs().year() ? dayjs() : dayjs(`${selectedYear}-12-31`)
  const isCurrentYear = selectedYear === dayjs().year()

  return (
    <div className="flex flex-col items-center gap-4">
      <ReactSelect
        value={yearOptions.find(option => option.value === selectedYear)}
        onChange={(option) => setSelectedYear(option.value)}
        options={yearOptions}
        className="w-48 text-gray-800"
      />
      <Calendar 
        start={start} 
        activities={activities} 
        plannedWorkouts={isCurrentYear ? plannedWorkouts : []}
        gymWorkouts={isCurrentYear ? gymWorkouts : []}
      />
    </div>
  )
}

export default DesktopHome
