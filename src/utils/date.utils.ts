import dayjs from 'dayjs';

/**
 * Get the start of the current day as a Unix timestamp
 * 
 * @returns Unix timestamp for the start of today
 */
export const getStartOfDay = (): number => {
  return dayjs().startOf('day').unix();
};

/**
 * Get the current time as a Unix timestamp
 * 
 * @returns Current Unix timestamp
 */
export const getCurrentTimestamp = (): number => {
  return dayjs().unix();
};

/**
 * Format a Unix timestamp into a readable date string
 * 
 * @param timestamp Unix timestamp
 * @param format Date format string
 * @returns Formatted date string
 */
export const formatTimestamp = (timestamp: number, format: string = 'YYYY-MM-DD HH:mm:ss'): string => {
  return dayjs.unix(timestamp).format(format);
};

/**
 * Check if a Unix timestamp is from today
 * 
 * @param timestamp Unix timestamp
 * @returns Boolean indicating if the timestamp is from today
 */
export const isToday = (timestamp: number): boolean => {
  const date = dayjs.unix(timestamp);
  const today = dayjs();
  return date.isSame(today, 'day');
}; 