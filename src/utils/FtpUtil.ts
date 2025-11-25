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

export const createFtp = async (
  supabase: SupabaseClient,
  userId: string,
  date: string,
  ftpValue: number
): Promise<void> => {
  const ftpData: FtpData = {
    ftp: { [date]: ftpValue }
  };

  const { error } = await supabase
    .from('stats')
    .insert({
      user_id: userId,
      data: ftpData
    });

  if (error) {
    throw error;
  }
};

export const updateFtp = async (
  supabase: SupabaseClient,
  userId: string,
  date: string,
  ftpValue: number
): Promise<void> => {
  const existing = await getFtp(supabase, userId);
  
  const existingFtp = existing?.ftp || {};
  const { [date]: _, ...rest } = existingFtp;
  
  const ftpData: FtpData = {
    ftp: {
      [date]: ftpValue,
      ...rest
    }
  };

  const { error } = await supabase
    .from('stats')
    .update({ data: ftpData })
    .eq('user_id', userId);

  if (error) {
    throw error;
  }
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


