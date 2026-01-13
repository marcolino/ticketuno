// src/services/api/interceptors.ts
import { InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

// Extend the Axios types locally
declare module 'axios' {
  interface InternalAxiosRequestConfig {
    metadata?: {
      triggerLoading?: boolean;
    };
  }
}

// Store references to the loading control functions
let loadingControls: {
  showLoading: () => void;
  hideLoading: () => void;
} | null = null;

// Initialize the interceptors with loading controls
export const setupLoadingInterceptors = (
  showLoadingFn: () => void,
  hideLoadingFn: () => void
) => {
  loadingControls = {
    showLoading: showLoadingFn,
    hideLoading: hideLoadingFn
  };
};

// Request interceptor
export const requestLoadingInterceptor = (config: InternalAxiosRequestConfig) => {
  // Optional: Skip loading for specific requests
  const skipLoading = config.headers?.['X-Skip-Loading'] === 'true';
  
  if (!skipLoading && loadingControls) {
    loadingControls.showLoading();
  }
  
  // Mark that this request should trigger loading
  return {
    ...config,
    metadata: {
      ...config.metadata,
      triggerLoading: !skipLoading
    }
  } as InternalAxiosRequestConfig;
};

// Response interceptor
export const responseLoadingInterceptor = (response: AxiosResponse) => {
  const config = response.config as InternalAxiosRequestConfig & {
    metadata?: { triggerLoading?: boolean };
  };
  
  if (config.metadata?.triggerLoading && loadingControls) {
    loadingControls.hideLoading();
  }
  
  return response;
};

// Error interceptor
export const errorLoadingInterceptor = (error: AxiosError) => {
  const config = error.config as (InternalAxiosRequestConfig & {
    metadata?: { triggerLoading?: boolean };
  }) | undefined;
  
  if (config?.metadata?.triggerLoading && loadingControls) {
    loadingControls.hideLoading();
  }
  
  return Promise.reject(error);
};
