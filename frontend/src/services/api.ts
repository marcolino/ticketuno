import axios, { AxiosInstance, /*AxiosResponse, */InternalAxiosRequestConfig } from 'axios';
import { 
  User, 
  LoginCredentials,
  LoginResponse,
  RegisterData, 
  RegisterResponse, 
  VerificationData,
  ForgotPasswordData,
  ForgotPasswordResponse,
  ResetPasswordData
} from '@/shared/types/user';
import { Theater } from '@/shared/types/theater';
import type { Event, EventStats, EventPerformance, EventWithDetails, EventOptions } from '@/shared/types/event';
import type { FullConsent } from '@/shared/types/consent';
import { PerformanceSeatsResponse } from '@/shared/types/performance';
import { Layout } from '@/shared/types/layout';
import { GeneralSetupType } from '@/shared/types/generalSetup';
import { GuardResult, GuardedDeleteResult, GuardedDeleteResultBulk, GuardedUpdateResult } from '@/shared/types/guard';
import { i18n } from '@/i18n';
import config from '@/shared/config';

// const API_VERSION = import.meta.env.VITE_API_VERSION ?? config.app.api.version;
// const API_BASE_PATH = import.meta.env.VITE_API_BASE_PATH ?? config.app.api.prefix;
//const API_VERSION = config.app.api.version;
//const API_BASE_URL = `/${API_BASE_PATH}/${API_VERSION}`;
const API_BASE_URL = `/${config.app.api.prefix}/${config.app.api.version}`;

console.log('API_BASE_URL:', API_BASE_URL); // TODO: DEBUG ONLY

let redirectingToMaintenance = false;

// Create the main API instance
const api: AxiosInstance = axios.create({
  //baseURL: `${API_BASE_URL}${API_BASE_PATH}${API_VERSION}`,
  baseURL: API_BASE_URL,
  timeout: 10000, // TODO: set default from config...
  headers: { // TODO: set default from config...
    'Content-Type': 'application/json',
  },
});

// Store the original request method
//const originalRequest = api.request;
//const originalRequest: AxiosInstance['request'] = api.request.bind(api);

// ========== LANGUAGE INTERCEPTOR ==========
// Interceptor to add language to all requests
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const currentLanguage = i18n.language || 'en';
  
  // Add Accept-Language header for HTTP language detection
  config.headers = config.headers || {};
  config.headers['Accept-Language'] = currentLanguage;
  
  // Add language as query parameter (optional, for GET requests)
  if (config.method?.toLowerCase() === 'get' || config.method?.toLowerCase() === 'delete') {
    config.params = {
      ...config.params,
      lng: currentLanguage
    };
  }

  // Add language header for POST/PUT/PATCH requests
  if (['post', 'put', 'patch'].includes(config.method?.toLowerCase() || '')) {
    config.headers['Content-Language'] = currentLanguage;
  }
  
  return config;
});

