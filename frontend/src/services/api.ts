import axios, { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { Theater, TheaterStats } from '../types/theater';
import { 
  User, 
  LoginCredentials,
  LoginResponse,
  RegisterData, 
  VerificationData,
  ForgotPasswordData,
  ResetPasswordData
} from '../types/user';
import { Show, ShowStats, ShowPerformance, ShowWithDetails } from '../types/show';
import i18n from '../i18n'; 

//const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'; // TODO: set default from config...
const API_BASE_PATH = import.meta.env.VITE_API_BASE_PATH; // ?? '/api/'; // TODO: set default from config...
const API_VERSION = import.meta.env.VITE_API_VERSION; // ?? 'v1'; // TODO: set default from config...
const API_BASE_URL = `${API_BASE_PATH}${API_VERSION}`;

console.log('API_BASE_URL:', API_BASE_URL); // TODO: DEBUG ONLY

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

// Helper function to get current language
export const getCurrentLanguage = (): string => {
  return i18n.language || 'en';
};

// Function to change language both in frontend and sync with backend
export const changeLanguage = async (lng: string): Promise<void> => {
  await i18n.changeLanguage(lng);
  // Optionally, we could notify the backend about language change
  // api.post('/api/users/language', { language: lng });
};

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
  showLoading: () => void;
  hideLoading: () => void;
} | null = null;

// Initialize loading interceptors
export const setupLoadingInterceptors = (
  showLoadingFn: () => void,
  hideLoadingFn: () => void
) => {
  loadingControls = {
    showLoading: showLoadingFn,
    hideLoading: hideLoadingFn
  };
};

// Control whether interceptors are enabled
let interceptorsEnabled = true;

export const enableLoadingInterceptors = () => {
  interceptorsEnabled = true;
};

export const disableLoadingInterceptors = () => {
  interceptorsEnabled = false;
};

// Custom request method that conditionally applies loading interceptors
api.interceptors.request.use((config) => {
  const skipLoading = config.headers?.['X-Skip-Loading'] === 'true';
  const shouldTriggerLoading = !skipLoading && interceptorsEnabled && loadingControls;

  if (shouldTriggerLoading) {
    loadingControls!.showLoading();
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
      // Token expired or invalid
      setAuthToken(null);
      // Optionally redirect to login page
      // window.location.href = '/'; // TODO: force login dialog to open
    }
    return Promise.reject(error);
  }
);
// ========== END AUTH MANAGEMENT ==========

// ========== API ENDPOINTS ==========
export const userApi = {
  // Login
  login: (credentials: LoginCredentials) => 
    //api.post<{ token: string; user: User }>('/users/login', credentials),
    api.post<LoginResponse>('/users/login', credentials),
  // Direct registration
  // register: (data: RegisterData) =>
  //   api.post<{ token: string; user: User }>('/users/register', data),
  
  // Registration with 2FA
  register: (data: RegisterData) =>
    api.post<{ message: string; email: string, verificationCode: string }>('/users/register', data),
  
  // Verify email
  verifyEmail: (data: VerificationData) =>
    api.post<{ token: string; user: User; message: string }>('/users/verify-email', data),
  
  // Resend verification code
  resendVerification: (email: string) =>
    api.post('/users/resend-verification', { email }),
  
  // Forgot password
  forgotPassword: (data: ForgotPasswordData) =>
    api.post('/users/forgot-password', data),
  
  // Password reset
  resetPassword: (data: ResetPasswordData) =>
    api.post('/users/reset-password', data),
  
  // Google OAuth
  getGoogleAuthUrl: () =>
    api.get<{ authUrl: string }>('/users/auth/google'),
  
  googleCallback: (code: string) =>
    api.post<{ token: string; user: User }>('/users/auth/google/callback', { code }),

  // Get user profile
  getProfile: () => api.get<User>('/users/profile'),

  // Update user profile
  updateProfile: (data: Partial<User>) => 
    api.put<User>('/users/profile', data),
};

export const theaterApi = {
  getAllTheaters: () => api.get<TheaterStats[]>('/theaters'),
  getTheaterById: (id: string) => api.get<Theater>(`/theaters/${id}`),
  createTheater: (theater: Partial<Theater>) => 
    api.post<Theater>('/theaters', theater),
  updateTheater: (id: string, theater: Partial<Theater>) => 
    api.put<Theater>(`/theaters/${id}`, theater),
  bookSeats: (theaterId: string, seatIds: string[]) => 
    api.post(`/theaters/${theaterId}/book`, { seatIds }),
  
  // Refresh theaters in background with skip-loading header (currently unused)
  refreshTheaters: () => api.get('/theaters/refresh', {
    headers: { 'X-Skip-Loading': 'true' }
  }),
};

export const showApi = {
  getAllShows: () => api.get<ShowStats[]>('/shows'),
  getShowById: (id: string) => api.get<ShowWithDetails>(`/shows/${id}`),
  createShow: (show: Partial<Show>) => api.post<Show>('/shows', show),
  updateShow: (id: string, show: Partial<Show>) => api.put<Show>(`/shows/${id}`, show),
  deleteShow: (id: string) => api.delete(`/shows/${id}`),
  getPerformances: (showId: string) => api.get<ShowPerformance[]>(`/shows/${showId}/performances`),
  getPerformance: (showId: string, performanceId: string) => 
    api.get<ShowPerformance>(`/shows/${showId}/performances/${performanceId}`),
  createPerformance: (showId: string, performance: Partial<ShowPerformance>) => 
    api.post<ShowPerformance>(`/shows/${showId}/performances`, performance),
  bookPerformance: (showId: string, performanceId: string, seatIds: string[]) =>
    api.post(`/shows/${showId}/performances/${performanceId}/book`, { seatIds }),
};

export default api;
