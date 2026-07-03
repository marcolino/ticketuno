import { t } from 'i18next';
// import axios from 'axios';

// interface LocalizedDateProps {
//   dateString: string; // format: YYYY-MM-DD
//   locale?: string; // optional, defaults to 'en-EN'
// }

interface LocalizedDateProps {
  dateString: string | Date | undefined,
  locale?: string; // e.g., 'it-IT', 'en-US'
  weekday?: 'long' | 'short' | 'narrow';
  year?: 'numeric' | '2-digit';
  month?: 'numeric' | '2-digit' | 'long' | 'short' | 'narrow';
  day?: 'numeric' | '2-digit';
}

export function localizedDate({
  dateString,
  locale = 'en-EN',
  weekday = 'long',
  year = 'numeric',
  month = 'long',
  day = 'numeric',
}: LocalizedDateProps) {
  let date: Date;
  let useUTC; // whether to force UTC in formatting

  // Determine the Date object and formatting behavior
  if (dateString === undefined) {
    // Use today's date (local time)
    date = new Date();
    useUTC = false;
  } else if (dateString instanceof Date) {
    // Use the provided Date object as-is (local time)
    date = dateString;
    useUTC = false;
  } else {
    // Parse string in YYYY-MM-DD format as UTC to avoid timezone shifts
    date = new Date(dateString + 'T00:00:00Z');
    useUTC = true;
  }

  // Validate the date
  if (isNaN(date.getTime())) {
    return t('Invalid date');
  }

  // Build formatter options dynamically
  const options: Intl.DateTimeFormatOptions = {
    weekday,
    year,
    month,
    day,
  };

  if (useUTC) {
    options.timeZone = 'UTC';
  }

  // Create formatter with requested locale and desired options
  const formatter = new Intl.DateTimeFormat(locale, options);
  return formatter.format(date);
};

export const getEnvMode = (): 'development' | 'staging' | 'production' => {
  // Use type assertion to avoid TypeScript error
  const mode = (import.meta as any).env?.MODE || 'production';
  return mode;
};

// export const isDev = getEnvMode() === 'development';
// export const isStaging = getEnvMode() === 'staging';
// export const isProd = getEnvMode() === 'production';
