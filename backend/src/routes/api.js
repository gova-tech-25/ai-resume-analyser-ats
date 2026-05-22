const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Controllers
const authController = require('../controllers/authController');
const resumeController = require('../controllers/resumeController');
const jobController = require('../controllers/jobController');
const applicationController = require('../controllers/applicationController');
const adminController = require('../controllers/adminController');
const notificationController = require('../controllers/notificationController');

// Middleware
const { mockAuth, checkRole } = require('../middleware/roleCheck');

// Configure Multer storage
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const filetypes = /pdf|docx/;
  const mimetype = file.mimetype;
  const extname = path.extname(file.originalname).toLowerCase();
  
  if (filetypes.test(extname)) {
    return cb(null, true);
  }
  cb(new Error('Only PDF and DOCX file types are allowed.'));
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: fileFilter
});

/* =========================================================================
   MOCK AUTH ROUTES (Profile resolution & switching)
   ========================================================================= */
router.get('/auth/profiles', authController.getProfiles);
router.get('/auth/me', authController.getMe);

/* =========================================================================
   STUDENT ROUTES
   ========================================================================= */
router.post(
  '/resumes/upload',
  mockAuth,
  checkRole(['student', 'admin']),
  upload.single('resume'),
  resumeController.uploadResume
);
router.get(
  '/resumes/history',
  mockAuth,
  checkRole(['student', 'admin']),
  resumeController.getHistory
);
router.delete(
  '/resumes/history',
  mockAuth,
  checkRole(['student', 'admin']),
  resumeController.clearHistory
);
router.post(
  '/resumes/analyze',
  mockAuth,
  checkRole(['student', 'admin']),
  resumeController.analyzeAgainstJob
);
router.get(
  '/applications/student',
  mockAuth,
  checkRole(['student', 'admin']),
  applicationController.getStudentApplications
);
router.post(
  '/applications/apply',
  mockAuth,
  checkRole(['student', 'admin']),
  applicationController.applyToJob
);

/* =========================================================================
   RECRUITER ROUTES
   ========================================================================= */
router.post(
  '/jobs',
  mockAuth,
  checkRole(['recruiter', 'admin']),
  jobController.postJob
);
router.get(
  '/jobs',
  jobController.getJobs // Publicly readable for students/recruiters
);
router.get(
  '/jobs/:id/applicants',
  mockAuth,
  checkRole(['recruiter', 'admin']),
  jobController.getApplicants
);
router.get(
  '/applications/recruiter',
  mockAuth,
  checkRole(['recruiter', 'admin']),
  applicationController.getRecruiterApplications
);
router.post(
  '/applications/:id/status',
  mockAuth,
  checkRole(['recruiter', 'admin']),
  applicationController.updateApplicationStatus
);

/* =========================================================================
   ADMIN ROUTES
   ========================================================================= */
router.get(
  '/admin/users',
  mockAuth,
  checkRole(['admin']),
  adminController.getUsers
);
router.post(
  '/admin/users',
  mockAuth,
  checkRole(['admin']),
  adminController.createUser
);
router.put(
  '/admin/users/:id',
  mockAuth,
  checkRole(['admin']),
  adminController.updateUser
);
router.delete(
  '/admin/users/:id',
  mockAuth,
  checkRole(['admin']),
  adminController.deleteUser
);
router.get(
  '/admin/analytics',
  mockAuth,
  checkRole(['admin']),
  adminController.getAnalytics
);

/* =========================================================================
   NOTIFICATION ROUTES
   ========================================================================= */
router.get(
  '/notifications',
  mockAuth,
  notificationController.getNotifications
);
router.put(
  '/notifications/:id/read',
  mockAuth,
  notificationController.markAsRead
);

module.exports = router;
