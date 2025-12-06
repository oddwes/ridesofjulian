import { useQuery } from '@tanstack/react-query';
import { supabase } from '../config/supabase';
import { getFtp, type FtpData } from '../utils/ftpUtil';

export const useFtpHistory = (userId?: string) => {
  return useQuery<FtpData | null>({
    queryKey: ['ftpHistory', userId],
    queryFn: async () => {
      if (!userId) return null;
      return await getFtp(supabase, userId);
    },
    enabled: !!userId,
  });
};


