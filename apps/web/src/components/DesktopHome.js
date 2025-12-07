"use client"

import { useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { useWorkoutData } from '../hooks/useWorkoutData'
import { useStravaActivitiesForDateRange } from '../hooks/useStravaActivitiesForDateRange'
import Calendar from './calendar/Calendar'
import { SlidingLoadingIndicator } from './SlidingLoadingIndicator'
import { DateRangeDropdown } from './DateRangeDropdown'

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
  const { activities, isLoading: activitiesLoading } = useStravaActivitiesForDateRange(
    currentDateRange.start,
    currentDateRange.end
  )

  const isCurrentYearRange = dayjs(currentDateRange.end).year() === dayjs().year()
  const isLoading = loading || activitiesLoading

  return (
    <div className="flex flex-col items-center gap-4 w-full justify-center">
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
