"use client"

import { getBeginningOfWeek, getEndOfWeek } from '../../utils/TimeUtil';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import { Week } from './Week';
import Row from '../ui/Row';
import { useState } from 'react';
import { WorkoutModal } from '../workouts/Modal';
import { getStoredWahooToken, deleteWahooWorkout, updateWahooWorkout } from '../../utils/WahooUtil';
import { updateGymWorkout, deleteGymWorkout } from '../../utils/GymUtil';
import { useQueryClient } from '@tanstack/react-query';

dayjs.extend(isBetween);

const Calendar = ({ start, activities, plannedWorkouts = [], gymWorkouts = [] }) => {
  const [editingWorkout, setEditingWorkout] = useState(null);
  const queryClient = useQueryClient();
  
  const handleWorkoutClick = (workout) => {
    if (workout.exercises) {
      setEditingWorkout({
        type: 'gym',
        ...workout,
        selectedDate: dayjs(workout.datetime).format('YYYY-MM-DD'),
        workoutTitle: 'Gym Workout'
      });
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
    }
  };

  const handleSaveEditedWorkout = async (data) => {
    if (editingWorkout?.type === 'gym') {
      const { exercises, date } = data;
      try {
        await updateGymWorkout(editingWorkout.id, exercises, date);
        queryClient.invalidateQueries({ queryKey: ['workouts'] });
        setEditingWorkout(null);
        alert("Successfully updated gym workout!");
      } catch (error) {
        console.error("Error updating gym workout:", error);
        alert("Failed to update gym workout");
      }
    } else {
      const { intervals, title, date } = data;
      const accessToken = getStoredWahooToken();
      if (!accessToken) {
        alert("Not authorized with Wahoo");
        throw new Error("Not authorized");
      }

      try {
        await updateWahooWorkout(editingWorkout.id, editingWorkout.plan_id, intervals, title, date);
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
      }
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
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return (
      <div className="font-bold">
        <Row header={dayjs(start).year()} columns={
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
    dayjs.extend(isBetween);
    const yearStart = dayjs(start).startOf('year');
    const nextWeek = dayjs().add(1, 'week');
    const isCurrentYear = dayjs(start).year() === dayjs().year();
    
    // Find the latest date to display (either start or latest planned workout)
    let latestDate = dayjs(start);
    if (plannedWorkouts.length > 0) {
      const latestWorkoutDate = plannedWorkouts.reduce((latest, workout) => {
        const workoutDate = dayjs(workout.starts);
        return workoutDate.isAfter(latest) ? workoutDate : latest;
      }, dayjs(start));
      
      if (latestWorkoutDate.isAfter(latestDate)) {
        latestDate = latestWorkoutDate;
      }
    }
    
    // Ensure at least one week beyond current week is shown (only for current year)
    if (isCurrentYear && latestDate.isBefore(nextWeek)) {
      latestDate = nextWeek;
    }
    
    const totalWeeks = latestDate.diff(yearStart, 'weeks') + 1;

    return [...Array(totalWeeks).keys()].map((i) => {
      const today = latestDate.subtract(i, 'weeks');
      const startDate = getBeginningOfWeek(today);
      const endDate = getEndOfWeek(today);
      const activitiesForWeek = activities.filter((activity) =>
        dayjs(activity.start_date).isBetween(startDate, endDate)
      );
      
      const plannedWorkoutsForWeek = plannedWorkouts.filter((workout) =>
        dayjs(workout.starts).isBetween(startDate, endDate)
      );

      const gymWorkoutsForWeek = gymWorkouts.filter((workout) =>
        dayjs(workout.datetime).isBetween(startDate, endDate)
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

      <WorkoutModal
        workout={editingWorkout}
        onClose={() => setEditingWorkout(null)}
        onSave={handleSaveEditedWorkout}
        onDelete={handleDeleteWorkout}
      />
    </>
  );
};

export default Calendar;
