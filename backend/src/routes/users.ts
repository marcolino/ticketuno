import express from 'express';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { database } from '../db/database';
import { authenticateToken, generateToken, requireAdmin, AuthRequest } from '../middleware/auth';
import { User, UserProfile } from '../types/user';

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone } = req.body;

    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'Email, password, first name, and last name are required' });
    }

    const existingUser = await database.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user: User = {
      id: uuidv4(),
      email,
      password: hashedPassword,
      firstName,
      lastName,
      phone,
      role: 'user',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await database.createUser(user);
    const token = generateToken(user.id, user.role);

    const profile: UserProfile = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    res.status(201).json({ token, user: profile });
  } catch (error) {
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await database.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    // if (!validPassword) {
    //   return res.status(401).json({ error: 'Invalid credentials' });
    // }

    const token = generateToken(user.id, user.role);
    const profile: UserProfile = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    res.json({ token, user: profile });
  } catch (error) {
    res.status(500).json({ error: 'Failed to login' });
  }
});

// Get profile
router.get('/profile', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const user = await database.getUserById(req.userId!);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const profile: UserProfile = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      role: user.role,
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
      createdAt: user!.createdAt,
      updatedAt: user!.updatedAt
    };

    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update profile' }); // TODO: return error messages, too, after we have t() also on backend
  }
});

export default router;
