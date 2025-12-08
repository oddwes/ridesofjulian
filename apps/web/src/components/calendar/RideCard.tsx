import { useContext, useMemo } from "react"
import Link from "next/link"
import { ChevronUp } from "lucide-react"
import { getTSS } from "@ridesofjulian/shared/utils/StravaUtil"
import { formatDuration } from "../../utils/TimeUtil"
import { formatDistance, formatElevation } from "../../utils/FormatUtil"
import { FtpContext } from "../FTP"
import { useSupabase } from "@/contexts/SupabaseContext"
import { useQuery } from "@tanstack/react-query"
import { getFtp, getFtpForDate } from "@/utils/FtpUtil"
import Col from "../ui/Col"
import { SimplifiedChart } from "../workouts/RideWorkoutChart"

interface Activity {
  id: number
  name: string
  distance: number
  total_elevation_gain: number
  moving_time?: number
  start_date?: string
  type?: string
  sport_type?: string
  average_watts?: number
  kilojoules?: number
  average_heartrate?: number
  source?: 'strava' | 'wahoo'
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
  const { supabase, user } = useSupabase()
  const { data: ftpHistory } = useQuery({
    queryKey: ['ftpHistory', user?.id],
    queryFn: async () => {
      if (!user) return null
      return await getFtp(supabase, user.id)
    },
    enabled: !!user,
  })

  const ftpForActivity = useMemo(
    () => getFtpForDate(ftpHistory || null, activity.start_date, ftp),
    [ftpHistory, activity.start_date, ftp]
  )
  const emoji = activity.type === 'Run' || activity.sport_type === 'Run' ? '🏃' : '🚴'
  const isCycling = activity.type !== 'Run' && activity.sport_type !== 'Run'
  const isStrava = activity.source !== 'wahoo'
  
  if (variant === 'mobile') {
    const content = (
      <div className="bg-orange-100 border-2 border-orange-500 rounded-lg p-2">
          <div className="flex flex-col gap-1">
            <div className="text-sm font-semibold text-orange-800 truncate">
              {emoji} {activity.name}
            </div>
            <div className="flex gap-1 text-[11px] text-orange-700 whitespace-nowrap">
              <span>{formatDistance(activity.distance)}</span>
              <span>{formatElevation(activity.total_elevation_gain)}</span>
              {activity.moving_time && (
                <span>{formatDuration(Math.round(activity.moving_time / 60))}</span>
              )}
            {(ftpForActivity !== undefined && ftpForActivity !== 0) && (
              <span>{getTSS(activity, ftpForActivity)}TSS</span>
            )}
            </div>
            {(isCycling && (activity.average_watts || activity.kilojoules) || activity.average_heartrate) && (
              <div className="flex gap-2 text-[11px] text-orange-700 whitespace-nowrap">
                {isCycling && activity.average_watts && (
                  <span>{Math.round(activity.average_watts)}W</span>
                )}
                {activity.average_heartrate && (
                  <span>{Math.round(activity.average_heartrate)}bpm</span>
                )}
                {isCycling && activity.kilojoules && (
                  <span>{Math.round(activity.kilojoules)}kJ</span>
                )}
              </div>
            )}
          </div>
        </div>
    )
    
    if (isStrava) {
      return (
        <a
          href={`https://strava.com/activities/${activity.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="block"
        >
          {content}
        </a>
      )
    }
    
    return content
  }

  const cardContent = (
    <div className="w-full bg-orange-100 border-2 border-orange-500 rounded flex flex-col justify-center items-center py-1 px-2">
          <div className="text-sm font-semibold truncate w-full text-center text-orange-800">
            {emoji} {activity.name}
          </div>
          <div className="flex gap-1 text-xs text-orange-700">
            <span>{formatDistance(activity.distance)}</span>
            <span>{formatElevation(activity.total_elevation_gain)}</span>
            {activity.moving_time && (
              <span>{formatDuration(Math.round(activity.moving_time / 60))}</span>
            )}
            {(ftpForActivity !== undefined && ftpForActivity !== 0) && (
              <span>{getTSS(activity, ftpForActivity)}TSS</span>
            )}
          </div>
          {(isCycling && (activity.average_watts || activity.kilojoules) || activity.average_heartrate) && (
            <div className="flex gap-2 text-xs text-orange-700">
              {isCycling && activity.average_watts && (
                <span>{Math.round(activity.average_watts)}W</span>
              )}
              {activity.average_heartrate && (
                <span>{Math.round(activity.average_heartrate)}bpm</span>
              )}
              {isCycling && activity.kilojoules && (
                <span>{Math.round(activity.kilojoules)}kJ</span>
              )}
            </div>
          )}
        </div>
  )
  
  if (isStrava) {
    return (
      <div className='w-full'>
        <Link
          href={`https://strava.com/activities/${activity.id}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          {cardContent}
        </Link>
      </div>
    )
  }
  
  return (
    <div className='w-full'>
      {cardContent}
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
  const duration = formatDuration(workout.minutes || 0)
  const intervals = workout.intervals || []

  if (variant === 'mobile') {
    return (
      <div className="bg-white border border-gray-300 rounded-lg p-2">
        <div className="mb-1">
          <SimplifiedChart intervals={intervals} height="h-12" />
        </div>
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
          <SimplifiedChart intervals={intervals} height="h-16" />
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
