export interface WahooWorkoutSummary {
  id: number;
  name: string;
  started_at: string;
  ascent_accum: string;
  cadence_avg: string | null;
  calories_accum: string;
  distance_accum: string;
  duration_active_accum: string;
  duration_paused_accum: string;
  duration_total_accum: string;
  heart_rate_avg: string | null;
  power_bike_np_last: string | null;
  power_bike_tss_last: string | null;
  power_avg: string | null;
  speed_avg: string;
  work_accum: string;
  time_zone: string;
  manual: boolean;
  edited: boolean | null;
  file: {
    url: string;
    fitness_app_id: number;
  } | null;
  files: unknown[];
  fitness_app_id: number;
  created_at: string;
  updated_at: string;
}

export interface WahooWorkout {
  id: number;
  starts: string;
  minutes: number;
  name: string;
  plan_id: number | null;
  plan_ids: number[];
  route_id: number | null;
  workout_token: string;
  workout_type_id: number;
  day_code: string | null;
  workout_summary: WahooWorkoutSummary | null;
  fitness_app_id: number;
  created_at: string;
  updated_at: string;
}

export interface WahooWorkoutsResponse {
  workouts: WahooWorkout[];
  total: number;
  page: number;
  per_page: number;
  order: string;
  sort: string;
}

