import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User';
import { generateToken, AuthRequest } from '../middleware/auth';

const router: Router = Router();

// Register
router.post('/register', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { email, password, fullName } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({ error: 'Email already registered' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      email,
      password: hashedPassword,
      fullName,
    });

    await user.save();

    const token = generateToken(user._id.toString(), user.isAdmin);

    res.status(201).json({
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        isAdmin: user.isAdmin,
      },
      token,
    });
  } catch (error) {
    res.status(400).json({ error: 'Failed to register user' });
  }
});

// Login
router.post('/login', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = generateToken(user._id.toString(), user.isAdmin);

    res.json({
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        isAdmin: user.isAdmin,
      },
      token,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to login' });
  }
});

// Logout
router.post('/logout', async (_req: AuthRequest, res: Response): Promise<void> => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
});

export default router;
