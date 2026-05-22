const mongoose = require('mongoose');

const ResumeSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  fileName: {
    type: String,
    required: true
  },
  filePath: {
    type: String,
    required: true
  },
  fileType: {
    type: String,
    enum: ['pdf', 'docx'],
    required: true
  },
  parsedText: {
    type: String,
    required: true
  },
  skills: [String],
  experienceSummary: String,
  educationSummary: String
}, {
  timestamps: true
});

module.exports = mongoose.model('Resume', ResumeSchema);
