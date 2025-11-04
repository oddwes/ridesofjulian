"use client";

import { useState, useEffect, memo, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Line } from "react-chartjs-2";
import "chart.js/auto";
import Container from "@/components/ui/Container";
import TabNavigation from "@/components/TabNavigation";
import { LoadingSpinner } from "@/components/LoadingSpinner";

interface Interval {
  id: string;
  name: string;
  duration: number;
  powerMin: number;
  powerMax: number;
}

interface Workout {
  id: number;
  workoutTitle: string;
  selectedDate: string;
  intervals: Interval[];
}

const getIntervalColor = (powerMin: number, powerMax: number) => {
  const avgPower = (powerMin + powerMax) / 2;
  if (avgPower < 100) return "rgba(156, 163, 175, 0.6)";
  if (avgPower < 150) return "rgba(96, 165, 250, 0.6)";
  if (avgPower < 200) return "rgba(52, 211, 153, 0.6)";
  if (avgPower < 250) return "rgba(251, 191, 36, 0.6)";
  if (avgPower < 300) return "rgba(251, 146, 60, 0.6)";
  return "rgba(220, 38, 38, 0.6)";
};

const WorkoutCard = memo(({ workout }: { workout: Workout }) => {
  const chartData = useMemo(() => {
    let currentTime = 0;
    const datasets = workout.intervals.map((interval, index) => {
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
  }, [workout.intervals]);

  const chartOptions = useMemo(() => {
    const totalDuration = workout.intervals.reduce((sum, interval) => sum + interval.duration / 60, 0);
    const maxPower = Math.max(
      workout.intervals.reduce((max, interval) => Math.max(max, interval.powerMax), 0),
      300
    );

    return {
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
  }, [workout.intervals]);

  const totalDuration = workout.intervals.reduce(
    (sum, interval) => sum + interval.duration / 60,
    0
  );
  
  const parseLocalDate = (dateString: string) => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const date = parseLocalDate(workout.selectedDate);

  return (
    <div className="bg-white border border-gray-300 rounded-lg p-4">
      <div className="mb-3">
        <div className="flex justify-between items-start mb-1">
          <h4 className="text-lg font-semibold">
            {workout.workoutTitle}
          </h4>
        </div>
        <p className="text-xs text-gray-600">
          {date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} | {Math.floor(totalDuration / 60)}h {Math.round(totalDuration % 60)}m
        </p>
      </div>

      <div className="h-32 bg-gray-50 border border-gray-200 rounded p-2 mb-3">
        <Line data={chartData} options={chartOptions} />
      </div>

      <div className="space-y-1 mb-3">
        {workout.intervals.map((interval, intervalIdx) => (
          <div
            key={intervalIdx}
            className="flex justify-between text-xs"
          >
            <span className="font-medium truncate mr-2">{interval.name}</span>
            <span className="text-gray-600 whitespace-nowrap">
              {interval.duration / 60}m | {interval.powerMin}-{interval.powerMax}W
            </span>
          </div>
        ))}
      </div>
    </div>
  );
});

WorkoutCard.displayName = 'WorkoutCard';

export default function PlanPage() {
  const router = useRouter();
  const [userPrompt, setUserPrompt] = useState("");
  const [ftp, setFtp] = useState<number>(200);
  const [blockDuration, setBlockDuration] = useState<number>(7);
  const [weeklyHours, setWeeklyHours] = useState<number>(10);
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<Workout[]>([]);

  useEffect(() => {
    const storedPlan = sessionStorage.getItem('generated_training_plan');
    const storedInputs = sessionStorage.getItem('training_plan_inputs');
    
    if (storedPlan) {
      try {
        const parsed = JSON.parse(storedPlan);
        setGeneratedPlan(parsed);
      } catch (error) {
        console.error('Error loading stored plan:', error);
      }
    }
    
    if (storedInputs) {
      try {
        const inputs = JSON.parse(storedInputs);
        setUserPrompt(inputs.userPrompt || "");
        setFtp(inputs.ftp || 200);
        setBlockDuration(inputs.blockDuration || 7);
        setWeeklyHours(inputs.weeklyHours || 10);
        setStartDate(inputs.startDate || new Date().toISOString().split("T")[0]);
      } catch (error) {
        console.error('Error loading stored inputs:', error);
      }
    }
  }, []);

  const generatePlan = async () => {
    if (!userPrompt.trim()) {
      alert("Please enter a training goal");
      return;
    }

    setIsGenerating(true);
    setGeneratedPlan([]); // Clear existing plan
    
    try {
      const response = await fetch("/api/generate-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userPrompt,
          ftp,
          blockDuration,
          weeklyHours,
          startDate,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate plan");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      if (!reader) {
        throw new Error("No response body");
      }

      const workouts: Workout[] = [];
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (data === '[DONE]') {
              continue;
            }
            
            try {
              const workout = JSON.parse(data);
              workouts.push(workout);
              setGeneratedPlan([...workouts]);
            } catch (e) {
              console.error("Failed to parse workout:", e);
            }
          }
        }
      }

      sessionStorage.setItem('generated_training_plan', JSON.stringify(workouts));
      sessionStorage.setItem('training_plan_inputs', JSON.stringify({
        userPrompt,
        ftp,
        blockDuration,
        weeklyHours,
        startDate,
      }));
    } catch (error) {
      console.error("Error generating plan:", error);
      alert("Failed to generate training plan");
    } finally {
      setIsGenerating(false);
    }
  };

  const saveWorkout = (workout: Workout) => {
    localStorage.setItem('workout_builder_data', JSON.stringify({
      intervals: workout.intervals,
      selectedDate: workout.selectedDate,
      workoutTitle: workout.workoutTitle,
    }));
    router.push('/workout');
  };

  const clearPlan = () => {
    sessionStorage.removeItem('generated_training_plan');
    sessionStorage.removeItem('training_plan_inputs');
    setGeneratedPlan([]);
    setUserPrompt("");
    setFtp(200);
    setBlockDuration(7);
    setWeeklyHours(10);
    setStartDate(new Date().toISOString().split("T")[0]);
  };

  const parseLocalDate = (dateString: string) => {
    // Parse date as local time to avoid timezone shifts
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const getISOWeek = (date: Date) => {
    // ISO week date starts on Monday
    const target = new Date(date.valueOf());
    const dayNr = (date.getDay() + 6) % 7; // Monday = 0, Sunday = 6
    target.setDate(target.getDate() - dayNr + 3); // Thursday in current week
    const firstThursday = target.valueOf();
    target.setMonth(0, 1); // January 1st
    if (target.getDay() !== 4) {
      target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
    }
    return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000); // 604800000 = 7 * 24 * 3600 * 1000
  };

  const groupWorkoutsByWeek = (workouts: Workout[]) => {
    const weeks: { [key: string]: Workout[] } = {};
    
    workouts.forEach(workout => {
      const date = parseLocalDate(workout.selectedDate);
      const weekNum = getISOWeek(date);
      const weekKey = `${date.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
      
      if (!weeks[weekKey]) {
        weeks[weekKey] = [];
      }
      weeks[weekKey].push(workout);
    });
    
    return Object.entries(weeks).sort(([a], [b]) => a.localeCompare(b));
  };

  return (
    <>
      <TabNavigation />
      <Container className="py-8">
        <h1 className="text-3xl font-bold mb-6">AI Training Plan Builder</h1>

        <div className="bg-white border border-gray-300 rounded-lg p-6 mb-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Training Goal & Type
              </label>
              <textarea
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                placeholder="e.g., Build base fitness with polarized training approach, focusing on endurance and high intensity intervals"
                className="w-full px-4 py-3 border border-gray-300 rounded resize-none"
                rows={4}
              />
            </div>

            <div className="flex gap-6">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-2">
                  FTP (watts)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={ftp}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, "");
                    setFtp(val ? parseInt(val) : 0);
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded"
                />
              </div>

              <div className="flex-1">
                <label className="block text-sm font-medium mb-2">
                  Block Duration (days)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={blockDuration}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, "");
                    setBlockDuration(val ? parseInt(val) : 0);
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded"
                />
              </div>

              <div className="flex-1">
                <label className="block text-sm font-medium mb-2">
                  Weekly Hours
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={weeklyHours}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, "");
                    setWeeklyHours(val ? parseInt(val) : 0);
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded"
                />
              </div>

              <div className="flex-1">
                <label className="block text-sm font-medium mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded"
                />
              </div>
            </div>

            <button
              onClick={generatePlan}
              disabled={isGenerating}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? "Generating Plan..." : "Generate Training Plan"}
            </button>
          </div>
        </div>

        {generatedPlan.length > 0 && (
          <div className="space-y-8 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Your Training Plan</h2>
              <button
                onClick={clearPlan}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                Clear Plan
              </button>
            </div>
            {groupWorkoutsByWeek(generatedPlan).map(([weekKey, workouts]) => {
              const firstDate = parseLocalDate(workouts[0].selectedDate);
              const lastDate = parseLocalDate(workouts[workouts.length - 1].selectedDate);
              const weekTotal = workouts.reduce((total, workout) => {
                return total + workout.intervals.reduce((sum, interval) => sum + interval.duration / 60, 0);
              }, 0);

              return (
                <div key={weekKey} className="space-y-4">
                  <div className="flex justify-between items-baseline">
                    <h3 className="text-xl font-semibold">
                      {weekKey} ({firstDate.toLocaleDateString()} - {lastDate.toLocaleDateString()})
                    </h3>
                    <p className="text-sm text-gray-600">
                      Total: {Math.floor(weekTotal / 60)}h {Math.round(weekTotal % 60)}m
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {workouts.map((workout, idx) => (
                      <WorkoutCard key={idx} workout={workout} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Container>

      {isGenerating && (
        <div className="fixed inset-0 bg-black/15 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 flex flex-col items-center gap-4 shadow-xl">
            <LoadingSpinner />
            <p className="text-lg font-medium">Generating your training plan...</p>
          </div>
        </div>
      )}
    </>
  );
}

