import { Row } from "react-bootstrap"
import { RowHeader } from "./RowHeader"
import { Day } from "./Day"
import dayjs from "dayjs"

export const Week = ({ startDate, endDate, activitiesForWeek }) => {
  return (
    <>
      <Row>
        <RowHeader
          startDate={startDate}
          endDate={endDate}
          activitiesForWeek={activitiesForWeek}
        />
        {
          [...Array(7).keys()].map(i => {
            const date = startDate.add(i, 'day')
            const activity = activitiesForWeek.find(a => dayjs(a.start_date).isSame(date, 'date'))
            return <Day activity={activity} isToday={date.isSame(dayjs(), 'date')}/>
          })
        }
      </Row>
      <hr/>
    </>
  )
}