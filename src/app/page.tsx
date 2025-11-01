'use client'

import Home from '@/components/Home'
import TabNavigation from '@/components/TabNavigation'
import { ensureValidToken } from '@/utils/StravaUtil'
import { ensureValidWahooToken } from '@/utils/WahooUtil'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { LoadingSpinner } from '@/components/LoadingSpinner'

export default function Page() {
  const router = useRouter()
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      const hasValidStravaToken = await ensureValidToken()
      if (!hasValidStravaToken) {
        router.push('/login')
        return
      }

      await ensureValidWahooToken()
      setIsReady(true)
    }

    checkAuth()
  }, [router])

  if (!isReady) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <>
      <TabNavigation />
      <Home />
    </>
  )
} 