import axios from 'axios';
import {
  STRAVA_ACCESS_TOKEN_KEY,
  STRAVA_REFRESH_TOKEN_KEY,
  STRAVA_TOKEN_EXPIRY_KEY,
  StravaTokenResponse,
} from './index';
import { StravaActivity } from '../../types/strava';

const getBeginningOfYear = (year: number) => {
  const date = new Date(year, 0, 1);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

const getEndOfYear = (year: number) => {
  const date = new Date(year, 11, 31);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
};

export const login = () => {
  const redirectUrl = process.env.NEXT_PUBLIC_STRAVA_REDIRECT_URL;
  const scope = 'activity:read_all,profile:read_all';
  window.location = `http://www.strava.com/oauth/authorize?client_id=${process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID}&response_type=code&redirect_uri=${redirectUrl}/exchange_token&approval_prompt=force&scope=${scope}`;
};

export const getAccessToken = async (authCode: string) => {
  try {
    const response = await axios.post(
      `https://www.strava.com/api/v3/oauth/token?client_id=${process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID}&client_secret=${process.env.NEXT_PUBLIC_STRAVA_CLIENT_SECRET}&code=${authCode}&grant_type=authorization_code`
    );
    storeTokens(response.data);
    return response.data;
  } catch (error) {
    console.log(error);
  }
};

export const refreshAccessToken = async () => {
  const refreshToken = localStorage.getItem(STRAVA_REFRESH_TOKEN_KEY);
  if (!refreshToken) {
    return null;
  }

  try {
    const response = await axios.post(
      `https://www.strava.com/api/v3/oauth/token?client_id=${process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID}&client_secret=${process.env.NEXT_PUBLIC_STRAVA_CLIENT_SECRET}&grant_type=refresh_token&refresh_token=${refreshToken}`
    );
    storeTokens(response.data);
    return response.data;
  } catch (error) {
    console.log(error);
    return null;
  }
};

const storeTokens = (data: StravaTokenResponse) => {
  localStorage.setItem(STRAVA_ACCESS_TOKEN_KEY, data.access_token);
  localStorage.setItem(STRAVA_REFRESH_TOKEN_KEY, data.refresh_token);
  localStorage.setItem(STRAVA_TOKEN_EXPIRY_KEY, String(data.expires_at));
};

export const isLoggedIn = () => {
  return (
    !!localStorage.getItem(STRAVA_ACCESS_TOKEN_KEY) &&
    Number(localStorage.getItem(STRAVA_TOKEN_EXPIRY_KEY)) > Date.now() / 1000
  );
};

export const hasRefreshToken = () => {
  return !!localStorage.getItem(STRAVA_REFRESH_TOKEN_KEY);
};

export const ensureValidToken = async () => {
  if (isLoggedIn()) {
    return true;
  }
  
  if (hasRefreshToken()) {
    const result = await refreshAccessToken();
    return !!result;
  }
  
  return false;
};

export const getAthlete = async () => {
  return await stravaApiV3Get('https://www.strava.com/api/v3/athlete');
};

export const getAthleteStats = async () => {
  const athlete = await getAthlete();
  return await stravaApiV3Get(`https://www.strava.com/api/v3/athletes/${athlete.id}/stats`);
};

import { getAthleteActivities as getAthleteActivitiesShared } from './utils';

export const getAthleteActivities = async (year: number, page = 1): Promise<StravaActivity[]> => {
  return getAthleteActivitiesShared(year, stravaApiV3Get, page);
};

export const stravaApiCall = async (url: string, params: Record<string, any> = {}) => {
  try {
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${localStorage.getItem(STRAVA_ACCESS_TOKEN_KEY)}` },
      params: params
    });
    return response.data;
  } catch (error) {
    console.log(error);
  }
};

const stravaApiV3Get = stravaApiCall;

