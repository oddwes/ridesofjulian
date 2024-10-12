import { Col } from "react-bootstrap"
import { getTotalDistance, getTotalElevation, getTotalTime, getTotalTss } from "../../utils/StravaUtil"
import { useContext } from "react"
import { FtpContext } from "../FTP"

export const RowHeader = ({startDate, endDate, activitiesForWeek}) => {
  const ftp = useContext(FtpContext)

  let dateRange
  if(startDate.isSame(endDate, 'month')) {
    dateRange = `${startDate.format('D')}-${endDate.format('D')} ${endDate.format('MMM')}`
  } else {
    dateRange = `${startDate.format('D')} ${startDate.format('MMM')}-${endDate.format('D')} ${endDate.format('MMM')}`
  }

  return (
    <Col xs={2}>
      <div className='header-col'>{dateRange}</div>
      <div>
        <div className='small-text'>Total Distance</div>
        {getTotalDistance(activitiesForWeek)} km
      </div>
      <div>
        <div className='small-text'>Total Elevation</div>
        {getTotalElevation(activitiesForWeek)} m
      </div>
      <div>
        <div className='small-text'>Total Time</div>
        {getTotalTime(activitiesForWeek)} h
      </div>
      <div>
        <div className='small-text'>Total TSS</div>
        {getTotalTss(activitiesForWeek, ftp)} TSS
      </div>
    </Col>
  )
}