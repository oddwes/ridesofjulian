"use client"

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getAccessToken } from '@ridesofjulian/shared/utils/StravaUtil/web';
import { LoadingSpinner } from './LoadingSpinner';

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
      <LoadingSpinner />
    </div>
  )
}

export default StravaRedirect