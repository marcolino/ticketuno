import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { userApi, setAuthToken } from '../services/api';
import { User, LoginCredentials, RegisterData } from '../types/user';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    try {
      const response = await userApi.getProfile();
      setUser(response.data);
      setIsAuthenticated(true);
    } catch (error) {
      setAuthToken(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false); // Set loading to false when done
    }
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
     setIsLoading(true); // Start loading
    try {
      const response = await userApi.login(credentials);
      setAuthToken(response.data.token);
      setUser(response.data.user);
      setIsAuthenticated(true);
    } finally {
      setIsLoading(false); // Set loading to false when done
    }
  }, []);

  const register = useCallback(async (data: RegisterData) => {
    const response = await userApi.register(data);
    // setAuthToken(response.data.token);
    // setUser(response.data.user);
    // setIsAuthenticated(true);
  }, []);

  const logout = useCallback(() => {
    setAuthToken(null);
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('authToken');
  }, []);

  const updateUser = useCallback((updatedUser: User) => {
    setUser(updatedUser);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      setAuthToken(token);
      loadProfile();
    } else {
      setIsLoading(false); // No token, loading is complete
    }
  }, [loadProfile]);

  // Memoize context value for stability
  const contextValue = useMemo(() => ({
    user,
    isAuthenticated,
    isAdmin: user?.role === 'admin',
    isLoading,
    login,
    register,
    logout,
    updateUser
  }), [user, isAuthenticated, isLoading, login, register, logout, updateUser]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Define hook AFTER provider
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthProvider;
