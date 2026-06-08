const User = require('../models/User');
const Job = require('../models/Job');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { sendResetEmail } = require('../services/emailService');

const JWT_SECRET = process.env.JWT_SECRET || 'atsify_jwt_secret_key_2026';

/**
 * Helper to ensure database is seeded if empty
 */
async function ensureSeed() {
  const count = await User.countDocuments();
  if (count === 0) {
    console.log('No users found in database. Auto-seeding default profiles...');
    const student = await User.create({
      username: 'Alex Student',
      email: 'alex.student@example.com',
      password: 'password123',
      role: 'student',
      profileImage: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex'
    });

    const recruiter = await User.create({
      username: 'Sarah Recruiter',
      email: 'sarah.recruiter@example.com',
      password: 'password123',
      role: 'recruiter',
      profileImage: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah'
    });

    const admin = await User.create({
      username: 'Devon Admin',
      email: 'devon.admin@example.com',
      password: 'password123',
      role: 'admin',
      profileImage: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Devon'
    });

    // Also add a sample job
    await Job.create({
      title: 'Full Stack Software Engineer',
      company: 'CloudTech Solutions',
      location: 'Remote',
      salaryRange: '$110,000 - $140,000',
      description: 'We are looking for a Full Stack Software Engineer to join our core product team.',
      requirements: ['React', 'Node.js', 'MongoDB', 'AWS', 'Git'],
      skillsRequired: ['React', 'Node.js', 'MongoDB', 'AWS', 'Git'],
      postedBy: recruiter._id,
      status: 'active'
    });

    console.log('Auto-seeding complete.');
  }
}

/**
 * Get all available mock profiles
 */
const getProfiles = async (req, res) => {
  try {
    await ensureSeed();
    const users = await User.find({}).select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profiles: ' + error.message });
  }
};

/**
 * Get current active user info
 */
const getMe = async (req, res) => {
  try {
    await ensureSeed();
    
    // If request contains req.user set by auth middleware, return it directly
    if (req.user) {
      const userObj = req.user.toObject();
      delete userObj.password;
      return res.json(userObj);
    }

    const userId = req.headers['x-user-id'];
    const role = req.headers['x-user-role'];
    
    let user;
    if (userId) {
      user = await User.findById(userId);
    }
    
    // Fallback if not found or no headers
    if (!user) {
      user = await User.findOne({ role: role || 'student' });
    }
    
    // Last resort fallback
    if (!user) {
      user = await User.findOne({});
    }

    if (!user) {
      return res.status(404).json({ error: 'No user profiles found. Please run seed script.' });
    }

    const userObj = user.toObject();
    delete userObj.password;
    res.json(userObj);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch active profile: ' + error.message });
  }
};

/**
 * User Registration
 */
