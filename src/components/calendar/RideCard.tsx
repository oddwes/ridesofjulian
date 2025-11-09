import { useContext } from "react"
import Link from "next/link"
import { ChevronUp } from "lucide-react"
import { getTSS } from "../../utils/StravaUtil"
import { getIntervalColor } from "../../utils/ColorUtil"
import { FtpContext } from "../FTP"
import Col from "../ui/Col"

interface Activity {
  id: number
  name: string
  distance: number
  total_elevation_gain: number
  type?: string
  sport_type?: string
}

interface PlannedWorkout {
  id?: number
  name: string
  minutes?: number
  intervals?: Array<{
    exit_trigger_value?: number
    targets?: Array<{
      low?: number
      high?: number
    }>
  }>
}

export const RideCard = ({ 
  activity, 
  variant = 'mobile' 
}: { 
  activity: Activity
  variant?: 'mobile' | 'desktop'
}) => {
  const { ftp } = useContext(FtpContext)
  const emoji = activity.type === 'Run' || activity.sport_type === 'Run' ? '🏃' : '🚴'
  
  if (variant === 'mobile') {
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
              {emoji} {activity.name}
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

  return (
    <div className='w-full'>
      <Link
        href={`https://strava.com/activities/${activity.id}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        <div className="w-full bg-orange-100 border-2 border-orange-500 rounded flex flex-col justify-center items-center">
          <div className="text-sm font-semibold truncate w-full text-center text-orange-800">
            {emoji} {activity.name}
          </div>
          <div className="text-xs text-orange-700">
            {Math.round(activity.distance / 1000)} km
          </div>
          <div className="text-xs text-orange-700">
            {Math.round(activity.total_elevation_gain)} m
          </div>
          {(ftp !== undefined && ftp !== 0) && (
            <div className="text-xs text-orange-600">
              {getTSS(activity, ftp)} TSS
            </div>
          )}
        </div>
      </Link>
    </div>
  )
}

export const PlannedRideCard = ({ 
  workout, 
  variant = 'mobile',
  isToday = false,
  onClick 
}: { 
  workout: PlannedWorkout
  variant?: 'mobile' | 'desktop'
  isToday?: boolean
  onClick?: () => void 
}) => {
  const minutes = workout.minutes || 0
  const hours = Math.floor(minutes / 60)
  const remainingMins = minutes % 60
  const duration = hours > 0 ? `${hours}h ${remainingMins}m` : `${remainingMins}m`
  
  const intervals = workout.intervals || []
  const totalDuration = intervals.reduce((sum, i) => sum + (i.exit_trigger_value || 0), 0)
  
  const chartContent = (
    <div className={`w-full bg-gray-50 ${variant === 'mobile' ? 'border border-gray-300 h-12' : 'border border-gray-300 h-16'} rounded flex items-end overflow-hidden`}>
      {intervals.length > 0 ? (
        intervals.map((interval, idx) => {
          const width = totalDuration > 0 ? (interval.exit_trigger_value! / totalDuration) * 100 : 0
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
  )

  if (variant === 'mobile') {
    return (
      <div className="bg-white border border-gray-300 rounded-lg p-2">
        <div className="mb-1">{chartContent}</div>
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
    <Col size="12">
      <div className="relative w-full h-full flex justify-center items-center">
        <div 
          onClick={onClick}
          className='w-full cursor-pointer hover:opacity-80 transition-opacity'
        >
          {chartContent}
          <div className="text-xs text-center mt-1 font-semibold truncate">
            {workout.name}
          </div>
          <div className="text-xs text-center">
            {duration}
          </div>
        </div>
        {isToday && (
          <div className="absolute bottom-0.5">
            <ChevronUp className="text-[#FC5201]" />
          </div>
        )}
      </div>
    </Col>
  )
}
