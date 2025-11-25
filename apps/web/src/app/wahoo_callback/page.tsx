import WahooRedirect from '@/components/WahooRedirect'
import { Suspense } from 'react'

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <WahooRedirect />
    </Suspense>
  )
}

