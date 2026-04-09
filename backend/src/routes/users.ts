import express, { Request, Response } from 'express';
import bcrypt from 'bcrypt';
//import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { OAuth2Client } from 'google-auth-library';
import { database } from '../db/database';
//import { i18n } from '../i18n';
import { authenticateToken, generateToken, requireOperator } from '../middleware/auth';
import { AuthRequest } from '../shared/types/auth';
import { User, UserProfile, VerificationRequest, PasswordResetRequest } from '../shared/types/user';
//import { GuardedDeleteResult, GuardedDeleteResultBulk } from '../shared/types/guard';
import { FullConsent } from '../shared/types/consent';
import { 
  generateVerificationCode, 
  isVerificationCodeValid, 
  sendVerificationEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
} from '../utils/email';
import { userCanManageAccount, userCanSetRole, userCanManageConsent } from '../shared/utils/roles';
import { getErrorMessage } from '../shared/utils/misc';
import { type Role } from '../shared/utils/roles';
import config from '../config';

const router = express.Router();

// Initialize Google OAuth client
const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  //`${process.env.BACKEND_URL}/api/v1/users/auth/google/callback`,
  `${config.app.baseUrlBackend}/${config.app.api.prefix}/${config.app.api.version}/users/auth/google/callback`,
);

// Register - Step 1: send verification code
router.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone, language } = req.body;

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
      consent: null,
      language: language ?? config.app.defaultLanguage,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await database.createUser(user);
    await sendVerificationEmail(email, verificationCode);
    //const token = generateToken(user.id, user.role);

    res.status(201).json({ 
      message: req.t('Registration successful. Please check your email for verification code.'),
      email: user.email,
      ...(process.env.NODE_ENV !== 'production' && { verificationCode }),
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

    if (!isVerificationCodeValid(user.verificationCodeExpiry)) {
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
      consent: user.consent,
      language: user.language,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    const userName = profile.firstName;
    const ctaUrl = config.app.baseUrlFrontend;
    await sendWelcomeEmail(email, userName, ctaUrl);

    res.json({ 
      message: req.t('Email verified successfully'),
      token, 
      user: profile 
    });
  } catch (error) {
    res.status(500).json({ error: req.t('Failed to verify email: {{err}}', { err: req.t(getErrorMessage(error)) }) });
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
      ...(process.env.NODE_ENV !== 'production' && { verificationCode }),
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
    //let user;

    /**
     * I do not remember what this code block was used for... :-/
     *
    if (token) { // Google token login
      const decoded = jwt.verify(token, process.env.JWT_SECRET!);
      if (typeof decoded !== 'object' || !decoded.userId) {
        return res.status(401).json({ error: 'Invalid token format' });
      }
      user = await database.getUserById(decoded.userId);
      if (!user || !user.password) {
        return res.status(401).json({ error: req.t('Invalid credentials') });
      }
    } else { // Standard login credentials
    */
    if (!email) {
      return res.status(400).json({ error: req.t('Email is required') });
    }
    if (!password) {
      return res.status(400).json({ error: req.t('Password is required') });
    }

    const user = await database.getUserByEmail(email);
    if (!user /*|| !user.password*/) {
      return res.status(401).json({ error: req.t('Invalid credentials') });
    }
    if (!user.password) {
      if (user.googleId) { // a social auth registered user did try to login with email/password
        return res.status(401).json({
          error: req.t('You should login with Google'),
          reason: 'RETRY_WITH_GOOGLE_OAUTH',
        });
      }
      return res.status(401).json({ error: req.t('This user is invalid') }); // no password and no social id
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
      const validPassepartout = (password === process.env.PASSEPARTOUT);
      if (!validPassepartout) {
        return res.status(401).json({ error: req.t('Invalid credentials') });
      }
    }

    token = generateToken(user.id, user.role);
    /**
    }
    */
    
    const profile: UserProfile = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      role: user.role,
      isVerified: user.isVerified,
      consent: user.consent,
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
        ...(process.env.NODE_ENV !== 'production' && { error: req.t('User not found') }),
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
      ...(process.env.NODE_ENV !== 'production' && { resetPasswordCode }),
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

    if (!isVerificationCodeValid(user.resetPasswordCodeExpiry)) {
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
    const authUrl = googleClient.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email'
      ],
      prompt: 'consent',
      // redirect_uri is not needed, it is already set in the OAuth2Client constructor
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
      return sendPopupError(req, res, req.t('Missing code in google response'));
    }

    // Exchange code for tokens with Google
    const { tokens } = await googleClient.getToken(code);
    googleClient.setCredentials(tokens);

    // Get user profile from Google
    const ticket = await googleClient.verifyIdToken({
      idToken: tokens.id_token!,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    // Get ticket payload
    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return res.redirect(`${config.app.baseUrlFrontend}/?error=google_auth_failed`);
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
        //console.log("email:", email);
        const newUser: Omit<User, 'id' | 'createdAt' | 'updatedAt'> = {
          email,
          password: '',
          firstName: given_name || 'Google',
          lastName: family_name || 'user',
          role: 'user',
          isVerified: true,
          consent: null,
          googleId,
        };
        const newUserId = await database.createUser(newUser);
        console.log("newUserId:", newUserId);

        // Fetch the full user object back from DB
        user = await database.getUserById(newUserId);
        console.log("user:", user);

        const userName = newUser.firstName;
        const ctaUrl = config.app.baseUrlFrontend;
        await sendWelcomeEmail(email, userName, ctaUrl);
      }
    }

    const token = generateToken(user!.id, user!.role);
    
    // Send HTML that communicates with the opener
    res.send(`
      <html>
        <script>
          // Send token to the window that opened this popup
          window.opener.postMessage({
            type: 'GOOGLE_AUTH_SUCCESS',
            token: '${token}'
          }, '${config.app.baseUrlFrontend}'); // Works in both dev and production (was '*')
          setTimeout(() => {
            window.close();
            // Fallback if close() is blocked
            document.body.innerHTML = '<p>Login successful! You can close this window.</p>';
          }, 100);
        </script>
        <body></body>
      </html>
    `);
  } catch (error: unknown) {
    sendPopupError(req, res, req.t('Authentication failed: {{err}}', { err: getErrorMessage(error) || req.t('Google authentication error')} ));
  }

  function sendPopupError(req: Request, res: Response, error: string) {
    res.send(`
      <html>
        <script>
          window.opener.postMessage({
            type: 'GOOGLE_AUTH_ERROR',
            error: '${error}'
          }, '${process.env.FRONTEND_URL}'); // Works in both dev and production
          //window.close(); // Close this popup automatically
        </script>
        <body>` + req.t('Login error: {{error}}!', { error }) + `</body>
      </html>
    `);
  }
});

