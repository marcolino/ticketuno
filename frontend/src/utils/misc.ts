import { t } from 'i18next';
import axios from 'axios';

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
        'error' in customError &&
        typeof customError.error === 'string'
      ) {
        return customError.error;
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