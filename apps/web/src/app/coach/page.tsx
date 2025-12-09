"use client";

import { useState, useEffect } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import Container from "@/components/ui/Container";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { WorkoutModal } from "@/components/workouts/Modal";
import { PlannedRide } from "@/components/PlannedRide";
import { RideWorkout, Interval } from "@/types/workout";
import { Exercise } from "@ridesofjulian/shared";
import TabNavigation from "@/components/TabNavigation";
import { useSupabase } from "@/contexts/SupabaseContext";
import { getFtp } from "@/utils/FtpUtil";


export default function CoachPage() {
  const queryClient = useQueryClient();
  const { supabase, user } = useSupabase();
  const [userPrompt, setUserPrompt] = useState("");
  const [ftp, setFtp] = useState<number>(200);
  const [weeklyHours, setWeeklyHours] = useState<number>(10);
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<RideWorkout[]>([]);
  const [planTitle, setPlanTitle] = useState<string>("Your Training Plan");
  const [editingWorkout, setEditingWorkout] = useState<RideWorkout | null>(null);

  const { data: ftpHistory } = useQuery({
    queryKey: ['ftpHistory', user?.id],
    queryFn: async () => {
      if (!user) return null;
      return await getFtp(supabase, user.id);
    },
    enabled: !!user,
  });

  const { data: scheduleData } = useQuery({
    queryKey: ['schedule', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('schedule')
        .select('date, plan, type')
        .eq('user_id', user.id)
        .eq('type', 'cycling')
        .order('date', { ascending: true });
      if (error) throw error;
      return data as { date: string; plan: RideWorkout[] | null; type: string }[];
    },
    enabled: !!user,
  });

  useEffect(() => {
    const storedPlan = sessionStorage.getItem('generated_training_plan');
    const storedInputs = sessionStorage.getItem('training_plan_inputs');
    const storedPlanTitle = sessionStorage.getItem('generated_plan_title');
    
    if (storedPlan) {
      try {
        const parsed = JSON.parse(storedPlan);
        setGeneratedPlan(parsed);
      } catch (error) {
        console.error('Error loading stored plan:', error);
      }
    }
    
    if (storedPlanTitle) {
      setPlanTitle(storedPlanTitle);
    }
    
    if (storedInputs) {
      try {
        const inputs = JSON.parse(storedInputs);
        setUserPrompt(inputs.userPrompt || "");
        setFtp(inputs.ftp || 200);
        setWeeklyHours(inputs.weeklyHours || 10);
        setStartDate(inputs.startDate || new Date().toISOString().split("T")[0]);
        setEndDate(inputs.endDate || new Date().toISOString().split("T")[0]);
      } catch (error) {
        console.error('Error loading stored inputs:', error);
      }
    }
  }, []);

  useEffect(() => {
    const storedInputs = sessionStorage.getItem('training_plan_inputs');
    if (!storedInputs && ftpHistory?.ftp && Object.keys(ftpHistory.ftp).length > 0) {
      const entries = Object.entries(ftpHistory.ftp)
        .map(([date, value]) => ({ date, value }))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      if (entries.length > 0) {
        const latestFtp = entries[0].value;
        setFtp(latestFtp);
      }
    }
  }, [ftpHistory]);

  const calculateBlockDuration = (start: string, end: string) => {
    const startDateObj = new Date(start);
    const endDateObj = new Date(end);
    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) return 0;
    const diffMs = endDateObj.getTime() - startDateObj.getTime();
    if (diffMs < 0) return 0;
    const dayMs = 24 * 60 * 60 * 1000;
    return Math.floor(diffMs / dayMs) + 1;
  };

  const generatePlan = async () => {
    if (!userPrompt.trim()) {
      alert("Please enter a training goal");
      return;
    }

    const blockDuration = calculateBlockDuration(startDate, endDate);
    if (blockDuration <= 0) {
      alert("End date must be on or after start date");
      return;
    }

    const openaiApiKey = localStorage.getItem('openai_api_key');
    if (!openaiApiKey) {
      alert("Please set your OpenAI API key in Profile settings");
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
          weeklyHours,
          startDate,
          endDate,
          openaiApiKey,
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

      const workouts: RideWorkout[] = [];
      let buffer = "";
      let receivedPlanTitle = false;

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() || '';

        for (const event of events) {
          const lines = event.split('\n');
          let dataContent = '';
          
          // Extract data: content from SSE event
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              dataContent = line.slice(6).trim();
              break;
            }
          }
          
          if (!dataContent || dataContent === '[DONE]') {
            continue;
          }
          
          try {
            const parsed = JSON.parse(dataContent);
            
            // Handle plan title metadata
            if (parsed.type === 'planTitle' && parsed.planTitle && !receivedPlanTitle) {
              setPlanTitle(parsed.planTitle);
              sessionStorage.setItem('generated_plan_title', parsed.planTitle);
              receivedPlanTitle = true;
              continue;
            }
            
            // Handle workout objects
            if (parsed.workoutTitle || parsed.selectedDate || parsed.intervals) {
              workouts.push(parsed);
              setGeneratedPlan([...workouts]);
            }
          } catch (e) {
            // JSON might be incomplete, keep in buffer for next chunk
            buffer = event + '\n\n' + buffer;
          }
        }
      }

      // Process any remaining buffer
      if (buffer.trim()) {
        const lines = buffer.split('\n');
        let dataContent = '';
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            dataContent = line.slice(6).trim();
            break;
          }
        }
        
        if (dataContent && dataContent !== '[DONE]') {
          try {
            const parsed = JSON.parse(dataContent);
            if (parsed.type === 'planTitle' && parsed.planTitle && !receivedPlanTitle) {
              setPlanTitle(parsed.planTitle);
              sessionStorage.setItem('generated_plan_title', parsed.planTitle);
            } else if (parsed.workoutTitle || parsed.selectedDate || parsed.intervals) {
              workouts.push(parsed);
            }
          } catch (e) {
            console.error("Failed to parse final buffer:", e);
          }
        }
      }

      sessionStorage.setItem('generated_training_plan', JSON.stringify(workouts));
      sessionStorage.setItem('training_plan_inputs', JSON.stringify({
        userPrompt,
        ftp,
        weeklyHours,
        startDate,
        endDate,
      }));
    } catch (error) {
      console.error("Error generating plan:", error);
      alert("Failed to generate training plan");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEditWorkout = (workout: RideWorkout) => {
    setEditingWorkout(workout);
  };

  const handleDeleteWorkout = (workout: RideWorkout) => {
    if (confirm(`Delete "${workout.workoutTitle}"?`)) {
      const updatedPlan = generatedPlan.filter(w => w.id !== workout.id);
      setGeneratedPlan(updatedPlan);
      sessionStorage.setItem('generated_training_plan', JSON.stringify(updatedPlan));
      
      const pushedWorkoutsKey = 'pushed_workouts_' + JSON.stringify(generatedPlan.map(w => w.id));
      const pushedWorkouts = JSON.parse(sessionStorage.getItem(pushedWorkoutsKey) || '[]');
      const updatedPushedWorkouts = pushedWorkouts.filter((id: number) => id !== workout.id);
      sessionStorage.setItem(pushedWorkoutsKey, JSON.stringify(updatedPushedWorkouts));
    }
  };

  const handleSaveEditedWorkout = async (data: { intervals?: Interval[]; exercises?: Exercise[]; title?: string; date: string }) => {
    const { intervals, title, date } = data;
    if (!editingWorkout || !intervals || !title) return;
    
    const updatedWorkout: RideWorkout = {
      ...editingWorkout,
      workoutTitle: title,
      selectedDate: date,
      intervals,
    };

    const updatedPlan = generatedPlan.map(w => 
      w.id === editingWorkout.id ? updatedWorkout : w
    );

    setGeneratedPlan(updatedPlan);
    sessionStorage.setItem('generated_training_plan', JSON.stringify(updatedPlan));
    setEditingWorkout(null);
  };

  const clearPlan = () => {
    const pushedWorkoutsKey = 'pushed_workouts_' + JSON.stringify(generatedPlan.map(w => w.id));
    sessionStorage.removeItem('generated_training_plan');
    sessionStorage.removeItem('generated_plan_title');
    sessionStorage.removeItem(pushedWorkoutsKey);
    setGeneratedPlan([]);
    setPlanTitle("Your Training Plan");
  };

  const parseLocalDate = (dateString: string) => {
    // Parse date as local time to avoid timezone shifts
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const formatLocalDate = (date: Date) => {
    // Format date as YYYY-MM-DD using local date components to avoid timezone shifts
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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

  const getISOYear = (date: Date) => {
    // Get the year that the ISO week belongs to (year of the Thursday in that week)
    const target = new Date(date.valueOf());
    const dayNr = (date.getDay() + 6) % 7; // Monday = 0, Sunday = 6
    target.setDate(target.getDate() - dayNr + 3); // Thursday in current week
    return target.getFullYear();
  };

  const getWeekRange = (date: Date) => {
    // Return Monday-Sunday range for the given date
    const dayNr = (date.getDay() + 6) % 7; // Monday = 0, Sunday = 6
    const start = new Date(date);
    start.setDate(date.getDate() - dayNr);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { start, end };
  };

  const groupWorkoutsByWeek = (workouts: RideWorkout[]) => {
    const weeks: { [key: string]: RideWorkout[] } = {};
    
    workouts.forEach(workout => {
      const date = parseLocalDate(workout.selectedDate);
      const weekNum = getISOWeek(date);
      const isoYear = getISOYear(date);
      const weekKey = `${isoYear}-W${String(weekNum).padStart(2, '0')}`;
      
      if (!weeks[weekKey]) {
        weeks[weekKey] = [];
      }
      weeks[weekKey].push(workout);
    });
    
    return Object.entries(weeks).sort(([a], [b]) => a.localeCompare(b));
  };

  const hasMatchingPlan = !!scheduleData?.some(
    (row) =>
      row.date === startDate &&
      JSON.stringify(row.plan) === JSON.stringify(generatedPlan)
  );

  const handleSavePlan = async () => {
    if (!user) {
      alert("You must be logged in to save a plan");
      return;
    }

    if (generatedPlan.length === 0) {
      alert("No plan to save");
      return;
    }

    try {
      sessionStorage.setItem('generated_training_plan', JSON.stringify(generatedPlan));
      sessionStorage.setItem('training_plan_inputs', JSON.stringify({
        userPrompt,
        ftp,
        weeklyHours,
        startDate,
        endDate,
      }));
      if (planTitle) {
        sessionStorage.setItem('generated_plan_title', planTitle);
      }

      const insertData: {
        date: string;
        plan: RideWorkout[];
        type: string;
        user_id: string;
        title?: string;
      } = {
        date: startDate,
        plan: generatedPlan,
        type: 'cycling',
        user_id: user.id,
      };
      
      if (planTitle && planTitle !== 'Your Training Plan') {
        insertData.title = planTitle;
      }

      const { error } = await supabase.from('schedule').insert(insertData);

      if (error) {
        console.error('Error saving plan to schedule', error);
        alert('Failed to save plan to schedule.');
      } else {
        queryClient.invalidateQueries({ queryKey: ['schedule'] });
        alert('Training plan saved to your schedule.');
      }
    } catch (e) {
      console.error('Error saving plan', e);
      alert('Failed to save training plan.');
    }
  };

  return (
    <>
      <TabNavigation />
      <Container className="mb-8 text-gray-600">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-white">AI Training Plan Builder</h1>
            <button
              onClick={clearPlan}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              Clear
            </button>
          </div>
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 sm:p-6 mb-6 w-full">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold mb-1 text-slate-200">
                Training Goal
              </label>
              <textarea
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                placeholder="e.g., Build base fitness with polarized training approach, focusing on endurance and high intensity intervals"
                className="w-full px-3 py-2 rounded-md bg-slate-950 border border-slate-700 text-sm text-slate-100 placeholder:text-slate-500 resize-none"
                rows={4}
                disabled={isGenerating}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-200">
                  FTP
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={ftp}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, "");
                    setFtp(val ? parseInt(val) : 0);
                  }}
                  className="w-full px-3 py-2 rounded-md bg-slate-950 border border-slate-700 text-sm text-slate-100"
                  disabled={isGenerating}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-200">
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
                  className="w-full px-3 py-2 rounded-md bg-slate-950 border border-slate-700 text-sm text-slate-100"
                  disabled={isGenerating}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-200">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  onClick={(e) => {
                    if (!isGenerating && (e.target as HTMLInputElement).showPicker) {
                      (e.target as HTMLInputElement).showPicker();
                    }
                  }}
                  className="w-full px-3 py-2 rounded-md bg-slate-950 border border-slate-700 text-sm text-slate-100 cursor-pointer"
                  disabled={isGenerating}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-200">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  onClick={(e) => {
                    if (!isGenerating && (e.target as HTMLInputElement).showPicker) {
                      (e.target as HTMLInputElement).showPicker();
                    }
                  }}
                  className="w-full px-3 py-2 rounded-md bg-slate-950 border border-slate-700 text-sm text-slate-100 cursor-pointer"
                  disabled={isGenerating}
                />
              </div>
            </div>

            <button
              onClick={generatePlan}
              disabled={isGenerating}
              className="mt-2 w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold"
            >
              {isGenerating ? "Generating Plan..." : "Generate Training Plan"}
             </button>
           </div>
         </div>
        </div>

        {generatedPlan.length > 0 && (
          <div className="space-y-4 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center">
              <p className="text-lg sm:text-2xl font-bold text-white">{planTitle}</p>
              <div className="flex gap-3">
                {!hasMatchingPlan && (
                  <button
                    onClick={handleSavePlan}
                    disabled={isGenerating || !generatedPlan.length}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Save
                  </button>
                )}
              </div>
            </div>
            {groupWorkoutsByWeek(generatedPlan).map(([weekKey, workouts]) => {
              const anyDate = parseLocalDate(workouts[0].selectedDate);
              const { start: weekStart, end: weekEnd } = getWeekRange(anyDate);
              const weekTotal = workouts.reduce((total, workout) => {
                return total + workout.intervals.reduce((sum, interval) => sum + interval.duration / 60, 0);
              }, 0);

              const startStr = formatLocalDate(weekStart);
              const endStr = formatLocalDate(weekEnd);

              return (
                <div key={weekKey} className="space-y-1">
                  <div className="flex flex-row items-baseline justify-between">
                    <span className="text-lg font-semibold text-white">{weekKey}</span>
                    <span className="text-sm text-slate-300">
                      {startStr} - {endStr}
                    </span>
                    <span className="text-sm text-slate-300">
                      {Math.floor(weekTotal / 60)}h {Math.round(weekTotal % 60)}m
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    {workouts.map((workout, idx) => (
                      <PlannedRide 
                        key={idx} 
                        workout={workout} 
                        onEdit={handleEditWorkout} 
                        onDelete={handleDeleteWorkout}
                      />
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
          <div className="bg-white rounded-lg p-8 flex flex-col items-center gap-4 shadow-xl text-gray-600">
            <LoadingSpinner />
            <p className="text-lg font-medium">Generating your training plan...</p>
          </div>
        </div>
      )}

      <WorkoutModal
        workout={editingWorkout ? { ...editingWorkout, type: 'ride' as const } : null}
        onClose={() => setEditingWorkout(null)}
        onSave={handleSaveEditedWorkout}
      />
    </>
  );
}

