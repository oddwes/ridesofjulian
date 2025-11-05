import { getTSS } from "../../utils/StravaUtil"
import { useContext, useState } from "react"
import { FtpContext } from "../FTP"
import Link from "next/link"
import { useRouter } from "next/navigation"
import Col from "../ui/Col";
import { ChevronUp, PlusCircle } from "lucide-react"
import dayjs from "dayjs"

const Day = ({ activity, plannedWorkout, isToday, date }) => {
  const { ftp } = useContext(FtpContext)
  const router = useRouter()
  const [isHovered, setIsHovered] = useState(false)
  
  const handleWorkoutClick = (workout) => {
    router.push(`/workout/${workout.id}`)
  }

  const handleAddWorkout = () => {
    sessionStorage.setItem('new_workout_date', date.format('YYYY-MM-DD'))
    router.push('/workout')
  }

  const isFutureDate = date && date.isAfter(dayjs(), 'day')
  const showAddButton = isFutureDate && !activity && !plannedWorkout

  const todayTag = (
    <Col>
      <div className="flex flex-col justify-center items-center h-full">
        <p>Today</p>
      </div>
      <div>
        <ChevronUp className="text-[#FC5201]" />
      </div>
    </Col>
  )

  const activityCircle = (activity, isToday) => {
    return (
      <Col size="12" className="justify-between gap-2">
        <div className='relative w-6/10 aspect-square rounded-full bg-[#FC5201] [container-type:inline-size] text-white flex flex-col justify-center items-center text-center'>
          <Link
            href={`https://strava.com/activities/${activity.id}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <div className="text-xs font-semibold px-2 mb-1">
              {activity.name}
            </div>
            <div>
              {Math.round(activity.distance / 1000)} km
            </div>
            <div>
              {Math.round(activity.total_elevation_gain)} m
            </div>
            {(ftp !== undefined && ftp !== 0) && (
              <div>
                {getTSS(activity, ftp)} TSS
              </div>
            )}
          </Link>
        </div>
        {isToday && (
          <ChevronUp className="text-[#FC5201]" />
        )}
      </Col>
    )
  }

  const getIntervalColor = (powerMin, powerMax) => {
    const avgPower = (powerMin + powerMax) / 2
    if (avgPower < 100) return "rgba(156, 163, 175, 0.6)"
    if (avgPower < 150) return "rgba(96, 165, 250, 0.6)"
    if (avgPower < 200) return "rgba(52, 211, 153, 0.6)"
    if (avgPower < 250) return "rgba(251, 191, 36, 0.6)"
    if (avgPower < 300) return "rgba(251, 146, 60, 0.6)"
    return "rgba(220, 38, 38, 0.6)"
  }

  const plannedWorkoutBar = (workout, isToday) => {
    const minutes = workout.minutes || 0
    const hours = Math.floor(minutes / 60)
    const remainingMins = minutes % 60
    const duration = hours > 0 ? `${hours}h ${remainingMins}m` : `${remainingMins}m`
    
    const intervals = workout.intervals || []
    const totalDuration = intervals.reduce((sum, i) => sum + (i.exit_trigger_value || 0), 0)
    
    return (
      <Col size="12" className="justify-between gap-1">
        <div 
          onClick={() => handleWorkoutClick(workout)}
          className='w-full cursor-pointer hover:opacity-80 transition-opacity'
        >
          <div className="w-full h-16 bg-gray-50 border border-gray-300 rounded flex items-end overflow-hidden">
            {intervals.length > 0 ? (
              intervals.map((interval, idx) => {
                const width = totalDuration > 0 ? (interval.exit_trigger_value / totalDuration) * 100 : 0
                const powerMin = interval.targets?.[0]?.low || 0
                const powerMax = interval.targets?.[0]?.high || 0
                const avgPower = (powerMin + powerMax) / 2
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
          <div className="text-xs text-center mt-1 font-semibold text-gray-700 truncate">
            {workout.name}
          </div>
          <div className="text-xs text-center text-gray-600">
            {duration}
          </div>
        </div>
        {isToday && (
          <ChevronUp className="text-[#FC5201]" />
        )}
      </Col>
    )
  }

  if (activity) {
    return activityCircle(activity, isToday)
  } else if (plannedWorkout) {
    return plannedWorkoutBar(plannedWorkout, isToday)
  } else if (isToday) {
    return todayTag
  } else if (showAddButton) {
    return (
      <Col>
        <div 
          className="relative w-full h-full flex items-center justify-center"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {isHovered && (
            <div 
              onClick={handleAddWorkout}
              className="cursor-pointer"
            >
              <PlusCircle className="text-blue-600 hover:text-blue-700" size={32} />
            </div>
          )}
        </div>
      </Col>
    )
  } else {
    return <Col><div></div></Col>
  }
}

export default Day