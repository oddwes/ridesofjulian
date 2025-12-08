import {
  WAHOO_ACCESS_TOKEN_KEY,
  WAHOO_REFRESH_TOKEN_KEY,
  WAHOO_TOKEN_EXPIRY_KEY,
  WahooTokenResponse,
  WahooWorkoutInput,
} from './index';
import { WahooWorkout } from '../../types/wahoo';

const WAHOO_CLIENT_ID = process.env.NEXT_PUBLIC_WAHOO_CLIENT_ID;
const WAHOO_CLIENT_SECRET = process.env.NEXT_PUBLIC_WAHOO_CLIENT_SECRET;
const WAHOO_REDIRECT_URI =
  process.env.NEXT_PUBLIC_WAHOO_REDIRECT_URI || 'http://localhost:3000/wahoo_callback';

let refreshPromise: Promise<WahooTokenResponse | null> | null = null;

export const getWahooAuthUrl = (returnPath = '/') => {
  const scopes = 'user_read workouts_read workouts_write plans_read plans_write';
  const state = encodeURIComponent(returnPath);
  return `https://api.wahooligan.com/oauth/authorize?client_id=${WAHOO_CLIENT_ID}&redirect_uri=${encodeURIComponent(WAHOO_REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent(scopes)}&state=${state}`;
};

export const clearAllWahooData = () => {
  if (typeof window === 'undefined') return;

  localStorage.removeItem(WAHOO_ACCESS_TOKEN_KEY);
  localStorage.removeItem(WAHOO_REFRESH_TOKEN_KEY);
  localStorage.removeItem(WAHOO_TOKEN_EXPIRY_KEY);
};

if (typeof window !== 'undefined') {
  (window as any).clearWahooTokens = clearAllWahooData;
}

export const revokeWahooToken = async (token: string) => {
  if (!token) return false;

  try {
    const response = await fetch('https://api.wahooligan.com/v1/permissions', {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.ok) {
      clearAllWahooData();
      return true;
    }

    return false;
  } catch (error) {
    return false;
  }
};

export const initiateWahooAuth = async (returnPath = '/') => {
  let tokenToRevoke = localStorage.getItem(WAHOO_ACCESS_TOKEN_KEY);

  if (!tokenToRevoke) {
    const refreshToken = localStorage.getItem(WAHOO_REFRESH_TOKEN_KEY);
    if (refreshToken) {
      try {
        const refreshed = await refreshWahooToken();
        if (refreshed) {
          tokenToRevoke = refreshed.access_token;
        }
      } catch (error) {
        // Ignore refresh errors
      }
    }
  }

  if (tokenToRevoke) {
    await revokeWahooToken(tokenToRevoke);
  }

  window.location.href = getWahooAuthUrl(returnPath);
};

export const exchangeWahooToken = async (authCode: string) => {
  const response = await fetch('https://api.wahooligan.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: WAHOO_CLIENT_ID!,
      client_secret: WAHOO_CLIENT_SECRET!,
      code: authCode,
      grant_type: 'authorization_code',
      redirect_uri: WAHOO_REDIRECT_URI,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));

    if (errorData.error?.includes('Too many unrevoked access tokens')) {
      const oldToken = localStorage.getItem(WAHOO_ACCESS_TOKEN_KEY);
      if (oldToken) {
        await revokeWahooToken(oldToken);
      }
      throw new Error('TOO_MANY_TOKENS');
    }

    throw new Error('Failed to exchange Wahoo token');
  }

  const data = (await response.json()) as WahooTokenResponse;
  storeWahooTokens(data);
  return data;
};

