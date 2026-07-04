// import { t } from 'i18next';
// import axios from 'axios';
import { sharedConfig as config } from '../config';
import { DeepPartial } from '../types/generalSetup';

//export type DeepPartial<T> = { [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P] };

export const buildPayload = (userId: string) => {
  return {
    userId,
    timestamp: Date.now(),
  };
};

export const getErrorMessage = (
  error: unknown,
  fallback = 'Unknown error occurred'
): string => {

  console.error('Error:', error);

  // Helper to check if it's a Stripe error (works for both client and server)
  const isStripeError = (err: unknown): boolean => {
    if (!err || typeof err !== 'object') return false;
    
    // Stripe errors typically have these properties
    const hasStripeProps = (
      'type' in err && 
      typeof err.type === 'string' &&
      ('message' in err || 'raw' in err)
    );
    
    // Check for Stripe-like error properties
    const hasStripeLikeProps = (
      ('code' in err && typeof err.code === 'string') ||
      ('statusCode' in err && typeof err.statusCode === 'number') ||
      ('headers' in err && typeof err.headers === 'object')
    );
    
    return hasStripeProps || (hasStripeLikeProps && 'type' in err);
  };

  // Handle Stripe errors first
  if (isStripeError(error)) {
    const stripeErr = error as any;
    
    // Try to get the most descriptive error message
    if (stripeErr.message) {
      return stripeErr.message;
    }
    
    // Some Stripe errors have error details in raw or nested objects
    if (stripeErr.raw && typeof stripeErr.raw === 'object') {
      if (stripeErr.raw.message) {
        return stripeErr.raw.message;
      }
      if (stripeErr.raw.error?.message) {
        return stripeErr.raw.error?.message;
      }
    }
    
    // Get type-specific message if available
    if (stripeErr.type) {
      const typeMessages: Record<string, string> = {
        'StripeCardError': 'Payment card error',
        'StripeInvalidRequestError': 'Invalid payment request',
        'StripeAPIError': 'Payment service error',
        'StripeAuthenticationError': 'Payment authentication failed',
        'StripePermissionError': 'Payment permission error',
        'StripeRateLimitError': 'Payment service rate limit exceeded',
        'card_error': 'Card payment error',
        'validation_error': 'Validation error',
        'idempotency_error': 'Duplicate payment request',
        'invalid_request_error': 'Invalid payment request',
        'api_error': 'Payment service error',
        'authentication_error': 'Authentication failed',
        'rate_limit_error': 'Rate limit exceeded',
      };
      
      // Find the most specific match
      for (const [key, msg] of Object.entries(typeMessages)) {
        if (stripeErr.type.includes(key) || key.includes(stripeErr.type)) {
          return msg;
        }
      }
      
      return `Payment error (${stripeErr.type})`;
    }
    
    return 'Payment processing error';
  }
  
  if (isAxiosLikeError(error)) {

    const customError = error.originalError;

    if (
      customError &&
      typeof customError === 'object'
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

    if (customError) {
      return String(customError);
    }

    const data = error.response?.data;

    if (typeof data === 'string') {
      return data;
    }

    if (
      data &&
      typeof data === 'object'
    ) {
      if (
        'message' in data &&
        typeof data.message === 'string'
      ) {
        return data.message;
      }

      if (
        'error' in data &&
        typeof data.error === 'string'
      ) {
        return data.error;
      }
    }

    if (typeof error.message === 'string') {
      return error.message;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (
    error &&
    typeof error === 'object' &&
    'message' in error
  ) {
    return String(error.message);
  }

  return fallback;
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
 * Formats a "humanized" date (for today and yestarday and tomorrow)
 * @param dateInput - Date input
 * @param locale - Locale to which format the date string
 * @param timeZone - Date input
 * @param t - Translation function
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

  const humanizedTime = time.replace(/:00$/, '');
  if (targetDay === today) {
    return t('today') + ', ' + t('at time') + ' ' + humanizedTime;
  }

  if (targetDay === yesterday) {
    return t('yesterday') + ', ' + t('at time') + ' ' + humanizedTime;
  }

  if (targetDay === tomorrow) {
    return t('tomorrow') + ', ' + t('at time') + ' ' + humanizedTime;
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

/**
 * Detect Axios-like errors without importing axios.
 */
function isAxiosLikeError(error: unknown): error is {
  message?: string;
  response?: {
    data?: unknown;
  };
  originalError?: unknown;
} {
  return (
    typeof error === 'object' &&
    error !== null &&
    (
      'response' in error ||
      'originalError' in error
    )
  );
}

/**
 * Deep merge two objects
 */
export function deepMerge<T extends Record<string, any>>(
  target: T,
  source: DeepPartial<T>
): T {
  if (!source || typeof source !== 'object') {
    return target;
  }

  const result = { ...target } as any;

  for (const key in source) {
    if (!Object.prototype.hasOwnProperty.call(source, key)) continue;

    const sourceValue = source[key];
    const targetValue = result[key];

    if (sourceValue === undefined) continue;

    // Check if both are plain objects (not arrays, not null)
    if (
      sourceValue &&
      typeof sourceValue === 'object' && !Array.isArray(sourceValue) &&
      targetValue &&
      typeof targetValue === 'object' && !Array.isArray(targetValue)
    ) {
      // Use 'as any' here to bypass the recursive type check
      result[key] = deepMerge(targetValue, sourceValue as any);
    } else {
      result[key] = sourceValue;
    }
  }

  return result;
}
