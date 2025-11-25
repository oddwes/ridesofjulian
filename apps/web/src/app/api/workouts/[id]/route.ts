import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { fetchWorkout, updateWorkout, deleteWorkout } from '@ridesofjulian/shared';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createSupabaseServerClient();
  const { id } = await params;

  try {
    const workout = await fetchWorkout(supabase, id);
    return NextResponse.json(workout);
  } catch (error) {
    console.error('Error fetching workout:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch workout';
    const status = message === 'Unauthorized' ? 401 : message === 'Workout not found' ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createSupabaseServerClient();
  const { id } = await params;

  try {
    const body = await request.json();
    const { datetime, exercises } = body;
    await updateWorkout(supabase, id, datetime, exercises);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating workout:', error);
    const message = error instanceof Error ? error.message : 'Failed to update workout';
    const status = message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createSupabaseServerClient();
  const { id } = await params;

  try {
    await deleteWorkout(supabase, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting workout:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete workout';
    const status = message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