const register = async (req, res) => {
  try {
    const { username, email, password, role } = req.body;
    
    const trimmedUsername = username?.trim();
    const trimmedEmail = email?.trim();
    
    if (!trimmedUsername || !trimmedEmail || !password || !role) {
      return res.status(400).json({ error: 'Username, email, password, and role are required.' });
    }

    if (!['student', 'recruiter', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid user role selected.' });
    }

    // Email structure validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    // Password length check
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const existingUser = await User.findOne({ $or: [{ email: trimmedEmail.toLowerCase() }, { username: trimmedUsername }] });
    if (existingUser) {
      return res.status(400).json({ error: 'Username or email already exists.' });
    }

    const profileImage = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(trimmedUsername)}`;
    const user = await User.create({
      username: trimmedUsername,
      email: trimmedEmail.toLowerCase(),
      password,
      role,
      profileImage
    });

    res.status(201).json({
      message: 'Registration successful! You can now log in.',
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        profileImage: user.profileImage
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed: ' + error.message });
  }
};

/**
 * User Login
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const trimmedEmail = email?.trim();
    
    if (!trimmedEmail || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    const user = await User.findOne({ email: trimmedEmail.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Set user online
    user.isOnline = true;
    user.lastActiveAt = new Date();
    await user.save();

    // Generate JWT token
    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    // Set JWT token in HTTP-only cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      message: 'Login successful.',
      token,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        profileImage: user.profileImage,
        isOnline: user.isOnline
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Login failed: ' + error.message });
  }
};

/**
 * User Logout
 */
const logout = async (req, res) => {
  try {
    if (req.user) {
      const user = await User.findById(req.user._id);
      if (user) {
        user.isOnline = false;
        user.lastActiveAt = new Date();
        await user.save();
      }
    }
    res.clearCookie('token');
    res.json({ message: 'Logout successful.' });
  } catch (error) {
    res.status(500).json({ error: 'Logout failed: ' + error.message });
  }
};

/**
 * Forgot Password
 */
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const trimmedEmail = email?.trim();

    if (!trimmedEmail) {
      return res.status(400).json({ error: 'Email is required.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    const user = await User.findOne({ email: trimmedEmail.toLowerCase() });
    if (!user) {
      return res.json({ message: 'If a user with that email exists, a password reset link has been sent.' });
    }

    // Generate secure reset token
    const token = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    // Construct reset URL pointing to Vite frontend
    let frontendUrl = `${req.protocol}://${req.get('host')}`;
    if (frontendUrl.includes('localhost:5000') || frontendUrl.includes('127.0.0.1:5000')) {
      frontendUrl = frontendUrl.replace('5000', '3000');
    }
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

    await sendResetEmail(user.email, resetUrl);

    res.json({ message: 'If a user with that email exists, a password reset link has been sent.' });
  } catch (error) {
    res.status(500).json({ error: 'Forgot password request failed: ' + error.message });
  }
};

/**
 * Reset Password
 */
const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: 'Token and new password are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ error: 'Password reset token is invalid or has expired.' });
    }

    // Update password (pre-save hook will hash it)
    user.password = password;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    user.isOnline = false;
    await user.save();

    res.json({ message: 'Password has been reset successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Password reset failed: ' + error.message });
  }
};

/**
 * Update Current User Profile
 */
const updateProfile = async (req, res) => {
  try {
    const { username, email, password, goal } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const trimmedUsername = username?.trim();
    const trimmedEmail = email?.trim();

    if (username !== undefined) {
      if (!trimmedUsername) {
        return res.status(400).json({ error: 'Username cannot be empty.' });
      }
      if (trimmedUsername.length < 3) {
        return res.status(400).json({ error: 'Username must be at least 3 characters long.' });
      }
      user.username = trimmedUsername;
      
      // Auto-update profile image seed if using DiceBear
      if (user.profileImage && user.profileImage.includes('api.dicebear.com')) {
        user.profileImage = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(trimmedUsername)}`;
      }
    }

    if (email !== undefined) {
      if (!trimmedEmail) {
        return res.status(400).json({ error: 'Email cannot be empty.' });
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        return res.status(400).json({ error: 'Please enter a valid email address.' });
      }

      // Check if email taken
      const existingUser = await User.findOne({ email: trimmedEmail.toLowerCase(), _id: { $ne: user._id } });
      if (existingUser) {
        return res.status(400).json({ error: 'Email already in use.' });
      }
      user.email = trimmedEmail.toLowerCase();
    }

    if (goal !== undefined) {
      user.goal = goal?.trim() || '';
    }

    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
      }
      user.password = password;
    }

    await user.save();

    const userObj = user.toObject();
    delete userObj.password;

    res.json({
      message: 'Profile updated successfully.',
      user: userObj
    });
  } catch (error) {
    res.status(500).json({ error: 'Profile update failed: ' + error.message });
  }
};

module.exports = {
  getProfiles,
  getMe,
  register,
  login,
  logout,
  forgotPassword,
  resetPassword,
  updateProfile
};
