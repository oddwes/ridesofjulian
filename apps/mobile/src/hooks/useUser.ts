import { useQuery } from '@tanstack/react-query';
import { supabase } from '../config/supabase';

export const useUser = () => {
  return useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user;
    },
  });
};


