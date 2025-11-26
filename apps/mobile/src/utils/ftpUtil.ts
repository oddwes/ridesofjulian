import { SupabaseClient } from '@supabase/supabase-js';

export type FtpData = {
  ftp: Record<string, number>;
};

export const getFtp = async (supabase: SupabaseClient, userId: string): Promise<FtpData | null> => {
  const { data, error } = await supabase
    .from('stats')
    .select('data')
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw error;
  }

  return (data?.data as FtpData) || null;
};

export const getFtpForDate = (
  ftpHistory: FtpData | null | undefined,
  isoDate: string | undefined,
  fallbackFtp?: number
): number | undefined => {
  if (!ftpHistory?.ftp || !isoDate) return fallbackFtp;

  const activityDateStr = isoDate.split('T')[0];

  const applicableEntries = Object.entries(ftpHistory.ftp)
    .filter(([date]) => date <= activityDateStr)
    .sort(([a], [b]) => a.localeCompare(b));

  if (applicableEntries.length === 0) return fallbackFtp;
  const [, value] = applicableEntries[applicableEntries.length - 1];
  return value as number;
};

