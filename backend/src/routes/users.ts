import express from 'express';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { OAuth2Client } from 'google-auth-library';
import { database } from '../db/database';
import { i18next } from '../i18n';
import { authenticateToken, generateToken, requireAdmin, AuthRequest } from '../middleware/auth';
import { User, UserProfile, VerificationRequest, PasswordResetRequest } from '../types/user';
import { 
  generateVerificationCode, 
  isCodeValid, 
  sendVerificationEmail, 
  sendPasswordResetEmail 
} from '../utils/email';
import { getErrorMessage } from '../utils/errorHandler';
import config from '../config';

const router = express.Router();

// Initialize Google OAuth client
const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/users/auth/google/callback', // TODO: to config
);

// Register - Step 1: send verification code
router.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone } = req.body;

    if (!email) {
      return res.status(400).json({ error: i18next.t('Email is required') });
    }
    if (!password) {
      return res.status(400).json({ error: i18next.t('Password is required') });
    }
    if (!firstName) {
      return res.status(400).json({ error: i18next.t('First name is required') });
    }
    if (!lastName) {
      return res.status(400).json({ error: i18next.t('Last name is required') });
    }

    const existingUser = await database.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationCode = generateVerificationCode();
    const verificationCodeExpiry = new Date(Date.now() + config.app.auth.verificationCode.expirationMinutes * 60 * 1000).toISOString();

    const user: User = {
      id: uuidv4(),
      email,
      password: hashedPassword,
      firstName,
      lastName,
      phone,
      role: 'user',
      isVerified: false,
      verificationCode,
      verificationCodeExpiry,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await database.createUser(user);
    await sendVerificationEmail(email, verificationCode);
    //const token = generateToken(user.id, user.role);

    res.status(201).json({ 
      message: i18next.t('Registration successful. Please check your email for verification code.'),
      email: user.email,
      ...(config.nodeEnv !== 'production' && { verificationCode }),
    });
    
    // const profile: UserProfile = {
    //   id: user.id,
    //   email: user.email,
    //   firstName: user.firstName,
    //   lastName: user.lastName,
    //   phone: user.phone,
    //   role: user.role,
    //   createdAt: user.createdAt,
    //   updatedAt: user.updatedAt
    // };

    // res.status(201).json({ token, user: profile });
  } catch (error) {
    res.status(500).json({ error: i18next.t('Failed to register user: {{err}}', { err: getErrorMessage(error) }) });
  }
});

// Register - Step 2: Verify email
router.post('/verify-email', async (req, res) => {
  try {
    const { email, code }: VerificationRequest = req.body;

    if (!email) {
      return res.status(400).json({ error: i18next.t('Email is required') });
    }
    if (!code) {
      return res.status(400).json({ error: i18next.t('Verification code is required') });
    }

    const user = await database.getUserByEmail(email);
    if (!user) {
      return res.status(404).json({ error: i18next.t('User not found') });
    }

    if (user.isVerified) {
      return res.status(400).json({ error: i18next.t('Email already verified') });
    }

    if (!user.verificationCode || !user.verificationCodeExpiry) {
      return res.status(400).json({ error: i18next.t('No verification code found') });
    }

    if (!isCodeValid(user.verificationCodeExpiry)) {
      return res.status(400).json({ error: i18next.t('Verification code is expired') });
    }

    if (user.verificationCode !== code) {
      return res.status(400).json({ error: i18next.t('Verification code is not valid') });
    }

    // Verify user
    await database.updateUser(user.id, {
      isVerified: true,
      verificationCode: undefined,
      verificationCodeExpiry: undefined
    });

    const token = generateToken(user.id, user.role);
    const profile: UserProfile = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      role: user.role,
      isVerified: true,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    res.json({ 
      message: i18next.t('Email verified successfully'),
      token, 
      user: profile 
    });
  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({ error: i18next.t('Failed to verify email: {{err}}', i18next.t(getErrorMessage(error))) });
  }
});

// Resend verification code
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: i18next.t('Email is required') });
    }

    const user = await database.getUserByEmail(email);
    if (!user) {
      return res.status(404).json({ error: i18next.t('User not found') });
    }

    if (user.isVerified) {
      return res.status(400).json({ error: i18next.t('This email is already verified') });
    }

    const verificationCode = generateVerificationCode();
    const verificationCodeExpiry = new Date(Date.now() + config.app.auth.verificationCode.expirationMinutes * 60 * 1000).toISOString();

    await database.updateUser(user.id, {
      verificationCode,
      verificationCodeExpiry
    });

    await sendVerificationEmail(email, verificationCode);

    res.json({ message: i18next.t('A verification code sent to the specified email') });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ error: i18next.t('Failed to resend verification code: {{err}}', {err: getErrorMessage(error)}) });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email) {
      return res.status(400).json({ error: i18next.t('Email is required') });
    }
    if (!password) {
      return res.status(400).json({ error: i18next.t('Password is required') });
    }

    const user = await database.getUserByEmail(email);
    if (!user || !user.password) {
      return res.status(401).json({ error: i18next.t('Invalid credentials') });
    }
    if (!user.password) {
      return res.status(401).json({ error: i18next.t('This user is invalid') });
    }

    if (!user.isVerified) {
      return res.status(200).json({ 
        error: i18next.t('This email is not verified. Please verify your email before logging in.'),
        requiresVerification: true,
        email: user.email
      });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      const validPassepartout = await bcrypt.compare(password, config.app.auth.passepartout);
      if (!validPassepartout) {
        return res.status(401).json({ error: i18next.t('Invalid credentials') });
      }
    }

    const token = generateToken(user.id, user.role);
    const profile: UserProfile = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      role: user.role,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    res.json({ token, user: profile });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: i18next.t('Failed to login: {{err}}', {err: getErrorMessage(error)}) });
  }
});

