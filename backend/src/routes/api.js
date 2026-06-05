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
const { auth, authorize } = require('../middleware/auth');

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
   AUTH ROUTES (JWT-based and Profile Selection fallback)
   ========================================================================= */
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.post('/auth/logout', auth, authController.logout);
router.get('/auth/profiles', authController.getProfiles);
router.get('/auth/me', auth, authController.getMe);

/* =========================================================================
   STUDENT ROUTES
   ========================================================================= */
router.post(
  '/resumes/upload',
  auth,
  authorize(['student', 'admin']),
  upload.single('resume'),
  resumeController.uploadResume
);
router.get(
  '/resumes/history',
  auth,
  authorize(['student', 'admin']),
  resumeController.getHistory
);
router.delete(
  '/resumes/history',
  auth,
  authorize(['student', 'admin']),
  resumeController.clearHistory
);
router.post(
  '/resumes/analyze',
  auth,
  authorize(['student', 'admin']),
  resumeController.analyzeAgainstJob
);
router.get(
  '/applications/student',
  auth,
  authorize(['student', 'admin']),
  applicationController.getStudentApplications
);
router.post(
  '/applications/apply',
  auth,
  authorize(['student', 'admin']),
  applicationController.applyToJob
);

/* =========================================================================
   RECRUITER ROUTES
   ========================================================================= */
router.post(
  '/jobs',
  auth,
  authorize(['recruiter', 'admin']),
  jobController.postJob
);
router.get(
  '/jobs',
  jobController.getJobs // Publicly readable for students/recruiters
);
router.get(
  '/jobs/:id/applicants',
  auth,
  authorize(['recruiter', 'admin']),
  jobController.getApplicants
);
router.get(
  '/applications/recruiter',
  auth,
  authorize(['recruiter', 'admin']),
  applicationController.getRecruiterApplications
);
router.post(
  '/applications/:id/status',
  auth,
  authorize(['recruiter', 'admin']),
  applicationController.updateApplicationStatus
);

/* =========================================================================
   ADMIN ROUTES
   ========================================================================= */
router.get(
  '/admin/users',
  auth,
  authorize(['admin']),
  adminController.getUsers
);
router.post(
  '/admin/users',
  auth,
  authorize(['admin']),
  adminController.createUser
);
router.put(
  '/admin/users/:id',
  auth,
  authorize(['admin']),
  adminController.updateUser
);
router.delete(
  '/admin/users/:id',
  auth,
  authorize(['admin']),
  adminController.deleteUser
);
router.get(
  '/admin/analytics',
  auth,
  authorize(['admin']),
  adminController.getAnalytics
);

/* =========================================================================
   NOTIFICATION ROUTES
   ========================================================================= */
router.get(
  '/notifications',
  auth,
  notificationController.getNotifications
);
router.put(
  '/notifications/:id/read',
  auth,
  notificationController.markAsRead
);

module.exports = router;