// ========== RESPONSE INTERCEPTOR FOR LANGUAGE SYNC ==========
// If backend sends language in response headers, sync it
api.interceptors.response.use(
  (response) => {
    const backendLanguage = response.headers['content-language'];
    if (backendLanguage && backendLanguage !== i18n.language) {
      // Sync frontend language with backend if different
      i18n.changeLanguage(backendLanguage);
    }
    return response;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ========== LOADING INTERCEPTORS SETUP ==========
// Store loading control functions
let loadingControls: {
  eventLoading: () => void;
  hideLoading: () => void;
} | null = null;

// Initialize loading interceptors
export const setupLoadingInterceptors = (
  eventLoadingFn: () => void,
  hideLoadingFn: () => void
) => {
  loadingControls = {
    eventLoading: eventLoadingFn,
    hideLoading: hideLoadingFn
  };
};

// Control whether interceptors are enabled
let interceptorsEnabled = true;

// export const enableLoadingInterceptors = () => {
//   interceptorsEnabled = true;
// };

// export const disableLoadingInterceptors = () => {
//   interceptorsEnabled = false;
// };

// Custom request method that conditionally applies loading interceptors
api.interceptors.request.use((config) => {
  const skipLoading = config.headers?.['X-Skip-Loading'] === 'true';
  const shouldTriggerLoading = !skipLoading && interceptorsEnabled && loadingControls;

  if (shouldTriggerLoading) {
    loadingControls!.eventLoading();
    (config as any).metadata = { triggerLoading: true };
  }

  return config;
});

api.interceptors.response.use(
  (response) => {
    if ((response.config as any).metadata?.triggerLoading) {
      loadingControls!.hideLoading();
    }
    return response;
  },
  (error) => {
    if ((error.config as any)?.metadata?.triggerLoading) {
      loadingControls!.hideLoading();
    }
    return Promise.reject(error);
  }
);

// Override shortcut methods to use our custom request
['get', 'delete', 'head'].forEach(method => {
  (api as any)[method] = function(url: string, config?: InternalAxiosRequestConfig) {
    return (api as any).request({ ...config, method, url });
  };
});

['post', 'put', 'patch'].forEach(method => {
  (api as any)[method] = function(url: string, data?: any, config?: InternalAxiosRequestConfig) {
    return (api as any).request({ ...config, method, url, data });
  };
});
// ========== END LOADING INTERCEPTORS ==========

// ========== AUTH TOKEN MANAGEMENT ==========
export const setAuthToken = (token: string | null) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    localStorage.setItem('authToken', token);
  } else {
    delete api.defaults.headers.common['Authorization'];
    localStorage.removeItem('authToken');
  }
};

// Initialize token from localStorage
const token = localStorage.getItem('authToken');
if (token) {
  setAuthToken(token);
}

// Optional: Add response interceptor to handle token expiration
api.interceptors.response.use(
  async (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      window.dispatchEvent(new Event("unauthorized")); // handled in AuthProvider, in frontend
      // // Token expired or invalid
      // setAuthToken(null);
      // // Optionally redirect to login page
      // // window.location.href = '/'; // TODO: force login dialog to open
    }
    return Promise.reject(error);
  }
);
// ========== END AUTH MANAGEMENT ==========

// ========== ERRORS MANAGEMENT ==========
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Check maintenance FIRST, before any error normalization
    if (error.response?.status === 503) {
      if (!redirectingToMaintenance && window.location.pathname !== '/maintenance') {
        redirectingToMaintenance = true;
        window.location.href = '/maintenance';
        return new Promise(() => {});
      }
      //return new Promise(() => { }); // Swallow — never resolve/reject
      // Already on /maintenance — reject with a clean error, not the raw HTML body
      return Promise.reject({
        ...error,
        message: i18n.t('Service unavailable'), // TODO: test this (i18n.t()) is translated !
        response: { ...error.response, data: { error: 'maintenance mode' } }
      });
    }

    let message = i18n.t('An unexpected error occurred');
    const normalizedError = {
      ...error,
      message,
      statusCode: error.response?.status,
      originalError: error.response?.data,
    };

    return Promise.reject(normalizedError);
  }
);

// api.interceptors.response.use(
//   (response) => response,
//   (error) => {
//     let message = i18n.t('An unexpected error occurred'); // TODO: check if this translates correctly
//     /*
//     if (error.response?.data?.error) {
//       message = error.response.data.error;
//     } else if (error.response?.data?.message) {
//       message = error.response.data.message;
//     } else if (error.response?.status) {
//       // Status-specific default messages
//       const statusMessages: Record<number, string> = {
//         400: i18n.t('Invalid request. Please check your input.'),
//         401: i18n.t('You must be logged in to perform this action.'),
//         403: i18n.t('You do not have permission to perform this action.'),
//         404: i18n.t('The requested resource was not found.'),
//         409: i18n.t('This operation conflicts with existing data.'),
//         422: i18n.t('Validation failed. Please check your input.'),
//         500: i18n.t('Server error. Please try again later.'),
//         502: i18n.t('Bad gateway. Server is temporarily unavailable.'),
//         503: i18n.t('Service unavailable. Please try again later.'),
//       };
//       message = statusMessages[error.response.status] || error.response.statusText || message;
//     } else if (error.message) {
//       message = error.message;
//     } else if (error.request) {
//       message = i18n.t('No response from server. Please check your connection.');
//     }
//     */
//     const normalizedError = {
//       ...error,
//       message,
//       statusCode: error.response?.status,
//       originalError: error.response?.data,
//     };

