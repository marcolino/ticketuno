import { AxiosError } from 'axios';

export interface ApiError {
  message: string;
  code?: string;
  details?: unknown;
}

export function handleApiError(error: unknown): ApiError {
  // Axios error with response
  if (error instanceof AxiosError) {
    const axiosError = error as AxiosError<{ error?: string; message?: string }>;
    
    return {
      message:
        axiosError.response?.data?.error 
          ?? axiosError.response?.data?.message 
          ?? axiosError.message 
          ?? 'API request failed',
      code: axiosError.code,
      details: axiosError.response?.data
    };
  }
  
  // Generic Error instance
  if (error instanceof Error) {
    return { message: error.message };
  }
  
  // Fallback
  return { message: 'An unexpected error occurred' };
}
