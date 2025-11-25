import { useContext } from "react"
import { getTotalDistance, getTotalElevation, getTotalTime, getTotalTss } from "../../utils/StravaUtil"
import { FtpContext } from "../FTP"

export const RowHeader = ({ startDate, endDate, activitiesForWeek }) => {
  const { ftp } = useContext(FtpContext)

  let dateRange
  if (startDate.isSame(endDate, 'month')) {
    dateRange = `${startDate.format('D')}-${endDate.format('D')} ${endDate.format('MMM')}`
  } else {
    dateRange = `${startDate.format('D')} ${startDate.format('MMM')}-${endDate.format('D')} ${endDate.format('MMM')}`
  }

  return (
    <div className="flex flex-col">
      <div className='font-bold text-left pb-2'>{dateRange}</div>
      <div>
        <div className='text-xs'>Total Distance</div>
        <p className="font-normal">{getTotalDistance(activitiesForWeek)} km</p>
      </div>
      <div>
        <div className='text-xs'>Total Elevation</div>
        <p className="font-normal">{getTotalElevation(activitiesForWeek)} m</p>
      </div>
      <div>
        <div className='text-xs'>Total Time</div>
        <p className="font-normal">{getTotalTime(activitiesForWeek)} h</p>
      </div>
      <div>
        <div className='text-xs'>Total TSS</div>
        <p className="font-normal">{getTotalTss(activitiesForWeek, ftp)} TSS</p>
      </div>
    </div>
  )
}