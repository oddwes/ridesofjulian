export const getIntervalColor = (powerMin: number, powerMax: number) => {
  const avgPower = (powerMin + powerMax) / 2
  if (avgPower < 100) return "rgba(156, 163, 175, 0.6)"
  if (avgPower < 150) return "rgba(96, 165, 250, 0.6)"
  if (avgPower < 200) return "rgba(52, 211, 153, 0.6)"
  if (avgPower < 250) return "rgba(251, 191, 36, 0.6)"
  if (avgPower < 300) return "rgba(251, 146, 60, 0.6)"
  return "rgba(220, 38, 38, 0.6)"
}

