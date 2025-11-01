export const WAHOO_ACCESS_TOKEN_KEY = 'wahoo_access_token';
export const WAHOO_REFRESH_TOKEN_KEY = 'wahoo_refresh_token';
export const WAHOO_TOKEN_EXPIRY_KEY = 'wahoo_token_expiry';

const WAHOO_CLIENT_ID = process.env.NEXT_PUBLIC_WAHOO_CLIENT_ID;
const WAHOO_CLIENT_SECRET = process.env.NEXT_PUBLIC_WAHOO_CLIENT_SECRET;
const WAHOO_REDIRECT_URI = process.env.NEXT_PUBLIC_WAHOO_REDIRECT_URI || 'http://localhost:3000/wahoo_callback';

export const getWahooAuthUrl = () => {
  const scopes = 'user_read workouts_read workouts_write plans_write';
  return `https://api.wahooligan.com/oauth/authorize?client_id=${WAHOO_CLIENT_ID}&redirect_uri=${encodeURIComponent(WAHOO_REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent(scopes)}`;
};

export const exchangeWahooToken = async (authCode) => {
  const response = await fetch('https://api.wahooligan.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
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

  return response.json();
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

