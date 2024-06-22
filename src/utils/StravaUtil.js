import axios from "axios";

const { REACT_APP_STRAVA_CLIENT_ID, REACT_APP_STRAVA_CLIENT_SECRET } = process.env

export const ACCESS_TOKEN_KEY = 'strava_access_token'
export const REFRESH_TOKEN_KEY = 'strava_refresh_token'
export const TOKEN_EXPIRY_KEY = 'strava_token_expiry'

export const login = () => {
  const redirectUrl = "http://localhost:3000/strava_redirect";
  const scope = "activity:read_all"
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
  return !!localStorage.getItem(ACCESS_TOKEN_KEY)
}

export const getAthlete = async () => {
  try {
    const response = await axios.get(
      'https://www.strava.com/api/v3/athlete',
      { headers: { Authorization: `Bearer ${localStorage.getItem(ACCESS_TOKEN_KEY)}` } }
    );
    return response.data;
  } catch (error) {
    console.log(error);
  }
}