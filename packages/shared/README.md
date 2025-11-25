# @ridesofjulian/shared

Shared code for Rides of Julian monorepo - types and data access functions used by both web and mobile apps.

## Structure

```
packages/shared/
├── src/
│   ├── types/           # Shared TypeScript types
│   │   ├── exercise.ts
│   │   ├── workout.ts
│   │   └── index.ts
│   ├── api/            # Supabase data access functions
│   │   ├── workouts.ts
│   │   └── index.ts
│   └── index.ts        # Main export
```

## Usage

### In Web App (Next.js)

The web app uses the shared functions in API routes:

```typescript
import { fetchWorkouts, createWorkout } from '@ridesofjulian/shared';

// In API route
export async function GET() {
  const supabase = await createSupabaseServerClient();
  const workouts = await fetchWorkouts(supabase);
  return NextResponse.json(workouts);
}
```

### In Mobile App (React Native)

The mobile app uses the shared functions directly with hooks:

```typescript
import { fetchWorkouts } from '@ridesofjulian/shared';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../config/supabase';

export const useWorkouts = () => {
  return useQuery({
    queryKey: ['workouts'],
    queryFn: () => fetchWorkouts(supabase),
  });
};
```

## API Functions

### Workouts

- `fetchWorkouts(supabase)` - Get all workouts for current user
- `fetchWorkout(supabase, workoutId)` - Get single workout by ID
- `createWorkout(supabase, datetime)` - Create new workout
- `updateWorkout(supabase, workoutId, datetime, exercises)` - Update workout
- `deleteWorkout(supabase, workoutId)` - Delete workout

All functions:
- Accept a Supabase client as first parameter
- Handle authentication automatically
- Throw errors that can be caught by callers
- Return typed data using shared types

