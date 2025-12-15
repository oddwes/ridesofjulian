"use client"

import { createContext, useState, useContext, useEffect } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useSupabase } from "@/contexts/SupabaseContext"
import { getFtp, createFtp, updateFtp } from "@/utils/FtpUtil"
import { Save } from "lucide-react"
import "chart.js/auto"

export const FtpContext = createContext({ ftp: undefined, setFtp: () => {} })

export const FTPProvider = ({ children }) => {
  const [ftp, setFtp] = useState()
  const { supabase, user } = useSupabase()

  const { data: ftpHistory } = useQuery({
    queryKey: ['ftpHistory', user?.id],
    queryFn: async () => {
      if (!user) return null
      return await getFtp(supabase, user.id)
    },
    enabled: !!user,
  })

  useEffect(() => {
    if (ftpHistory?.ftp && Object.keys(ftpHistory.ftp).length > 0) {
      const entries = Object.entries(ftpHistory.ftp)
        .map(([date, value]) => ({ date, value }))
        .sort((a, b) => new Date(b.date) - new Date(a.date))
      
      if (entries.length > 0) {
        const latestFtp = entries[0].value
        setFtp(latestFtp)
      }
    }
  }, [ftpHistory])

  const updateFtp = (newFtp) => {
    setFtp(newFtp)
  }

  return (
    <FtpContext.Provider value={{ ftp, setFtp: updateFtp }}>
      {children}
    </FtpContext.Provider>
  )
}

export const FTPInput = () => {
  const { ftp, setFtp } = useContext(FtpContext)
  const { supabase, user } = useSupabase()
  const [saving, setSaving] = useState(false)
  const [originalFtp, setOriginalFtp] = useState(null)
  const [ftpIsDirty, setFtpIsDirty] = useState(false)
  const queryClient = useQueryClient()

  const { data: ftpHistory } = useQuery({
    queryKey: ['ftpHistory', user?.id],
    queryFn: async () => {
      if (!user) return null
      return await getFtp(supabase, user.id)
    },
    enabled: !!user,
  })

  useEffect(() => {
    if (ftpHistory?.ftp && Object.keys(ftpHistory.ftp).length > 0) {
      const entries = Object.entries(ftpHistory.ftp)
        .map(([date, value]) => ({ date, value }))
        .sort((a, b) => new Date(b.date) - new Date(a.date))
      
      if (entries.length > 0) {
        const latestFtp = entries[0].value
        if (!originalFtp) {
          setOriginalFtp(latestFtp)
        }
      }
    }
  }, [ftpHistory, originalFtp])

  const handleFtpChange = (e) => {
    const value = e.target.value
    setFtp(value)
    if (!ftpIsDirty && value !== String(originalFtp || '')) {
      setFtpIsDirty(true)
    } else if (value === String(originalFtp || '')) {
      setFtpIsDirty(false)
    }
  }

  const handleSave = async () => {
    if (!user || !ftp || !ftpIsDirty) return
    
    setSaving(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      const ftpValue = Number(ftp)
      
      const existing = await getFtp(supabase, user.id)
      
      if (existing) {
        await updateFtp(supabase, user.id, today, ftpValue)
      } else {
        await createFtp(supabase, user.id, today, ftpValue)
      }
      setOriginalFtp(ftpValue)
      setFtpIsDirty(false)
      await queryClient.invalidateQueries({ queryKey: ['ftpHistory', user.id] })
    } catch (error) {
      console.error('Failed to save FTP:', error)
    } finally {
      setSaving(false)
    }
  }

  // const chartData = useMemo(() => {
  //   if (!ftpHistory?.ftp || Object.keys(ftpHistory.ftp).length === 0) return null

  //   const entries = Object.entries(ftpHistory.ftp)
  //     .map(([date, value]) => ({ date, value }))
  //     .sort((a, b) => new Date(a.date) - new Date(b.date))

  //   const monthlyData = {}
  //   entries.forEach(({ date, value }) => {
  //     const monthKey = date.substring(0, 7)
  //     if (!monthlyData[monthKey] || new Date(date) > new Date(monthlyData[monthKey].date)) {
  //       monthlyData[monthKey] = { date, value }
  //     }
  //   })

  //   const sortedMonths = Object.keys(monthlyData).sort()
  //   if (sortedMonths.length === 0) return null

  //   const firstMonth = sortedMonths[0]
  //   const lastMonth = sortedMonths[sortedMonths.length - 1]
    
  //   const startDate = new Date(firstMonth + '-01')
  //   const endDate = new Date(lastMonth + '-01')
    
  //   const allMonths = []
  //   const currentDate = new Date(startDate)
    
  //   while (currentDate <= endDate) {
  //     const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`
  //     allMonths.push(monthKey)
  //     currentDate.setMonth(currentDate.getMonth() + 1)
  //   }

  //   const labels = allMonths.map(month => {
  //     const date = new Date(month + '-01')
  //     return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  //   }).reverse()
    
  //   const values = allMonths.map(month => {
  //     return monthlyData[month] ? monthlyData[month].value : null
  //   }).reverse()

  //   return {
  //     labels,
  //     datasets: [{
  //       label: 'FTP',
  //       data: values,
  //       borderColor: 'rgb(99, 102, 241)',
  //       backgroundColor: 'rgba(99, 102, 241, 0.1)',
  //       tension: 0.4,
  //       fill: true,
  //       pointRadius: 4,
  //       pointHoverRadius: 6,
  //       spanGaps: true,
  //     }]
  //   }
  // }, [ftpHistory])

  // const chartOptions = useMemo(() => {
  //   if (!chartData) return null

  //   return {
  //     responsive: true,
  //     maintainAspectRatio: false,
  //     interaction: {
  //       mode: 'index',
  //       intersect: false,
  //     },
  //     plugins: {
  //       legend: { display: false },
  //       tooltip: {
  //         callbacks: {
  //           label: (context) => `FTP: ${context.parsed.y}W`
  //         }
  //       }
  //     },
  //     scales: {
  //       x: {
  //         ticks: {
  //           maxRotation: 45,
  //           minRotation: 45
  //         }
  //       },
  //       y: {
  //         beginAtZero: false,
  //         ticks: {
  //           callback: (value) => `${value}W`
  //         }
  //       }
  //     }
  //   }
  // }, [chartData])

  // const chartWidth = useMemo(() => {
  //   if (!chartData) return 0
  //   const pxPerPoint = 30
  //   return chartData.labels.length * pxPerPoint
  // }, [chartData])

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-semibold mb-2">
          FTP
        </label>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="number"
              value={ftp || ''}
              onChange={handleFtpChange}
              placeholder="-- W"
              className="w-full px-3 py-2 pr-12 rounded-md bg-slate-950 border border-slate-700 text-sm text-slate-100"
            />
            {ftp && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-300 pointer-events-none">
                W
              </span>
            )}
          </div>
          <button
            onClick={handleSave}
            disabled={saving || !ftpIsDirty}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={16} />
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
      
      {/* {isDesktop && (
        <div className="w-full">
          {loadingHistory ? (
            <div className="h-64 flex items-center justify-center text-gray-400">
              Loading chart...
            </div>
          ) : chartData ? (
            <div className="w-full p-4 overflow-x-auto">
              <div style={{ width: `${chartWidth}px`, height: '256px' }}>
                <Line data={chartData} options={chartOptions} />
              </div>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">
              No FTP data available
            </div>
          )}
        </div>
      )} */}
    </div>
  )
}

export default FTPProvider