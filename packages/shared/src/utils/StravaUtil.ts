export const STRAVA_ACCESS_TOKEN_KEY = 'strava_access_token';
export const STRAVA_REFRESH_TOKEN_KEY = 'strava_refresh_token';
export const STRAVA_TOKEN_EXPIRY_KEY = 'strava_token_expiry';

export type StravaTokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
};


