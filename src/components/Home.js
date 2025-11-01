"use client"

import { useEffect, useState } from 'react'
import { getAthleteActivities } from '../utils/StravaUtil'
import { getPlannedWorkouts, hasWahooRefreshToken, getWahooAuthUrl } from '../utils/WahooUtil'
import Calendar from './calendar/Calendar'
import ReactSelect from 'react-select'
import Totals from './Totals'
import dayjs from 'dayjs'
import FTP from './FTP'
import { LoadingSpinner } from './LoadingSpinner'

const Home = () => {
  const [activities, setActivities] = useState([])
  const [plannedWorkouts, setPlannedWorkouts] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState(dayjs().year())
  const [hasWahooToken, setHasWahooToken] = useState(false)

  useEffect(() => {
    setHasWahooToken(hasWahooRefreshToken())
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      const [activities, workouts] = await Promise.all([
        getAthleteActivities(selectedYear),
        getPlannedWorkouts()
      ])
      
      setActivities(activities)
      setPlannedWorkouts(workouts)
      setLoading(false)
    }

    fetchData()
  }, [selectedYear])

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

  const handleConnectWahoo = () => {
    window.location.href = getWahooAuthUrl()
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <div className="flex justify-center flex-1">
          <ReactSelect
            value={yearOptions.find(option => option.value === selectedYear)}
            onChange={(option) => setSelectedYear(option.value)}
            options={yearOptions}
            className="w-48"
          />
        </div>
        {!hasWahooToken && (
          <button
            onClick={handleConnectWahoo}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Connect to Wahoo
          </button>
        )}
      </div>
      <div className="flex justify-between gap-4">
        <Calendar start={start} activities={activities} plannedWorkouts={plannedWorkouts} />
        <div className="flex flex-col gap-4">
          <Totals athleteActivities={activities} />
          <FTP />
        </div>
      </div>
    </div>
  )
}

export default Home
