import { memo } from 'react'
import { Edit2, Trash2 } from 'lucide-react'
import { WorkoutChart } from './RideWorkoutChart'
import type { RideWorkout } from '@/types/workout'

interface PlannedRideProps {
  workout: RideWorkout
  isToday?: boolean
  onEdit?: (workout: RideWorkout) => void
  onDelete?: (workout: RideWorkout) => void
}

const formatDurationMinutes = (intervals: RideWorkout['intervals']) =>
  intervals.reduce((sum, interval) => sum + interval.duration / 60, 0)

export const PlannedRide = memo(({ 
  workout, 
  isToday = false, 
  onEdit, 
  onDelete
}: PlannedRideProps) => {
  const minutes = formatDurationMinutes(workout.intervals)
  const durationHours = Math.floor(minutes / 60)
  const durationMinutes = Math.round(minutes % 60)

  return (
    <div
      className={`bg-slate-950 border rounded-xl p-4 text-slate-100 shadow-md ${
        isToday ? 'border-2 border-blue-500' : 'border-slate-800'
      }`}
    >
      <div className="mb-2">
        <div className="flex justify-between items-start mb-1">
          <h4 className="text-sm font-semibold truncate mr-2">
            {workout.workoutTitle}
          </h4>
          {(onEdit || onDelete) && (
            <div className="flex gap-1">
              {onDelete && (
                <button
                  onClick={() => onDelete(workout)}
                  className="p-1 rounded-full text-red-400 hover:bg-slate-800/80"
                >
                  <Trash2 size={16} />
                </button>
              )}
              {onEdit && (
                <button
                  onClick={() => onEdit(workout)}
                  className="p-1 rounded-full text-blue-400 hover:bg-slate-800/80"
                >
                  <Edit2 size={16} />
                </button>
              )}
            </div>
          )}
        </div>
        <p className="text-xs text-slate-300">
          {workout.selectedDate} | {durationHours}h {durationMinutes}m
        </p>
      </div>
      <WorkoutChart intervals={workout.intervals} />
    </div>
  )
})

PlannedRide.displayName = 'PlannedRide'

