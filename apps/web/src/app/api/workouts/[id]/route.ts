import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { Exercise } from '@/types/exercise';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createSupabaseServerClient();
  const { id } = await params;

  try {
    const { data, error: userError } = await supabase.auth.getSession();

    if (userError || !data.session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: workoutData, error: workoutError } = await supabase
      .from('workouts')
      .select('id, datetime')
      .eq('id', id)
      .eq('user_id', data.session.user.id)
      .single();

    if (workoutError || !workoutData) {
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 });
    }

    const { data: exercisesData, error: exercisesError } = await supabase
      .from('exercises')
      .select('id, name, weight, sets, reps, completed')
      .eq('workout_id', id);

    if (exercisesError) {
      throw exercisesError;
    }

    return NextResponse.json({
      ...workoutData,
      exercises: exercisesData || [],
    });
  } catch (error) {
    console.error('Error fetching workout:', error);
    return NextResponse.json({ error: 'Failed to fetch workout' }, { status: 500 });
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

    const { data, error: userError } = await supabase.auth.getSession();

    if (userError || !data.session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error: workoutError } = await supabase
      .from('workouts')
      .update({ datetime })
      .eq('id', id)
      .eq('user_id', data.session.user.id);

    if (workoutError) {
      throw workoutError;
    }

    const { error: deleteError } = await supabase
      .from('exercises')
      .delete()
      .eq('workout_id', id);

    if (deleteError) {
      throw deleteError;
    }

    if (exercises && exercises.length > 0) {
      const exercisesToInsert = exercises.map((exercise: Exercise) => ({
        workout_id: id,
        name: exercise.name,
        weight: exercise.weight || 0,
        sets: exercise.sets || 0,
        reps: exercise.reps || 0,
        completed: exercise.completed || 0,
      }));

      const { error: insertError } = await supabase
        .from('exercises')
        .insert(exercisesToInsert);

      if (insertError) {
        throw insertError;
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating workout:', error);
    return NextResponse.json({ error: 'Failed to update workout' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createSupabaseServerClient();
  const { id } = await params;

  try {
    const { data, error: userError } = await supabase.auth.getSession();

    if (userError || !data.session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error: deleteExercisesError } = await supabase
      .from('exercises')
      .delete()
      .eq('workout_id', id);

    if (deleteExercisesError) {
      throw deleteExercisesError;
    }

    const { error: deleteWorkoutError } = await supabase
      .from('workouts')
      .delete()
      .eq('id', id)
      .eq('user_id', data.session.user.id);

    if (deleteWorkoutError) {
      throw deleteWorkoutError;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting workout:', error);
    return NextResponse.json({ error: 'Failed to delete workout' }, { status: 500 });
  }
}

