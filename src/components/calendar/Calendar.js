"use client"

import { getBeginningOfWeek, getEndOfWeek } from '../../utils/TimeUtil';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import { Week } from './Week';
import Row from '../ui/Row';

dayjs.extend(isBetween);

const Calendar = ({ start, activities }) => {
  const printHeaderRow = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return (
      <div className="font-bold">
        <Row>
          <div className="flex justify-center">
            {dayjs(start).year()}
          </div>
          <div className="flex justify-between w-full mx-4">
            {days.map((day, index) => (
              <div key={index} className="text-center w-full">
                {day}
              </div>
            ))}
          </div>
        </Row>
      </div>
    );
  };

  const printWeeks = () => {
    dayjs.extend(isBetween);
    const weekCount = dayjs(start).diff(dayjs(start).startOf('year'), 'weeks');

    return [...Array(weekCount).keys()].map((i) => {
      const today = start.subtract(i, 'weeks');
      const startDate = getBeginningOfWeek(today);
      const endDate = getEndOfWeek(today);
      const activitiesForWeek = activities.filter((activity) =>
        dayjs(activity.start_date).isBetween(startDate, endDate)
      );

      return (
        <>
          <hr className="w-full h-0.25 bg-gray-300 border-0 rounded-sm" />
          <Week
            startDate={startDate}
            endDate={endDate}
            activitiesForWeek={activitiesForWeek}
            key={startDate}
          />
        </>
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
