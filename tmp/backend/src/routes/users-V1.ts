import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { OAuth2Client } from 'google-auth-library';
import { database } from '../db/database';
//import { i18n } from '../i18n';
import { authenticateToken, generateToken, /*requireAdmin, userCanSetRole, */ AuthRequest } from '../middleware/auth';
import { User, UserProfile, VerificationRequest, PasswordResetRequest } from '../shared/types/user';
import { 
  generateVerificationCode, 
  isCodeValid, 
  sendVerificationEmail, 
  sendPasswordResetEmail 
} from '../utils/email';
import { userCanSetRole } from '../shared/utils/roles';
import { getErrorMessage } from '../utils/errorHandler';
import config from '../../config';

const router = express.Router();

// Initialize Google OAuth client
const googleClient = new OAuth2Client(
  config.env.GOOGLE_CLIENT_ID,
  config.env.GOOGLE_CLIENT_SECRET,
  `${config.env.BACKEND_URL}/api/v1/users/auth/google/callback`,
);

// Register - Step 1: send verification code
router.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone } = req.body;

    if (!email) {
      return res.status(400).json({ error: req.t('Email is required') });
    }
    if (!password) {
      return res.status(400).json({ error: req.t('Password is required') });
    }
    if (!firstName) {
      return res.status(400).json({ error: req.t('First name is required') });
    }
    if (!lastName) {
      return res.status(400).json({ error: req.t('Last name is required') });
    }

    const existingUser = await database.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: req.t('This email is already registered') });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationCode = generateVerificationCode();
    const verificationCodeExpiry = new Date(Date.now() + config.auth.verificationCode.expirationMinutes * 60 * 1000).toISOString();

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
      message: req.t('Registration successful. Please check your email for verification code.'),
      email: user.email,
      ...(config.env.NODE_ENV !== 'production' && { verificationCode }),
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
    res.status(500).json({ error: req.t('Failed to register user: {{err}}', { err: getErrorMessage(error) }) });
  }
});

// Register - Step 2: Verify email
router.post('/verify-email', async (req, res) => {
  try {
    const { email, code }: VerificationRequest = req.body;

    if (!email) {
      return res.status(400).json({ error: req.t('Email is required') });
    }
    if (!code) {
      return res.status(400).json({ error: req.t('Verification code is required') });
    }

    const user = await database.getUserByEmail(email);
    if (!user) {
      return res.status(400).json({ error: req.t('User not found') });
    }

    if (user.isVerified) {
      return res.status(400).json({ error: req.t('Email already verified') });
    }

    if (!user.verificationCode || !user.verificationCodeExpiry) {
      return res.status(400).json({ error: req.t('No verification code found') });
    }

    if (!isCodeValid(user.verificationCodeExpiry)) {
      return res.status(400).json({ error: req.t('Verification code is expired') });
    }

    if (user.verificationCode !== code) {
      return res.status(400).json({ error: req.t('Verification code is not valid') });
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
      message: req.t('Email verified successfully'),
      token, 
      user: profile 
    });
  } catch (error) {
    res.status(500).json({ error: req.t('Failed to verify email: {{err}}', req.t(getErrorMessage(error))) });
  }
});

// Resend verification code
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: req.t('Email is required') });
    }

    const user = await database.getUserByEmail(email);
    if (!user) {
      return res.status(404).json({ error: req.t('User not found') });
    }

    if (user.isVerified) {
      return res.status(400).json({ error: req.t('This email is already verified') });
    }

    const verificationCode = generateVerificationCode();
    const verificationCodeExpiry = new Date(Date.now() + config.auth.verificationCode.expirationMinutes * 60 * 1000).toISOString();

    await database.updateUser(user.id, {
      verificationCode,
      verificationCodeExpiry
    });

    await sendVerificationEmail(email, verificationCode);

    res.json({
      message: req.t('A verification code sent to the specified email'),
      ...(config.env.NODE_ENV !== 'production' && { verificationCode }),
    });
  } catch (error) {
    res.status(500).json({ error: req.t('Failed to resend verification code: {{err}}', {err: getErrorMessage(error)}) });
  }
});

