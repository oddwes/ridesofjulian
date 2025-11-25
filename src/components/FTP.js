"use client"

import { createContext, useState, useContext, useEffect, useMemo } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useSupabase } from "@/contexts/SupabaseContext"
import { getFtp, createFtp, updateFtp } from "@/utils/FtpUtil"
import { useMediaQuery } from "@/hooks/useMediaQuery"
import { Line } from "react-chartjs-2"
import "chart.js/auto"

export const FtpContext = createContext({ ftp: undefined, setFtp: () => {} })

export const FTPProvider = ({ children }) => {
  const [ftp, setFtp] = useState()

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
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const queryClient = useQueryClient()

  const { data: ftpHistory, isLoading: loadingHistory } = useQuery({
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
      
      if (entries.length > 0 && !ftp) {
        setFtp(entries[0].value)
      }
    }
  }, [ftpHistory, ftp, setFtp])

  const handleFtpChange = (e) => {
    setFtp(e.target.value)
  }

  const handleSave = async () => {
    if (!user || !ftp) return
    
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
      await queryClient.invalidateQueries({ queryKey: ['ftpHistory', user.id] })
    } catch (error) {
      console.error('Failed to save FTP:', error)
    } finally {
      setSaving(false)
    }
  }

  const chartData = useMemo(() => {
    if (!ftpHistory?.ftp || Object.keys(ftpHistory.ftp).length === 0) return null

    const entries = Object.entries(ftpHistory.ftp)
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => new Date(a.date) - new Date(b.date))

    const monthlyData = {}
    entries.forEach(({ date, value }) => {
      const monthKey = date.substring(0, 7)
      if (!monthlyData[monthKey] || new Date(date) > new Date(monthlyData[monthKey].date)) {
        monthlyData[monthKey] = { date, value }
      }
    })

    const sortedMonths = Object.keys(monthlyData).sort()
    if (sortedMonths.length === 0) return null

    const firstMonth = sortedMonths[0]
    const lastMonth = sortedMonths[sortedMonths.length - 1]
    
    const startDate = new Date(firstMonth + '-01')
    const endDate = new Date(lastMonth + '-01')
    
    const allMonths = []
    const currentDate = new Date(startDate)
    
    while (currentDate <= endDate) {
      const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`
      allMonths.push(monthKey)
      currentDate.setMonth(currentDate.getMonth() + 1)
    }

    const labels = allMonths.map(month => {
      const date = new Date(month + '-01')
      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    }).reverse()
    
    const values = allMonths.map(month => {
      return monthlyData[month] ? monthlyData[month].value : null
    }).reverse()

    return {
      labels,
      datasets: [{
        label: 'FTP',
        data: values,
        borderColor: 'rgb(99, 102, 241)',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        tension: 0.4,
        fill: true,
        pointRadius: 4,
        pointHoverRadius: 6,
        spanGaps: true,
      }]
    }
  }, [ftpHistory])

  const chartOptions = useMemo(() => {
    if (!chartData) return null

    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context) => `FTP: ${context.parsed.y}W`
          }
        }
      },
      scales: {
        x: {
          ticks: {
            maxRotation: 45,
            minRotation: 45
          }
        },
        y: {
          beginAtZero: false,
          ticks: {
            callback: (value) => `${value}W`
          }
        }
      }
    }
  }, [chartData])

  const chartWidth = useMemo(() => {
    if (!chartData) return 0
    const pxPerPoint = 30
    return chartData.labels.length * pxPerPoint
  }, [chartData])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center gap-4">
        <label className="text-sm font-medium">Update FTP:</label>
        <input
          type="number"
          value={ftp || ''}
          onChange={handleFtpChange}
          className="w-24 md:w-28 px-3 py-2 rounded-lg border border-slate-600 bg-slate-900/60 text-slate-50 placeholder:text-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 transition-colors"
        />
        <button
          onClick={handleSave}
          disabled={saving || !ftp}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
      
      {isDesktop && (
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
      )}
    </div>
  )
}

export default FTPProvider