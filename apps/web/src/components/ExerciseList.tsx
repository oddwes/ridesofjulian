import { useEffect, useState, useRef } from 'react';
import { TrashIcon } from '@heroicons/react/24/solid';
import EditableLabel from 'react-inline-editing';
import { Exercise } from '@ridesofjulian/shared';

interface ExerciseListProps {
  workoutId?: string;
  exercises: Exercise[];
  onExercisesChange: (updatedExercises: Exercise[]) => void;
  focusExerciseId?: string;
  onFocusRequest: (exerciseId: string | undefined) => void;
  restDurationSeconds: number;
  weightUnit?: 'kg' | 'lb';
}

export const ExerciseList: React.FC<ExerciseListProps> = ({ exercises, onExercisesChange, focusExerciseId, onFocusRequest, restDurationSeconds, weightUnit = 'lb' }) => {
  const [localExercises, setLocalExercises] = useState<Exercise[]>(exercises);
  const [editingExerciseId, setEditingExerciseId] = useState<string | undefined>(undefined);
  const longPressTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isLongPress, setIsLongPress] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerExerciseId, setTimerExerciseId] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setLocalExercises(exercises);
  }, [exercises]);

  useEffect(() => {
    if (focusExerciseId) {
      setEditingExerciseId(focusExerciseId);
    }
  }, [focusExerciseId]);

  useEffect(() => {
    if (timerExerciseId && timerSeconds > 0) {
      timerRef.current = setTimeout(() => {
        setTimerSeconds(prev => prev - 1);
      }, 1000);
    } else if (timerSeconds === 0 && timerExerciseId) {
      setTimerExerciseId(null);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [timerSeconds, timerExerciseId]);

  const startTimer = (exerciseId: string) => {
    const duration = restDurationSeconds && restDurationSeconds > 0 ? restDurationSeconds : 120;
    setTimerSeconds(duration);
    setTimerExerciseId(exerciseId);
  };

  const handleExerciseChange = (exerciseId: string, field: 'name' | 'weight' | 'reps' | 'sets', value: string | number) => {
    const updatedExercises = localExercises.map(ex =>
      ex.id === exerciseId ? { ...ex, [field]: value || (field === 'name' ? '' : 0) } : ex
    );
    setLocalExercises(updatedExercises);
    onExercisesChange(updatedExercises);
  };

  const localDeleteExercise = (exerciseId: string) => {
    const updatedExercises = localExercises.filter(ex => ex.id !== exerciseId);
    setLocalExercises(updatedExercises);
    onExercisesChange(updatedExercises);
  };

  const localIncrementCompleted = (exerciseId: string) => {
    const target = localExercises.find(ex => ex.id === exerciseId);
    if (!target) return;
    const sets = target.sets || 0;
    const completed = target.completed || 0;
    if (sets === 0 || completed >= sets) return;

    const updatedExercises = localExercises.map(ex =>
      ex.id === exerciseId
        ? { ...ex, completed: (ex.completed || 0) + 1 }
        : ex
    );
    setLocalExercises(updatedExercises);
    onExercisesChange(updatedExercises);
    startTimer(exerciseId);
  };

  const localDecrementCompleted = (exerciseId: string) => {
    const updatedExercises = localExercises.map(ex =>
      ex.id === exerciseId && ex.completed > 0
        ? { ...ex, completed: ex.completed - 1 }
        : ex
    );
    setLocalExercises(updatedExercises);
    onExercisesChange(updatedExercises);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onFocusRequest(undefined);
    }
  };

  const handleMouseDown = (exerciseId: string) => {
    setIsLongPress(false);
    longPressTimeoutRef.current = setTimeout(() => {
      setIsLongPress(true);
      localDecrementCompleted(exerciseId);
    }, 500);
  };

  const handleMouseUp = (exerciseId: string) => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }

    if (!isLongPress) {
      localIncrementCompleted(exerciseId);
    }
  };

  const handleMouseLeave = () => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
  };

  const handleTouchStart = (event: React.TouchEvent, exerciseId: string) => {
    handleMouseDown(exerciseId);
  };

  const handleTouchEnd = (event: React.TouchEvent, exerciseId: string) => {
    event.preventDefault();
    handleMouseUp(exerciseId);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-2">
      {localExercises.map((exercise) => (
        <div key={exercise.id} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center mb-2">
            <div onKeyDown={handleKeyDown}>
              <EditableLabel
                text={exercise.name}
                labelClassName="font-semibold text-lg text-gray-800 dark:text-gray-200"
                inputClassName="bg-gray-100 dark:bg-gray-600 px-1 rounded font-semibold text-lg"
                onFocusOut={(name: string) => {
                  handleExerciseChange(exercise.id, 'name', name);
                  onFocusRequest(undefined);
                }}
                isEditing={editingExerciseId === exercise.id}
              />
            </div>
            <button
              onClick={() => localDeleteExercise(exercise.id)}
              className="text-red-500 hover:text-red-700 dark:hover:text-red-400"
              aria-label="Delete exercise"
            >
              <TrashIcon className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-3 items-center gap-4 mb-4">
            <div>
              <label htmlFor={`weight-${exercise.id}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Weight ({weightUnit})
              </label>
              <input
                id={`weight-${exercise.id}`}
                type="number"
                min="0"
                value={exercise.weight || ''}
                onChange={(e) => handleExerciseChange(exercise.id, 'weight', parseInt(e.target.value))}
                className="w-full p-1.5 border border-gray-300 dark:border-gray-500 rounded bg-white dark:bg-gray-600 text-sm text-gray-900 dark:text-gray-100 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label htmlFor={`sets-${exercise.id}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Sets
              </label>
              <input
                id={`sets-${exercise.id}`}
                type="number"
                min="0"
                value={exercise.sets || ''}
                onChange={(e) => handleExerciseChange(exercise.id, 'sets', parseInt(e.target.value))}
                className="w-full p-1.5 border border-gray-300 dark:border-gray-500 rounded bg-white dark:bg-gray-600 text-sm text-gray-900 dark:text-gray-100 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label htmlFor={`reps-${exercise.id}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Reps
              </label>
              <input
                id={`reps-${exercise.id}`}
                type="number"
                min="0"
                value={exercise.reps || ''}
                onChange={(e) => handleExerciseChange(exercise.id, 'reps', parseInt(e.target.value))}
                className="w-full p-1.5 border border-gray-300 dark:border-gray-500 rounded bg-white dark:bg-gray-600 text-sm text-gray-900 dark:text-gray-100 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          {(exercise.sets || 0) > 0 && (
            <div
              className="flex flex-col justify-center items-center space-y-2 border rounded-lg p-2 cursor-pointer"
              onMouseDown={() => handleMouseDown(exercise.id)}
              onMouseUp={() => handleMouseUp(exercise.id)}
              onMouseLeave={handleMouseLeave}
              onTouchStart={(e) => handleTouchStart(e, exercise.id)}
              onTouchEnd={(e) => handleTouchEnd(e, exercise.id)}
              onTouchCancel={handleMouseLeave}
            >
              <div className="flex items-center m-2">
                {Array.from({ length: exercise.sets || 0 }).map((_, index) => (
                  <div
                    key={index}
                    className={`h-2 w-5 rounded-full ${index < (exercise.completed || 0) ? 'bg-green-500' : 'bg-gray-700'} rotate-90`}
                  ></div>
                ))}
              </div>
            </div>
          )}
          {timerExerciseId === exercise.id && (
            <div className="mt-2 bg-blue-500 text-white px-3 py-2 rounded-lg text-center">
              <div className="text-sm font-medium">Rest Timer</div>
              <div className="text-lg font-bold">{formatTime(timerSeconds)}</div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

