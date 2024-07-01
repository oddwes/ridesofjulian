import '../styling/totals.css';

import { getTotalDistance, getTotalElevation, getTotalTime } from '../utils/StravaUtil';

import { Table } from "react-bootstrap"
import dayjs from 'dayjs';

const Totals = ({athleteActivities}) => {
  return (
    <Table striped bordered hover>
      <tbody>
        <tr>
          <td colSpan={2} className="centered" style={{fontSize: 'large'}}>{dayjs(athleteActivities[0].start_date).year()}</td>
        </tr>
        <tr>
          <td style={{fontSize: 'smaller'}}>Total ride time</td>
          <td className='total'>{getTotalTime(athleteActivities)} h</td>
        </tr>
        <tr>
          <td style={{fontSize: 'smaller'}}>Total distance</td>
          <td className='total'>{getTotalDistance(athleteActivities)} km</td>
        </tr>
        <tr>
          <td style={{fontSize: 'smaller'}}>Total elevation</td>
          <td className='total'>{getTotalElevation(athleteActivities)} m</td>
        </tr>
        <tr>
          <td style={{fontSize: 'smaller'}}>Ride count</td>
          <td className='total'>{athleteActivities.length}</td>
        </tr>
      </tbody>
    </Table>
  )
}

export default Totals