import { format, startOfDay, parseISO } from 'date-fns'

export const formatDateKey = (date) => format(date, 'yyyy-MM-dd')

export const getDateKey = (isoString) => {
  return formatDateKey(startOfDay(parseISO(isoString)))
}

export const isDateMatch = (isoString, dateKey) => {
  return getDateKey(isoString) === dateKey
}

