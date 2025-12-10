"use client"

import { useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { useWorkoutData } from '../hooks/useWorkoutData'
import { useStravaActivitiesForDateRange, useWahooActivitiesForDateRange, combineAndDeduplicateActivities } from '@ridesofjulian/shared'
import { stravaApiCall, ensureValidToken } from '@ridesofjulian/shared/utils/StravaUtil/web'
import { ensureValidWahooToken } from '@ridesofjulian/shared/utils/WahooUtil/web'
import Calendar from './calendar/Calendar'
import { SlidingLoadingIndicator } from './SlidingLoadingIndicator'
import { DateRangeDropdown } from './DateRangeDropdown'
import TabNavigation from './TabNavigation'
import { RideAnalysisModal } from './RideAnalysisModal'

const DesktopHome = () => {
  const [selectedRange, setSelectedRange] = useState('3months')
  const [selectedActivity, setSelectedActivity] = useState(null)

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

  const activities = useMemo(() => 
    combineAndDeduplicateActivities(stravaActivities, wahooWorkouts),
    [stravaActivities, wahooWorkouts]
  )

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
          onActivityClick={setSelectedActivity}
        />
      </div>
      <RideAnalysisModal
        activity={selectedActivity}
        onClose={() => setSelectedActivity(null)}
      />
    </div>
  )
}

export default DesktopHome
