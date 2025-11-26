import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthRequest, makeRedirectUri } from 'expo-auth-session';
import dayjs from 'dayjs';
import {
  STRAVA_ACCESS_TOKEN_KEY,
  STRAVA_REFRESH_TOKEN_KEY,
  STRAVA_TOKEN_EXPIRY_KEY,
  StravaTokenResponse,
} from '@ridesofjulian/shared/src/utils/StravaUtil';

export const storeStravaTokens = async (data: StravaTokenResponse) => {
  await AsyncStorage.multiSet([
    [STRAVA_ACCESS_TOKEN_KEY, data.access_token],
    [STRAVA_REFRESH_TOKEN_KEY, data.refresh_token],
    [STRAVA_TOKEN_EXPIRY_KEY, String(data.expires_at)],
  ]);
};

export const hasStravaRefreshToken = async () => {
  const token = await AsyncStorage.getItem(STRAVA_REFRESH_TOKEN_KEY);
  return !!token;
};

export const isStravaLoggedIn = async () => {
  const [accessToken, expiry] = await AsyncStorage.multiGet([
    STRAVA_ACCESS_TOKEN_KEY,
    STRAVA_TOKEN_EXPIRY_KEY,
  ]);
  if (!accessToken[1] || !expiry[1]) return false;
  return Number(expiry[1]) > Date.now() / 1000;
};

export const refreshStravaAccessToken = async () => {
  const refreshToken = await AsyncStorage.getItem(STRAVA_REFRESH_TOKEN_KEY);
  if (!refreshToken) return null;

  const clientId = process.env.EXPO_PUBLIC_STRAVA_CLIENT_ID;
  const clientSecret = process.env.EXPO_PUBLIC_STRAVA_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const res = await fetch(
    `https://www.strava.com/api/v3/oauth/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=refresh_token&refresh_token=${refreshToken}`,
    { method: 'POST' }
  );
  if (!res.ok) return null;
  const data = (await res.json()) as StravaTokenResponse;
  await storeStravaTokens(data);
  return data;
};

export const ensureValidStravaToken = async () => {
  if (await isStravaLoggedIn()) return true;
  if (await hasStravaRefreshToken()) {
    const res = await refreshStravaAccessToken();
    return !!res;
  }
  return false;
};

export const connectStrava = async () => {
  const clientId = process.env.EXPO_PUBLIC_STRAVA_CLIENT_ID;
  const clientSecret = process.env.EXPO_PUBLIC_STRAVA_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    console.warn('Strava env missing: EXPO_PUBLIC_STRAVA_CLIENT_ID / EXPO_PUBLIC_STRAVA_CLIENT_SECRET');
    return false;
  }

  const redirectUri = makeRedirectUri({
    scheme: 'trainhard',
    path: 'strava_redirect',
  });

  const request = new AuthRequest({
    clientId,
    redirectUri,
    responseType: 'code',
    extraParams: {
      approval_prompt: 'force',
      scope: 'activity:read_all,profile:read_all',
    },
    usePKCE: false,
  });

  const result = await request.promptAsync(
    { authorizationEndpoint: 'https://www.strava.com/oauth/mobile/authorize' } as any
  );
  if (result.type !== 'success' || !result.params?.code) return false;

  const code = result.params.code as string;
  const res = await fetch(
    `https://www.strava.com/api/v3/oauth/token?client_id=${clientId}&client_secret=${clientSecret}&code=${code}&grant_type=authorization_code`,
    { method: 'POST' }
  );
  if (!res.ok) return false;

  const data = (await res.json()) as StravaTokenResponse;
  await storeStravaTokens(data);
  return true;
};

export interface StravaActivity {
  id: number;
  name: string;
  distance: number;
  total_elevation_gain: number;
  moving_time: number;
  start_date: string;
  type?: string;
  sport_type?: string;
  average_watts?: number;
  weighted_average_watts?: number;
  kilojoules?: number;
  average_heartrate?: number;
}

const stravaApiGet = async (url: string, params: Record<string, any> = {}) => {
  const accessToken = await AsyncStorage.getItem(STRAVA_ACCESS_TOKEN_KEY);
  if (!accessToken) throw new Error('No Strava access token');

  const queryString = new URLSearchParams(params).toString();
  const fullUrl = queryString ? `${url}?${queryString}` : url;

  const res = await fetch(fullUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) throw new Error('Strava API request failed');
  return res.json();
};

export const getAthleteActivities = async (year: number, page = 1): Promise<StravaActivity[]> => {
  const perPage = 100;
  const firstDayOfYear = dayjs(`${year}-01-01`).valueOf() / 1000;
  const lastDayOfYear = dayjs(`${year}-12-31`).valueOf() / 1000;

  const activities = await stravaApiGet('https://www.strava.com/api/v3/athlete/activities', {
    after: firstDayOfYear,
    before: lastDayOfYear,
    page,
    per_page: perPage,
  });

  if (activities.length === perPage) {
    const nextPage = await getAthleteActivities(year, page + 1);
    return activities.concat(nextPage);
  }

  return activities;
};

export const getTSS = (activity: StravaActivity, ftp: number): number => {
  if (!activity.weighted_average_watts) {
    return 0;
  }
  const intensityFactor = activity.weighted_average_watts / ftp;
  return Math.round(
    ((activity.moving_time * activity.weighted_average_watts * intensityFactor) / (ftp * 3600)) * 100
  );
};


