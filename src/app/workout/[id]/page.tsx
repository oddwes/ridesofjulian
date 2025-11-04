"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Container from "@/components/ui/Container";
import EditWorkout, { Interval } from "@/components/workouts/Edit";
import { getStoredWahooToken, getWorkoutById, getPlanIntervals } from "@/utils/WahooUtil";

export default function EditWorkoutPage() {
  const router = useRouter();
  const params = useParams();
  const workoutId = params.id as string;
  const queryClient = useQueryClient();
  
  const [intervals, setIntervals] = useState<Interval[]>([]);
  const [workoutTitle, setWorkoutTitle] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>("");

  const { data: workoutData, isLoading, error } = useQuery({
    queryKey: ['workout', workoutId],
    queryFn: () => getWorkoutById(workoutId),
  });

  const { data: planIntervals } = useQuery({
    queryKey: ['planIntervals', workoutData?.plan_id],
    queryFn: () => getPlanIntervals(workoutData!.plan_id!),
    enabled: !!workoutData?.plan_id,
  });

  useEffect(() => {
    if (error) {
      alert("Failed to load workout");
      router.push('/');
    }
  }, [error, router]);

  useEffect(() => {
    if (workoutData) {
      setWorkoutTitle(workoutData.name || "");
      setSelectedDate(workoutData.starts.split('T')[0]);
    }
  }, [workoutData]);

  useEffect(() => {
    if (planIntervals) {
      const fetchedIntervals: Interval[] = planIntervals.map((interval: any, idx: number) => ({
        id: `${Date.now()}-${idx}`,
        name: interval.name || `Interval ${idx + 1}`,
        duration: interval.exit_trigger_value,
        powerMin: interval.targets[0]?.low || 0,
        powerMax: interval.targets[0]?.high || 0,
      }));
      setIntervals(fetchedIntervals);
    }
  }, [planIntervals]);

  const generatePlanJson = (intervals: Interval[], title: string) => {
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
        name: title || "Custom Workout",
        version: "1.0.0",
        workout_type_family: 0,
        workout_type_location: 1,
      },
      intervals: planIntervals,
    };
  };

  const handleSave = async ({ intervals, title, date }: { intervals: Interval[]; title: string; date: string }) => {
    const accessToken = getStoredWahooToken();
    if (!accessToken) {
      alert("Not authorized with Wahoo");
      throw new Error("Not authorized");
    }

    const planData = generatePlanJson(intervals, title);
    const planJson = JSON.stringify(planData);
    const base64Plan = btoa(planJson);
    const dataUri = `data:application/json;base64,${base64Plan}`;
    
    const externalId = `workout-${Date.now()}`;
    const providerUpdatedAt = new Date().toISOString();

    if (workoutData?.plan_id) {
      const planFormBody = new URLSearchParams();
      planFormBody.append("plan[file]", dataUri);
      planFormBody.append("plan[filename]", "plan.json");
      planFormBody.append("plan[external_id]", externalId);
      planFormBody.append("plan[provider_updated_at]", providerUpdatedAt);

      const planUpdateResponse = await fetch(`https://api.wahooligan.com/v1/plans/${workoutData.plan_id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: planFormBody.toString(),
      });

      if (!planUpdateResponse.ok) {
        throw new Error(`Plan update failed: ${planUpdateResponse.statusText}`);
      }
    }

    const workoutDate = new Date(date + 'T12:00:00');
    const totalMinutes = Math.ceil(intervals.reduce((sum, i) => sum + i.duration, 0) / 60);
    
    const workoutFormBody = new URLSearchParams();
    workoutFormBody.append("workout[workout_token]", `workout-${Date.now()}`);
    workoutFormBody.append("workout[workout_type_id]", "1");
    workoutFormBody.append("workout[starts]", workoutDate.toISOString());
    workoutFormBody.append("workout[minutes]", totalMinutes.toString());
    workoutFormBody.append("workout[name]", title || "Custom Workout");
    if (workoutData?.plan_id) {
      workoutFormBody.append("workout[plan_id]", workoutData.plan_id.toString());
    }

    const workoutResponse = await fetch(`https://api.wahooligan.com/v1/workouts/${workoutId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: workoutFormBody.toString(),
    });

    if (!workoutResponse.ok) {
      throw new Error(`Workout update failed: ${workoutResponse.statusText}`);
    }

    queryClient.invalidateQueries({ queryKey: ['workout', workoutId] });
    queryClient.invalidateQueries({ queryKey: ['plannedWorkouts'] });
    if (workoutData?.plan_id) {
      queryClient.invalidateQueries({ queryKey: ['planIntervals', workoutData.plan_id] });
    }

    alert("Successfully updated workout on Wahoo!");
    router.push('/');
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this workout?")) return;

    const accessToken = getStoredWahooToken();
    if (!accessToken) {
      alert("Not authorized with Wahoo");
      return;
    }

    const response = await fetch(`https://api.wahooligan.com/v1/workouts/${workoutId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Delete failed: ${response.statusText}`);
    }

    queryClient.invalidateQueries({ queryKey: ['plannedWorkouts'] });

    alert("Workout deleted successfully!");
    router.push('/');
  };

  if (isLoading || !workoutData || intervals.length === 0) {
    return (
      <Container className="py-8">
        <div className="text-center">Loading workout...</div>
      </Container>
    );
  }

  return (
    <Container className="py-8">
        <EditWorkout
          initialIntervals={intervals}
          initialTitle={workoutTitle}
          initialDate={selectedDate}
          onSave={handleSave}
          onDelete={handleDelete}
          saveButtonText="Update Workout"
        />
    </Container>
  );
}

