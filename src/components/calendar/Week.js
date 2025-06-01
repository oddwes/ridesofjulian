"use client"

import Row from '../ui/Row'
import Day from './Day'
import dayjs from 'dayjs'
import { RowHeader } from './RowHeader'

export const Week = ({ startDate, endDate, activitiesForWeek }) => {
  const days = [...Array(7).keys()].map((i) => {
    const date = startDate.add(i, 'day');
    const activity = activitiesForWeek.find((a) => dayjs(a.start_date).isSame(date, 'date'));
    return <Day activity={activity} isToday={date.isSame(dayjs(), 'date')} key={date} />;
  })

  return (
    <Row>
      <RowHeader startDate={startDate} endDate={endDate} activitiesForWeek={activitiesForWeek} />
      {days}
    </Row>
  )
}
