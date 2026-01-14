import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { userApi, setAuthToken } from '../services/api';
import { User, LoginCredentials, RegisterData } from '../types/user';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  //const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      setAuthToken(token);
      loadProfile();
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }
  }, []);

  const loadProfile = async () => {
    try {
      const response = await userApi.getProfile();
      setUser(response.data);
      setIsAuthenticated(true);
    } catch (error) {
      setAuthToken(null);
    } finally {
      //setLoading(false);
    }
  };

  const login = async (credentials: LoginCredentials) => {
    const response = await userApi.login(credentials);
    setAuthToken(response.data.token);
    setUser(response.data.user);
    setIsAuthenticated(true);
  };

  const register = async (data: RegisterData) => {
    const response = await userApi.register(data);
    setAuthToken(response.data.token);
    setUser(response.data.user);
    setIsAuthenticated(true);
  };

  const logout = () => {
    setAuthToken(null);
    setUser(null);
    setIsAuthenticated(false);
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
  };

  // if (loading) {
  //   return null; // Or a loading spinner
  // }

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isAdmin: user?.role === 'admin',
      login,
      register,
      logout,
      updateUser
    }}>
      {children}
    </AuthContext.Provider>
  );
};
