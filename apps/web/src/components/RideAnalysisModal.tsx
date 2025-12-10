'use client'

import { Modal } from './ui/Modal'
import { RideAnalysis } from './RideAnalysis'
import type { StravaActivity } from '@ridesofjulian/shared'

interface RideAnalysisModalProps {
  activity: StravaActivity | null
  onClose: () => void
}

export function RideAnalysisModal({ activity, onClose }: RideAnalysisModalProps) {
  if (!activity) return null

  return (
    <Modal
      title={activity.name}
      onClose={onClose}
      showFooter={false}
    >
      <div className="pb-4">
        <RideAnalysis activity={activity} />
      </div>
    </Modal>
  )
}
