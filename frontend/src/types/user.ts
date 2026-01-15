export interface User {
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

export type LoginSuccessResponse = {
  token: string;
  user: User;
}

export type LoginVerificationRequiredResponse = {
  requiresVerification: true;
  email: string;
}

export type LoginResponse =
  | LoginSuccessResponse
  | LoginVerificationRequiredResponse

export interface LoginCredentials {
  email: string;
  password: string;
}

export type RegisterResponse = {
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

export interface ForgotPasswordData {
  email: string;
}

export interface ResetPasswordData {
  email: string;
  code: string;
  newPassword: string;
}
