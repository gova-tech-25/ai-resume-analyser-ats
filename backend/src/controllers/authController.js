const User = require('../models/User');
const Job = require('../models/Job');
const jwt = require('jsonwebtoken');

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
    
    if (!username || !email || !password || !role) {
      return res.status(400).json({ error: 'Username, email, password, and role are required.' });
    }

    if (!['student', 'recruiter', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid user role selected.' });
    }

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ error: 'Username or email already exists.' });
    }

    const profileImage = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(username)}`;
    const user = await User.create({
      username,
      email,
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
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await User.findOne({ email });
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
    res.json({ message: 'Logout successful.' });
  } catch (error) {
    res.status(500).json({ error: 'Logout failed: ' + error.message });
  }
};

module.exports = {
  getProfiles,
  getMe,
  register,
  login,
  logout
};
