import Row from '../ui/Row'
import Day from './Day'
import dayjs from 'dayjs'
import { RowHeader } from './RowHeader'

export const Week = ({ startDate, endDate, activitiesForWeek, plannedWorkoutsForWeek = [], gymWorkoutsForWeek = [], onWorkoutClick }) => {
  const days = [...Array(7).keys()].map((i) => {
    const date = startDate.add(i, 'day');
    const activities = activitiesForWeek.filter((a) => dayjs(a.start_date).isSame(date, 'date'));
    const plannedWorkouts = plannedWorkoutsForWeek.filter((w) => dayjs(w.starts).isSame(date, 'date'));
    const gymWorkouts = gymWorkoutsForWeek.filter((w) => dayjs(w.datetime).isSame(date, 'date'));
    return <Day activities={activities} plannedWorkouts={plannedWorkouts} gymWorkouts={gymWorkouts} isToday={date.isSame(dayjs(), 'date')} date={date} key={date} onWorkoutClick={onWorkoutClick} />;
  })

  return (
    <Row
      header={<RowHeader startDate={startDate} endDate={endDate} activitiesForWeek={activitiesForWeek} />}
      columns={days}
    />
  )
}
