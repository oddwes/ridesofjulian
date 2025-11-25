"use client";

import { useState, useMemo, useEffect, forwardRef, useImperativeHandle } from "react";
import { Trash2, Copy } from "lucide-react";
import { DetailedChart } from "./RideWorkoutChart";

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
  const [intervals, setIntervals] = useState<Interval[]>(initialIntervals);
  const [selectedDate, setSelectedDate] = useState<string>(initialDate);
  const [workoutTitle, setWorkoutTitle] = useState<string>(initialTitle);
  const [isSaving, setIsSaving] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

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

  return (
    <div className="text-gray-600">
      <div className="mb-6">
        <DetailedChart intervals={intervals} />
      </div>

      <div className="mb-6 flex justify-center gap-6">
        <div className="flex flex-col">
          <label className="block text-sm font-medium mb-2 text-center">Title</label>
          <input
            type="text"
            value={workoutTitle}
            onChange={(e) => setWorkoutTitle(e.target.value)}
            placeholder="Workout title"
            disabled={disabled}
            className="px-4 py-2 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>
        <div className="flex flex-col">
          <label className="block text-sm font-medium mb-2 text-center">Workout Date</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            disabled={disabled}
            className="px-4 py-2 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>
        <div className="flex flex-col">
          <label className="block text-sm font-medium mb-2 text-center">Total Duration</label>
          <div className="px-4 py-2 bg-gray-100 border border-gray-300 rounded text-center font-semibold">
            {Math.floor(totalDuration / 60)}:{String(Math.round(totalDuration % 60)).padStart(2, '0')}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {intervals.map((interval, index) => (
          <div
            key={interval.id}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            className={`bg-white border border-gray-300 rounded-lg p-4 flex gap-4 items-center cursor-move ${
              draggedIndex === index ? 'opacity-50' : ''
            }`}
          >
            <div className="flex-1">
              <label className="block text-xs text-gray-600 mb-1">Name</label>
              <input
                type="text"
                value={interval.name}
                onChange={(e) => updateInterval(interval.id, "name", e.target.value)}
                placeholder="Interval name"
                disabled={disabled}
                className="w-full px-3 py-2 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            <div className="w-32">
              <label className="block text-xs text-gray-600 mb-1">Duration (min)</label>
              <input
                type="text"
                inputMode="numeric"
                value={interval.duration / 60}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, "");
                  updateInterval(interval.id, "duration", val ? parseInt(val) * 60 : 0);
                }}
                disabled={disabled}
                className="w-full px-3 py-2 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            <div className="w-40">
              <label className="block text-xs text-gray-600 mb-1">Power Range (W)</label>
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  inputMode="numeric"
                  value={interval.powerMin}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, "");
                    updateInterval(interval.id, "powerMin", val ? parseInt(val) : 0);
                  }}
                  disabled={disabled}
                  className="w-16 px-2 py-2 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <span>-</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={interval.powerMax}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, "");
                    updateInterval(interval.id, "powerMax", val ? parseInt(val) : 0);
                  }}
                  disabled={disabled}
                  className="w-16 px-2 py-2 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            <button
              onClick={() => duplicateInterval(interval.id)}
              disabled={disabled}
              className="px-3 py-2 text-blue-600 hover:bg-blue-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Copy size={18} />
            </button>

            <button
              onClick={() => deleteInterval(interval.id)}
              disabled={disabled}
              className="px-3 py-2 text-red-600 hover:bg-red-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 size={18} />
            </button>
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

