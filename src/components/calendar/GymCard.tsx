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
    return exercise.weight ? `${exercise.name} (${exercise.weight} lbs)` : exercise.name
  }
  
  const exercises = workout.exercises || []
  
  if (variant === 'mobile') {
    const itemsPerColumn = Math.ceil(exercises.length / 3)
    const column1 = exercises.slice(0, itemsPerColumn)
    const column2 = exercises.slice(itemsPerColumn, itemsPerColumn * 2)
    const column3 = exercises.slice(itemsPerColumn * 2)
    
    return (
      <div 
        onClick={onClick}
        className="bg-purple-100 border-2 border-purple-400 rounded-lg p-2 cursor-pointer active:opacity-70 transition-opacity"
      >
        <div className="flex flex-col">
          <div className="text-sm font-semibold text-purple-800 mb-2">
            💪 Gym
          </div>
          <div className="flex gap-2 text-[11px] text-purple-700">
            <div className="flex flex-col">
              {column1.map((exercise, idx) => (
                <div key={idx}>{formatExercise(exercise)}</div>
              ))}
            </div>
            {column2.length > 0 && (
              <div className="flex flex-col">
                {column2.map((exercise, idx) => (
                  <div key={idx}>{formatExercise(exercise)}</div>
                ))}
              </div>
            )}
            {column3.length > 0 && (
              <div className="flex flex-col">
                {column3.map((exercise, idx) => (
                  <div key={idx}>{formatExercise(exercise)}</div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  const midpoint = Math.ceil(exercises.length / 2)
  const leftColumn = exercises.slice(0, midpoint)
  const rightColumn = exercises.slice(midpoint)

  return (
    <div 
      onClick={onClick}
      className='w-full cursor-pointer hover:opacity-80 transition-opacity'
    >
      <div className="w-full bg-purple-100 border-2 border-purple-400 rounded flex flex-col justify-center items-center py-1 px-2">
        <div className="text-sm font-semibold text-purple-800 mb-2">
          💪 Gym
        </div>
        <div className="flex gap-4 text-xs text-purple-700 w-full justify-center">
          <div className="flex flex-col">
            {leftColumn.map((exercise, idx) => (
              <div key={idx}>{formatExercise(exercise)}</div>
            ))}
          </div>
          {rightColumn.length > 0 && (
            <div className="flex flex-col">
              {rightColumn.map((exercise, idx) => (
                <div key={idx}>{formatExercise(exercise)}</div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

