"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Line } from "react-chartjs-2";
import "chart.js/auto";
import { Trash2, Copy } from "lucide-react";
import Container from "@/components/ui/Container";
import { getStoredWahooToken, getWahooAuthUrl } from "@/utils/WahooUtil";

interface Interval {
  id: string;
  name: string;
  duration: number;
  powerMin: number;
  powerMax: number;
}

const WORKOUT_STORAGE_KEY = 'workout_builder_data';

const loadWorkoutFromStorage = () => {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(WORKOUT_STORAGE_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
};

const defaultIntervals = [
  {
    id: "1",
    name: "Warmup",
    duration: 300,
    powerMin: 0,
    powerMax: 150,
  },
  {
    id: "2",
    name: "Z2",
    duration: 2400,
    powerMin: 145,
    powerMax: 160,
  },
  {
    id: "3",
    name: "Cooldown",
    duration: 300,
    powerMin: 0,
    powerMax: 150,
  },
];

export default function WorkoutPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const storedWorkout = loadWorkoutFromStorage();
  
  const [intervals, setIntervals] = useState<Interval[]>(
    storedWorkout?.intervals || defaultIntervals
  );
  const [selectedDate, setSelectedDate] = useState<string>(
    storedWorkout?.selectedDate || new Date().toISOString().split("T")[0]
  );
  const [workoutTitle, setWorkoutTitle] = useState<string>(
    storedWorkout?.workoutTitle || ""
  );
  const [isPushing, setIsPushing] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  useEffect(() => {
    setIsMounted(true);
    const newDate = sessionStorage.getItem('new_workout_date');
    
    if (newDate) {
      setSelectedDate(newDate);
      sessionStorage.removeItem('new_workout_date');
    }
  }, []);

  useEffect(() => {
    const workoutData = {
      intervals,
      selectedDate,
      workoutTitle,
    };
    localStorage.setItem(WORKOUT_STORAGE_KEY, JSON.stringify(workoutData));
  }, [intervals, selectedDate, workoutTitle]);

  const generatePlanJson = () => {
    const planIntervals = intervals.map((interval, index) => ({
      name: interval.name || `Interval ${index + 1}`,
      exit_trigger_type: "time",
      exit_trigger_value: interval.duration,
      intensity_type: "tempo",
      targets: [
        {
          type: "watts",
          low: interval.powerMin,
          high: interval.powerMax,
        },
      ],
    }));

    return {
      header: {
        name: workoutTitle || "Custom Workout",
        version: "1.0.0",
        workout_type_family: 0,
        workout_type_location: 1,
      },
      intervals: planIntervals,
    };
  };

  const pushToWahoo = async () => {
    if (intervals.length === 0) {
      alert("Please add at least one interval");
      return;
    }

    const accessToken = getStoredWahooToken();
    
    if (!accessToken) {
      if (confirm("You need to authorize with Wahoo first. Redirect to Wahoo login?")) {
        window.location.href = getWahooAuthUrl('/workout');
      }
      return;
    }

    setIsPushing(true);

    try {
      const planData = generatePlanJson();
      const planJson = JSON.stringify(planData);
      const base64Plan = btoa(planJson);
      const dataUri = `data:application/json;base64,${base64Plan}`;
      
      const externalId = `workout-${Date.now()}`;
      const providerUpdatedAt = new Date().toISOString();

      // Create the plan with form-encoded data
      const formBody = new URLSearchParams();
      formBody.append("plan[file]", dataUri);
      formBody.append("plan[filename]", "plan.json");
      formBody.append("plan[external_id]", externalId);
      formBody.append("plan[provider_updated_at]", providerUpdatedAt);

      const planResponse = await fetch("https://api.wahooligan.com/v1/plans", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formBody.toString(),
      });

      if (!planResponse.ok) {
        const errorText = await planResponse.text();
        console.error("Plan creation error:", errorText);
        throw new Error(`Plan creation failed: ${planResponse.statusText} - ${errorText}`);
      }

      const planResult = await planResponse.json();
      const planId = planResult.id;
      console.log("Plan created:", planResult);

      // Step 2: Create a workout and attach the plan
      // Create date at noon local time to avoid timezone issues
      const workoutDate = new Date(selectedDate + 'T12:00:00');
      const totalMinutes = Math.ceil(intervals.reduce((sum, i) => sum + i.duration, 0) / 60);
      
      const workoutFormBody = new URLSearchParams();
      workoutFormBody.append("workout[workout_token]", `workout-${Date.now()}`);
      workoutFormBody.append("workout[workout_type_id]", "1"); // 1 = Bike
      workoutFormBody.append("workout[starts]", workoutDate.toISOString());
      workoutFormBody.append("workout[minutes]", totalMinutes.toString());
      workoutFormBody.append("workout[name]", workoutTitle || "Custom Workout");
      workoutFormBody.append("workout[plan_id]", planId.toString());

      const workoutResponse = await fetch("https://api.wahooligan.com/v1/workouts", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: workoutFormBody.toString(),
      });

      if (!workoutResponse.ok) {
        const errorText = await workoutResponse.text();
        console.error("Workout creation error:", errorText);
        throw new Error(`Workout creation failed: ${workoutResponse.statusText} - ${errorText}`);
      }

      const workoutResult = await workoutResponse.json();
      console.log("Workout created:", workoutResult);
      
      queryClient.invalidateQueries({ queryKey: ['plannedWorkouts'] });
      
      alert("Successfully pushed workout to Wahoo!");
      router.push('/');
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("Error pushing to Wahoo:", error);
        alert(`Failed to push to Wahoo: ${error.message}`);
      } else {
        console.error("Error pushing to Wahoo:", error);
        alert("Failed to push to Wahoo: Unknown error");
      }
    } finally {
      setIsPushing(false);
    }
  };


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

  const clearWorkout = () => {
    setIntervals(defaultIntervals);
    setWorkoutTitle("");
  };

  const getIntervalColor = (powerMin: number, powerMax: number) => {
    const avgPower = (powerMin + powerMax) / 2;
    if (avgPower < 100) return "rgba(156, 163, 175, 0.6)";
    if (avgPower < 150) return "rgba(96, 165, 250, 0.6)";
    if (avgPower < 200) return "rgba(52, 211, 153, 0.6)";
    if (avgPower < 250) return "rgba(251, 191, 36, 0.6)";
    if (avgPower < 300) return "rgba(251, 146, 60, 0.6)";
    return "rgba(220, 38, 38, 0.6)";
  };

  const chartData = useMemo(() => {
    if (intervals.length === 0) return null;

    let currentTime = 0;
    const datasets = intervals.map((interval, index) => {
      const startTime = currentTime;
      const endTime = currentTime + interval.duration / 60;
      currentTime = endTime;

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
      };
    });

    return { datasets };
  }, [intervals.map(i => `${i.duration}-${i.powerMin}-${i.powerMax}`).join("|")]);

  const totalDuration = useMemo(() => {
    return intervals.reduce((sum, interval) => sum + interval.duration / 60, 0);
  }, [intervals.map(i => i.duration).join("|")]);

  const maxPower = useMemo(() => {
    const highest = intervals.reduce((max, interval) => Math.max(max, interval.powerMax), 0);
    return Math.max(highest, 300);
  }, [intervals.map(i => i.powerMax).join("|")]);

  const chartOptions = {
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
  };

  if (!isMounted) {
    return null;
  }

  return (
    <Container className="py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Workout Builder</h1>
          <button
            onClick={pushToWahoo}
            disabled={isPushing}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPushing 
              ? "Pushing..." 
              : !getStoredWahooToken()
                ? "Connect to Wahoo"
                : "Push to Wahoo"}
          </button>
        </div>

      {/* Graph */}
      <div className="mb-6">
        <div className="relative h-64 bg-gray-50 border border-gray-200 rounded">
          {intervals.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400">
              No intervals configured
            </div>
          ) : (
            <div className="h-full p-4">
              <Line data={chartData!} options={chartOptions} />
            </div>
          )}
        </div>
      </div>

      {/* Title and Date Selector */}
      <div className="mb-6 flex justify-between items-end">
        <div className="flex justify-center gap-6 flex-1">
          <div className="flex flex-col">
            <label className="block text-sm font-medium mb-2 text-center">Title</label>
            <input
              type="text"
              value={workoutTitle}
              onChange={(e) => setWorkoutTitle(e.target.value)}
              placeholder="Workout title"
              className="px-4 py-2 border border-gray-300 rounded"
            />
          </div>
          <div className="flex flex-col">
            <label className="block text-sm font-medium mb-2 text-center">Workout Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded"
            />
          </div>
          <div className="flex flex-col">
            <label className="block text-sm font-medium mb-2 text-center">Total Duration</label>
            <div className="px-4 py-2 bg-gray-100 border border-gray-300 rounded text-center font-semibold">
              {Math.floor(totalDuration / 60)}:{String(Math.round(totalDuration % 60)).padStart(2, '0')}
            </div>
          </div>
        </div>
        <button
          onClick={clearWorkout}
          className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors"
        >
          Clear Workout
        </button>
      </div>

      {/* Interval Rows */}
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
                className="w-full px-3 py-2 border border-gray-300 rounded"
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
                className="w-full px-3 py-2 border border-gray-300 rounded"
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
                  className="w-16 px-2 py-2 border border-gray-300 rounded"
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
                  className="w-16 px-2 py-2 border border-gray-300 rounded"
                />
              </div>
            </div>

            <button
              onClick={() => duplicateInterval(interval.id)}
              className="px-3 py-2 text-blue-600 hover:bg-blue-50 rounded"
            >
              <Copy size={18} />
            </button>

            <button
              onClick={() => deleteInterval(interval.id)}
              className="px-3 py-2 text-red-600 hover:bg-red-50 rounded"
            >
              <Trash2 size={18} />
            </button>
          </div>
        ))}
      </div>

      {/* Add Interval Button */}
      <div className="flex justify-center mt-6">
        <button
          onClick={addInterval}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Add Interval
        </button>
      </div>
    </Container>
  );
}