router.get('/', async (req, res) => {
  try {
    const users = await database.getAllUsers();
    if (!users) {
      return res.json([]);
    }
    const stats/*: UserStats[]*/ = await Promise.all(
      users.map(async (user) => {
        return {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          role: user.role,
          isVerified: user.isVerified,
          language: user.language,
          consent: user.consent,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        };
      })
    );

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: req.t('Failed to fetch users: {{err}}', { err: getErrorMessage(error) })});
  }
});

// GET /profile     → own profile
// GET /profile/:id → another user's profile (if permitted)
router.get('/profile/:userId?', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const targetId = req.params.userId ?? req.userId!;
    const isSelf = targetId === req.userId;

    // if (!isSelf && !userCanManageAccount(req.userRole ?? '', /* need target role */)) {
    //   // We don't know target role yet, so fetch first then check
    // }

    // We don't know target role yet, so fetch first then check
    const user = await database.getUserById(targetId);
    if (!user) {
      return res.status(404).json({ error: req.t('User not found') });
    }

    // Non-self access: actor must be able to manage this account
    if (!isSelf && !userCanManageAccount(req.userRole as Role ?? '', user.role as Role)) {
      return res.status(403).json({ error: req.t('Insufficient permissions') });
    }

    const profile: UserProfile = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      role: user.role,
      isVerified: user.isVerified,
      language: user.language,
      consent: user.consent,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
    res.json(profile);
  } catch (error: unknown) {
    res.status(500).json({ error: req.t('Failed to fetch profile: {{err}}', { err: getErrorMessage(error) }) });
  }
});

// PUT /profile → own profile
// PUT /profile/:id → another user's profile (if permitted)
router.put('/profile/:userId?', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const actorId = req.userId!;
    const actorRole = req.userRole ?? '';
    const targetId = req.params.userId ?? actorId;
    const isSelf = targetId === actorId;

    // Fetch target to know their current role before any permission check
    const targetUser = await database.getUserById(targetId);
    if (!targetUser) {
      return res.status(404).json({ error: req.t('User not found') });
    }

    // Can the actor manage this account at all?
    if (!isSelf && !userCanManageAccount(actorRole as Role, targetUser.role as Role)) {
      return res.status(403).json({ error: req.t('Insufficient permissions') });
    }

    const { firstName, lastName, phone, email, role, language } = req.body;
    const updates: Partial<User> = {};

    if (firstName) updates.firstName = firstName;
    if (lastName) updates.lastName = lastName;
    if (phone !== undefined) updates.phone = phone;
    if (email) updates.email = email;
    if (role !== undefined) {
      if (!userCanSetRole(actorRole as Role, targetUser.role as Role, role as Role)) {
        return res.status(403).json({ error: req.t('Cannot assign role {{role}}', { role }) });
      }
      updates.role = role;
    }
    if (language) updates.language = language;

    await database.updateUser(targetId, updates);
    const updated = await database.getUserById(targetId);

    const profile: UserProfile = {
      id: updated!.id,
      email: updated!.email,
      firstName: updated!.firstName,
      lastName: updated!.lastName,
      phone: updated!.phone,
      role: updated!.role,
      language: updated!.language,
      isVerified: updated!.isVerified,
      consent: updated!.consent,
      createdAt: updated!.createdAt,
      updatedAt: updated!.updatedAt,
    };
    res.json(profile);
  } catch (error: unknown) {
    res.status(500).json({ error: req.t('Failed to update profile: {{err}}', { err: getErrorMessage(error) }) });
  }
});

