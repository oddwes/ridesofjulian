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
    sessionStorage.setItem('editing_workout', JSON.stringify({
      id: workout.id,
      workoutTitle: workout.name,
      selectedDate: workout.starts.split('T')[0],
      planId: workout.plan_id
    }))
    router.push('/workout')
  }

  const handleAddWorkout = () => {
    sessionStorage.removeItem('editing_workout')
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

  const plannedWorkoutCircle = (workout, isToday) => {
    const minutes = workout.minutes || 0
    const hours = Math.floor(minutes / 60)
    const remainingMins = minutes % 60
    const duration = hours > 0 ? `${hours}h ${remainingMins}m` : `${remainingMins}m`
    
    return (
      <Col size="12" className="justify-between gap-2">
        <div 
          onClick={() => handleWorkoutClick(workout)}
          className='relative w-1/2 aspect-square rounded-full border-2 border-[#FC5201] [container-type:inline-size] text-[#FC5201] flex flex-col justify-center items-center text-center cursor-pointer hover:bg-[#FC5201] hover:text-white transition-colors'
        >
          <div className="text-xs font-semibold px-2">
            {workout.name}
          </div>
          <div className="text-xs">
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
    return plannedWorkoutCircle(plannedWorkout, isToday)
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