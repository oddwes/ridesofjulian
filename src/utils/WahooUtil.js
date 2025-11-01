export const WAHOO_ACCESS_TOKEN_KEY = 'wahoo_access_token';
export const WAHOO_REFRESH_TOKEN_KEY = 'wahoo_refresh_token';
export const WAHOO_TOKEN_EXPIRY_KEY = 'wahoo_token_expiry';

const WAHOO_CLIENT_ID = process.env.NEXT_PUBLIC_WAHOO_CLIENT_ID;
const WAHOO_CLIENT_SECRET = process.env.NEXT_PUBLIC_WAHOO_CLIENT_SECRET;
const WAHOO_REDIRECT_URI = process.env.NEXT_PUBLIC_WAHOO_REDIRECT_URI || 'http://localhost:3000/wahoo_callback';

export const getWahooAuthUrl = (returnPath = '/') => {
  const scopes = 'user_read workouts_read workouts_write plans_write';
  const state = encodeURIComponent(returnPath);
  return `https://api.wahooligan.com/oauth/authorize?client_id=${WAHOO_CLIENT_ID}&redirect_uri=${encodeURIComponent(WAHOO_REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent(scopes)}&state=${state}`;
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
    throw new Error('Failed to exchange Wahoo token');
  }

  const data = await response.json();
  storeWahooTokens(data);
  return data;
};

export const refreshWahooToken = async () => {
  const refreshToken = localStorage.getItem(WAHOO_REFRESH_TOKEN_KEY);
  if (!refreshToken) {
    return null;
  }

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
      return null;
    }

    const data = await response.json();
    storeWahooTokens(data);
    return data;
  } catch (error) {
    console.error('Error refreshing Wahoo token:', error);
    return null;
  }
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

