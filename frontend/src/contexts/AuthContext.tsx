import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { userApi, setAuthToken } from '../services/api';
import { 
  User, 
  LoginCredentials, 
  LoginResponse,
  RegisterData, 
  RegisterResponse,
  VerificationData,
  ForgotPasswordData,
  ResetPasswordData
} from '../types/user';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  //login: (credentials: LoginCredentials) => Promise<{ requiresVerification?: true; email?: string } | void>;
  login: (credentials: LoginCredentials) => Promise<LoginResponse>;
  //register: (data: RegisterData) => Promise<{ email: string }>;
  register: (data: RegisterData) => Promise<RegisterResponse>;
  verifyEmail: (data: VerificationData) => Promise<void>;
  resendVerification: (email: string) => Promise<void>;
  forgotPassword: (data: ForgotPasswordData) => Promise<void>;
  resetPassword: (data: ResetPasswordData) => Promise<void>;
  googleLogin: (code: string) => Promise<void>;
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
      setUser(null); // TODO: do we need this?
      setIsAuthenticated(false); // TODO: do we need this?
    } finally {
      setIsLoading(false); // Set loading to false when done
    }
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    setIsLoading(true); // Start loading
    try {
      const response = await userApi.login(credentials);
      if ('requiresVerification' in response.data) {
        return {
          requiresVerification: true,
          email: response.data.email,
        };
      }
      setAuthToken(response.data.token);
      setUser(response.data.user);
      setIsAuthenticated(true);
    } finally {
      setIsLoading(false); // Set loading to false when done
    }
  }, []);

  const register = useCallback(async (data: RegisterData) => {
    const response = await userApi.register(data);
    return {
      message: response.data.message,
      email: response.data.email,
      verificationCode: response.data.verificationCode,
    };
  }, []);

  const verifyEmail = async (data: VerificationData) => {
    const response = await userApi.verifyEmail(data);
    setAuthToken(response.data.token);
    setUser(response.data.user);
    setIsAuthenticated(true);
  };

  const resendVerification = async (email: string) => {
    await userApi.resendVerification(email);
  };

  const forgotPassword = async (data: ForgotPasswordData) => {
    await userApi.forgotPassword(data);
  };

  const resetPassword = async (data: ResetPasswordData) => {
    await userApi.resetPassword(data);
  };

  const googleLogin = async (code: string) => {
    const response = await userApi.googleCallback(code);
    setAuthToken(response.data.token);
    setUser(response.data.user);
    setIsAuthenticated(true);
  };

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
    verifyEmail,
    resendVerification,
    forgotPassword,
    resetPassword,
    googleLogin,
    logout,
    updateUser
  }), [user, isAuthenticated, isLoading, login, register, logout, updateUser]);

  // if (isLoading) { // TODO: is this sok ???
  //   return null;
  // }

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
