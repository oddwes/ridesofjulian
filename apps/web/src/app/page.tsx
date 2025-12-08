'use client'

import Home from '@/components/Home'
import { ensureValidToken } from '@/utils/StravaUtil'
import { ensureValidWahooToken } from '@/utils/WahooUtil'
import { useEffect, useState } from 'react'

export default function Page() {
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      await ensureValidToken()
      await ensureValidWahooToken()
      setIsReady(true)
    }

    checkAuth()
  }, [])

  if (!isReady) {
    return <></>
  }

  return (
    <Home />
  )
} 