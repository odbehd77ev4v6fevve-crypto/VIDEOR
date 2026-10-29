import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { WatchHistory } from '../models/WatchHistory';
import { WatchLater } from '../models/WatchLater';
import { Playlist } from '../models/Playlist';
import { signUserToken, requireAuth } from '../middleware/auth';
import { PlatformSettings } from '../models/PlatformSettings';

const router = Router();

// Register new user
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, displayName } = req.body;

    if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || email.trim().length > 254) {
      res.status(400).json({ success: false, error: 'A valid email address is required.' });
      return;
    }

    if (!password || typeof password !== 'string' || password.length < 8) {
      res.status(400).json({ success: false, error: 'Password must be at least 8 characters long.' });
      return;
    }

    if (typeof displayName !== 'string' || displayName.trim().length === 0 || displayName.trim().length > 60) {
      res.status(400).json({ success: false, error: 'Display name is required.' });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const settings = await PlatformSettings.findOne().select('allowRegistration').lean();
    if (settings?.allowRegistration === false) {
      res.status(403).json({ success: false, error: 'New registrations are currently disabled.' });
      return;
    }

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      res.status(409).json({ success: false, error: 'An account with this email already exists.' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      email: normalizedEmail,
      passwordHash,
      displayName: displayName.trim(),
      role: 'user',
      status: 'active',
      preferences: {
        theme: 'dark',
        autoplayNext: true,
        defaultQuality: 'auto',
      },
    });

    const token = signUserToken(newUser);

    res.cookie('vidora_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({
      success: true,
      token,
      user: {
        _id: (newUser._id as any).toString(),
        email: newUser.email,
        displayName: newUser.displayName,
        role: newUser.role,
        avatarUrl: newUser.avatarUrl,
        preferences: newUser.preferences,
        createdAt: newUser.createdAt,
      },
    });
  } catch (err: any) {
    console.error('[Auth Route] Register error:', err);
    if (err?.code === 11000 || err?.name === 'MongoServerError' && err?.message?.includes('duplicate key')) {
      res.status(409).json({ success: false, error: 'An account with this email already exists.' });
      return;
    }
    res.status(500).json({ success: false, error: 'Failed to create account.' });
  }
});

// Login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
      res.status(400).json({ success: false, error: 'Email and password are required.' });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      res.status(401).json({ success: false, error: 'Invalid email or password.' });
      return;
    }

    if (user.status === 'suspended') {
      res.status(403).json({ success: false, error: 'Your account has been suspended.' });
      return;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(401).json({ success: false, error: 'Invalid email or password.' });
      return;
    }

    user.lastLoginAt = new Date();
    await user.save();

    const token = signUserToken(user);

    res.cookie('vidora_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      token,
      user: {
        _id: (user._id as any).toString(),
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        preferences: user.preferences,
        createdAt: user.createdAt,
      },
    });
  } catch (err: any) {
    console.error('[Auth Route] Login error:', err);
    res.status(500).json({ success: false, error: 'Failed to authenticate user.' });
  }
});

// Logout
router.post('/logout', (req: Request, res: Response): void => {
  res.clearCookie('vidora_token');
  res.json({ success: true, message: 'Logged out successfully.' });
});

// Get current user profile and activity stats
router.get('/me', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user!._id).select('-passwordHash');
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found.' });
      return;
    }

    const [historyCount, watchLaterCount, playlistsCount] = await Promise.all([
      WatchHistory.countDocuments({ userId: user._id }),
      WatchLater.countDocuments({ userId: user._id }),
      Playlist.countDocuments({ userId: user._id }),
    ]);

    res.json({
      success: true,
      user: {
        _id: (user._id as any).toString(),
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        status: user.status,
        preferences: user.preferences,
        createdAt: user.createdAt,
        stats: {
          historyCount,
          watchLaterCount,
          playlistsCount,
        },
      },
    });
  } catch (err: any) {
    console.error('[Auth Route] Me error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch user profile.' });
  }
});

// Update profile
router.put('/profile', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { displayName, bio, avatarUrl, preferences } = req.body;
    const user = await User.findById(req.user!._id);
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found.' });
      return;
    }

    if (displayName && typeof displayName === 'string') {
      user.displayName = displayName.trim().slice(0, 60);
    }
    if (typeof bio === 'string') {
      user.bio = bio.trim().slice(0, 300);
    }
    if (typeof avatarUrl === 'string') {
      user.avatarUrl = avatarUrl.trim();
    }
    if (preferences && typeof preferences === 'object' && !Array.isArray(preferences)) {
      const nextPreferences: Record<string, unknown> = {};
      if (['dark', 'cinema'].includes(preferences.theme)) nextPreferences.theme = preferences.theme;
      if (typeof preferences.autoplayNext === 'boolean') nextPreferences.autoplayNext = preferences.autoplayNext;
      if (['auto', '1080p', '720p'].includes(preferences.defaultQuality)) nextPreferences.defaultQuality = preferences.defaultQuality;
      user.preferences = { ...user.preferences, ...nextPreferences } as typeof user.preferences;
    }

    await user.save();

    res.json({
      success: true,
      user: {
        _id: (user._id as any).toString(),
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        preferences: user.preferences,
      },
    });
  } catch (err: any) {
    console.error('[Auth Route] Update profile error:', err);
    res.status(500).json({ success: false, error: 'Failed to update profile.' });
  }
});

// Change Password
router.put('/change-password', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string' || newPassword.length < 8 || newPassword.length > 128) {
      res.status(400).json({ success: false, error: 'New password must be at least 8 characters long.' });
      return;
    }

    const user = await User.findById(req.user!._id);
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found.' });
      return;
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      res.status(401).json({ success: false, error: 'Current password is incorrect.' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ success: true, message: 'Password changed successfully.' });
  } catch (err: any) {
    console.error('[Auth Route] Change password error:', err);
    res.status(500).json({ success: false, error: 'Failed to update password.' });
  }
});

// Forgot Password Request
router.post('/forgot-password', (_req: Request, res: Response): void => {
  res.status(501).json({
    success: false,
    error: 'Password reset is not configured for this deployment.',
    code: 'PASSWORD_RESET_NOT_CONFIGURED',
  });
});

export default router;
