import config from '../config';

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


/**
 *Formats a "humanized" date (for today and yestarday and tomorrow)
 * @param dateInput - Date input
 * @param locale - Locale to which format the date string
 * @param timeZone - Date input
 * @returns Humanized date
 */
export const humanizedDate = (
  dateInput: string | Date,
  locale: string,
  timeZone: string,
  t: (key: string, params?: Record<string, unknown>) => string
) => {
  const date = new Date(
    typeof dateInput === 'string'
      ? dateInput.replace(' ', 'T') + 'Z'
      : dateInput
  );

  const now = new Date();

  const dateOnly = (d: Date) =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d); // YYYY-MM-DD

  const targetDay = dateOnly(date);
  const today = dateOnly(now);

  const yesterdayDate = new Date(now);
  yesterdayDate.setDate(now.getDate() - 1);
  const yesterday = dateOnly(yesterdayDate);

  const tomorrowDate = new Date(now);
  tomorrowDate.setDate(now.getDate() + 1);
  const tomorrow = dateOnly(tomorrowDate);

  const time = date.toLocaleTimeString(locale, {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
  });

  if (targetDay === today) {
    return t('today') + ', ' + time;
  }

  if (targetDay === yesterday) {
    return t('yesterday') + ', ' + time;
  }

  if (targetDay === tomorrow) {
    return t('tomorrow') + ', ' + time;
  }

  return t('on') + ' ' + date.toLocaleString(locale, {
    timeZone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
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
