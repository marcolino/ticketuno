export interface User {
  id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: 'admin' | 'operator' | 'user';
  isVerified: boolean;
  verificationCode?: string;
  verificationCodeExpiry?: string;
  resetPasswordCode?: string;
  resetPasswordCodeExpiry?: string;
  googleId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NewUser {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: string;
  isVerified: boolean;
  verificationCode?: string;
  verificationCodeExpiry?: string;
  resetPasswordCode?: string;
  resetPasswordCodeExpiry?: string;
  googleId?: string;
}

interface LoginSuccessResponse {
  token: string;
  user: User;
  requiresVerification?: never; // Explicitly exclude
}

interface LoginVerificationRequiredResponse {
  requiresVerification: true;
  email: string;
}

export type LoginResponse =
  | LoginSuccessResponse
  | LoginVerificationRequiredResponse;

interface LoginEmailCredentials {
  email: string;
  password: string;
}

interface LoginOAuthCredentials {
  token: string;
}

export type LoginCredentials =
  | LoginEmailCredentials
  | LoginOAuthCredentials;

export interface RegisterResponse {
  message: string;
  email: string;
  verificationCode?: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface VerificationData {
  email: string;
  code: string;
}

export interface ResendVerificationResponse {
  message: string;
  verificationCode?: string;
}

export interface ForgotPasswordData {
  email: string;
}

export interface ForgotPasswordResponse {
  message: string;
  resetPasswordCode?: string;
  error?: string;
}

export interface ResetPasswordData {
  email: string;
  code: string;
  newPassword: string;
}

export interface ResetPasswordResponse {
  message: string;
  resetPasswordCode?: string;
}

export interface VerifyEmailResponse {
  message?: string;
  token: string;
  user: User;
}

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: 'admin' | 'operator' | 'user';
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