//     return Promise.reject(normalizedError);
//   }
// );
// ========== END ERRORS MANAGEMENT ==========

// ========== API ENDPOINTS ==========
export const globalApi = {
  
  version: () => // Backend version
    api.get('/version'),

  health: () => // Backend version
    api.get('/health'),
};

export const userApi = {
  
  login: (credentials: LoginCredentials) => // Login
    api.post<LoginResponse>('/users/login', credentials),
  
  register: (data: RegisterData) => // Registration with 2FA
    api.post<RegisterResponse>('/users/register', data),
  
  verifyEmail: (data: VerificationData) => // Verify email
    api.post<{ token: string; user: User; message: string }>('/users/verify-email', data),
  
  resendVerification: (email: string) => // Resend verification code
    api.post<{ message: string; verificationCode: string }>('/users/resend-verification', { email }),
  
  forgotPassword: (data: ForgotPasswordData) => // Forgot password
    api.post<ForgotPasswordResponse>('/users/forgot-password', data),
  
  resetPassword: (data: ResetPasswordData) => // Password reset
    api.post('/users/reset-password', data),
  
  getGoogleAuthUrl: () => // Google OAuth
    api.get<{ authUrl: string }>('/users/auth/google'),
  
  googleCallback: (code: string) => // Google callback
    api.post<{ token: string; user: User }>('/users/auth/google/callback', { code }),

  getProfile: (userId?: string | undefined) =>
    api.get<User>(userId ? `/users/profile/${userId}` : '/users/profile'),

  updateProfile: (userId: string | undefined, data: Partial<User>) =>
    api.put<User>(userId ? `/users/profile/${userId}` : '/users/profile', data),

  updateConsent: (userId: string | undefined, data: Partial<FullConsent>) =>
    api.put<User>(userId ? `/users/consent/${userId}` : '/users/consent', data),

  verifyConsentToken: (token: string, consentType?: string) =>
    api.get<User>(`/users/verifyConsentToken/${token}/${consentType}`),

  // verifyConsentUnsubscribeToken: (token: string) =>
  //   api.put<User>(`/users/verify-consent-unsubscribe-token/${token}`),

  unsubscribe: (token: string) =>
    api.post(`/users/unsubscribe/${token}`),

  getUserByToken: (token: string) =>
    api.get<User>(`/users/token/${token}`),

  getAllUsers: () =>
    api.get<User[]>(`/users`),

  // delete: (userId: string) =>
  //   api.delete<GuardedDeleteResult>(`/users/${userId}`),
  delete: (userIds: string | string[]) => {
    const ids = Array.isArray(userIds) ? userIds : [userIds];
    return api.delete<GuardedDeleteResultBulk>('/users', { data: { ids } });
  },
};

export const theaterApi = {
  getAllTheaters: () =>
    api.get<Theater[]>('/theaters'),

  getTheaterById: (id: string) =>
    api.get<Theater>(`/theaters/${id}`),

  createTheater: (theater: Partial<Theater>) => 
    api.post<string>('/theaters', theater),

  // updateTheater: (id: string, theater: Partial<Theater>) =>
  //   api.put<Theater>(`/theaters/${id}`, theater),
  updateTheater: (id: string, data: Partial<Theater>) =>
    api.put<GuardedUpdateResult>(`/theaters/${id}`, data),

  // getTheaterLayoutCurrent: (id: string) =>
  //   api.get<Theater>(`/theaters/${id}/layout`),

  // setTheaterLayoutCurrent: (id: string, layoutId: string) =>
  //   api.put<Theater>(`/theaters/${id}/layout/${layoutId}`),

  // clearTheaterLayoutCurrent: (id: string) =>
  //   api.delete<Theater>(`/theaters/${id}/layout`),

  deleteTheater: (id: string) =>
    //api.delete(`/theaters/${id}`),
    api.delete<GuardedDeleteResult>(`/theaters/${id}`),

  // bookSeats: (theaterId: string, seatIds: string[]) =>
  //   api.post(`/theaters/${theaterId}/book`, { seatIds }),

  refreshTheaters: () => api.get('/theaters/refresh', { // Refresh theaters in background with skip-loading header (currently unused)
    headers: { 'X-Skip-Loading': 'true' }
  }),
};

