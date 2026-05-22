const Application = require('../models/Application');
const Job = require('../models/Job');
const Resume = require('../models/Resume');
const Notification = require('../models/Notification');
const { calculateSimilarity, analyzeResume } = require('../services/aiClient');

/**
 * Apply to a job (Student role)
 */
const applyToJob = async (req, res) => {
  try {
    const { jobId, resumeId } = req.body;

    if (!jobId || !resumeId) {
      return res.status(400).json({ error: 'jobId and resumeId are required.' });
    }

    // Check if already applied
    const existingApplication = await Application.findOne({
      student: req.user._id,
      job: jobId
    });

    if (existingApplication) {
      return res.status(400).json({ error: 'You have already applied to this job.' });
    }

    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found.' });
    }

    const resume = await Resume.findById(resumeId);
    if (!resume) {
      return res.status(404).json({ error: 'Resume not found.' });
    }

    // Perform AI analysis
    const jdText = `${job.title} ${job.description} ${job.requirements.join(' ')}`;
    console.log(`Calculating AI similarity between Resume and Job: ${job.title}`);
    const similarityScore = await calculateSimilarity(resume.parsedText, jdText);
    
    // Get full ATS metrics for this job matching
    const analysis = await analyzeResume(resume.parsedText, jdText);
    const atsScore = analysis.ats_score;

    // Create Application
    const application = await Application.create({
      student: req.user._id,
      job: jobId,
      resume: resumeId,
      similarityScore: Math.round(similarityScore),
      atsScore: Math.round(atsScore),
      status: 'applied'
    });

    // Notify Recruiter
    await Notification.create({
      user: job.postedBy,
      title: 'New Applicant!',
      message: `A candidate has applied for "${job.title}". AI Similarity Match: ${Math.round(similarityScore)}%`,
      type: 'info'
    });

    // Notify Student
    await Notification.create({
      user: req.user._id,
      title: 'Application Submitted',
      message: `Successfully applied to "${job.title}" at "${job.company}". AI Match Score: ${Math.round(similarityScore)}%`,
      type: 'success'
    });

    res.status(201).json({
      message: 'Application submitted successfully.',
      application
    });
  } catch (error) {
    console.error('Job application error:', error);
    res.status(500).json({ error: 'Failed to apply: ' + error.message });
  }
};

/**
 * Update application status and send feedback (Recruiter role)
 */
const updateApplicationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, feedback } = req.body;

    if (!['applied', 'shortlisted', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid application status.' });
    }

    const application = await Application.findById(id).populate('job');
    if (!application) {
      return res.status(404).json({ error: 'Application not found.' });
    }

    application.status = status;
    if (feedback !== undefined) {
      application.feedback = feedback;
    }
    await application.save();

    // Notify Student
    await Notification.create({
      user: application.student,
      title: `Application Update: ${status.toUpperCase()}`,
      message: `Your application for "${application.job.title}" has been ${status}. ${feedback ? 'Feedback: ' + feedback : ''}`,
      type: status === 'shortlisted' ? 'success' : 'danger'
    });

    res.json({
      message: 'Application status updated.',
      application
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update application status: ' + error.message });
  }
};

/**
 * Get all applications for the active Student
 */
const getStudentApplications = async (req, res) => {
  try {
    const applications = await Application.find({ student: req.user._id })
      .populate('job', 'title company location status')
      .populate('resume', 'fileName')
      .sort({ appliedAt: -1 });

    res.json(applications);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch student applications: ' + error.message });
  }
};

/**
 * Get all applications for jobs posted by the active Recruiter
 */
const getRecruiterApplications = async (req, res) => {
  try {
    const jobs = await Job.find({ postedBy: req.user._id });
    const jobIds = jobs.map(j => j._id);

    const applications = await Application.find({ job: { $in: jobIds } })
      .populate('job', 'title company location status')
      .populate('student', 'username email profileImage')
      .populate('resume', 'fileName filePath fileType skills')
      .sort({ appliedAt: -1 });

    res.json(applications);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch recruiter applications: ' + error.message });
  }
};

module.exports = {
  applyToJob,
  updateApplicationStatus,
  getStudentApplications,
  getRecruiterApplications
};
