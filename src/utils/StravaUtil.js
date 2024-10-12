import { getBeginningOfYear, getEndOfYear } from "./TimeUtil";

import axios from "axios";

const { REACT_APP_STRAVA_CLIENT_ID, REACT_APP_STRAVA_CLIENT_SECRET } = process.env

export const ACCESS_TOKEN_KEY = 'strava_access_token'
export const REFRESH_TOKEN_KEY = 'strava_refresh_token'
export const TOKEN_EXPIRY_KEY = 'strava_token_expiry'

export const login = () => {
  const redirectUrl = "http://localhost:3000/strava_redirect";
  const scope = "activity:read_all,profile:read_all"
  window.location = `http://www.strava.com/oauth/authorize?client_id=${REACT_APP_STRAVA_CLIENT_ID}&response_type=code&redirect_uri=${redirectUrl}/exchange_token&approval_prompt=force&scope=${scope}`;
}

export const getAccessToken = async (authCode) => {
  try {
    const response = await axios.post(
      `https://www.strava.com/api/v3/oauth/token?client_id=${REACT_APP_STRAVA_CLIENT_ID}&client_secret=${REACT_APP_STRAVA_CLIENT_SECRET}&code=${authCode}&grant_type=authorization_code`
    );
    return response.data;
  } catch (error) {
    console.log(error);
  }
}

export const isLoggedIn = () => {
  return (!!localStorage.getItem(ACCESS_TOKEN_KEY)) && (localStorage.getItem(TOKEN_EXPIRY_KEY) > Date.now()/1000)
}

export const getAthlete = async () => {
  return await stravaApiV3Get('https://www.strava.com/api/v3/athlete')
}

export const getAthleteStats = async () => {
  const athlete = await getAthlete()
  return await stravaApiV3Get(`https://www.strava.com/api/v3/athletes/${athlete.id}/stats`)
}

export const getAthleteActivities = async (year, page = 1) => {
  const perPage = 100
  const firstDayOfYear = getBeginningOfYear(year).valueOf()/1000
  const lastDayOfYear = getEndOfYear(year).valueOf()/1000
  const activities = await stravaApiV3Get(
    'https://www.strava.com/api/v3/athlete/activities',
    {
      after: firstDayOfYear,
      before: lastDayOfYear,
      page: page,
      per_page: perPage,
    }
  )
  if(activities.length === perPage) {
    const nextPage = await getAthleteActivities(year, page + 1)
    return activities.concat(nextPage)
  } else {
    return activities
  }
}

const stravaApiV3Get = async (url, params = {}) => {
  try {
    const response = await axios.get(
      url,
      {
        headers: { Authorization: `Bearer ${localStorage.getItem(ACCESS_TOKEN_KEY)}` },
        params: params
      }
    );
    return response.data;
  } catch (error) {
    console.log(error);
  }
}

export const getTotalDistance = (activities) => {
  return Math.round(activities.reduce((partialSum, a) => partialSum + a.distance, 0)/1000)
}

export const getTotalElevation = (activities) => {
  return Math.round(activities.reduce((partialSum, a) => partialSum + a.total_elevation_gain, 0))
}

export const getTotalTime = (activities) => {
  return Math.round(activities.reduce((partialSum, a) => partialSum + a.moving_time, 0)/3600)
}

export const getTSS = (activity) => {
  if (!activity.weighted_average_watts) {
    return 0
  }
  const ftp = 240
  const intensityFactor = activity.weighted_average_watts / ftp
  return Math.round((activity.moving_time * activity.weighted_average_watts * intensityFactor)/(ftp * 3600) * 100)
}

export const getTotalTss = (activities) => {
  return activities.reduce((partialSum, activity) => partialSum + getTSS(activity), 0)
}