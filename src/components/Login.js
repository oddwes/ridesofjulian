"use client"

import { ensureValidToken, login } from "../utils/StravaUtil"
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

const Login = () => {
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      const hasValidToken = await ensureValidToken()
      if (hasValidToken) {
        router.push('/')
      }
    }
    checkAuth()
  }, [router])

  return (
    <div className="flex justify-center items-center min-h-screen">
      <button
        onClick={login}
        className="flex items-center gap-2 bg-[#FC4C02] text-white pl-4 pr-6 py-3 rounded-lg"
      >
        <img src="/strava-logo.svg" width="50" height="50" alt="strava logo" />
        <span className="font-bold">Login</span>
      </button>
    </div>
  )
}

export default Login