import '../styling/calendar.css';

import { Table } from "react-bootstrap"
import dayjs from 'dayjs';

const Totals = ({athleteActivities}) => {
  const getTotalTime = () => {
    let totalRideTime = athleteActivities.reduce((partialSum, a) => partialSum + a.moving_time, 0)
    return (totalRideTime / 3600).toFixed(2)
  }

  const getTotalDistance = () => {
    let totalRideDistance = athleteActivities.reduce((partialSum, a) => partialSum + a.distance, 0)
    return (totalRideDistance / 1000).toFixed(2)
  }

  const getTotalElevation = () => {
    return athleteActivities.reduce((partialSum, a) => partialSum + a.total_elevation_gain, 0)
  }

  return (
    <Table striped bordered hover>
      <tbody>
        <tr>
          <th colSpan={2} className="centered">{dayjs(athleteActivities[0].start_date).year()}</th>
        </tr>
        <tr>
          <td>Total ride time</td>
          <td>{getTotalTime()} h</td>
        </tr>
        <tr>
          <td>Total distance</td>
          <td>{getTotalDistance()} km</td>
        </tr>
        <tr>
          <td>Total elevation</td>
          <td>{getTotalElevation()} m</td>
        </tr>
        <tr>
          <td>Ride count</td>
          <td>{athleteActivities.length}</td>
        </tr>
      </tbody>
    </Table>
  )
}

export default Totals