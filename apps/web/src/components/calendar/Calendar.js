import { getBeginningOfWeek, getEndOfWeek } from '../../utils/TimeUtil';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import { Week } from './Week';
import Row from '../ui/Row';
import { useState, useRef } from 'react';
import { Modal } from '../ui/Modal';
import { getStoredWahooToken, deleteWahooWorkout, updateWahooWorkout } from '../../utils/WahooUtil';
import { updateGymWorkout, deleteGymWorkout } from '../../utils/GymUtil';
import { useQueryClient } from '@tanstack/react-query';
import EditWorkout from '../workouts/Edit';

dayjs.extend(isBetween);

const Calendar = ({ dateRange, activities, plannedWorkouts = [], gymWorkouts = [], onActivityClick }) => {
  const [editingWorkout, setEditingWorkout] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [workoutTitle, setWorkoutTitle] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const editWorkoutRef = useRef(null);
  const queryClient = useQueryClient();
  
  const handleWorkoutClick = (workout) => {
    if (workout.exercises) {
      setEditingWorkout({
        type: 'gym',
        ...workout,
        selectedDate: dayjs(workout.datetime).format('YYYY-MM-DD'),
        workoutTitle: 'Gym Workout'
      });
      setWorkoutTitle('Gym Workout');
      setSelectedDate(dayjs(workout.datetime).format('YYYY-MM-DD'));
    } else {
      const intervals = (workout.intervals || []).map((interval, idx) => ({
        id: `${workout.id}-${idx}`,
        name: interval.name || `Interval ${idx + 1}`,
        duration: interval.exit_trigger_value || 0,
        powerMin: interval.targets?.[0]?.low || 0,
        powerMax: interval.targets?.[0]?.high || 0,
      }));
      
      const workoutDate = dayjs(workout.starts).format('YYYY-MM-DD');
      
      setEditingWorkout({
        type: 'ride',
        ...workout,
        intervals,
        selectedDate: workoutDate,
        workoutTitle: workout.name
      });
      setWorkoutTitle(workout.name || 'Untitled Workout');
      setSelectedDate(workoutDate);
    }
  };

  const handleSaveEditedWorkout = async (data) => {
    if (editingWorkout?.type === 'gym') {
      const { exercises, date } = data;
      setIsSaving(true);
      try {
        await updateGymWorkout(editingWorkout.id, exercises, date);
        queryClient.invalidateQueries({ queryKey: ['workouts'] });
        setEditingWorkout(null);
        alert("Successfully updated gym workout!");
      } catch (error) {
        console.error("Error updating gym workout:", error);
        alert("Failed to update gym workout");
      } finally {
        setIsSaving(false);
      }
    } else {
      const { intervals, title, date } = data;
      const accessToken = getStoredWahooToken();
      if (!accessToken) {
        alert("Not authorized with Wahoo");
        throw new Error("Not authorized");
      }

      setIsSaving(true);
      try {
        await updateWahooWorkout(editingWorkout.id, editingWorkout.plan_id, intervals, title ?? workoutTitle, date);
        queryClient.invalidateQueries({ queryKey: ['workout', editingWorkout.id] });
        queryClient.invalidateQueries({ queryKey: ['plannedWorkouts'] });
        if (editingWorkout?.plan_id) {
          queryClient.invalidateQueries({ queryKey: ['planIntervals', editingWorkout.plan_id] });
        }
        setEditingWorkout(null);
        alert("Successfully updated workout on Wahoo!");
      } catch (error) {
        console.error("Error updating workout:", error);
        alert("Failed to update workout");
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleModalSave = async () => {
    if (!editWorkoutRef.current) return;
    setIsSaving(true);
    try {
      await editWorkoutRef.current.save();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteWorkout = async () => {
    if (!editingWorkout) return;

    if (editingWorkout.type === 'gym') {
      try {
        await deleteGymWorkout(editingWorkout.id);
        queryClient.invalidateQueries({ queryKey: ['workouts'] });
        setEditingWorkout(null);
        alert("Successfully deleted gym workout!");
      } catch (error) {
        console.error("Error deleting gym workout:", error);
        alert("Failed to delete gym workout");
      }
    } else {
      const accessToken = getStoredWahooToken();
      if (!accessToken) {
        alert("Not authorized with Wahoo");
        return;
      }

      try {
        await deleteWahooWorkout(editingWorkout.id, editingWorkout.plan_id);
        queryClient.invalidateQueries({ queryKey: ['workout', editingWorkout.id] });
        queryClient.invalidateQueries({ queryKey: ['plannedWorkouts'] });
        if (editingWorkout.plan_id) {
          queryClient.invalidateQueries({ queryKey: ['planIntervals', editingWorkout.plan_id] });
        }
        setEditingWorkout(null);
        alert("Successfully deleted workout from Wahoo!");
      } catch (error) {
        console.error("Error deleting workout:", error);
        alert("Failed to delete workout");
      }
    }
  };

  const printHeaderRow = () => {
    const rangeStart = dayjs(dateRange.start);
    const rangeEnd = dayjs(dateRange.end);
    const sameYear = rangeStart.year() === rangeEnd.year();
    const label = sameYear
      ? rangeStart.year()
      : `${rangeStart.year()} - ${rangeEnd.year()}`;

    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return (
      <div className="font-bold h-full grow">
        <Row header={label} columns={
          days.map((day, index) => (
            <div key={index} className="text-center w-full">
              {day}
            </div>
          ))
        } />
      </div>
    );
  };

  const printWeeks = () => {
    const rangeStart = dayjs(dateRange.start);
    const rangeEnd = dayjs(dateRange.end);
    const firstWeekStart = getBeginningOfWeek(rangeStart);
    const lastWeekEnd = getEndOfWeek(rangeEnd);
    const totalWeeks = lastWeekEnd.diff(firstWeekStart, 'weeks') + 1;

    return [...Array(totalWeeks).keys()].map((i) => {
      const weekEnd = lastWeekEnd.subtract(i, 'weeks');
      const startDate = getBeginningOfWeek(weekEnd);
      const endDate = getEndOfWeek(weekEnd);
      const activitiesForWeek = activities.filter((activity) =>
        dayjs(activity.start_date).isBetween(startDate, endDate, null, '[]')
      );
      
      const plannedWorkoutsForWeek = plannedWorkouts.filter((workout) =>
        dayjs(workout.starts).isBetween(startDate, endDate, null, '[]')
      );

      const gymWorkoutsForWeek = gymWorkouts.filter((workout) =>
        dayjs(workout.datetime).isBetween(startDate, endDate, null, '[]')
      );

      return (
        <div key={startDate}>
          <hr className="w-full h-0.25 bg-gray-300 border-0 rounded-sm" />
          <Week
            startDate={startDate}
            endDate={endDate}
            activitiesForWeek={activitiesForWeek}
            plannedWorkoutsForWeek={plannedWorkoutsForWeek}
            gymWorkoutsForWeek={gymWorkoutsForWeek}
            onWorkoutClick={handleWorkoutClick}
            onActivityClick={onActivityClick}
            key={startDate}
          />
        </div>
      );
    })
  };

  return (
    <>
      <div className="flex flex-col w-full">
        <hr className="w-full h-0.25 my-4 bg-gray-300 border-0 rounded-sm" />
        {printHeaderRow()}
        <hr className="w-full h-0.25 my-4 bg-gray-300 border-0 rounded-sm" />
        {printWeeks()}
      </div>

      {editingWorkout && (
        <Modal
          title={workoutTitle}
          date={selectedDate}
          onTitleChange={setWorkoutTitle}
          onDateChange={setSelectedDate}
          onClose={() => setEditingWorkout(null)}
          onSave={handleModalSave}
          onDelete={handleDeleteWorkout}
          isSaving={isSaving}
          editableTitle={true}
        >
          {editingWorkout.type === 'gym' ? (
            <EditWorkout
              ref={editWorkoutRef}
              type="gym"
              initialExercises={editingWorkout.exercises}
              initialDate={selectedDate}
              onSave={handleSaveEditedWorkout}
              disabled={isSaving}
            />
          ) : (
            <EditWorkout
              ref={editWorkoutRef}
              type="ride"
              initialIntervals={editingWorkout.intervals}
              initialTitle={workoutTitle}
              initialDate={selectedDate}
              onSave={handleSaveEditedWorkout}
              disabled={isSaving}
            />
          )}
        </Modal>
      )}
    </>
  );
};

export default Calendar;
