import { getTotalDistance, getTotalElevation, getTotalTime, getTotalTss } from "../../utils/StravaUtil"
import { useContext } from "react"
import { FtpContext } from "../FTP"

export const RowHeader = ({ startDate, endDate, activitiesForWeek }) => {
  const ftp = useContext(FtpContext)

  let dateRange
  if (startDate.isSame(endDate, 'month')) {
    dateRange = `${startDate.format('D')}-${endDate.format('D')} ${endDate.format('MMM')}`
  } else {
    dateRange = `${startDate.format('D')} ${startDate.format('MMM')}-${endDate.format('D')} ${endDate.format('MMM')}`
  }

  return (
    <div className="flex flex-col">
      <div className='text-[16px] font-[700] text-left pb-2'>{dateRange}</div>
      <div>
        <div className='text-[10px]'>Total Distance</div>
        <p className="text-[16px] font-[400]">{getTotalDistance(activitiesForWeek)} km</p>
      </div>
      <div>
        <div className='text-[10px]'>Total Elevation</div>
        <p className="text-[16px] font-[400]">{getTotalElevation(activitiesForWeek)} m</p>
      </div>
      <div>
        <div className='text-[10px]'>Total Time</div>
        <p className="text-[16px] font-[400]">{getTotalTime(activitiesForWeek)} h</p>
      </div>
      <div>
        <div className='text-[10px]'>Total TSS</div>
        <p className="text-[16px] font-[400]">{getTotalTss(activitiesForWeek, ftp)} TSS</p>
      </div>
    </div>
  )
}