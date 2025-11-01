"use client"

import { getBeginningOfWeek, getEndOfWeek } from '../../utils/TimeUtil';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import { Week } from './Week';
import Row from '../ui/Row';

dayjs.extend(isBetween);

const Calendar = ({ start, activities, plannedWorkouts = [] }) => {
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

      return (
        <div key={startDate}>
          <hr className="w-full h-0.25 bg-gray-300 border-0 rounded-sm" />
          <Week
            startDate={startDate}
            endDate={endDate}
            activitiesForWeek={activitiesForWeek}
            plannedWorkoutsForWeek={plannedWorkoutsForWeek}
            key={startDate}
          />
        </div>
      );
    })
  };

  return (
    <div className="flex flex-col w-full">
      <hr className="w-full h-0.25 my-4 bg-gray-300 border-0 rounded-sm" />
      {printHeaderRow()}
      <hr className="w-full h-0.25 my-4 bg-gray-300 border-0 rounded-sm" />
      {printWeeks()}
    </div>
  );
};

export default Calendar;
