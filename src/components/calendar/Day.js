import { useState } from "react"
import { useRouter } from "next/navigation"
import { PlusCircle } from "lucide-react"
import dayjs from "dayjs"
import Col from "../ui/Col"
import { RideCard, PlannedRideCard } from "./RideCard"
import { GymCard } from "./GymCard"

const Day = ({ activity, plannedWorkout, gymWorkout, isToday, date, onWorkoutClick }) => {
  const router = useRouter()
  const [isHovered, setIsHovered] = useState(false)
  
  const handleWorkoutClick = (workout) => {
    if (onWorkoutClick) {
      onWorkoutClick(workout)
    } else {
      router.push(`/workout/${workout.id}`)
    }
  }

  const handleAddWorkout = () => {
    sessionStorage.setItem('new_workout_date', date.format('YYYY-MM-DD'))
    router.push('/workout')
  }

  const isFutureDate = date && date.isAfter(dayjs(), 'day')
  const showAddButton = isFutureDate && !activity && !plannedWorkout && !gymWorkout

  const todayTag = (
    <Col>
      <div className="relative w-full h-full flex flex-col justify-center items-center border-2 border-blue-600 rounded">
        <p>Today</p>
      </div>
    </Col>
  )


  if (activity || gymWorkout || plannedWorkout) {
    const items = []
    
    if (activity) {
      items.push({ type: 'activity', time: new Date(activity.start_date), content: <RideCard activity={activity} variant="desktop" /> })
    }
    if (plannedWorkout && !activity) {
      items.push({ type: 'planned', time: date.toDate(), content: <PlannedRideCard workout={plannedWorkout} variant="desktop" isToday={false} onClick={() => handleWorkoutClick(plannedWorkout)} /> })
    }
    if (gymWorkout) {
      items.push({ type: 'gym', time: new Date(gymWorkout.datetime), content: <GymCard workout={gymWorkout} variant="desktop" onClick={() => handleWorkoutClick(gymWorkout)} /> })
    }
    
    items.sort((a, b) => a.time - b.time)
    
    return (
      <Col size="12">
        <div className={`relative w-full h-full grow flex justify-center items-center ${isToday ? 'border-2 border-blue-600 rounded' : ''}`}>
          <div className="w-full flex flex-col gap-1">
            {items.map((item, idx) => (
              <div key={idx}>{item.content}</div>
            ))}
          </div>
        </div>
      </Col>
    )
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