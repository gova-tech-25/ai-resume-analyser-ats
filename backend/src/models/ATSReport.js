const mongoose = require('mongoose');

const BulletImprovementSchema = new mongoose.Schema({
  original: String,
  improved: String,
  reason: String
}, { _id: false });

const ATSReportSchema = new mongoose.Schema({
  resume: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resume',
    required: true
  },
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job'
  },
  atsScore: {
    type: Number,
    required: true
  },
  missingKeywords: [String],
  matchingKeywords: [String],
  grammarScore: Number,
  sectionsScore: Number,
  improvements: [BulletImprovementSchema],
  suggestedProjects: [String],
  suggestedCertifications: [String],
  interviewQuestions: [String]
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

module.exports = mongoose.model('ATSReport', ATSReportSchema);
