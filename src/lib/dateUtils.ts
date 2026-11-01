import { format } from 'date-fns';

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // +5:30

/**
 * Convert any date to IST Date object
 */
export const toIST = (date: Date | string): Date => {
  const d = typeof date === 'string' ? new Date(date) : date;
  // Get UTC time, then add IST offset
  const utcMs = d.getTime() + d.getTimezoneOffset() * 60 * 1000;
  return new Date(utcMs + IST_OFFSET_MS);
};

/**
 * Format a date in IST timezone
 */
export const formatIST = (date: Date | string, formatStr: string): string => {
  return format(toIST(date), formatStr);
};

/**
 * Get current IST time string
 */
export const getCurrentIST = (): Date => {
  return toIST(new Date());
};