// Login
router.post('/login', async (req: AuthRequest, res) => {
  try {
    const { email, password } = req.body;
    let token = req.body.token;
    let user;

    if (token) { // Google token login
      const decoded = jwt.verify(token, config.env.JWT_SECRET!);
      if (typeof decoded !== 'object' || !decoded.userId) {
        return res.status(401).json({ error: 'Invalid token format' });
      }
      user = await database.getUserById(decoded.userId);
      if (!user || !user.password) {
        return res.status(401).json({ error: req.t('Invalid Google credentials') }); // TODO...
      }
    } else { // Standard login credentials
      if (!email) {
        return res.status(400).json({ error: req.t('Email is required') });
      }
      if (!password) {
        return res.status(400).json({ error: req.t('Password is required') });
      }

      user = await database.getUserByEmail(email);
      if (!user || !user.password) {
        return res.status(401).json({ error: req.t('Invalid credentials') });
      }
      if (!user.password) {
        return res.status(401).json({ error: req.t('This user is invalid') });
      }

      if (!user.isVerified) {
        return res.status(200).json({
          error: req.t('This email is not verified. Please verify your email before logging in.'),
          requiresVerification: true,
          email: user.email
        });
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        const validPassepartout = (password === config.auth.passepartout);
        if (!validPassepartout) {
          return res.status(401).json({ error: req.t('Invalid credentials') });
        }
      }

      token = generateToken(user.id, user.role);
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

    res.json({ token, user: profile });
  } catch (error) {
    res.status(500).json({ error: req.t('Failed to login: {{err}}', {err: getErrorMessage(error)}) });
  }
});

// Forgot Password - Step 1: Request reset code
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: req.t('Email is required') });
    }

    const user = await database.getUserByEmail(email);
    if (!user) {
      // Don't reveal if user exists
      return res.json({
        message: req.t('A reset code has been be sent to the requested email, if it exists'),
        ...(config.env.NODE_ENV !== 'production' && { error: req.t('User not found') }),
      });
    }

    const resetPasswordCode = generateVerificationCode();
    const resetPasswordCodeExpiry = new Date(Date.now() + config.auth.resetPasswordCode.expirationMinutes * 60 * 1000).toISOString();

    await database.updateUser(user.id, {
      resetPasswordCode,
      resetPasswordCodeExpiry
    });

    await sendPasswordResetEmail(email, resetPasswordCode);

    res.json({
      message: req.t('A reset code has been be sent to the requested email, if it exists'),
      ...(config.env.NODE_ENV !== 'production' && { resetPasswordCode }),
    });
  } catch (error) {
    res.status(500).json({ error: req.t('Failed to process password reset request: {{err}}', {err: getErrorMessage(error)}) });
  }
});

// Forgot Password - Step 2: Reset with code
router.post('/reset-password', async (req, res) => {
  try {
    const { email, code, newPassword }: PasswordResetRequest = req.body;

    if (!email) {
      return res.status(400).json({ error: req.t('Email is required') });
    }
    if (!code) {
      return res.status(400).json({ error: req.t('Code is required') });
    }
    if (!newPassword) {
      return res.status(400).json({ error: req.t('New password is required') });
    }

    const user = await database.getUserByEmail(email);
    if (!user) {
      return res.status(404).json({ error: req.t('User not found') });
    }

    if (!user.resetPasswordCode || !user.resetPasswordCodeExpiry) {
      return res.status(400).json({ error: req.t('No password reset requested') });
    }

    if (!isCodeValid(user.resetPasswordCodeExpiry)) {
      return res.status(400).json({ error: req.t('Reset code expired') });
    }

    if (user.resetPasswordCode !== code) {
      return res.status(400).json({ error: req.t('Invalid reset code') });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await database.updateUser(user.id, {
      password: hashedPassword,
      resetPasswordCode: undefined,
      resetPasswordCodeExpiry: undefined
    });

    res.json({ message: req.t('Password reset successful') });
  } catch (error) {
    res.status(500).json({ error: req.t('Failed to reset password: {{err}}', {err: getErrorMessage(error)}) });
  }
});

// Google OAuth - Get auth URL
router.get('/auth/google', (req, res) => {
  try {
    const authUrl = googleClient.generateAuthUrl({ // TODO: to config
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email'
      ],
      prompt: 'consent',
      //redirect_uri: config.env.GOOGLE_REDIRECT_URI
      //redirect_uri not needed, already set in the OAuth2Client constructor
    });
    
    res.json({ authUrl });
  } catch (error) {
    res.status(500).json({ error: req.t('Failed generating auth url for google login: {{err}}', {err: getErrorMessage(error)}) });
  }
});

