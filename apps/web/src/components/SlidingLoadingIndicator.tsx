"use client"

type SlidingLoadingIndicatorProps = {
  isLoading: boolean
}

export function SlidingLoadingIndicator({ isLoading }: SlidingLoadingIndicatorProps) {
  if (!isLoading) return null

  return (
    <div className="h-1.5 my-2 overflow-hidden w-full flex justify-center">
      <div className="loading-pill h-1.5 w-9 rounded-full bg-gray-500" />
    </div>
  )
}


