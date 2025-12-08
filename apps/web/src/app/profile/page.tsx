'use client';

import { useSupabase } from "@/contexts/SupabaseContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Session } from '@supabase/supabase-js';
import Image from "next/image";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { login, ensureValidToken } from "@/utils/StravaUtil";
import { hasWahooRefreshToken, initiateWahooAuth } from "@/utils/WahooUtil";
import { FTPInput } from "@/components/FTP";
import { Save } from "lucide-react";

export default function ProfilePage() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [stravaConnected, setStravaConnected] = useState(false);
  const [wahooConnected, setWahooConnected] = useState(false);
  const [openaiApiKey, setOpenaiApiKey] = useState<string>('');
  const [openaiApiKeyInput, setOpenaiApiKeyInput] = useState<string>('');
  const [openaiApiKeyIsDirty, setOpenaiApiKeyIsDirty] = useState(false);
  const [weight, setWeight] = useState<string>('');
  const [weightInput, setWeightInput] = useState<string>('');
  const [weightIsDirty, setWeightIsDirty] = useState(false);
  const [weightIsSaving, setWeightIsSaving] = useState(false);
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
    
    const storedKey = localStorage.getItem('openai_api_key');
    if (storedKey) {
      setOpenaiApiKey(storedKey);
      setOpenaiApiKeyInput(storedKey);
    }
  }, []);

  useEffect(() => {
    const fetchWeight = async () => {
      if (!session?.user?.id) return;
      
      const { data, error } = await supabase
        .from('stats')
        .select('data')
        .eq('user_id', session.user.id)
        .single();

      if (!error && data?.data) {
        const statsData = data.data as { weight?: Record<string, number> };

        if (statsData.weight) {
          const weightEntries = Object.entries(statsData.weight)
            .map(([date, value]) => ({ date, value }))
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

          if (weightEntries.length > 0) {
            const weightValue = String(weightEntries[0].value);
            setWeight(weightValue);
            setWeightInput(weightValue);
          }
        }
      }
    };

    if (session?.user?.id) {
      fetchWeight();
    }
  }, [session?.user?.id, supabase]);

  const handleOpenaiApiKeyInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setOpenaiApiKeyInput(value);
    if (!openaiApiKeyIsDirty && value !== openaiApiKey) {
      setOpenaiApiKeyIsDirty(true);
    } else if (value === openaiApiKey) {
      setOpenaiApiKeyIsDirty(false);
    }
  };

  const handleSaveOpenaiApiKey = () => {
    if (!openaiApiKeyIsDirty) return;
    const trimmed = openaiApiKeyInput.trim();
    localStorage.setItem('openai_api_key', trimmed);
    setOpenaiApiKey(trimmed);
    setOpenaiApiKeyIsDirty(false);
  };

  const handleWeightInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setWeightInput(value);
    if (!weightIsDirty && value !== weight) {
      setWeightIsDirty(true);
    } else if (value === weight) {
      setWeightIsDirty(false);
    }
  };

  const handleSaveWeight = async () => {
    if (!session?.user?.id || !weightIsDirty) return;

    const value = parseFloat(weightInput);
    if (Number.isNaN(value) || value <= 0) return;

    setWeightIsSaving(true);

    try {
      const today = new Date().toISOString().split('T')[0];

      const { data: existing } = await supabase
        .from('stats')
        .select('data')
        .eq('user_id', session.user.id)
        .single();

      const existingData = (existing?.data as { ftp?: Record<string, number>; weight?: Record<string, number> }) || {};
      const existingWeight = existingData.weight || {};
      const weightData = {
        ...existingData,
        weight: {
          [today]: value,
          ...existingWeight,
        },
      };

      if (existing) {
        await supabase
          .from('stats')
          .update({ data: weightData })
          .eq('user_id', session.user.id);
      } else {
        await supabase
          .from('stats')
          .insert({
            user_id: session.user.id,
            data: weightData,
          });
      }

      setWeight(String(value));
      setWeightIsDirty(false);
    } catch (error) {
      console.error('Failed to save weight:', error);
    } finally {
      setWeightIsSaving(false);
    }
  };

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
        
        <div className="border-t space-y-2 pt-4">
          <FTPInput />

          <div>
            <label className="block text-sm font-semibold mb-2">
              Weight
            </label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type="number"
                  value={weightInput}
                  onChange={handleWeightInputChange}
                  placeholder="-- kg"
                  className="w-full px-3 py-2 pr-12 rounded-md bg-slate-950 border border-slate-700 text-sm text-slate-100"
                />
                {weightInput && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-300 pointer-events-none">
                    kg
                  </span>
                )}
              </div>
              <button
                onClick={handleSaveWeight}
                disabled={!weightIsDirty || weightIsSaving}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={16} />
                {weightIsSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>

        </div>
        <div className="border-t pt-4">
          <label className="block text-sm font-semibold mb-2">
            OpenAI API Key
          </label>
          <div className="flex gap-2">
            <input
              type="password"
              value={openaiApiKeyInput}
              onChange={handleOpenaiApiKeyInputChange}
              placeholder="sk-..."
              className="flex-1 px-3 py-2 rounded-md bg-slate-950 border border-slate-700 text-sm text-slate-100"
            />
            <button
              onClick={handleSaveOpenaiApiKey}
              disabled={!openaiApiKeyIsDirty}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={16} />
              Save
            </button>
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

