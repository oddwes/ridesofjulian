"use client"

import { useEffect, useState } from 'react'
import { getAthleteActivities, isLoggedIn } from '../utils/StravaUtil'
import Calendar from './calendar/Calendar'
import ReactSelect from 'react-select'
import Totals from './Totals'
import dayjs from 'dayjs'
import { useRouter } from 'next/navigation'
import FTP from './FTP'
import { LoadingSpinner } from './LoadingSpinner'

const Home = () => {
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState(dayjs().year())
  const router = useRouter()

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push('/login')
      return
    }

    const fetchActivities = async () => {
      const data = await getAthleteActivities(selectedYear)
      setActivities(data)
      setLoading(false)
    }

    fetchActivities()
  }, [selectedYear, router])

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
    <div className="p-4">
      <div className="flex justify-center">
        <ReactSelect
          value={yearOptions.find(option => option.value === selectedYear)}
          onChange={(option) => setSelectedYear(option.value)}
          options={yearOptions}
          className="w-48"
        />
      </div>
      <div className="flex justify-between gap-4">
        <Calendar start={start} activities={activities} />
        <div className="flex flex-col gap-4">
          <Totals athleteActivities={activities} />
          <FTP />
        </div>
      </div>
    </div>
  )
}

export default Home
