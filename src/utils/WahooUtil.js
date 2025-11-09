export const WAHOO_ACCESS_TOKEN_KEY = 'wahoo_access_token';
export const WAHOO_REFRESH_TOKEN_KEY = 'wahoo_refresh_token';
export const WAHOO_TOKEN_EXPIRY_KEY = 'wahoo_token_expiry';

const WAHOO_CLIENT_ID = process.env.NEXT_PUBLIC_WAHOO_CLIENT_ID;
const WAHOO_CLIENT_SECRET = process.env.NEXT_PUBLIC_WAHOO_CLIENT_SECRET;
const WAHOO_REDIRECT_URI = process.env.NEXT_PUBLIC_WAHOO_REDIRECT_URI || 'http://localhost:3000/wahoo_callback';

let refreshPromise = null;

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
  
  console.log('All Wahoo tokens cleared from localStorage');
};

if (typeof window !== 'undefined') {
  window.clearWahooTokens = clearAllWahooData;
}

export const revokeWahooToken = async (token) => {
  if (!token) return false;
  
  try {
    const response = await fetch('https://api.wahooligan.com/v1/permissions', {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    if (response.ok) {
      clearAllWahooData();
      return true;
    }
    
    console.error('Failed to revoke Wahoo token:', response.status);
    return false;
  } catch (error) {
    console.error('Error revoking Wahoo token:', error);
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
        console.error('Failed to refresh token for revocation:', error);
      }
    }
  }
  
  if (tokenToRevoke) {
    await revokeWahooToken(tokenToRevoke);
  }
  
  window.location.href = getWahooAuthUrl(returnPath);
};

export const exchangeWahooToken = async (authCode) => {
  const response = await fetch('https://api.wahooligan.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: WAHOO_CLIENT_ID,
      client_secret: WAHOO_CLIENT_SECRET,
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

  const data = await response.json();
  storeWahooTokens(data);
  return data;
};

export const refreshWahooToken = async () => {
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
          client_id: WAHOO_CLIENT_ID,
          client_secret: WAHOO_CLIENT_SECRET,
          refresh_token: refreshToken,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        if (errorData.error?.includes('Too many unrevoked access tokens')) {
          const oldToken = localStorage.getItem(WAHOO_ACCESS_TOKEN_KEY);
          if (oldToken) {
            await revokeWahooToken(oldToken);
            console.warn('Too many Wahoo tokens detected during refresh.');
          }
        }
        
        return null;
      }

      const data = await response.json();
      storeWahooTokens(data);
      
      await fetch('https://api.wahooligan.com/v1/user', {
        headers: {
          'Authorization': `Bearer ${data.access_token}`,
        },
      });
      
      return data;
    } catch (error) {
      console.error('Error refreshing Wahoo token:', error);
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};

const storeWahooTokens = (data) => {
  const expiresAt = data.created_at + data.expires_in - 300;
  localStorage.setItem(WAHOO_ACCESS_TOKEN_KEY, data.access_token);
  localStorage.setItem(WAHOO_REFRESH_TOKEN_KEY, data.refresh_token);
  localStorage.setItem(WAHOO_TOKEN_EXPIRY_KEY, expiresAt.toString());
};

export const getStoredWahooToken = () => {
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

export const hasWahooRefreshToken = () => {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem(WAHOO_REFRESH_TOKEN_KEY);
};

export const ensureValidWahooToken = async () => {
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
  const futureDate = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
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
  const workouts = data.workouts ? data.workouts.filter(w => w.plan_id) : [];
  
  const workoutsWithIntervals = await Promise.all(
    workouts.map(async (workout) => {
      try {
        const intervals = await getPlanIntervals(workout.plan_id);
        return { ...workout, intervals };
      } catch (error) {
        console.error(`Failed to fetch intervals for workout ${workout.id}:`, error);
        return { ...workout, intervals: [] };
      }
    })
  );
  
  return workoutsWithIntervals;
};

export const getWorkoutById = async (workoutId) => {
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

export const getPlanById = async (planId) => {
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

export const getPlanIntervals = async (planId) => {
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

export const deleteWahooWorkout = async (workoutId, planId) => {
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

export const updateWahooWorkout = async (workoutId, planId, intervals, title, date) => {
  const token = getStoredWahooToken();
  if (!token) {
    throw new Error('No Wahoo token available');
  }

  const planIntervals = intervals.map((interval, index) => ({
    name: interval.name || `Interval ${index + 1}`,
    exit_trigger_type: "time",
    exit_trigger_value: interval.duration,
    intensity_type: "tempo",
    targets: [
      {
        type: "watts",
        low: interval.powerMin,
        high: interval.powerMax,
      },
    ],
  }));

  const planData = {
    header: {
      name: title || "Custom Workout",
      version: "1.0.0",
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
    planFormBody.append("plan[file]", dataUri);
    planFormBody.append("plan[filename]", "plan.json");
    planFormBody.append("plan[external_id]", externalId);
    planFormBody.append("plan[provider_updated_at]", providerUpdatedAt);

    const planUpdateResponse = await fetch(`https://api.wahooligan.com/v1/plans/${planId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/x-www-form-urlencoded",
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
  workoutFormBody.append("workout[workout_token]", `workout-${Date.now()}`);
  workoutFormBody.append("workout[workout_type_id]", "1");
  workoutFormBody.append("workout[starts]", workoutDate.toISOString());
  workoutFormBody.append("workout[minutes]", totalMinutes.toString());
  workoutFormBody.append("workout[name]", title || "Custom Workout");
  if (planId) {
    workoutFormBody.append("workout[plan_id]", planId.toString());
  }

  const workoutResponse = await fetch(`https://api.wahooligan.com/v1/workouts/${workoutId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: workoutFormBody.toString(),
  });

  if (!workoutResponse.ok) {
    throw new Error(`Workout update failed: ${workoutResponse.statusText}`);
  }

  return true;
};


