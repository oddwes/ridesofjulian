"use client"

import { getAccessToken } from '../utils/StravaUtil';
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
        await getAccessToken(authCode)
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