import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { userApi, setAuthToken } from '../services/api';
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
} from '../types/user';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
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

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    try {
      const response = await userApi.getProfile();
      setUser(response.data);
      setIsAuthenticated(true);
    } catch (error) {
      setAuthToken(null);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    try {
      const response = await userApi.login(credentials);
      //if ('requiresVerification' in response.data) {
      if (response.data.requiresVerification) {
        return response.data;
        // return {
        //   requiresVerification: true,
        //   email: response.data.email,
        // };
      }
      setAuthToken(response.data.token);
      setUser(response.data.user);
      setIsAuthenticated(true);
      return response.data;  // ✅ Explicit return
    } catch (error) {
      setAuthToken(null);
      setUser(null);
      setIsAuthenticated(false);
      throw error;
    }
  }, []);

  const register = useCallback(async (data: RegisterData) => {
    // try {
      const response = await userApi.register(data);
      return response.data;
    // } catch (error) {
    //   console.error(error);
    // }
    
    // const response = await userApi.register(data);
    // return response.data;
    
    // return {
    //   message: response.data.message,
    //   email: response.data.email,
    //   verificationCode: response.data.verificationCode,
    // };
  }, []);

  const verifyEmail = async (data: VerificationData) => {
    const response = await userApi.verifyEmail(data);
    setAuthToken(response.data.token);
    setUser(response.data.user);
    setIsAuthenticated(true);
    return response.data;
  };

  const resendVerification = async (email: string) => {
    const response = await userApi.resendVerification(email);
    return response.data;
    // return {
    //   message: response.data.message,
    //   verificationCode: response.data.verificationCode,
    // };
  };

  const forgotPassword = async (data: ForgotPasswordData) => {
    const response = await userApi.forgotPassword(data);
    return response.data;
    // return {
    //   message: response.data.message,
    //   resetPasswordCode: response.data.resetPasswordCode,
    //   error: response.data.error,
    // };
  };

  const resetPassword = async (data: ResetPasswordData) => {
    const response = await userApi.resetPassword(data);
    return response.data;
  };

  // const googleLogin = async (code: string) => {
  //   const response = await userApi.googleCallback(code);
  //   setAuthToken(response.data.token);
  //   setUser(response.data.user);
  //   setIsAuthenticated(true);
  //   return response.data;
  // };

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
    } else { // Guest users must also resolve loading
      setAuthToken(null);
      setUser(null);
      setIsAuthenticated(false);
      setLoading(false); // This was missing
    }
  }, [loadProfile]);

  // Memoize context value for stability
  const contextValue = useMemo(() => ({
    user,
    isAuthenticated,
    isAdmin: user?.role === 'admin',
    loading,
    login,
    register,
    verifyEmail,
    resendVerification,
    forgotPassword,
    resetPassword,
    //googleLogin,
    logout,
    updateUser
  }), [user, isAuthenticated, loading, login, register, logout, updateUser]);

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
