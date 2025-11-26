'use client';

import { GymCard } from '@ridesofjulian/shared/mobile';
import { Workout } from '@ridesofjulian/shared';
import { useRouter } from 'next/navigation';

interface GymCardWebProps {
  workout: Workout;
}

export function GymCardWeb({ workout }: GymCardWebProps) {
  const router = useRouter();

  const handlePress = (workoutId: string) => {
    router.push(`/workout/${workoutId}`);
  };

  return (
    <GymCard
      workout={workout}
      onPress={handlePress}
    />
  );
}

