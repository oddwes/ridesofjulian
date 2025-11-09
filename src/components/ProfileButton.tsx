"use client";

import { useSupabase } from "@/contexts/SupabaseContext"
import Image from "next/image";
import { useEffect, useState } from "react";
import { Session } from '@supabase/supabase-js';
import { useRouter } from "next/navigation";

export function ProfileButton() {
  const [session, setSession] = useState<Session | null>(null);
  const { supabase } = useSupabase()
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  const handleProfileClick = () => {
    router.push('/profile');
  };

  if (!session) return null;

  const firstName = session.user?.user_metadata?.full_name?.split(' ')[0] || 
                   session.user?.email?.split('@')[0] || 
                   'Profile';

  return (
    <button
      onClick={handleProfileClick}
      className="flex items-center gap-2 sm:bg-gray-50 text-gray-700 font-medium sm:py-2 sm:px-4 sm:rounded-lg sm:shadow-sm sm:border"
    >
      {session.user?.user_metadata?.avatar_url && (
        <Image
          src={session.user.user_metadata.avatar_url}
          alt={`${session.user.user_metadata.full_name || "User"}'s profile`}
          width={40}
          height={40}
          className="rounded-full sm:w-8 sm:h-8"
        />
      )}
      <span className="hidden sm:inline">{firstName}</span>
    </button>
  );
}