export const layoutApi = {
  getAllLayouts: () =>
    api.get<Layout[]>('/layouts'),

  getLayoutById: (id: string) =>
    api.get<Layout>(`/layouts/${id}`),

  getLayoutByTheaterId: (theaterId: string) =>
    api.get<Layout[]>(`/layouts/${theaterId}`),

  createLayout: (layout: Partial<Layout>) =>
    api.post<Layout>('/layouts', layout),

  updateLayout: (id: string, layout: Partial<Layout>) =>
    api.put<Layout>(`/layouts/${id}`, layout),

  deleteLayout: (id: string) =>
    api.delete(`/layouts/${id}`),

  getLayoutGuard: (id: string) =>
    api.get(`/layouts/${id}/guard`),

};

export const eventApi = {
  getAllEvents: (options?: EventOptions) =>
    api.get<EventStats[]>('/events', { params: options }),

  getEventById: (id: string) =>
    api.get<EventWithDetails>(`/events/${id}`),

  createEvent: (event: Partial<Event>) =>
    api.post<Event>('/events', event),

  // updateEvent: (id: string, event: Partial<Event>) =>
  //   api.put<Event>(`/events/${id}`, event),
  updateEvent: (id: string, event: Partial<Event>) =>
    api.put<GuardedUpdateResult>(`/events/${id}`, event),
  
  deleteEvent: (id: string) =>
    api.delete(`/events/${id}`),

  getEventGuard: (id: string) =>
    api.get(`/events/${id}/guard`),

  getPerformances: (eventId: string) =>
    api.get<EventPerformance[]>(`/events/${eventId}/performances`),

  getPerformance: (eventId: string, performanceId: string) => 
    api.get<EventPerformance>(`/events/${eventId}/performances/${performanceId}`),

  getPerformanceSeats: (eventId: string, performanceId: string) => 
    api.get<PerformanceSeatsResponse>(`/events/${eventId}/performances/${performanceId}/seats`),

  createPerformance: (eventId: string, performance: Partial<EventPerformance>) => 
    api.post<EventPerformance>(`/events/${eventId}/performances`, performance),

  updatePerformance: (eventId: string, performanceId: string, data: Partial<EventPerformance>) =>
    api.put<EventPerformance>(`/events/${eventId}/performances/${performanceId}`, data),

  deletePerformance: (eventId: string, performanceId: string) =>
    api.delete(`/events/${eventId}/performances/${performanceId}`),

  bookPerformance: (eventId: string, performanceId: string, seatIds: string[]) =>
    api.post(`/events/${eventId}/performances/${performanceId}/book`, { seatIds }),
};

export const ticketApi = {
  validateTicket: (code: string) =>
    api.post(`/tickets/${code}/validate`),
};

export const imageApi = {
  upload: (file: File | Blob, imageType: string) => {
    const formData = new FormData();
    const name = file instanceof File ? file.name : `${imageType}-upload.jpg`;
    formData.append('imageType', imageType); // imageType BEFORE image ... order matters in multipart streams... :-/
    formData.append('image', file, name);
    return api.post<{ filename: string }>('/images/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  delete: (filename: string) =>
    api.delete(`/images/${filename}`),
};

export const guardsApi = {
  performance:
    (id: string) => api.get<GuardResult>(`/guards/performance/${id}`).then(r => r.data),
  
  event:
    (id: string) => api.get<GuardResult>(`/guards/event/${id}`).then(r => r.data),
  
  theater:
    (id: string) => api.get<GuardResult>(`/guards/theater/${id}`).then(r => r.data),
  
  layout:
    (id: string) => api.get<GuardResult>(`/guards/layout/${id}`).then(r => r.data),
  };

export const setupApi = {
  load: () =>
    api.get<GeneralSetupType>('/setup'),

  save: (payload: Partial<GeneralSetupType>) =>
    api.post<GeneralSetupType>('/setup', payload),
};
