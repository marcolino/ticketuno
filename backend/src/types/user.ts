export interface User {
  id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: 'admin' | 'user';
  isVerified: boolean;
  verificationCode?: string;
  verificationCodeExpiry?: string;
  resetPasswordCode?: string;
  resetPasswordCodeExpiry?: string;
  googleId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: 'admin' | 'user';
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VerificationRequest {
  email: string;
  code: string;
}

export interface PasswordResetRequest {
  email: string;
  code: string;
  newPassword: string;
}
