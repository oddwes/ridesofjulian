import { useMemo } from "react"
import { Line } from "react-chartjs-2"
import "chart.js/auto"
import { getIntervalColor } from "@/utils/ColorUtil"

interface WahooInterval {
  exit_trigger_value?: number
  targets?: Array<{
    low?: number
    high?: number
  }>
}

interface ChartInterval {
  id?: string
  name?: string
  duration: number
  powerMin: number
  powerMax: number
}

interface SimplifiedChartProps {
  intervals: WahooInterval[]
  height?: string
  className?: string
}

interface DetailedChartProps {
  intervals: ChartInterval[]
  height?: string
  showEmptyState?: boolean
}

export const SimplifiedChart = ({ 
  intervals, 
  height = 'h-16',
  className = ''
}: SimplifiedChartProps) => {
  const totalDuration = intervals.reduce((sum, i) => sum + (i.exit_trigger_value || 0), 0)
  
  return (
    <div className={`w-full bg-gray-50 border border-gray-300 ${height} rounded flex items-end overflow-hidden ${className}`}>
      {intervals.length > 0 ? (
        intervals.map((interval, idx) => {
          const width = totalDuration > 0 ? (interval.exit_trigger_value! / totalDuration) * 100 : 0
          const powerMin = interval.targets?.[0]?.low || 0
          const powerMax = interval.targets?.[0]?.high || 0
          const maxPower = Math.max(...intervals.map(i => i.targets?.[0]?.high || 0), 300)
          const height = maxPower > 0 ? (powerMax / maxPower) * 100 : 0
          
          return (
            <div
              key={idx}
              style={{
                width: `${width}%`,
                height: `${height}%`,
                backgroundColor: getIntervalColor(powerMin, powerMax),
                borderRight: idx < intervals.length - 1 ? '1px solid rgba(0,0,0,0.1)' : 'none'
              }}
            />
          )
        })
      ) : (
        <div className="w-full h-full bg-gray-200" />
      )}
    </div>
  )
}

export const DetailedChart = ({ 
  intervals, 
  height = "h-64",
  showEmptyState = true 
}: DetailedChartProps) => {
  const chartData = useMemo(() => {
    if (intervals.length === 0) return null

    let currentTime = 0
    const datasets = intervals.map((interval, index) => {
      const startTime = currentTime
      const endTime = currentTime + interval.duration / 60
      currentTime = endTime

      return {
        label: `${interval.name || `Interval ${index + 1}`}`,
        data: [
          { x: startTime, y: 0 },
          { x: startTime, y: interval.powerMax },
          { x: endTime, y: interval.powerMax },
          { x: endTime, y: 0 },
        ],
        borderColor: "rgba(0, 0, 0, 0.2)",
        backgroundColor: getIntervalColor(interval.powerMin, interval.powerMax),
        fill: true,
        pointRadius: 0,
        pointHoverRadius: 0,
        borderWidth: 1,
        stepped: false,
      }
    })

    return { datasets }
  }, [intervals])

  const totalDuration = useMemo(() => {
    return intervals.reduce((sum, interval) => sum + interval.duration / 60, 0)
  }, [intervals])

  const maxPower = useMemo(() => {
    const highest = intervals.reduce((max, interval) => Math.max(max, interval.powerMax), 0)
    return Math.max(highest, 300)
  }, [intervals])

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: false },
      tooltip: { enabled: false },
    },
    scales: {
      x: {
        type: "linear" as const,
        min: 0,
        max: totalDuration || 10,
      },
      y: {
        min: 0,
        max: maxPower,
      },
    },
  }), [totalDuration, maxPower])

  if (intervals.length === 0) {
    if (!showEmptyState) return null
    return (
      <div className={`relative ${height} bg-gray-50 border border-gray-200 rounded`}>
        <div className="absolute inset-0 flex items-center justify-center text-gray-400">
          No intervals configured
        </div>
      </div>
    )
  }

  return (
    <div className={`relative ${height} bg-gray-50 border border-gray-200 rounded`}>
      <div className="h-full p-4">
        <Line data={chartData!} options={chartOptions} />
      </div>
    </div>
  )
}

