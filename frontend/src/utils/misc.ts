import { t } from 'i18next';
import axios from 'axios';

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

export function getErrorMessage(error: unknown): string {
  console.error('Error:', error);
  // Handle Axios errors
  if (axios.isAxiosError(error)) {
    // Safely access the custom 'originalError' property
    const customError = (error as any).originalError;

    if (customError) {
      // If customError is an object with an 'error' string property
      if (
        typeof customError === 'object' &&
        customError !== null &&
        'message' in customError &&
        typeof customError.message === 'string'
      ) {
        return customError.nessage;
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
}