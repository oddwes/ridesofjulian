import { getBeginningOfWeek, getEndOfWeek } from '../../utils/TimeUtil';
import Col from 'react-bootstrap/Col';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import { Week } from './Week';

import './../../styling/calendar.css';

const Calendar = ({ start, activities }) => {
  const printHeaderRow = () => {
    return (
      <Row>
        <Col xs={2} className="header-col">
          {dayjs(start).year()}
        </Col>
        {['Mon', 'Tue', 'Wed', 'Thur', 'Fri', 'Sat', 'Sun'].map((day) => {
          return (
            <Col className="header-row centered" key={day}>
              {day}
            </Col>
          );
        })}
      </Row>
    );
  };

  const printRows = () => {
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
        <Week
          startDate={startDate}
          endDate={endDate}
          activitiesForWeek={activitiesForWeek}
          key={startDate}
        />
      );
    });
  };

  return (
    <>
      <Container fluid>
        <hr />
        {printHeaderRow()}
        <hr />
        <hr />
        {printRows()}
      </Container>
    </>
  );
};

export default Calendar;
