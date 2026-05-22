const Resume = require('../models/Resume');
const ATSReport = require('../models/ATSReport');
const Notification = require('../models/Notification');
const Job = require('../models/Job');
const { parseFile } = require('../services/parserService');
const { analyzeResume } = require('../services/aiClient');
const fs = require('fs');


/**
 * Handle resume upload and initial parser analysis
 */
const uploadResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const { originalname, path: filePath } = req.file;
    const fileType = originalname.split('.').pop().toLowerCase();
    
    if (fileType !== 'pdf' && fileType !== 'docx') {
      return res.status(400).json({ error: 'Only PDF and DOCX files are allowed.' });
    }

    console.log(`Parsing file: ${originalname} (${fileType}) at path: ${filePath}`);
    const text = await parseFile(filePath, fileType);
    
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Extracted text is empty. The file may be corrupt or scanned image-only.' });
    }

    console.log('Sending parsed text to AI microservice...');
    const aiAnalysis = await analyzeResume(text);

    // Save Resume
    const resume = await Resume.create({
      user: req.user._id,
      fileName: originalname,
      filePath: filePath,
      fileType: fileType,
      parsedText: text,
      skills: aiAnalysis.skills_extracted || [],
      experienceSummary: 'Extracted Summary',
      educationSummary: 'Extracted Education'
    });

    // Save ATS Report
    const report = await ATSReport.create({
      resume: resume._id,
      atsScore: aiAnalysis.ats_score,
      missingKeywords: aiAnalysis.missing_keywords || [],
      matchingKeywords: aiAnalysis.matching_keywords || [],
      grammarScore: aiAnalysis.grammar_score,
      sectionsScore: aiAnalysis.sections_score,
      improvements: aiAnalysis.improvements || [],
      suggestedProjects: aiAnalysis.suggested_projects || [],
      suggestedCertifications: aiAnalysis.suggested_certifications || []
    });

    // Create Notification
    await Notification.create({
      user: req.user._id,
      title: 'Resume Analyzed!',
      message: `Your resume "${originalname}" was parsed. ATS score: ${aiAnalysis.ats_score}%`,
      type: 'success'
    });

    res.status(201).json({
      message: 'Resume uploaded and analyzed successfully.',
      resume,
      report
    });
  } catch (error) {
    console.error('Upload and analysis error:', error);
    res.status(500).json({ error: 'Failed to process resume: ' + error.message });
  }
};

/**
 * Get resume upload history
 */
const getHistory = async (req, res) => {
  try {
    const resumes = await Resume.find({ user: req.user._id }).sort({ createdAt: -1 });
    
    // For each resume, find its associated ATS report
    const history = await Promise.all(
      resumes.map(async (resume) => {
        const report = await ATSReport.findOne({ resume: resume._id }).sort({ createdAt: -1 });
        return {
          resume,
          report
        };
      })
    );

    res.json(history);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve resume history: ' + error.message });
  }
};

/**
 * Analyze an existing resume against a job description (either job ID or raw JD text)
 */
const analyzeAgainstJob = async (req, res) => {
  try {
    const { resumeId, jobId, jobDescriptionText } = req.body;

    if (!resumeId) {
      return res.status(400).json({ error: 'resumeId is required.' });
    }

    const resume = await Resume.findById(resumeId);
    if (!resume) {
      return res.status(404).json({ error: 'Resume not found.' });
    }

    let jdText = jobDescriptionText;
    let job = null;

    if (jobId) {
      job = await Job.findById(jobId);
      if (!job) {
        return res.status(404).json({ error: 'Job not found.' });
      }
      jdText = `${job.title} ${job.description} ${job.requirements.join(' ')}`;
    }

    if (!jdText) {
      return res.status(400).json({ error: 'Either jobId or jobDescriptionText must be provided.' });
    }

    console.log(`Analyzing resume ${resumeId} against job description...`);
    const aiAnalysis = await analyzeResume(resume.parsedText, jdText);

    // Save a new ATS Report linked to this job
    const report = await ATSReport.create({
      resume: resume._id,
      job: job ? job._id : null,
      atsScore: aiAnalysis.ats_score,
      missingKeywords: aiAnalysis.missing_keywords || [],
      matchingKeywords: aiAnalysis.matching_keywords || [],
      grammarScore: aiAnalysis.grammar_score,
      sectionsScore: aiAnalysis.sections_score,
      improvements: aiAnalysis.improvements || [],
      suggestedProjects: aiAnalysis.suggested_projects || [],
      suggestedCertifications: aiAnalysis.suggested_certifications || []
    });

    res.json(report);
  } catch (error) {
    console.error('Job match analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze resume against job: ' + error.message });
  }
};

/**
 * Clear all resume history for the logged in user
 */
const clearHistory = async (req, res) => {
  try {
    const userId = req.user._id;

    // Find all resumes belonging to this user
    const resumes = await Resume.find({ user: userId });

    if (resumes.length === 0) {
      return res.status(200).json({ message: 'No resume history to clear.' });
    }

    // Unlink each file from disk if path exists
    for (const resume of resumes) {
      if (resume.filePath) {
        try {
          if (fs.existsSync(resume.filePath)) {
            fs.unlinkSync(resume.filePath);
            console.log(`Successfully deleted file from disk: ${resume.filePath}`);
          }
        } catch (fileErr) {
          console.error(`Error deleting file at ${resume.filePath}:`, fileErr);
        }
      }
    }

    // Extract resume IDs
    const resumeIds = resumes.map(r => r._id);

    // Delete associated ATS reports
    const reportDeleteRes = await ATSReport.deleteMany({ resume: { $in: resumeIds } });
    console.log(`Deleted ${reportDeleteRes.deletedCount} ATS reports`);

    // Delete resumes
    const resumeDeleteRes = await Resume.deleteMany({ user: userId });
    console.log(`Deleted ${resumeDeleteRes.deletedCount} resumes`);

    // Create Notification
    await Notification.create({
      user: userId,
      title: 'Scan History Cleared',
      message: 'All your previous resume scans and ATS reports have been successfully cleared.',
      type: 'info'
    });

    res.status(200).json({ message: 'Resume history and associated reports cleared successfully.' });
  } catch (error) {
    console.error('Clear history error:', error);
    res.status(500).json({ error: 'Failed to clear resume history: ' + error.message });
  }
};

module.exports = {
  uploadResume,
  getHistory,
  analyzeAgainstJob,
  clearHistory
};
