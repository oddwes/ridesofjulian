import { useContext } from 'react';
import dayjs, { Dayjs } from 'dayjs';
import type { StravaActivity } from '@ridesofjulian/shared';
import type { FtpData } from '@/utils/FtpUtil';
import { getFtpForDate } from '@/utils/FtpUtil';
import { getTSS } from '@/utils/StravaUtil';
import { FtpContext } from './FTP';

type WeeklySummaryProps = {
  activities: StravaActivity[];
  ftpHistory?: FtpData | null;
  weekStart: Dayjs;
};

export function WeeklySummary({ activities, ftpHistory, weekStart }: WeeklySummaryProps) {
  const { ftp } = useContext(FtpContext);
  const weekEnd = weekStart.endOf('week');

  const weekActivities = activities.filter((a) => {
    const d = dayjs(a.start_date);
    return !d.isBefore(weekStart, 'day') && !d.isAfter(weekEnd, 'day');
  });

  const totals = weekActivities.reduce(
    (acc, a) => {
      acc.distance += a.distance || 0;
      acc.elevation += a.total_elevation_gain || 0;
      acc.time += a.moving_time || 0;
      const ftpForActivity = getFtpForDate(ftpHistory ?? null, a.start_date, ftp);
      if (ftpForActivity) {
        acc.tss += getTSS(a, ftpForActivity);
      }
      return acc;
    },
    { distance: 0, elevation: 0, time: 0, tss: 0 }
  );

  const distanceKm = Math.round(totals.distance / 1000);
  const elevationM = Math.round(totals.elevation);
  const timeHours = Math.round(totals.time / 3600);
  const totalTss = Math.round(totals.tss);

  let dateRange: string;
  if (weekStart.isSame(weekEnd, 'month')) {
    dateRange = `${weekStart.format('D')}-${weekEnd.format('D')} ${weekEnd.format('MMM')}`;
  } else {
    dateRange = `${weekStart.format('D')} ${weekStart.format('MMM')}-${weekEnd.format('D')} ${weekEnd.format('MMM')}`;
  }

  return (
    <div className="mb-2 rounded-lg border border-gray-800 bg-slate-950 px-3 py-1.5 text-xs text-slate-50">
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-slate-100">{dateRange}</span>
        <span className="font-semibold">{distanceKm} km</span>
        <span className="font-semibold">{elevationM} m</span>
        <span className="font-semibold">{timeHours} h</span>
        <span className="font-semibold">{totalTss} TSS</span>
      </div>
    </div>
  );
}


