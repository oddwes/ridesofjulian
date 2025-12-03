import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthRequest } from 'expo-auth-session';

export const WAHOO_ACCESS_TOKEN_KEY = 'wahoo_access_token';
export const WAHOO_REFRESH_TOKEN_KEY = 'wahoo_refresh_token';
export const WAHOO_TOKEN_EXPIRY_KEY = 'wahoo_token_expiry';

export interface WahooTokenResponse {
  access_token: string;
  refresh_token: string;
  created_at: number;
  expires_in: number;
}

export interface WahooIntervalInput {
  name?: string;
  duration: number;
  powerMin: number;
  powerMax: number;
}

export interface WahooWorkoutInput {
  id: number;
  workoutTitle: string;
  selectedDate: string;
  intervals: WahooIntervalInput[];
}

const clientId = process.env.EXPO_PUBLIC_WAHOO_CLIENT_ID;
const clientSecret = process.env.EXPO_PUBLIC_WAHOO_CLIENT_SECRET;
const redirectUri = 'ridesofjulian://wahoo_redirect';

const hasClientConfig = () => {
  if (!clientId || !clientSecret) {
    console.warn('Wahoo env missing: EXPO_PUBLIC_WAHOO_CLIENT_ID / EXPO_PUBLIC_WAHOO_CLIENT_SECRET');
    return false;
  }
  return true;
};

export const storeWahooTokens = async (data: WahooTokenResponse) => {
  const expiresAt = data.created_at + data.expires_in - 300;
  await AsyncStorage.multiSet([
    [WAHOO_ACCESS_TOKEN_KEY, data.access_token],
    [WAHOO_REFRESH_TOKEN_KEY, data.refresh_token],
    [WAHOO_TOKEN_EXPIRY_KEY, String(expiresAt)],
  ]);
};

export const disconnectWahoo = async () => {
  await AsyncStorage.multiRemove([
    WAHOO_ACCESS_TOKEN_KEY,
    WAHOO_REFRESH_TOKEN_KEY,
    WAHOO_TOKEN_EXPIRY_KEY,
  ]);
};

export const hasWahooRefreshToken = async () => {
  const token = await AsyncStorage.getItem(WAHOO_REFRESH_TOKEN_KEY);
  return !!token;
};

export const getStoredWahooToken = async () => {
  const [accessToken, expiry] = await AsyncStorage.multiGet([
    WAHOO_ACCESS_TOKEN_KEY,
    WAHOO_TOKEN_EXPIRY_KEY,
  ]);
  if (!accessToken[1] || !expiry[1]) return null;
  const now = Math.floor(Date.now() / 1000);
  if (now >= Number(expiry[1])) return null;
  return accessToken[1];
};

export const refreshWahooAccessToken = async () => {
  if (!hasClientConfig()) return null;

  const refreshToken = await AsyncStorage.getItem(WAHOO_REFRESH_TOKEN_KEY);
  if (!refreshToken) return null;

  const res = await fetch('https://api.wahooligan.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId!,
      client_secret: clientSecret!,
      refresh_token: refreshToken,
    }).toString(),
  });

  if (!res.ok) return null;
  const data = (await res.json()) as WahooTokenResponse;
  await storeWahooTokens(data);
  return data;
};

export const ensureValidWahooToken = async () => {
  const token = await getStoredWahooToken();
  if (token) return token;
  const refreshed = await refreshWahooAccessToken();
  return refreshed?.access_token ?? null;
};

export const connectWahoo = async () => {
  if (!hasClientConfig()) return false;

  const request = new AuthRequest({
    clientId: clientId!,
    redirectUri,
    responseType: 'code',
    extraParams: {
      scope: 'user_read workouts_read workouts_write plans_read plans_write',
    },
    usePKCE: false,
  });

  const result = await request.promptAsync({
    authorizationEndpoint: 'https://api.wahooligan.com/oauth/authorize',
  } as any);

  if (result.type !== 'success' || !result.params?.code) return false;

  const code = result.params.code as string;

  const res = await fetch('https://api.wahooligan.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId!,
      client_secret: clientSecret!,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    }).toString(),
  });

  if (!res.ok) return false;

  const data = (await res.json()) as WahooTokenResponse;
  await storeWahooTokens(data);
  return true;
};

