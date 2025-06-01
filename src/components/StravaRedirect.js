"use client"

import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, TOKEN_EXPIRY_KEY, getAccessToken } from '../utils/StravaUtil';
import { useRouter, useSearchParams } from 'next/navigation';

import { useEffect } from 'react';

const StravaRedirect = () => {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    async function getTokens() {
      const authCode = searchParams.get('code')
      if (!authCode) {
        router.push('/login')
        return
      }

      try {
        const tokens = await getAccessToken(authCode)
        localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access_token)
        localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token)
        localStorage.setItem(TOKEN_EXPIRY_KEY, tokens.expires_at)
        router.push('/')
      } catch (error) {
        console.error('Error getting tokens:', error)
        router.push('/login')
      }
    }
    getTokens()
  }, [router, searchParams])

  return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#FC4C02]"></div>
    </div>
  )
}

export default StravaRedirect