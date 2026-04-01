import { t } from 'i18next';
import axios from 'axios';
import config from '../config';

export const getErrorMessage = (error: unknown): string => {
  console.error('Error:', error);
  // Handle Axios errors
  if (axios.isAxiosError(error)) {
    // Safely access the custom 'originalError' property
    const customError = (error as any).originalError;

    if (customError) {
      // If customError is an object with an 'error' string property
      if (
        typeof customError === 'object' &&
        customError !== null
      ) {
        if (
          'message' in customError &&
          typeof customError.message === 'string'
        ) {
          return customError.message;
        }
        if (
          'error' in customError &&
          typeof customError.error === 'string'
        ) {
          return customError.error;
        }
      }
      // Otherwise convert the whole customError to string
      return String(customError);
    }

    // Fallback to response data (common for server errors)
    if (error.response?.data) {
      const data = error.response.data;
      if (typeof data === 'string') return data;
      if (typeof data === 'object' && data !== null) {
        if ('message' in data && typeof data.message === 'string') return data.message;
        if ('error' in data && typeof data.error === 'string') return data.error;
      }
    }

    // Default Axios error message
    return error.message;
  }

  // Handle generic Error instances
  if (error instanceof Error) {
    return error.message;
  }

  // Handle string errors
  if (typeof error === 'string') {
    return error;
  }

  // Handle objects with a 'message' property
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }

  // Fallback
  return t('Unknown error occurred');
};

export const formatMoney = (
  value: number,
  locale: string = config.app.defaultLanguage,
  currency: string = config.app.defaultCurrency): string => {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(value);
};

// export const formatMoney = (amount: number, currency: string, locale: string): string => {
//   const formatter = new Intl.NumberFormat(locale, {
//     style: 'currency',
//     currency: currency,
//   });
//   return formatter.format(amount);
// };

/**
 * 
 * @param date Formats a date i
 * @param locale 
 * @returns 
 */
export const formatFullDate = (
  date: string | Date,
  locale: string = config.app.defaultLanguage,
  options?: Intl.DateTimeFormatOptions // optional, can override defaults
): string => {
  // Convert input to a Date object (UTC for strings)
  const dateObj = typeof date === 'string' ? parseUTCDate(date) : date;

  // Default options: day numeric, month long, year numeric, UTC timezone
  const defaultOptions: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC', // date should always be UTC
  };

  // User options override defaults
  return new Intl.DateTimeFormat(locale, { ...defaultOptions, ...options }).format(dateObj);
};

export const formatWeekday = (
  date: string | Date,
  locale: string = config.app.defaultLanguage,
): string => {
  // Convert input to a Date object (UTC for strings)
  const dateObj = typeof date === 'string' ? parseUTCDate(date) : date;

  return new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    timeZone: 'UTC',
  }).format(dateObj);
}

/**
 * Calculates the absolute difference between two times given as "HH:MM" strings.
 * Returns a formatted string: "X days, Yh Zm" where days and hours are omitted if zero.
 * @param time1 - First time string.
 * @param time2 - Second time string.
 * @returns Formatted difference string.
 */
export const formatTimeDifference = (
  time1: string,
  time2: string
): string => {
  const minutes1 = parseTimeToMinutes(time1);
  const minutes2 = parseTimeToMinutes(time2);

  const diffMinutes = Math.abs(minutes1 - minutes2);

  const days = Math.floor(diffMinutes / (24 * 60));
  const remainingMinutes = diffMinutes % (24 * 60);
  const hours = Math.floor(remainingMinutes / 60);
  const minutes = remainingMinutes % 60;

  const parts: string[] = [];

  if (days > 0) {
    parts.push(`${days}d`);
  }
  if (hours > 0) {
    parts.push(`${hours}h`);
  }
  // Always show minutes (even if zero)
  parts.push(`${minutes}m`);

  // Join with a space if there are multiple parts
  return parts.join(' ');
}

/** Helpers *************************************************************************************/

/**
 * Parse "YYYY-MM-DD" as UTC Date
 * @param dateStr - Date string "YYYY-MM-DD" format.
 * @returns Total minutes represented by the string.
 */
function parseUTCDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  // month is 0-indexed in Date.UTC
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Parse a string in "HH:MM" format (e.g., "03:45", "120:15") into total minutes.
 * @param time - Time string in "HH:MM" format.
 * @returns Total minutes represented by the string.
 * @throws Will throw an error if the format is invalid.
 */
function parseTimeToMinutes(time: string): number {
  const parts = time.split(':');
  if (parts.length !== 2) {
    throw new Error(`Invalid time format: "${time}". Expected "HH:MM".`);
  }
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  if (isNaN(hours) || isNaN(minutes) || minutes < 0 || minutes > 59) {
    throw new Error(`Invalid time value: "${time}". Hours and minutes must be numbers, minutes 0-59.`);
  }
  return hours * 60 + minutes;
}