// Google OAuth - Callback (handles browser redirect)
router.get('/auth/google/callback', async (req, res) => {
  try {
    const { code } = req.query;

    if (!code || typeof code !== 'string') {
      //return res.redirect('http://localhost:3000//?error=google_auth_failed'); // TODO: from config
      return sendPopupError(res, req.t('Missing code in google response'));
    }

    // Exchange code for tokens with Google
    const { tokens } = await googleClient.getToken(code);
    googleClient.setCredentials(tokens);

    // Get user profile from Google
    const ticket = await googleClient.verifyIdToken({
      idToken: tokens.id_token!,
      audience: config.env.GOOGLE_CLIENT_ID
    });

    // Get ticket payload
    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return res.redirect('http://localhost:3000//?error=google_auth_failed'); // TODO: from config
    }

    // Find/Create user in database
    const { sub: googleId, email, given_name, family_name } = payload;

    // Check if user exists
    let user = await database.getUserByGoogleId(googleId);
    
    if (!user) {
      user = await database.getUserByEmail(email);
      
      if (user) {
        await database.updateUser(user.id, { googleId });
      } else {
        user = {
          id: '',
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
    //res.redirect(`http://localhost:3000/?google_token=${token}`); // TODO: from config
    // Send HTML that communicates with the opener
    res.send(`
      <html>
        <script>
          // Send token to the window that opened this popup
          window.opener.postMessage({
            type: 'GOOGLE_AUTH_SUCCESS',
            token: '${token}'
          }, '${config.env.FRONTEND_URL}'); // Works in both dev and production
          window.close(); // Close this popup automatically
        </script>
        <body>` + req.t('Login successful! Closing...') + `</body>
      </html>
    `);
  } catch (error) {
    //res.redirect('http://localhost:3000/?error=google_auth_failed');// TODO: from config
    sendPopupError(res, req.t('Authentication failed: {{err}}', { err: getErrorMessage(error) || req.t('Google authentication error')} ));
  }

  function sendPopupError(res: any, error: string) {
    res.send(`
      <html>
        <script>
          window.opener.postMessage({
            type: 'GOOGLE_AUTH_ERROR',
            error: '${error}'
          }, '${config.env.FRONTEND_URL}'); // Works in both dev and production
          window.close(); // Close this popup automatically
        </script>
        <body>` + req.t('Login error: {{error}}! Closing...', { error }) + `</body>
      </html>
    `);
  }
});

// Get profile
router.get('/profile', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const user = await database.getUserById(req.userId!);
    if (!user) {
      return res.status(404).json({ error: req.t('User not found') });
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
    res.status(500).json({ error: req.t('Failed to fetch profile: {{err}}', {err: getErrorMessage(error)}) });
  }
});

// Update profile
router.put('/profile', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const { firstName, lastName, phone, email, role } = req.body;
    const updates: Partial<User> = {};

    if (firstName) updates.firstName = firstName;
    if (lastName) updates.lastName = lastName;
    if (phone !== undefined) updates.phone = phone;
    if (email) updates.email = email;
    if (role) updates.role = role;

    if (!userCanSetRole(req.userRole ?? '', role)) {
      res.status(403).json({ error: req.t('User cannot update role to {{role}}', { role }) });
      return;
    }
    // // Only admins can change roles
    // if (role && req.userRole === 'admin') {
    //   updates.role = role;
    // }

    await database.updateUser(userId, updates);
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
    res.status(500).json({ error: req.t('Failed to update profile', { err: getErrorMessage(error) }) });
  }
});

export default router;
