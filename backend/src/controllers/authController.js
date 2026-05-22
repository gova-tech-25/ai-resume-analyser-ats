const User = require('../models/User');
const Job = require('../models/Job');

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
      role: 'student',
      profileImage: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex'
    });

    const recruiter = await User.create({
      username: 'Sarah Recruiter',
      email: 'sarah.recruiter@example.com',
      role: 'recruiter',
      profileImage: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah'
    });

    const admin = await User.create({
      username: 'Devon Admin',
      email: 'devon.admin@example.com',
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
    const users = await User.find({});
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

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch active profile: ' + error.message });
  }
};

module.exports = {
  getProfiles,
  getMe
};
