const User = require('../models/User');
const Resume = require('../models/Resume');
const Job = require('../models/Job');
const Application = require('../models/Application');
const ATSReport = require('../models/ATSReport');

/**
 * Get all users for admin management
 */
const getUsers = async (req, res) => {
  try {
    const users = await User.find({}).sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users: ' + error.message });
  }
};

/**
 * Remove/delete a user account
 */
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Prevent admin from deleting themselves (if user ids match)
    if (id === req.user._id.toString()) {
      return res.status(400).json({ error: 'Admins cannot delete their own accounts.' });
    }

    const user = await User.findByIdAndDelete(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Clean up related documents cascadingly
    // 1. Delete Student-related records
    const resumes = await Resume.find({ user: id });
    const resumeIds = resumes.map(r => r._id);
    await ATSReport.deleteMany({ resume: { $in: resumeIds } });
    await Resume.deleteMany({ user: id });
    await Application.deleteMany({ student: id });

    // 2. Delete Recruiter-related records
    const jobs = await Job.find({ postedBy: id });
    const jobIds = jobs.map(j => j._id);
    await Application.deleteMany({ job: { $in: jobIds } });
    await ATSReport.deleteMany({ job: { $in: jobIds } });
    await Job.deleteMany({ postedBy: id });

    res.json({ message: 'User and all associated data deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete user: ' + error.message });
  }
};

/**
 * Create a new user (Admin only)
 */
const createUser = async (req, res) => {
  try {
    const { username, email, role, password } = req.body;
    const trimmedUsername = username?.trim();
    const trimmedEmail = email?.trim();

    if (!trimmedUsername || !trimmedEmail || !role) {
      return res.status(400).json({ error: 'Username, email, and role are required.' });
    }

    if (trimmedUsername.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters long.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    if (!['student', 'recruiter', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role.' });
    }

    const profileImage = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(trimmedUsername)}`;

    const user = await User.create({
      username: trimmedUsername,
      email: trimmedEmail.toLowerCase(),
      role,
      password: password || 'password123',
      profileImage
    });

    res.status(201).json({
      message: 'User created successfully.',
      user
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Username or email already exists.' });
    }
    res.status(500).json({ error: 'Failed to create user: ' + error.message });
  }
};

/**
 * Update an existing user's details (Admin only)
 */
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, role } = req.body;
    const trimmedUsername = username?.trim();
    const trimmedEmail = email?.trim();

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (username !== undefined) {
      if (!trimmedUsername) {
        return res.status(400).json({ error: 'Username cannot be empty.' });
      }
      if (trimmedUsername.length < 3) {
        return res.status(400).json({ error: 'Username must be at least 3 characters long.' });
      }
      user.username = trimmedUsername;
    }

    if (email !== undefined) {
      if (!trimmedEmail) {
        return res.status(400).json({ error: 'Email cannot be empty.' });
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        return res.status(400).json({ error: 'Please enter a valid email address.' });
      }
      user.email = trimmedEmail.toLowerCase();
    }

    if (role !== undefined) {
      if (!['student', 'recruiter', 'admin'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role.' });
      }
      if (id === req.user._id.toString() && role !== 'admin') {
        return res.status(400).json({ error: 'You cannot change your own admin role.' });
      }
      user.role = role;
    }

    if (username) {
      user.profileImage = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(trimmedUsername)}`;
    }

    await user.save();

    res.json({
      message: 'User updated successfully.',
      user
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Username or email already exists.' });
    }
    res.status(500).json({ error: 'Failed to update user: ' + error.message });
  }
};

/**
 * Get dashboard analytics for Admin
 */
const getAnalytics = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const studentsCount = await User.countDocuments({ role: 'student' });
    const recruitersCount = await User.countDocuments({ role: 'recruiter' });
    const adminsCount = await User.countDocuments({ role: 'admin' });

    const totalJobs = await Job.countDocuments();
    const totalResumes = await Resume.countDocuments();
    const totalApplications = await Application.countDocuments();

    // Get average ATS Score from reports
    const reports = await ATSReport.find({});
    const avgAtsScore = reports.length > 0 
      ? Math.round(reports.reduce((acc, curr) => acc + curr.atsScore, 0) / reports.length)
      : 0;

    // Simulate system activity data for Recharts (e.g. over past 5 months)
    const systemActivity = [
      { month: 'Jan', resumes: 15, applications: 25, jobs: 4 },
      { month: 'Feb', resumes: 22, applications: 40, jobs: 6 },
      { month: 'Mar', resumes: 35, applications: 58, jobs: 8 },
      { month: 'Apr', resumes: 48, applications: 85, jobs: 12 },
      { month: 'May', resumes: totalResumes, applications: totalApplications, jobs: totalJobs }
    ];

    res.json({
      counts: {
        totalUsers,
        studentsCount,
        recruitersCount,
        adminsCount,
        totalJobs,
        totalResumes,
        totalApplications,
        avgAtsScore
      },
      systemActivity
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve system analytics: ' + error.message });
  }
};

module.exports = {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  getAnalytics
};