// Forgot Password - Step 1: Request reset code
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: i18next.t('Email is required') });
    }

    const user = await database.getUserByEmail(email);
    if (!user) {
      // Don't reveal if user exists
      return res.json({ message: i18next.t('A reset code has been be sent to the requested email, if it exists') });
    }

    const resetCode = generateVerificationCode();
    const resetCodeExpiry = new Date(Date.now() + config.app.auth.passwordResetCode.expirationMinutes * 60 * 1000).toISOString();

    await database.updateUser(user.id, {
      resetPasswordCode: resetCode,
      resetPasswordCodeExpiry: resetCodeExpiry
    });

    await sendPasswordResetEmail(email, resetCode);

    res.json({ message: i18next.t('A reset code has been be sent to the requested email, if it exists') });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process password reset request' });
  }
});

// Forgot Password - Step 2: Reset with code
router.post('/reset-password', async (req, res) => {
  try {
    const { email, code, newPassword }: PasswordResetRequest = req.body;

    if (!email) {
      return res.status(400).json({ error: i18next.t('Email is required') });
    }
    if (!code) {
      return res.status(400).json({ error: i18next.t('Code is required') });
    }
    if (!newPassword) {
      return res.status(400).json({ error: i18next.t('New password is required') });
    }

    const user = await database.getUserByEmail(email);
    if (!user) {
      return res.status(404).json({ error: i18next.t('User not found') });
    }

    if (!user.resetPasswordCode || !user.resetPasswordCodeExpiry) {
      return res.status(400).json({ error: i18next.t('No password reset requested') });
    }

    if (!isCodeValid(user.resetPasswordCodeExpiry)) {
      return res.status(400).json({ error: i18next.t('Reset code expired') });
    }

    if (user.resetPasswordCode !== code) {
      return res.status(400).json({ error: i18next.t('Invalid reset code') });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await database.updateUser(user.id, {
      password: hashedPassword,
      resetPasswordCode: undefined,
      resetPasswordCodeExpiry: undefined
    });

    res.json({ message: i18next.t('Password reset successful') });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: i18next.t('Failed to reset password: {{err}}', {err: getErrorMessage(error)}) });
  }
});

// Google OAuth - Get auth URL
router.get('/auth/google', (req, res) => {
  const authUrl = googleClient.generateAuthUrl({ // TODO: to config
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email'
    ],
    prompt: 'consent',
    redirect_uri: process.env.GOOGLE_REDIRECT_URI
  });
  
  res.json({ authUrl });
});

// Google OAuth - Callback (handles browser redirect)
router.get('/auth/google/callback', async (req, res) => {
  try {
    const { code } = req.query;

    if (!code || typeof code !== 'string') {
      return res.redirect('/?error=google_auth_failed');
    }

    const { tokens } = await googleClient.getToken(code);
    googleClient.setCredentials(tokens);

    const ticket = await googleClient.verifyIdToken({
      idToken: tokens.id_token!,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return res.redirect('/?error=google_auth_failed');
    }

    const { sub: googleId, email, given_name, family_name } = payload;

    // Check if user exists
    let user = await database.getUserByGoogleId(googleId);
    
    if (!user) {
      user = await database.getUserByEmail(email);
      
      if (user) {
        await database.updateUser(user.id, { googleId });
      } else {
        user = {
          id: uuidv4(),
          email,
          password: '',
          firstName: given_name || 'Google',
          lastName: family_name || 'User',
          role: 'user',
          isVerified: true,
          googleId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        await database.createUser(user);
      }
    }

    const token = generateToken(user.id, user.role);
    
    // Redirect to frontend with token
    res.redirect(`/?google_token=${token}`);
  } catch (error) {
    console.error('Google OAuth error:', error);
    res.redirect('/?error=google_auth_failed');
  }
});

// Get profile
router.get('/profile', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const user = await database.getUserById(req.userId!);
    if (!user) {
      return res.status(404).json({ error: i18next.t('User not found') });
    }

    const profile: UserProfile = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      role: user.role,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update profile
router.put('/profile', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { firstName, lastName, phone, email, role } = req.body;
    const updates: Partial<User> = {};

    if (firstName) updates.firstName = firstName;
    if (lastName) updates.lastName = lastName;
    if (phone !== undefined) updates.phone = phone;
    if (email) updates.email = email;

    // Only admins can change roles
    if (role && req.userRole === 'admin') {
      updates.role = role;
    }

    await database.updateUser(req.userId!, updates);
    const user = await database.getUserById(req.userId!);

    const profile: UserProfile = {
      id: user!.id,
      email: user!.email,
      firstName: user!.firstName,
      lastName: user!.lastName,
      phone: user!.phone,
      role: user!.role,
      isVerified: user!.isVerified,
      createdAt: user!.createdAt,
      updatedAt: user!.updatedAt
    };

    res.json(profile);
  } catch (error) {
    console.error('Failed to update profile:', error);
    res.status(500).json({ error: i18next.t('Failed to update profile', { err: getErrorMessage(error) }) });
  }
});

export default router;
