export const WAHOO_ACCESS_TOKEN_KEY = 'wahoo_access_token';
export const WAHOO_REFRESH_TOKEN_KEY = 'wahoo_refresh_token';
export const WAHOO_TOKEN_EXPIRY_KEY = 'wahoo_token_expiry';

export type WahooTokenResponse = {
  access_token: string;
  refresh_token: string;
  created_at: number;
  expires_in: number;
};

export interface WahooIntervalInput {
  name?: string;
  duration: number;
  powerMin: number;
  powerMax: number;
}

export interface WahooWorkoutInput {
  id: number;
  workoutTitle: string;
  selectedDate: string;
  intervals: WahooIntervalInput[];
}

export * from '../../types/wahoo';

