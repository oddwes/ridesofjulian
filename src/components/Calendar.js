import { getBeginningOfWeek, getEndOfWeek } from "../utils/TimeUtil"

import Col from "react-bootstrap/Col"
import Container from "react-bootstrap/Container"
import { Link } from "react-router-dom"
import Row from "react-bootstrap/Row"
import dayjs from "dayjs"

const Calendar = ({start, activities}) => {
  const printRow = (header, columns) => {
    return (
      <Row>
        <Col xs={2} style={{textAlign:'center'}}>{header}</Col>
        {
          columns.map(col => <Col>{col}</Col>)
        }
      </Row>
    )
  }

  let rows = []
  for(let i=0; i< 8; ++i) {
    const today = start.subtract(i, 'weeks')
    const startDate = getBeginningOfWeek(today)
    const endDate = getEndOfWeek(today)
    const header = `${startDate.format('D')}-${endDate.format('D')} ${endDate.format('MMM')}`
    let week = []
    for(let i=0; i<7; ++i) {
      const date = startDate.add(i, 'day')
      if(date.isSame(dayjs(), 'date')) {
        week.push('TODAY')
      } else {
        const activity = activities.find(a => dayjs(a.start_date).isSame(date, 'date'))
        if(activity) {
          week.push(
            <Link
              to={`https://strava.com/activities/${activity.id}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {(activity.distance/1000).toFixed(2)} KM
            </Link>
          )
        } else {
          week.push('')
        }
      }
    }
    rows.push(printRow(header, week))
  }

  return (
    <>
      <hr/>
      <Container fluid>
        {printRow(2024, ['Mon', 'Tue', 'Wed', 'Thur', 'Fri', 'Sat', 'Sun'])}
      </Container>
      <hr/>
      {rows}
    </>
  )
}

export default Calendar