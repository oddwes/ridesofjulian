export const formatDistance = (distanceInMeters) => {
  return `${Math.round(distanceInMeters / 1000)}km`
}

export const formatElevation = (elevationInMeters) => {
  return `${Math.round(elevationInMeters)}m`
}

