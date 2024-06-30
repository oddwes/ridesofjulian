import '../styling/strava.css';

import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, TOKEN_EXPIRY_KEY, getAccessToken } from '../utils/StravaUtil';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useEffect } from 'react';

const StravaRedirect = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  useEffect(() => {
    async function getTokens() {
      const authCode = searchParams.get('code')
      const tokens = await getAccessToken(authCode)
      localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access_token)
      localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token)
      localStorage.setItem(TOKEN_EXPIRY_KEY, tokens.expires_at)
      navigate('/')
    }
    getTokens()
  }, [])
}

export default StravaRedirect