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
  return date.startOf('week')
}

export const getEndOfWeek = (date) => {
  return date.endOf('week')
}