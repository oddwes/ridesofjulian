interface GymWorkout {
  id?: string
  exercises?: Array<{
    completed?: number
    sets?: number
  }>
}

export const GymCard = ({ 
  workout, 
  variant = 'mobile',
  onClick 
}: { 
  workout: GymWorkout
  variant?: 'mobile' | 'desktop'
  onClick?: () => void 
}) => {
  const exerciseCount = workout.exercises?.length || 0
  const completedCount = workout.exercises?.filter(e => e.completed === e.sets).length || 0
  
  if (variant === 'mobile') {
    return (
      <div className="bg-purple-100 border-2 border-purple-400 rounded-lg p-2">
        <div className="flex items-center gap-2">
          <div className="text-sm font-semibold text-purple-800">
            💪 Gym
          </div>
          <div className="flex gap-2 text-[11px] text-purple-700">
            <span>{exerciseCount} exercises</span>
            {completedCount > 0 && (
              <span className="text-purple-600">
                {completedCount}/{exerciseCount} complete
              </span>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div 
      onClick={onClick}
      className='w-full cursor-pointer hover:opacity-80 transition-opacity'
    >
      <div className="w-full bg-purple-100 border-2 border-purple-400 rounded flex flex-col justify-center items-center py-1">
        <div className="text-sm font-semibold text-purple-800">
          💪 Gym
        </div>
        <div className="text-xs text-purple-700">
          {exerciseCount} exercises
        </div>
        {completedCount > 0 && (
          <div className="text-xs text-purple-600">
            {completedCount}/{exerciseCount} complete
          </div>
        )}
      </div>
    </div>
  )
}

