import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
  useMemo,
} from 'react';
import { userApi, setAuthToken } from '@/services/api';
import useSessionManager from '@/hooks/useSessionManager';
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
import { i18n } from '@/i18n';

interface AuthContextType {
  user: User | null;
  token: string | null;
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
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem('authToken')
  );

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const isAdmin = user?.role === 'admin';
  const isOperator = user?.role === 'admin' || user?.role === 'operator';
  
  const loadProfile = useCallback(async () => {
    try {
      const response = await userApi.getProfile(user!.id ?? null);

      const rawUser = response.data;
      console.log("******************* typeof rawUser.consent:", typeof rawUser.consent, rawUser.consent);

      const userData: User = {
        ...rawUser,
        consent: rawUser.consent,
        // consent: // TODO: why this code? rawUser.consent is JSON or object here ???
        //   typeof rawUser.consent === "string"
        //     ? JSON.parse(rawUser.consent)
        //     : rawUser.consent ?? null,
      };

      setUser(userData);
      setIsAuthenticated(true);

      if (userData.language) {
        i18n.changeLanguage(userData.language);
      }

      return userData;
    } catch (error) {
      logout();
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);
  
  // const loadProfileORIG = useCallback(async () => {
  //   try {
  //     const response = await userApi.getProfile();
  //     const userData: User = {
  //       ...response.data,
  //       consent: response.data.consent
  //         ? JSON.parse(response.data.consent)
  //         : null,
  //     };
  //     setUser(userData);
  //     setIsAuthenticated(true);
  //     return response.data;
  //   } catch (error) {
  //     logout();
  //     throw error;
  //   } finally {
  //     setLoading(false);
  //   }
  // }, []);

  const login = useCallback(
    async (credentials: LoginCredentials) => {
      try {
        //setLoading(true);

        if ('token' in credentials) {
          const newToken = credentials.token;
          setAuthToken(newToken);
          localStorage.setItem('authToken', newToken);
          setToken(newToken);

          const userData = await loadProfile();

          return {
            token: newToken,
            user: userData,
          };
        } else {
          const response = await userApi.login(credentials);

          if (response.data.requiresVerification) {
            //setLoading(false);
            return response.data;
          }

          const newToken = response.data.token;
          setAuthToken(newToken);
          localStorage.setItem('authToken', newToken);
          setToken(newToken);

          setUser(response.data.user);
          setIsAuthenticated(true);
          //setLoading(false);

          return response.data;
        }
      } catch (error: any) {
        logout();
        throw error;
      }
    },
    [loadProfile]
  );

  const logout = useCallback(() => {
    const currentPath = window.location.pathname;
    
    if (!currentPath.startsWith('/unsubscribe')) {
      localStorage.setItem('redirectAfterLogin', currentPath);
    }

    setAuthToken(null);
    localStorage.removeItem('authToken');
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  const register = useCallback(async (data: RegisterData) => {
    const response = await userApi.register(data);
    return response.data;
  }, []);

  const verifyEmail = useCallback(async (data: VerificationData) => {
    const response = await userApi.verifyEmail(data);
    const newToken = response.data.token;

    setAuthToken(newToken);
    localStorage.setItem('authToken', newToken);
    setToken(newToken);

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

  const updateUser = useCallback((updatedUser: User) => {
    setUser(updatedUser);
  }, []);

  // Integrate session manager
  useSessionManager({
    token,
    logout,
  });

  // Boot logic
  useEffect(() => {
    if (token) {
      setAuthToken(token);
      loadProfile();
    } else {
      setLoading(false);
    }
  }, [token, loadProfile]);

  // Unauthorized logic
  useEffect(() => {
    const handleUnauthorized = () => {
      logout();
    };
    window.addEventListener("unauthorized", handleUnauthorized);
    return () => {
      window.removeEventListener("unauthorized", handleUnauthorized);
    };
  }, [logout]);

  const contextValue = useMemo(
    () => ({
      user,
      token,
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
      updateUser,
    }),
    [
      user,
      token,
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
      updateUser,
    ]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthProvider;
