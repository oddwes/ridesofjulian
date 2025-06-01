import { getTSS } from "../../utils/StravaUtil"
import { useContext } from "react"
import { FtpContext } from "../FTP"
import Link from "next/link"
import Col from "../ui/Col";
import { ChevronUp } from "lucide-react"

const Day = ({ activity, isToday }) => {
  const ftp = useContext(FtpContext)

  const todayTag = (
    <Col>
      <div className="flex flex-col justify-center items-center h-full">
        <p>Today</p>
      </div>
      <div>
        <ChevronUp className="text-[#FC5201]" />
      </div>
    </Col>
  )

  const activityCircle = (activity, isToday) => {
    return (
      <Col className="gap-2">
        <Link
          href={`https://strava.com/activities/${activity.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className='activity-circle-text'
        >
          <div className='rounded-full bg-[#FC5201] text-[16px] font-[400] w-[125px] h-[125px] flex flex-col justify-center items-center text-center text-white'>
            <div>
              {Math.round(activity.distance / 1000)} km
            </div>
            <div>
              {Math.round(activity.total_elevation_gain)} m
            </div>
            <div>
              {getTSS(activity, ftp)} TSS
            </div>
          </div>
        </Link>
        <div className='centered activity-sub-text text-[10px] text-center'>{activity.name}</div>
        {isToday && (
          <ChevronUp className="text-bg-[#FC5201]" />
        )}
      </Col>
    )
  }

  if (activity) {
    return (activityCircle(activity, isToday))
  } else if (isToday) {
    return todayTag
  } else {
    return <Col />
  }
}

export default Day