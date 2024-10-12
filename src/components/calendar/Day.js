import { faAngleUp } from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { Link } from "react-router-dom"
import { getTSS } from "../../utils/StravaUtil"
import { Col } from "react-bootstrap"
import { useContext } from "react"
import { FtpContext } from "../FTP"

export const Day = ({ activity, isToday }) => {
  const ftp = useContext(FtpContext)

  const todayTag = (
      <div className='fill-parent'>
        <div className='vertical-center centered activity-sub-text'>
          <div>Today</div>
        </div>
        <div className='vertical-bottom'>
          <FontAwesomeIcon icon={faAngleUp} className='strava-text'/>
        </div>
      </div>
  )

  const activityCircle = (activity, isToday) => {
    return (
      <Link
        to={`https://strava.com/activities/${activity.id}`}
        target="_blank"
        rel="noopener noreferrer"
        className='activity-circle-text'
      >
        <div className="fill-parent">
          <div className='centered vertical-center'>
            <div className='circle' style={{margin:'auto'}}>
              <div className='text'>
                <div>
                  {Math.round(activity.distance/1000)} km
                </div>
                <div>
                  {Math.round(activity.total_elevation_gain)} m
                </div>
                <div>
                  {getTSS(activity, ftp)} TSS
                </div>
              </div>
            </div>
            <div className='centered activity-sub-text small-text'>{activity.name}</div>
          </div>
          {isToday && (
            <div className="centered vertical-bottom">
              <FontAwesomeIcon icon={faAngleUp} className='strava-text'/>
            </div>
          )}
        </div>
      </Link>
    )
  }

  if (activity) {
    return (
      <Col>
        {activityCircle(activity, isToday)}
      </Col>
    )
  } else if (isToday) {
    return (
      <Col>
        {todayTag}
      </Col>
    )
  } else {
    return <Col />
  }
}