const encodeBase64 = (value: string) => {
  if (typeof btoa === 'function') return btoa(value);
  throw new Error('BASE64_UNAVAILABLE');
};

export const createWahooWorkout = async (workout: WahooWorkoutInput) => {
  const token = await ensureValidWahooToken();
  if (!token) {
    throw new Error('No Wahoo token available');
  }

  const planIntervals = workout.intervals.map((interval, index) => ({
    name: interval.name || `Interval ${index + 1}`,
    exit_trigger_type: 'time',
    exit_trigger_value: interval.duration,
    intensity_type: 'tempo',
    targets: [
      {
        type: 'watts',
        low: interval.powerMin,
        high: interval.powerMax,
      },
    ],
  }));

  const planData = {
    header: {
      name: workout.workoutTitle || 'Custom Workout',
      version: '1.0.0',
      workout_type_family: 0,
      workout_type_location: 1,
    },
    intervals: planIntervals,
  };

  const planJson = JSON.stringify(planData);
  const base64Plan = encodeBase64(planJson);
  const dataUri = `data:application/json;base64,${base64Plan}`;

  const externalId = `workout-${workout.id}-${Date.now()}`;
  const providerUpdatedAt = new Date().toISOString();

  const planFormBody = new URLSearchParams();
  planFormBody.append('plan[file]', dataUri);
  planFormBody.append('plan[filename]', 'plan.json');
  planFormBody.append('plan[external_id]', externalId);
  planFormBody.append('plan[provider_updated_at]', providerUpdatedAt);

  const planResponse = await fetch('https://api.wahooligan.com/v1/plans', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: planFormBody.toString(),
  });

  if (!planResponse.ok) {
    if (planResponse.status === 429) {
      throw new Error('RATE_LIMITED');
    }
    throw new Error(`Plan creation failed: ${planResponse.statusText}`);
  }

  const planResult = await planResponse.json();
  const planId = planResult.id;

  const workoutDate = new Date(workout.selectedDate + 'T12:00:00');
  const totalMinutes = Math.ceil(
    workout.intervals.reduce((sum, i) => sum + i.duration, 0) / 60
  );

  const workoutFormBody = new URLSearchParams();
  workoutFormBody.append(
    'workout[workout_token]',
    `workout-${workout.id}-${Date.now()}`
  );
  workoutFormBody.append('workout[workout_type_id]', '1');
  workoutFormBody.append('workout[starts]', workoutDate.toISOString());
  workoutFormBody.append('workout[minutes]', totalMinutes.toString());
  workoutFormBody.append(
    'workout[name]',
    workout.workoutTitle || 'Custom Workout'
  );
  workoutFormBody.append('workout[plan_id]', planId.toString());

  const workoutResponse = await fetch('https://api.wahooligan.com/v1/workouts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: workoutFormBody.toString(),
  });

  if (!workoutResponse.ok) {
    if (workoutResponse.status === 429) {
      throw new Error('RATE_LIMITED');
    }
    throw new Error(`Workout creation failed: ${workoutResponse.statusText}`);
  }

  const workoutResult = await workoutResponse.json();
  return { planId, workoutId: workoutResult.id };
};

export const deleteWahooWorkout = async (workoutId: number, planId?: number) => {
  const token = await ensureValidWahooToken();
  if (!token) {
    throw new Error('No Wahoo token available');
  }

  if (planId) {
    const planResponse = await fetch(`https://api.wahooligan.com/v1/plans/${planId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!planResponse.ok) {
      throw new Error(`Failed to delete plan: ${planResponse.statusText}`);
    }
  }

  const workoutResponse = await fetch(`https://api.wahooligan.com/v1/workouts/${workoutId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!workoutResponse.ok) {
    throw new Error(`Failed to delete workout: ${workoutResponse.statusText}`);
  }

  return true;
};

