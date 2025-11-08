import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await createSupabaseServerClient();

  try {
    const { data, error: userError } = await supabase.auth.getSession();

    if (userError || !data.session) {
      console.error('Auth error:', userError);
      return NextResponse.json({ error: 'Unauthorized', details: userError?.message || 'No valid session' }, { status: 401 });
    }

    const user = data.session.user;

    const { data: workoutsData, error: workoutsError } = await supabase
      .from('workouts')
      .select('id, datetime')
      .eq('user_id', user.id);

    if (workoutsError) {
      throw workoutsError;
    }

    const workoutsWithExercises = await Promise.all(
      workoutsData.map(async (workout) => {
        const { data: exercisesData, error: exercisesError } = await supabase
          .from('exercises')
          .select('id, name, weight, sets, reps, completed')
          .eq('workout_id', workout.id);

        if (exercisesError) {
          throw exercisesError;
        }

        return {
          ...workout,
          exercises: exercisesData || [],
        };
      })
    );

    return NextResponse.json(workoutsWithExercises);
  } catch (error) {
    console.error('Error fetching workouts:', error);
    return NextResponse.json({ error: 'Failed to fetch workouts' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();

  try {
    const body = await request.json();

    const { data, error: userError } = await supabase.auth.getSession();

    if (userError || !data.session) {
      console.error('Auth error:', userError);
      return NextResponse.json({ error: 'Unauthorized', details: userError?.message || 'No valid session' }, { status: 401 });
    }

    const user = data.session.user;

    const { data: workoutData, error } = await supabase
      .from('workouts')
      .insert({
        datetime: body.datetime,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(workoutData);
  } catch (error) {
    console.error('Error creating workout:', error);
    return NextResponse.json({ error: 'Failed to create workout' }, { status: 500 });
  }
}


