"use client"

import { getTotalDistance, getTotalElevation, getTotalTime } from '../utils/StravaUtil'
import dayjs from 'dayjs'

const Totals = ({ athleteActivities }) => {
  const year = dayjs(athleteActivities[0].start_date).year()
  const totalDistance = getTotalDistance(athleteActivities)
  const totalElevation = getTotalElevation(athleteActivities)
  const totalTime = getTotalTime(athleteActivities)
  const rideCount = athleteActivities.length

  return (
    <div className="bg-white rounded w-fit border border-gray-200 h-fit">
      <div className="text-center text-xl font-medium py-3 border-b border-gray-200 bg-gray-100">{year}</div>
      <div className="grid grid-cols-2">
        <div className="px-4 py-2 text-gray-700">Total ride time</div>
        <div className="px-4 py-2 text-right">{totalTime} h</div>
        <div className="px-4 py-2 text-gray-700 bg-gray-100">Total distance</div>
        <div className="px-4 py-2 bg-gray-100 text-right">{totalDistance} km</div>
        <div className="px-4 py-2 text-gray-700">Total elevation</div>
        <div className="px-4 py-2 text-right">{totalElevation.toFixed(0)} m</div>
        <div className="px-4 py-2 text-gray-700 bg-gray-100">Ride count</div>
        <div className="px-4 py-2 bg-gray-100 text-right">{rideCount}</div>
      </div>
    </div>
  )
}

export default Totals