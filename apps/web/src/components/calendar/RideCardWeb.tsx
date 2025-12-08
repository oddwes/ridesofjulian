'use client';

import { RideCard } from '@ridesofjulian/shared/mobile';
import { StravaActivity } from '@ridesofjulian/shared';
import { getTSS } from '@ridesofjulian/shared/utils/StravaUtil';
import { formatDistance, formatElevation } from '../../utils/FormatUtil';
import { formatDuration } from '../../utils/TimeUtil';
import { useContext, useMemo } from 'react';
import { FtpContext } from '../FTP';
import { useSupabase } from '@/contexts/SupabaseContext';
import { useQuery } from '@tanstack/react-query';
import { getFtp, getFtpForDate } from '@/utils/FtpUtil';

interface RideCardWebProps {
  activity: StravaActivity & { source?: 'strava' | 'wahoo' };
}

export function RideCardWeb({ activity }: RideCardWebProps) {
  const { ftp } = useContext(FtpContext);
  const { supabase, user } = useSupabase();
  const { data: ftpHistory } = useQuery({
    queryKey: ['ftpHistory', user?.id],
    queryFn: async () => {
      if (!user) return null;
      return await getFtp(supabase, user.id);
    },
    enabled: !!user,
  });

  const ftpForActivity = useMemo(
    () => getFtpForDate(ftpHistory || null, activity.start_date, ftp),
    [ftpHistory, activity.start_date, ftp]
  );

  const handlePress = (activityId: number) => {
    if (activity.source !== 'wahoo') {
      window.open(`https://strava.com/activities/${activityId}`, '_blank');
    }
  };

  return (
    <RideCard
      activity={activity}
      onPress={handlePress}
      ftpForActivity={ftpForActivity}
      getTSS={getTSS}
      formatDistance={formatDistance}
      formatElevation={formatElevation}
      formatDuration={formatDuration}
    />
  );
}

