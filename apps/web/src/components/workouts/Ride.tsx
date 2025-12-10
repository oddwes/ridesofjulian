"use client";

import { useState, useMemo, useEffect, forwardRef, useImperativeHandle } from "react";
import { Trash2, Copy } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { DetailedChart } from "./RideWorkoutChart";
import { useSupabase } from "@/contexts/SupabaseContext";
import { getFtp, getFtpForDate, type FtpData } from "@/utils/FtpUtil";

export interface Interval {
  id: string;
  name: string;
  duration: number;
  powerMin: number;
  powerMax: number;
}

export interface EditWorkoutHandle {
  save: () => Promise<void>;
  isSaving: boolean;
}

interface EditRideWorkoutProps {
  initialIntervals?: Interval[];
  initialTitle?: string;
  initialDate?: string;
  onSave: (data: { intervals: Interval[]; title: string; date: string }) => Promise<void>;
  disabled?: boolean;
}

const defaultIntervals: Interval[] = [
  {
    id: "1",
    name: "Warmup",
    duration: 300,
    powerMin: 0,
    powerMax: 150,
  },
];

const EditRideWorkout = forwardRef<EditWorkoutHandle, EditRideWorkoutProps>(({
  initialIntervals = defaultIntervals,
  initialTitle = "",
  initialDate = new Date().toISOString().split("T")[0],
  onSave,
  disabled = false,
}, ref) => {
  const { supabase, user } = useSupabase();
  const [intervals, setIntervals] = useState<Interval[]>(initialIntervals);
  const [selectedDate, setSelectedDate] = useState<string>(initialDate);
  const [workoutTitle, setWorkoutTitle] = useState<string>(initialTitle);
  const [isSaving, setIsSaving] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const { data: ftpHistory } = useQuery<FtpData | null>({
    queryKey: ['ftpHistory', user?.id],
    queryFn: async () => {
      if (!user) return null;
      return await getFtp(supabase, user.id);
    },
    enabled: !!user,
  });

  useEffect(() => {
    setIntervals(initialIntervals);
    setWorkoutTitle(initialTitle);
    setSelectedDate(initialDate);
  }, [initialIntervals, initialTitle, initialDate]);

  const handleSave = async () => {
    if (intervals.length === 0) {
      alert("Please add at least one interval");
      return;
    }

    setIsSaving(true);
    try {
      await onSave({ intervals, title: workoutTitle, date: selectedDate });
    } catch (error) {
      console.error("Error saving workout:", error);
    } finally {
      setIsSaving(false);
    }
  };

  useImperativeHandle(ref, () => ({
    save: handleSave,
    isSaving,
  }));

  const addInterval = () => {
    const newInterval: Interval = {
      id: Date.now().toString(),
      name: "",
      duration: 300,
      powerMin: 100,
      powerMax: 150,
    };
    setIntervals([...intervals, newInterval]);
  };

  const updateInterval = (id: string, field: keyof Interval, value: string | number) => {
    setIntervals(
      intervals.map((interval) =>
        interval.id === id ? { ...interval, [field]: value } : interval
      )
    );
  };

  const deleteInterval = (id: string) => {
    setIntervals(intervals.filter((interval) => interval.id !== id));
  };

  const duplicateInterval = (id: string) => {
    const index = intervals.findIndex((interval) => interval.id === id);
    if (index === -1) return;
    
    const intervalToDupe = intervals[index];
    const newInterval: Interval = {
      ...intervalToDupe,
      id: Date.now().toString(),
    };
    
    const newIntervals = [...intervals];
    newIntervals.splice(index + 1, 0, newInterval);
    setIntervals(newIntervals);
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    
    const newIntervals = [...intervals];
    const draggedItem = newIntervals[draggedIndex];
    newIntervals.splice(draggedIndex, 1);
    newIntervals.splice(index, 0, draggedItem);
    
    setIntervals(newIntervals);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const totalDuration = useMemo(() => {
    return intervals.reduce((sum, interval) => sum + interval.duration / 60, 0);
  }, [intervals]);

  const ftpForWorkout = useMemo(() => {
    return getFtpForDate(ftpHistory ?? null, selectedDate);
  }, [ftpHistory, selectedDate]);

  return (
    <div className="text-gray-50">
      <div className="mb-6">
        <DetailedChart intervals={intervals} />
      </div>

      <div className="mb-6 flex justify-center gap-6">
        <div className="flex flex-row items-center gap-3">
          <div className="flex flex-col">
            <label className="block text-xs font-medium mb-1 text-center">Total Duration</label>
            <div className="text-center text-sm">
              {Math.floor(totalDuration / 60)}:{String(Math.round(totalDuration % 60)).padStart(2, '0')}
            </div>
          </div>
          {ftpForWorkout && (
            <div className="flex flex-col">
              <label className="block text-xs font-medium mb-1 text-center">Estimated TSS</label>
              <div className="text-center text-sm">
                {intervals.reduce((sum, i) => {
                  // Estimate TSS using classic formula: (duration_hrs * NP/FTP)^2 * 100
                  // Here NP is approximated as avg power = (powerMin+powerMax)/2
                  const np = (i.powerMin + i.powerMax) / 2;
                  const durationHrs = i.duration / 3600;
                  const tss = durationHrs * Math.pow(np / ftpForWorkout, 2) * 100;
                  return sum + tss;
                }, 0).toFixed(0)}
              </div>
            </div>
          )}
        </div>
      </div>

      <div>
        {intervals.map((interval, index) => (
          <div
            key={interval.id}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            className={`rounded-lg px-4 py-2 flex flex-col sm:flex-row gap-3 sm:gap-2 items-stretch sm:items-center cursor-move ${
              draggedIndex === index ? 'opacity-50' : ''
            }`}
          >
            <div className="flex-1 min-w-0">
              <input
                type="text"
                value={interval.name}
                onChange={(e) => updateInterval(interval.id, "name", e.target.value)}
                placeholder="Interval name"
                disabled={disabled}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            <div className="flex gap-3 sm:gap-4 items-center flex-shrink-0">
              <div className="w-24 sm:w-32 relative">
                <input
                  type="text"
                  inputMode="numeric"
                  value={interval.duration / 60}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, "");
                    updateInterval(interval.id, "duration", val ? parseInt(val) * 60 : 0);
                  }}
                  placeholder="Duration"
                  disabled={disabled}
                  className="w-full px-3 py-2 pr-10 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs pointer-events-none">min</span>
              </div>

              <div className="flex-shrink-0">
                <div className="flex gap-2 items-center">
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={interval.powerMin}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, "");
                        updateInterval(interval.id, "powerMin", val ? parseInt(val) : 0);
                      }}
                      placeholder="Min"
                      disabled={disabled}
                      className="w-20 sm:w-24 px-2 py-2 pr-8 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs pointer-events-none">W</span>
                  </div>
                  <span className="text-sm">-</span>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={interval.powerMax}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, "");
                        updateInterval(interval.id, "powerMax", val ? parseInt(val) : 0);
                      }}
                      placeholder="Max"
                      disabled={disabled}
                      className="w-20 sm:w-24 px-2 py-2 pr-8 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs pointer-events-none">W</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => duplicateInterval(interval.id)}
                  disabled={disabled}
                  className="p-1 text-blue-600 hover:bg-blue-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Copy size={16} />
                </button>

                <button
                  onClick={() => deleteInterval(interval.id)}
                  disabled={disabled}
                  className="p-1 text-red-600 hover:bg-red-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-center mt-6">
        <button
          onClick={addInterval}
          disabled={disabled}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Add Interval
        </button>
      </div>
    </div>
  );
});

EditRideWorkout.displayName = 'EditRideWorkout';

export default EditRideWorkout;

