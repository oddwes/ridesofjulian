"use client"

import dayjs from "dayjs"
import isoWeek from "dayjs/plugin/isoWeek"

dayjs.extend(isoWeek)

export const getBeginningOfYear = (year) => {
  return dayjs(`${year}-01-01`)
}

export const getEndOfYear = (year) => {
  return dayjs(`${year}-12-31`)
}

export const getBeginningOfWeek = (date) => {
  const dayIndex = date.day() // 0 (Sun) .. 6 (Sat)
  const diffFromMonday = (dayIndex + 6) % 7 // 0 for Mon, 6 for Sun
  return date.subtract(diffFromMonday, 'day').startOf('day')
}

export const getEndOfWeek = (date) => {
  const beginningOfWeek = getBeginningOfWeek(date)
  return beginningOfWeek.add(6, 'day').endOf('day')
}

export const formatDuration = (minutes) => {
  const hours = Math.floor(minutes / 60)
  const remainingMins = minutes % 60
  return hours > 0 ? `${hours}h ${remainingMins}m` : `${remainingMins}m`
}