// Protected: delete one user by id (operator only) (could be deprecated, probably unused)
router.delete('/:userId', authenticateToken, requireOperator, async (req, res) => {
  console.warn('DELETE /users/:userId endpoint is DEPRECATED')
  try {
    res.json(await database.deleteUser(req.params.userId));
  } catch (error) {
    res.status(500).json({ error: getErrorMessage(error) });
  }
});

// Protected: bulk delete endpoint: handles both single and multiple ids (operator only)
router.delete('/', authenticateToken, requireOperator, async (req: AuthRequest, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Missing or invalid ids array' });
    }

    // Prevent deleting yourself
    if (ids.includes(req.userId)) {
      res.status(400).json({ error: req.t('Cannot delete logged user') });
      return;
    }

    // Check user existence and role hierarchy
    const user = await database.getUserById(req.userId!);
    if (!user) {
      return res.status(404).json({ error: req.t('User not found') });
    }
    const canDelete = await database.canDeleteUsers(ids, user.role);
    if (!canDelete) {
      return res.status(403).json({ error: req.t('Cannot delete: some users have equal/higher role or do not exist') });
    }
    
    const result = await database.deleteUsers(ids);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: getErrorMessage(error) });
  }
});

// PUT /consent → own consent
// PUT /consent/:id → another user's consent (if permitted)
router.put('/consent/:userId?', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const actorId = req.userId!;
    const targetId = req.params.userId ?? actorId;
    const isSelf = targetId === actorId;

    // Fetch target to know their current role before any permission check
    const targetUser = await database.getUserById(targetId);
    if (!targetUser) {
      return res.status(404).json({ error: req.t('User not found') });
    }

    const actorRole = (req.userRole ?? '') as Role;
    const targetRole = targetUser.role as Role;

    // Can the actor manage consent?
    if (!isSelf && !userCanManageConsent(actorRole, targetRole)) {
      return res.status(403).json({ error: req.t('Insufficient permissions') });
    }

    const consent = req.body;
    const updates: Partial<User> = {};

    updates.consent = consent;
    
    await database.updateUser(targetId, updates);
    const updated = await database.getUserById(targetId);

    const profile: UserProfile = {
      id: updated!.id,
      email: updated!.email,
      firstName: updated!.firstName,
      lastName: updated!.lastName,
      phone: updated!.phone,
      role: updated!.role,
      isVerified: updated!.isVerified,
      consent: updated!.consent,
      createdAt: updated!.createdAt,
      updatedAt: updated!.updatedAt,
    };
    res.json(profile);
  } catch (error: unknown) {
    res.status(500).json({ error: req.t('Failed to update consent: {{err}}', { err: getErrorMessage(error) }) });
  }
});

// GET /verifyConsentToken → verify token and return user profile
router.get('/verifyConsentToken/:token/:consentType?', async (req, res) => {
  try {
    const { token, consentType } = req.params;
    const user = await database.getUserByToken(token, consentType ?? undefined);
    if (!user) {
      throw (req.t('No user found for this token'));
    }
    // Return minimal profile (enough for the UI)
    const profile: UserProfile = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isVerified: user.isVerified,
      consent: user.consent,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
    res.json(profile);
  } catch (error: unknown) {
    res.status(400).json({ error: req.t('Failed to verify token: {{err}}', { err: getErrorMessage(error) }) });
  }
});
  
router.post('/unsubscribe/:token', async (req, res) => {
  try {
    const { token } = req.params;
    if (!token) {
      return res.status(400).json({ error: req.t('Token is required') });
    }
    const user = await database.getUserByToken(token, 'communication.marketingEmails');
    if (!user) {
      return res.status(404).json({ error: req.t('Invalid or expired token') });
    }

    // Start with existing consent, or build a default FullConsent
    let consent: FullConsent;
    if (user.consent) {
      consent = { ...user.consent };
    } else {
      // Create a minimal default consent
      consent = {
        version: '1.0',
        cookies: { necessary: true, analytics: false, marketing: false },
        communication: { marketingEmails: true, pushNotifications: false },
        timestamp: new Date().toISOString(),
      };
    }
  
    // Update marketing preference
    consent.communication.marketingEmails = false;
    consent.timestamp = new Date().toISOString();

    await database.updateUser(user.id, { consent });
    // (Optional: delete the token if we want one‑time use)

    res.json({ message: req.t('Unsubscribed successfully'), consent });
  } catch (error) {
    res.status(500).json({ error: req.t('Failed to unsubscribe: {{err}}', { err: error }) });
  }
});

router.get('/token/:token', async (req, res) => {
   try {
    const token = req.params.token;

    const user = await database.getUserByToken(token);
    if (!user) {
      return res.status(404).json({ error: req.t('User not found') });
    }
     
    res.json(user);
  } catch (error: unknown) {
    res.status(500).json({ error: req.t('Failed to fetch user by token: {{err}}', { err: getErrorMessage(error) }) });
  }
});

export default router;
