import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { userApi, setAuthToken } from '@/services/api';
import { 
  User, 
  LoginCredentials,
  LoginResponse,
  RegisterData, 
  RegisterResponse,
  VerificationData,
  VerifyEmailResponse,
  ResendVerificationResponse,
  ForgotPasswordData,
  ForgotPasswordResponse,
  ResetPasswordData,
  ResetPasswordResponse,
} from '@/shared/types/user';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isOperator: boolean;
  loading: boolean;
  login: (credentials: LoginCredentials) => Promise<LoginResponse>;
  register: (data: RegisterData) => Promise<RegisterResponse>;
  verifyEmail: (data: VerificationData) => Promise<VerifyEmailResponse>;
  resendVerification: (email: string) => Promise<ResendVerificationResponse>;
  forgotPassword: (data: ForgotPasswordData) => Promise<ForgotPasswordResponse>;
  resetPassword: (data: ResetPasswordData) => Promise<ResetPasswordResponse>;
  logout: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // const isAdmin = (user): boolean => {
  //   return user?.role === 'admin';
  // };
  // const isOperator = (user): boolean => {
  //   return user?.role === 'admin' || user?.role === 'operator';
  // };
  const isAdmin = user?.role === 'admin';
  const isOperator = user?.role === 'admin' || user?.role === 'operator';
  
  const loadProfile = useCallback(async () => {
    try {
      const response = await userApi.getProfile();
      setUser(response.data);
      setIsAuthenticated(true);
      setLoading(false);
      return response.data;
    } catch (error) {
      setAuthToken(null);
      localStorage.removeItem('authToken');
      setUser(null);
      setIsAuthenticated(false);
      setLoading(false);
      throw error;
    }
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    try {
      setLoading(true);
      
      // Check if it's a token login (Google OAuth)
      if ('token' in credentials) {
        // Token-based login (for Google OAuth)
        const token = credentials.token;
        setAuthToken(token);
        localStorage.setItem('authToken', token);
        
        // Load user profile with the new token
        const userData = await loadProfile();
        
        return {
          token,
          user: userData,
        };
      } else {
        // Email/password login (existing logic)
        const response = await userApi.login(credentials);
        
        if (response.data.requiresVerification) {
          setLoading(false);
          return response.data;
        }
        
        setAuthToken(response.data.token);
        localStorage.setItem('authToken', response.data.token);
        setUser(response.data.user);
        setIsAuthenticated(true);
        setLoading(false);
        return response.data;
      }
    } catch (error: any) {
      setAuthToken(null);
      localStorage.removeItem('authToken');
      setUser(null);
      setIsAuthenticated(false);
      setLoading(false);
      throw error;
    }
  }, [loadProfile]);

  const register = useCallback(async (data: RegisterData) => {
    const response = await userApi.register(data);
    return response.data;
  }, []);

  const verifyEmail = useCallback(async (data: VerificationData) => {
    const response = await userApi.verifyEmail(data);
    setAuthToken(response.data.token);
    localStorage.setItem('authToken', response.data.token);
    setUser(response.data.user);
    setIsAuthenticated(true);
    return response.data;
  }, []);

  const resendVerification = useCallback(async (email: string) => {
    const response = await userApi.resendVerification(email);
    return response.data;
  }, []);

  const forgotPassword = useCallback(async (data: ForgotPasswordData) => {
    const response = await userApi.forgotPassword(data);
    return response.data;
  }, []);

  const resetPassword = useCallback(async (data: ResetPasswordData) => {
    const response = await userApi.resetPassword(data);
    return response.data;
  }, []);

  const logout = useCallback(() => {
    setAuthToken(null);
    localStorage.removeItem('authToken');
    setUser(null);
    setIsAuthenticated(false);
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
      setLoading(false);
    }
  }, [loadProfile]);

  const contextValue = useMemo(() => ({
    user,
    isAuthenticated,
    isAdmin,
    isOperator,
    loading,
    login,
    register,
    verifyEmail,
    resendVerification,
    forgotPassword,
    resetPassword,
    logout,
    updateUser
  }), [user, isAuthenticated, isAdmin, isOperator, loading, login, register, verifyEmail, resendVerification, forgotPassword, resetPassword, logout, updateUser]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook MUST be AFTER provider
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthProvider;
