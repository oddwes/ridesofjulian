'use client';

import { useSupabase } from "@/contexts/SupabaseContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Session } from '@supabase/supabase-js';
import Image from "next/image";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { login, ensureValidToken } from "@/utils/StravaUtil";
import { hasWahooRefreshToken, initiateWahooAuth } from "@/utils/WahooUtil";

export default function ProfilePage() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [stravaConnected, setStravaConnected] = useState(false);
  const [wahooConnected, setWahooConnected] = useState(false);
  const { supabase } = useSupabase();
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  useEffect(() => {
    const checkStravaConnection = async () => {
      const hasValidToken = await ensureValidToken();
      setStravaConnected(hasValidToken);
    };
    checkStravaConnection();
    setWahooConnected(hasWahooRefreshToken());
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/auth');
  };

  const handleStravaConnect = () => {
    login();
  };

  const handleWahooConnect = async () => {
    await initiateWahooAuth();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (!session) {
    router.push('/auth');
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto p-8">
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          {session.user?.user_metadata?.avatar_url && (
            <Image
              src={session.user.user_metadata.avatar_url}
              alt="Profile picture"
              width={80}
              height={80}
              className="rounded-full"
            />
          )}
          <div>
            <h2 className="text-2xl font-semibold">
              {session.user?.user_metadata?.full_name || 'User'}
            </h2>
            <p>{session.user?.email}</p>
          </div>
        </div>

        <div className="py-6 border-t border-b space-y-4">
          <button
            onClick={handleStravaConnect}
            disabled={stravaConnected}
            className="w-full flex items-center justify-center gap-2 bg-[#FC4C02] text-white pl-4 pr-6 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Image src="/strava.svg" width="30" height="30" alt="strava logo" />
            <span className="font-bold">{stravaConnected ? 'Connected' : 'Connect to Strava'}</span>
          </button>

          <button
            onClick={handleWahooConnect}
            disabled={wahooConnected}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Image src="/wahoo.png" width="40" height="40" alt="wahooligan logo" />
            <span className="font-bold">{wahooConnected ? 'Connected' : 'Connect to Wahoo'}</span>
          </button>

        </div>
        <button
          onClick={handleSignOut}
          className="w-full px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}

