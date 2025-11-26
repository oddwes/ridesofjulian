export interface StravaActivity {
  id: number;
  name: string;
  distance: number;
  total_elevation_gain: number;
  moving_time: number;
  start_date: string;
  type?: string;
  sport_type?: string;
  average_watts?: number;
  weighted_average_watts?: number;
  kilojoules?: number;
  average_heartrate?: number;
}

