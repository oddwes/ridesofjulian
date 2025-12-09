import { getIntervalColor } from '@/utils/ColorUtil'

export type Interval = {
  id: string
  name: string
  duration: number
  powerMin: number
  powerMax: number
}

interface WorkoutChartProps {
  intervals: Interval[]
  showIntervals?: boolean
}

export function WorkoutChart({ intervals, showIntervals = true }: WorkoutChartProps) {
  if (intervals.length === 0) return null

  const maxPower = Math.max(300, ...intervals.map((i) => i.powerMax || 0))
  const totalDuration = intervals.reduce((sum, i) => sum + (i.duration || 0), 0)

  if (maxPower <= 0 || totalDuration <= 0) {
    return showIntervals ? (
      <>
        {intervals.map((interval) => (
          <div key={interval.id} className="flex justify-between mb-0.5">
            <span className="text-xs font-medium text-slate-200 flex-1 mr-2 truncate">
              {interval.name}
            </span>
            <span className="text-xs text-slate-400 whitespace-nowrap">
              {interval.duration / 60}m | {interval.powerMin}-{interval.powerMax}W
            </span>
          </div>
        ))}
      </>
    ) : null
  }

  return (
    <>
      <div className="mb-3 py-1">
        <div className="h-20 flex items-end overflow-hidden px-0.5">
          {intervals.map((interval, idx) => {
            if (!interval.duration) return null
            const width = totalDuration > 0 ? (interval.duration / totalDuration) * 100 : 0
            const barHeight = maxPower > 0 ? (interval.powerMax / maxPower) * 100 : 0
            const minBarHeight = 4
            const actualHeight = Math.max(barHeight, minBarHeight)
            return (
              <div
                key={interval.id}
                className="flex items-end h-full"
                style={{
                  width: `${width}%`,
                  marginRight: idx < intervals.length - 1 ? '2px' : '0',
                }}
              >
                <div
                  className="w-full rounded-sm"
                  style={{
                    height: `${actualHeight}%`,
                    minHeight: '4px',
                    backgroundColor: getIntervalColor(interval.powerMin, interval.powerMax),
                  }}
                />
              </div>
            )
          })}
        </div>
      </div>

      {showIntervals &&
        intervals.map((interval) => (
          <div key={interval.id} className="flex justify-between mb-0.5">
            <span className="text-xs font-medium text-slate-200 flex-1 mr-2 truncate">
              {interval.name}
            </span>
            <span className="text-xs text-slate-400 whitespace-nowrap">
              {interval.duration / 60}m | {interval.powerMin}-{interval.powerMax}W
            </span>
          </div>
        ))}
    </>
  )
}

