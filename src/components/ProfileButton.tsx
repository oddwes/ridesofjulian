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
      className="flex items-center gap-2 bg-gray-50 text-gray-700 font-medium py-2 px-4 rounded-lg shadow-sm border"
    >
      {session.user?.user_metadata?.avatar_url && (
        <Image
          src={session.user.user_metadata.avatar_url}
          alt={`${session.user.user_metadata.full_name || "User"}'s profile`}
          width={32}
          height={32}
          className="rounded-full"
        />
      )}
      {firstName}
    </button>
  );
}

