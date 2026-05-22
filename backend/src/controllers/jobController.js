const Job = require('../models/Job');
const Application = require('../models/Application');
const Notification = require('../models/Notification');

/**
 * Recruiter posts a new job description
 */
const postJob = async (req, res) => {
  try {
    const { title, company, location, description, requirements, skillsRequired, salaryRange } = req.body;

    if (!title || !company || !description) {
      return res.status(400).json({ error: 'Title, company, and description are required.' });
    }

    const job = await Job.create({
      title,
      company,
      location,
      description,
      requirements: requirements || [],
      skillsRequired: skillsRequired || [],
      salaryRange,
      postedBy: req.user._id,
      status: 'active'
    });

    res.status(201).json({
      message: 'Job posted successfully.',
      job
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to post job: ' + error.message });
  }
};

/**
 * Get all active jobs (optionally filter by recruiter)
 */
const getJobs = async (req, res) => {
  try {
    const filter = { status: 'active' };
    
    // If recruiter wants to see only their jobs
    if (req.query.myJobs === 'true') {
      const userId = req.user?._id || req.headers['x-user-id'];
      if (!userId) {
        return res.status(400).json({ error: 'User ID header (x-user-id) is required when myJobs is true.' });
      }
      filter.postedBy = userId;
    }
    
    const jobs = await Job.find(filter).populate('postedBy', 'username').sort({ createdAt: -1 });
    
    const jobsWithCounts = await Promise.all(
      jobs.map(async (job) => {
        const count = await Application.countDocuments({ job: job._id });
        const jobObj = job.toObject();
        jobObj.applicantCount = count;
        return jobObj;
      })
    );

    res.json(jobsWithCounts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch jobs: ' + error.message });
  }
};

/**
 * Get applicants for a specific job, sorted by similarityScore descending
 */
const getApplicants = async (req, res) => {
  try {
    const { id: jobId } = req.params;
    
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found.' });
    }

    const applications = await Application.find({ job: jobId })
      .populate('student', 'username email profileImage')
      .populate('resume', 'fileName filePath fileType skills')
      .sort({ similarityScore: -1 }); // Rank candidates using AI similarity score

    res.json({
      job,
      applications
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch applicants: ' + error.message });
  }
};

module.exports = {
  postJob,
  getJobs,
  getApplicants
};
