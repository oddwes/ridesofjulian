export const formatDistance = (distanceInMeters: number) => {
  return `${Math.round(distanceInMeters / 1000)}km`;
};

export const formatElevation = (elevationInMeters: number) => {
  return `${Math.round(elevationInMeters)}m`;
};

export const formatDuration = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  return hours > 0 ? `${hours}h ${remainingMins}m` : `${remainingMins}m`;
};

