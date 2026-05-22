const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  role: {
    type: String,
    enum: ['student', 'recruiter', 'admin'],
    required: true
  },
  profileImage: {
    type: String,
    default: 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('User', UserSchema);
