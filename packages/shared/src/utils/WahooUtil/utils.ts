import { WahooWorkout, WahooWorkoutsResponse } from '../../types/wahoo';

export const getWahooWorkouts = async (
  token: string,
  startsAfter: string,
  startsBefore: string,
  onPageFetched?: (workouts: WahooWorkout[], page: number, totalPages: number) => void
): Promise<WahooWorkout[]> => {
  const allWorkouts: WahooWorkout[] = [];
  let page = 1;
  let totalPages = 1;
  const perPage = 30;
  const startsAfterDate = new Date(startsAfter);

  while (page <= totalPages) {
    const response = await fetch(
      `https://api.wahooligan.com/v1/workouts?order_by=starts&order_dir=asc&starts_after=${startsAfter}&starts_before=${startsBefore}&page=${page}&per_page=${perPage}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch workouts: ${response.statusText}`);
    }

    const data = (await response.json()) as WahooWorkoutsResponse;
    const workouts = data.workouts || [];
    
    if (page === 1) {
      totalPages = Math.ceil(data.total / perPage);
    }

    if (workouts.length > 0) {
      const firstWorkoutDate = new Date(workouts[0].starts);
      if (firstWorkoutDate < startsAfterDate) {
        break;
      }
      
      allWorkouts.push(...workouts);
    }

    if (onPageFetched) {
      onPageFetched(workouts, page, totalPages);
    }

    if (workouts.length < perPage || page >= totalPages) {
      break;
    }

    page++;
  }

  return allWorkouts;
};

