import '../styling/calendar.css';

import { getBeginningOfWeek, getEndOfWeek } from "../utils/TimeUtil"
import { getTotalDistance, getTotalElevation, getTotalTime } from '../utils/StravaUtil';

import Col from "react-bootstrap/Col"
import Container from "react-bootstrap/Container"
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Link } from "react-router-dom"
import Row from "react-bootstrap/Row"
import dayjs from "dayjs"
import { faAngleUp } from '@fortawesome/free-solid-svg-icons';
import isBetween from "dayjs/plugin/isBetween"

const Calendar = ({start, activities, isHeader = false}) => {
  const printHeaderRow = () => {
    return (
      <Row>
        <Col xs={2} className='header-col'>{dayjs(start).year()}</Col>
        {
          ['Mon', 'Tue', 'Wed', 'Thur', 'Fri', 'Sat', 'Sun'].map(day => {
            return (
              <Col className='header-row centered'>
                {day}
              </Col>
            )
          })
        }
      </Row>
    )
  }

  const printRows = () => {
    dayjs.extend(isBetween)
    const weekCount = dayjs(start).diff(dayjs(start).startOf('year'), 'weeks')
    return (
      [...Array(weekCount).keys()].map(i => {
        const today = start.subtract(i, 'weeks')
        const startDate = getBeginningOfWeek(today)
        const endDate = getEndOfWeek(today)
        const weekActivities = activities.filter(activity => dayjs(activity.start_date).isBetween(startDate, endDate))
        return (
          <>
            <Row>
              {printRowHeader(startDate, endDate, weekActivities)}
              {
                [...Array(7).keys()].map(i => {
                  const date = startDate.add(i, 'day')
                  const activity = weekActivities.find(a => dayjs(a.start_date).isSame(date, 'date'))
                  return printDay(activity, date.isSame(dayjs(), 'date'))
                })
              }
            </Row>
            <hr/>
          </>
        )
      })
    )
  }

  const printRowHeader = (startDate, endDate, weekActivities) => {
    let dateRange
    if(startDate.isSame(endDate, 'month')) {
      dateRange = `${startDate.format('D')}-${endDate.format('D')} ${endDate.format('MMM')}`
    } else {
      dateRange = `${startDate.format('D')} ${startDate.format('MMM')}-${endDate.format('D')} ${endDate.format('MMM')}`
    }
    return (
      <Col xs={2}>
        <p className='header-col'>{dateRange}</p>
        <div>
          <div className='small-text'>Total Distance</div>
          {getTotalDistance(weekActivities)} km
        </div>
        <div>
          <div className='small-text'>Total Elevation</div>
          {getTotalElevation(weekActivities)} m
        </div>
        <div>
          <div className='small-text'>Total Time</div>
          {getTotalTime(weekActivities)} h
        </div>
      </Col>
    )
  }

  const printDay = (activity, isToday) => {
    return (
      <Col>
        {activity && activityCircle(activity, isToday)}
        {!activity && isToday && todayTag()}
      </Col>
    )
  }

  const activityCircle = (activity, isToday) => {
    return (
      <Link
        to={`https://strava.com/activities/${activity.id}`}
        target="_blank"
        rel="noopener noreferrer"
        className='activity-circle-text'
      >
        <div className='centered'>
          <div className='circle' style={{margin:'auto'}}>
            <div className='text'>
              <div>
                {`${Math.round(activity.distance/1000)} km`}
              </div>
              <div>
                {`${Math.round(activity.total_elevation_gain)} m`}
              </div>
            </div>
          </div>
          <div className='centered activity-sub-text small-text'>{activity.name}</div>
          {isToday && (
            <div>
              <FontAwesomeIcon icon={faAngleUp} className='strava-text'/>
            </div>
          )}
        </div>
      </Link>
    )
  }

  const todayTag = () => {
    return (
      <div className='fill-parent'>
        <div className='vertical-center centered activity-sub-text'>
          <div>Today</div>
        </div>
        <div className='vertical-bottom'>
          <FontAwesomeIcon icon={faAngleUp} className='strava-text'/>
        </div>
      </div>
    )
  }

  return (
    <>
      <Container fluid>
        <hr/>
          {printHeaderRow()}
        <hr/>
        <hr/>
        {printRows()}
      </Container>
    </>
  )
}

export default Calendar