'use client'

import { useParams, useRouter } from 'next/navigation';
import { WorkoutEditScreenWeb } from '@/components/WorkoutEditScreenWeb';

export default function WorkoutFormPage() {
  const router = useRouter();
  const params = useParams();
  const workoutIdParam = params.id as string;

  return (
    <WorkoutEditScreenWeb
      workoutId={workoutIdParam}
      onClose={() => router.push('/')}
    />
  );
}

