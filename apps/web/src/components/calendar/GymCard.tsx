interface GymWorkout {
  id?: string
  exercises?: Array<{
    name?: string
    weight?: number
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
  const formatExercise = (exercise: { name?: string; weight?: number }) => {
    if (!exercise?.name) return ''
    return exercise.name
  }
  
  const exercises = workout.exercises || []
  const subtitle = exercises.map(formatExercise).filter(Boolean).join(', ')
  
  if (variant === 'mobile') {
    return (
      <div 
        onClick={onClick}
        className="bg-purple-100 border-2 border-purple-400 rounded-lg p-2 cursor-pointer active:opacity-70 transition-opacity"
      >
        <div className="flex flex-col">
          <div className="text-sm font-semibold text-purple-800 mb-2">
            💪 Gym
          </div>
          <div className="text-[11px] text-purple-700">
            {subtitle}
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
      <div className="w-full bg-purple-100 border-2 border-purple-400 rounded flex flex-col justify-center items-center py-1 px-2">
        <div className="text-sm font-semibold text-purple-800 mb-2">
          💪 Gym
        </div>
        <div className="text-xs text-purple-700 w-full text-center">
          {subtitle}
        </div>
      </div>
    </div>
  )
}

