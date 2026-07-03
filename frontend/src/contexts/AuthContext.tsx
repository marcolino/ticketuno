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
} from '@ticketuno/shared/types/user';
import { i18n } from '@/i18n';
import { jwtDecode } from 'jwt-decode';

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
  impersonate: (userId: string) => Promise<void>;
  endImpersonation: () => Promise<void>;
  impersonatedBy: string | null;
  isImpersonating: boolean;
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

  // Derived from the JWT: present only when the current token is an
  // admin-impersonation token (carries the originating admin's id).
  const impersonatedBy = useMemo<string | null>(() => {
    if (!token) return null;
    try {
      return jwtDecode<{ impersonatedBy?: string }>(token).impersonatedBy ?? null;
    } catch {
      return null;
    }
  }, [token]);
  const isImpersonating = !!impersonatedBy;
  
  const loadProfile = useCallback(async () => {
    try {
      const response = await userApi.getProfile();

      const rawUser = response.data;
      const userData: User = {
        ...rawUser,
        consent: rawUser.consent, // Ensure consent is already an object/parsed
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
      setLoading(false); // Important!
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

  const logout = useCallback(() => {
    const currentPath = window.location.pathname;
    
    if (!currentPath.startsWith('/unsubscribe')) {
      localStorage.setItem('redirectAfterLogin', currentPath);
    }

    setAuthToken(null);
    localStorage.removeItem('authToken');
    sessionStorage.removeItem('adminToken');
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
  }, []);

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

          const userData = await loadProfile(); // Wait for profile fetch
          return { token: newToken, user: userData };
          
          // setUser(response.data.user);
          // setIsAuthenticated(true);
          // //setLoading(false);

          // return response.data;
        }
      } catch (error) {
        logout();
        throw error;
      }
    },
    [loadProfile]
  );

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

  // Admin "login as user": swap in a short-lived impersonation token, keeping
  // the admin token in sessionStorage so the session can be restored.
  const impersonate = useCallback(async (userId: string) => {
    const response = await userApi.impersonate(userId);
    const impersonationToken = response.data.token;

    const adminToken = localStorage.getItem('authToken');
    if (adminToken) sessionStorage.setItem('adminToken', adminToken);

    setAuthToken(impersonationToken); // sets Authorization header + localStorage
    setToken(impersonationToken);
    await loadProfile();
  }, [loadProfile]);

  const endImpersonation = useCallback(async () => {
    const adminToken = sessionStorage.getItem('adminToken');
    if (!adminToken) return;
    sessionStorage.removeItem('adminToken');
    setAuthToken(adminToken);
    setToken(adminToken);
    await loadProfile();
  }, [loadProfile]);

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
      impersonate,
      endImpersonation,
      impersonatedBy,
      isImpersonating,
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
      impersonate,
      endImpersonation,
      impersonatedBy,
      isImpersonating,
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
