import dayjs from "dayjs"
import isoWeek from "dayjs/plugin/isoWeek"

export const getBeginningOfYear = (year) => {
  return dayjs(`${year}-01-01`)
}

export const getEndOfYear = (year) => {
  return dayjs(`${year}-12-31`)
}

export const getBeginningOfWeek = (date) => {
  dayjs.extend(isoWeek)
  return dayjs(date).startOf('isoWeek')
}

export const getEndOfWeek = (date) => {
  dayjs.extend(isoWeek)
  return dayjs(date).endOf('isoWeek')
}