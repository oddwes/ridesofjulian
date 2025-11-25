import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { fetchWorkouts, createWorkout } from '@ridesofjulian/shared';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await createSupabaseServerClient();

  try {
    const workouts = await fetchWorkouts(supabase);
    return NextResponse.json(workouts);
  } catch (error) {
    console.error('Error fetching workouts:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch workouts';
    const status = message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();

  try {
    const body = await request.json();
    const workout = await createWorkout(supabase, body.datetime);
    return NextResponse.json(workout);
  } catch (error) {
    console.error('Error creating workout:', error);
    const message = error instanceof Error ? error.message : 'Failed to create workout';
    const status = message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}


