import axios, { AxiosInstance } from 'axios';
import { Theater, TheaterStats } from '../types/theater';
import { User, LoginCredentials, RegisterData } from '../types/user';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001' // TODO: set default from config...
const API_BASE_PATH = import.meta.env.VITE_API_BASE_PATH ?? '/api/' // TODO: set default from config...
const API_VERSION = import.meta.env.VITE_API_VERSION ?? 'v1' // TODO: set default from config...

console.log('API_BASE_URL:', API_BASE_URL); // TODO: DEBUG ONLY

const api: AxiosInstance = axios.create({
  baseURL: `${API_BASE_URL}${API_BASE_PATH}${API_VERSION}`,
  timeout: 10000, // TODO: set default from config...
  headers: { // TODO: set default from config...
    'Content-Type': 'application/json',
  },
});

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

export const userApi = {
  login: (credentials: LoginCredentials) => api.post<{ token: string; user: User }>('/users/login', credentials),
  register: (data: RegisterData) => api.post<{ token: string; user: User }>('/users/register', data),
  getProfile: () => api.get<User>('/users/profile'),
  updateProfile: (data: Partial<User>) => api.put<User>('/users/profile', data),
};

export const theaterApi = {
  getAllTheaters: () => api.get<TheaterStats[]>('/theaters'),
  getTheaterById: (id: string) => api.get<Theater>(`/theaters/${id}`),
  createTheater: (theater: Partial<Theater>) => api.post<Theater>('/theaters', theater),
  updateTheater: (id: string, theater: Partial<Theater>) => api.put<Theater>(`/theaters/${id}`, theater),
  bookSeats: (theaterId: string, seatIds: string[]) => api.post(`/theaters/${theaterId}/book`, { seatIds }),
  //login: (password: string) => api.post('/theaters/auth/login', { password }),
};

export default api;
