'use client'

import { useEffect, useMemo, useState, useRef } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'
import TabNavigation from '@/components/TabNavigation'
import { SlidingLoadingIndicator } from '@/components/SlidingLoadingIndicator'
import { PlannedRide } from '@/components/PlannedRide'
import { useSupabase } from '@/contexts/SupabaseContext'
import { getFtp, getFtpForDate, type FtpData } from '@/utils/FtpUtil'
import type { RideWorkout, Interval } from '@/types/workout'
import { deleteWorkoutFromSchedule, type Exercise } from '@ridesofjulian/shared'
import { Modal } from '@/components/ui/Modal'
import EditWorkout, { type EditWorkoutHandle } from '@/components/workouts/Edit'

dayjs.extend(isoWeek)

type ScheduleRow = { date: string; plan: RideWorkout[] | null; type: string }
type ScheduledRideWorkout = RideWorkout & { scheduleRowDate: string }

const formatDurationMinutes = (intervals: Interval[]) =>
  intervals.reduce((sum, interval) => sum + interval.duration / 60, 0)

const computeWorkoutTss = (workout: RideWorkout, ftpHistory: FtpData | null | undefined): number => {
  const ftpForWorkout = getFtpForDate(ftpHistory ?? null, workout.selectedDate)
  if (!ftpForWorkout) return 0

  let numerator = 0
  workout.intervals.forEach((interval) => {
    if (!interval.duration) return
    const avgPower = (interval.powerMin + interval.powerMax) / 2
    const intensityFactor = avgPower / ftpForWorkout
    numerator += interval.duration * avgPower * intensityFactor
  })

  if (!numerator || !ftpForWorkout) return 0
  return Math.round((numerator / (ftpForWorkout * 3600)) * 100)
}