export const refreshWahooToken = async (): Promise<WahooTokenResponse | null> => {
  if (refreshPromise) {
    return refreshPromise;
  }

  const refreshToken = localStorage.getItem(WAHOO_REFRESH_TOKEN_KEY);
  if (!refreshToken) {
    return null;
  }

  refreshPromise = (async () => {
    try {
      const response = await fetch('https://api.wahooligan.com/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: WAHOO_CLIENT_ID!,
          client_secret: WAHOO_CLIENT_SECRET!,
          refresh_token: refreshToken,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        if (errorData.error?.includes('Too many unrevoked access tokens')) {
          const oldToken = localStorage.getItem(WAHOO_ACCESS_TOKEN_KEY);
          if (oldToken) {
            await revokeWahooToken(oldToken);
          }
        }

        return null;
      }

      const data = (await response.json()) as WahooTokenResponse;
      storeWahooTokens(data);

      await fetch('https://api.wahooligan.com/v1/user', {
        headers: {
          Authorization: `Bearer ${data.access_token}`,
        },
      });

      return data;
    } catch (error) {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};

const storeWahooTokens = (data: WahooTokenResponse) => {
  const expiresAt = data.created_at + data.expires_in - 300;
  localStorage.setItem(WAHOO_ACCESS_TOKEN_KEY, data.access_token);
  localStorage.setItem(WAHOO_REFRESH_TOKEN_KEY, data.refresh_token);
  localStorage.setItem(WAHOO_TOKEN_EXPIRY_KEY, expiresAt.toString());
};

export const getStoredWahooToken = (): string | null => {
  if (typeof window === 'undefined') return null;

  const token = localStorage.getItem(WAHOO_ACCESS_TOKEN_KEY);
  const expiry = localStorage.getItem(WAHOO_TOKEN_EXPIRY_KEY);

  if (!token || !expiry) return null;

  const now = Math.floor(Date.now() / 1000);
  if (now >= parseInt(expiry)) {
    return null;
  }

  return token;
};

export const hasWahooRefreshToken = (): boolean => {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem(WAHOO_REFRESH_TOKEN_KEY);
};

export const ensureValidWahooToken = async (): Promise<string | null> => {
  if (typeof window === 'undefined') return null;

  const token = getStoredWahooToken();
  if (token) {
    return token;
  }

  if (hasWahooRefreshToken()) {
    const result = await refreshWahooToken();
    if (result) {
      return result.access_token;
    }
  }

  return null;
};

export const getPlannedWorkouts = async (daysAhead = 7) => {
  const token = getStoredWahooToken();
  if (!token) {
    return [];
  }

  const today = new Date().toISOString().split('T')[0];
  const futureDate = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  const response = await fetch(
    `https://api.wahooligan.com/v1/workouts?order_by=starts&order_dir=asc&starts_after=${today}&starts_before=${futureDate}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch workouts: ${response.statusText}`);
  }

  const data = await response.json();
  const workouts = data.workouts ? data.workouts.filter((w: WahooWorkout) => w.plan_id) : [];

  const workoutsWithIntervals = await Promise.all(
    workouts.map(async (workout: WahooWorkout) => {
      try {
        const intervals = await getPlanIntervals(workout.plan_id!);
        return { ...workout, intervals };
      } catch (error) {
        return { ...workout, intervals: [] };
      }
    })
  );

  return workoutsWithIntervals;
};

export const getWorkoutById = async (workoutId: number) => {
  const token = getStoredWahooToken();
  if (!token) {
    throw new Error('No Wahoo token available');
  }

  const response = await fetch(`https://api.wahooligan.com/v1/workouts/${workoutId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch workout: ${response.statusText}`);
  }

  return response.json();
};

export const getPlanById = async (planId: number) => {
  const token = getStoredWahooToken();
  if (!token) {
    throw new Error('No Wahoo token available');
  }

  const response = await fetch(`https://api.wahooligan.com/v1/plans/${planId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch plan: ${response.statusText}`);
  }

  return response.json();
};

export const getPlanIntervals = async (planId: number) => {
  const planData = await getPlanById(planId);

  if (!planData.file?.url) {
    throw new Error('Plan file URL not found');
  }

  const fileResponse = await fetch(planData.file.url);
  if (!fileResponse.ok) {
    throw new Error('Failed to fetch plan file');
  }

  const planJson = await fileResponse.json();
  return planJson.intervals || [];
};

export const deleteWahooWorkout = async (workoutId: number, planId?: number) => {
  const token = getStoredWahooToken();
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

export const createWahooWorkout = async (workout: WahooWorkoutInput) => {
  const token = getStoredWahooToken();
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
  const base64Plan = btoa(planJson);
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
  workoutFormBody.append('workout[workout_token]', `workout-${workout.id}-${Date.now()}`);
  workoutFormBody.append('workout[workout_type_id]', '1');
  workoutFormBody.append('workout[starts]', workoutDate.toISOString());
  workoutFormBody.append('workout[minutes]', totalMinutes.toString());
  workoutFormBody.append('workout[name]', workout.workoutTitle || 'Custom Workout');
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

export const updateWahooWorkout = async (
  workoutId: number,
  planId: number | null,
  intervals: WahooWorkoutInput['intervals'],
  title: string,
  date: string
) => {
  const token = getStoredWahooToken();
  if (!token) {
    throw new Error('No Wahoo token available');
  }

  const planIntervals = intervals.map((interval, index) => ({
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
      name: title || 'Custom Workout',
      version: '1.0.0',
      workout_type_family: 0,
      workout_type_location: 1,
    },
    intervals: planIntervals,
  };

  const planJson = JSON.stringify(planData);
  const base64Plan = btoa(planJson);
  const dataUri = `data:application/json;base64,${base64Plan}`;

  const externalId = `workout-${Date.now()}`;
  const providerUpdatedAt = new Date().toISOString();

  if (planId) {
    const planFormBody = new URLSearchParams();
    planFormBody.append('plan[file]', dataUri);
    planFormBody.append('plan[filename]', 'plan.json');
    planFormBody.append('plan[external_id]', externalId);
    planFormBody.append('plan[provider_updated_at]', providerUpdatedAt);

    const planUpdateResponse = await fetch(`https://api.wahooligan.com/v1/plans/${planId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: planFormBody.toString(),
    });

    if (!planUpdateResponse.ok) {
      throw new Error(`Plan update failed: ${planUpdateResponse.statusText}`);
    }
  }

  const workoutDate = new Date(date + 'T12:00:00');
  const totalMinutes = Math.ceil(intervals.reduce((sum, i) => sum + i.duration, 0) / 60);

  const workoutFormBody = new URLSearchParams();
  workoutFormBody.append('workout[workout_token]', `workout-${Date.now()}`);
  workoutFormBody.append('workout[workout_type_id]', '1');
  workoutFormBody.append('workout[starts]', workoutDate.toISOString());
  workoutFormBody.append('workout[minutes]', totalMinutes.toString());
  workoutFormBody.append('workout[name]', title || 'Custom Workout');
  if (planId) {
    workoutFormBody.append('workout[plan_id]', planId.toString());
  }

  const workoutResponse = await fetch(`https://api.wahooligan.com/v1/workouts/${workoutId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: workoutFormBody.toString(),
  });

  if (!workoutResponse.ok) {
    throw new Error(`Workout update failed: ${workoutResponse.statusText}`);
  }

  return true;
};