export default function PlanPage() {
  const { supabase, user } = useSupabase()
  const queryClient = useQueryClient()

  const { data: scheduleRows = [], isLoading: scheduleLoading } = useQuery<ScheduleRow[]>({
    queryKey: ['schedule', user?.id],
    queryFn: async () => {
      if (!user) return []
      const { data, error } = await supabase
        .from('schedule')
        .select('date, plan, type')
        .eq('user_id', user.id)
        .eq('type', 'cycling')
        .order('date', { ascending: true })
      if (error) throw error
      return data as ScheduleRow[]
    },
    enabled: !!user,
  })

  const { data: ftpHistory } = useQuery<FtpData | null>({
    queryKey: ['ftpHistory', user?.id],
    queryFn: async () => {
      if (!user) return null
      return await getFtp(supabase, user.id)
    },
    enabled: !!user,
  })

  const weeks = useMemo(() => {
    const map: Record<string, { weekStart: dayjs.Dayjs; workouts: ScheduledRideWorkout[]; totalMinutes: number; totalTss: number }> = {}

    scheduleRows.forEach((row) => {
      if (!row.plan) return
      row.plan.forEach((workout) => {
        const d = dayjs(workout.selectedDate)
        const weekStart = d.startOf('isoWeek')
        const key = weekStart.format('YYYY-MM-DD')
        if (!map[key]) {
          map[key] = { weekStart, workouts: [], totalMinutes: 0, totalTss: 0 }
        }
        const minutes = formatDurationMinutes(workout.intervals)
        const tss = computeWorkoutTss(workout, ftpHistory)
        map[key].workouts.push({ ...workout, scheduleRowDate: row.date })
        map[key].totalMinutes += minutes
        map[key].totalTss += tss
      })
    })

    return Object.values(map).sort((a, b) => a.weekStart.valueOf() - b.weekStart.valueOf())
  }, [scheduleRows, ftpHistory])

  const todayStr = dayjs().format('YYYY-MM-DD')
  const [collapsedWeeks, setCollapsedWeeks] = useState<string[] | null>(null)
  const [editingWorkout, setEditingWorkout] = useState<ScheduledRideWorkout | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [workoutTitle, setWorkoutTitle] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const editWorkoutRef = useRef<EditWorkoutHandle>(null)

  useEffect(() => {
    if (!weeks.length || collapsedWeeks !== null) return
    const currentWeekStart = dayjs().startOf('isoWeek')
    const initial = weeks
      .filter(w => w.weekStart.isBefore(currentWeekStart, 'day'))
      .map(w => w.weekStart.format('YYYY-MM-DD'))
    setCollapsedWeeks(initial)
  }, [weeks, collapsedWeeks])

  const collapsed = collapsedWeeks ?? []

  const updateSchedule = async (workout: ScheduledRideWorkout, updater: (plan: RideWorkout[]) => RideWorkout[]) => {
    if (!user?.id) return

    const { data, error } = await supabase
      .from('schedule')
      .select('id, plan')
      .eq('user_id', user.id)
      .eq('type', 'cycling')
      .eq('date', workout.scheduleRowDate)
      .single<{ id: number; plan: RideWorkout[] }>()

    if (error || !data) {
      console.error('Failed to load schedule row', error)
      throw new Error('Failed to load schedule row')
    }

    const currentPlan = data.plan || []
    const nextPlan = updater(currentPlan)

    const { error: updateError } = await supabase
      .from('schedule')
      .update({ plan: nextPlan })
      .eq('id', data.id)

    if (updateError) {
      console.error('Failed to update schedule row', updateError)
      throw new Error('Failed to update schedule row')
    }

    queryClient.invalidateQueries({ queryKey: ['schedule', user.id] })
  }

  const handleEditWorkout = (workout: RideWorkout) => {
    const scheduledWorkout = workout as ScheduledRideWorkout
    setEditingWorkout(scheduledWorkout)
    setWorkoutTitle(scheduledWorkout.workoutTitle)
    setSelectedDate(scheduledWorkout.selectedDate)
  }

  const handleSaveEditedWorkout = async (data: { intervals?: Interval[]; exercises?: Exercise[]; title?: string; date: string }) => {
    if (!editingWorkout || !user?.id) return

    const { intervals, title, date } = data
    if (!intervals) return

    try {
      await updateSchedule(editingWorkout, (plan) =>
        plan.map((w) =>
          w.id === editingWorkout.id
            ? { ...w, workoutTitle: title ?? workoutTitle, selectedDate: date, intervals }
            : w
        )
      )
      setEditingWorkout(null)
    } catch (error) {
      console.error('Failed to save workout:', error)
      throw error
    }
  }

  const handleWahooIdChange = async (wahooId: number | null) => {
    if (!editingWorkout || !user?.id) return

    try {
      const updatedWahooId = wahooId ?? undefined
      await updateSchedule(editingWorkout, (plan) =>
        plan.map((w) =>
          w.id === editingWorkout.id
            ? { ...w, wahooId: updatedWahooId }
            : w
        )
      )
      setEditingWorkout({ ...editingWorkout, wahooId: updatedWahooId })
    } catch (error) {
      console.error('Failed to update wahooId:', error)
      throw error
    }
  }

  const handleModalSave = async () => {
    if (!editWorkoutRef.current) return
    setIsSaving(true)
    try {
      await editWorkoutRef.current.save()
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteWorkout = async () => {
    if (!editingWorkout || !user?.id) return
    try {
      await deleteWorkoutFromSchedule(supabase, user.id, editingWorkout.id, editingWorkout.scheduleRowDate)
      queryClient.invalidateQueries({ queryKey: ['schedule', user.id] })
      setEditingWorkout(null)
    } catch (error) {
      console.error('Failed to delete workout:', error)
      throw error
    }
  }

  const handleDeleteWorkoutFromCard = async (workout: RideWorkout) => {
    if (!user?.id) return
    const scheduledWorkout = workout as ScheduledRideWorkout
    if (!confirm(`Delete "${workout.workoutTitle}"?`)) return
    try {
      await deleteWorkoutFromSchedule(supabase, user.id, scheduledWorkout.id, scheduledWorkout.scheduleRowDate)
      queryClient.invalidateQueries({ queryKey: ['schedule', user.id] })
    } catch (error) {
      console.error('Failed to delete workout:', error)
    }
  }

  const isFutureOrToday = (dateStr: string) => {
    const workoutDate = dayjs(dateStr).startOf('day')
    const today = dayjs().startOf('day')
    return workoutDate.isSame(today) || workoutDate.isAfter(today)
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-3 md:px-4 overflow-x-hidden">
      <TabNavigation />
      <SlidingLoadingIndicator isLoading={scheduleLoading} />
      {!scheduleLoading && weeks.length === 0 && (
        <p className="mt-4 text-sm text-slate-300">No training plan yet.</p>
      )}

      {weeks.map((week) => {
        const weekKey = week.weekStart.format('YYYY-MM-DD')
        const isCollapsed = collapsed.includes(weekKey)
        const dates: string[] = []
        for (let i = 0; i < 7; i++) {
          dates.push(week.weekStart.add(i, 'day').format('YYYY-MM-DD'))
        }

        const restDates = dates.filter(
          (dateStr) => !week.workouts.some((w) => w.selectedDate === dateStr)
        )

        const sortedItems = [
          ...week.workouts.map((w) => ({ type: 'workout' as const, date: w.selectedDate, workout: w })),
          ...restDates.map((d) => ({ type: 'rest' as const, date: d, workout: null as null }))
        ].sort((a, b) => a.date.localeCompare(b.date))

        return (
          <div key={weekKey} className="mb-6 space-y-1">
            <button
              type="button"
              onClick={() =>
                setCollapsedWeeks(prev => {
                  const base = prev ?? []
                  return base.includes(weekKey)
                    ? base.filter(k => k !== weekKey)
                    : [...base, weekKey]
                })
              }
              className="w-full flex items-baseline justify-between text-left"
            >
              <div className="flex items-center gap-2">
                {isCollapsed ? (
                  <ChevronRight className="w-4 h-4 text-slate-300" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-300" />
                )}
                <span className="text-base font-semibold text-white">
                  Week of {week.weekStart.format('MMM D')}
                </span>
              </div>
              <span className="text-sm text-slate-300">
                {Math.floor(week.totalMinutes / 60)}h {Math.round(week.totalMinutes % 60)}m ·{' '}
                {week.totalTss} TSS
              </span>
            </button>
            {!isCollapsed && (
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              {sortedItems.map((item) => {
                if (item.type === 'workout') {
                  const isToday = item.date === todayStr
                  const canEditOrDelete = isFutureOrToday(item.date)
                  return (
                    <PlannedRide
                      key={item.workout.id}
                      workout={item.workout}
                      isToday={isToday}
                      onEdit={canEditOrDelete ? handleEditWorkout : undefined}
                      onDelete={canEditOrDelete ? handleDeleteWorkoutFromCard : undefined}
                    />
                  )
                } else {
                  const isTodayRest = item.date === todayStr
                  return (
                    <div
                      key={`rest-${item.date}`}
                      className={`rounded-xl border p-4 text-gray-700 ${
                        isTodayRest ? 'border-2 border-blue-500 bg-gray-200' : 'border-slate-800 bg-gray-300/80'
                      }`}
                    >
                      <div className="flex justify-between items-baseline">
                        <span className="text-sm font-semibold">
                          {dayjs(item.date).format('MMMM D, YYYY')}
                        </span>
                        <span className="text-xs text-gray-600">Rest</span>
                      </div>
                    </div>
                  )
                }
              })}
            </div>
            )}
          </div>
        )
      })}

      {editingWorkout && (
        <Modal
          title={workoutTitle}
          date={selectedDate}
          onTitleChange={setWorkoutTitle}
          onDateChange={setSelectedDate}
          onClose={() => setEditingWorkout(null)}
          onSave={handleModalSave}
          onDelete={isFutureOrToday(editingWorkout.selectedDate) ? handleDeleteWorkout : undefined}
          isSaving={isSaving}
          editableTitle={true}
        >
          <EditWorkout
            ref={editWorkoutRef}
            type="ride"
            initialIntervals={editingWorkout.intervals}
            initialTitle={workoutTitle}
            initialDate={selectedDate}
            initialWahooId={editingWorkout.wahooId}
            workoutId={editingWorkout.id}
            onSave={handleSaveEditedWorkout}
            onWahooIdChange={handleWahooIdChange}
            disabled={isSaving}
          />
        </Modal>
      )}
    </div>
  )
}

