const mongoose = require('mongoose');
const User = require('../models/User');
const Job = require('../models/Job');
const Resume = require('../models/Resume');
const Application = require('../models/Application');
const ATSReport = require('../models/ATSReport');
const Notification = require('../models/Notification');
require('dotenv').config();

const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai_resume_analyser';

async function seedDatabase() {
  try {
    console.log(`Connecting to MongoDB at: ${mongoURI}`);
    await mongoose.connect(mongoURI);
    console.log('Database connected. Clearing old data...');

    // Clear old data
    await User.deleteMany({});
    await Job.deleteMany({});
    await Resume.deleteMany({});
    await Application.deleteMany({});
    await ATSReport.deleteMany({});
    await Notification.deleteMany({});

    console.log('Inserting seed users...');
    
    // Seed Users
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

    console.log('Seeded Users successfully:');
    console.log(`Student ID: ${student._id}`);
    console.log(`Recruiter ID: ${recruiter._id}`);
    console.log(`Admin ID: ${admin._id}`);

    // Seed Jobs
    console.log('Inserting seed jobs...');
    const jobs = [
      {
        title: 'Full Stack Software Engineer',
        company: 'CloudTech Solutions',
        location: 'Remote (US/Canada)',
        salaryRange: '$110,000 - $140,000',
        description: 'We are looking for a Full Stack Software Engineer to join our core product team. You will be building modern web applications, implementing microservices, and deploying cloud architecture.',
        requirements: [
          '3+ years of experience with web application development.',
          'Experience building APIs using Node.js, Express, or Python FastAPI.',
          'Strong frontend capabilities in React and CSS styling systems.',
          'Familiarity with MongoDB or relational databases (PostgreSQL/MySQL).',
          'Deploying and maintaining cloud applications on AWS or GCP.'
        ],
        skillsRequired: ['React', 'Node.js', 'Express.js', 'Python', 'FastAPI', 'MongoDB', 'AWS', 'REST API', 'Git'],
        postedBy: recruiter._id,
        status: 'active'
      },
      {
        title: 'Frontend Engineer (React)',
        company: 'PixelPerfect Designs',
        location: 'San Francisco, CA (Hybrid)',
        salaryRange: '$120,000 - $150,000',
        description: 'Join our creative design and technology studio as a Frontend Engineer. You will bring beautiful UI/UX mocks to life, optimize frontend performance, and implement smooth animations.',
        requirements: [
          '2+ years of professional React experience.',
          'Expertise in CSS styling systems, including Tailwind CSS or modern CSS.',
          'Proficiency with TypeScript and modern JavaScript build tools.',
          'Experience with interactive charts (Recharts/D3) and animations (Framer Motion).',
          'Strong collaboration skills with UI/UX designers.'
        ],
        skillsRequired: ['React', 'JavaScript', 'TypeScript', 'Tailwind CSS', 'Redux', 'Vite', 'UI/UX', 'Git'],
        postedBy: recruiter._id,
        status: 'active'
      },
      {
        title: 'Machine Learning & NLP Developer',
        company: 'Aether AI Systems',
        location: 'Remote',
        salaryRange: '$130,000 - $170,000',
        description: 'We are seeking an NLP Specialist to enhance our intelligent text analyzer engines. You will build classification pipelines, fine-tune transformer models, and optimize inference endpoints.',
        requirements: [
          'Solid understanding of NLP concepts and tokenization techniques.',
          'Experience with spaCy, NLTK, or Hugging Face sentence transformers.',
          'Strong background in Python and data engineering libraries.',
          'Familiarity with FastAPI and RESTful microservice architectures.',
          'Ability to write clean, reusable, and optimized code.'
        ],
        skillsRequired: ['Python', 'FastAPI', 'NLP', 'Machine Learning', 'Deep Learning', 'PyTorch', 'TensorFlow', 'Scikit-Learn', 'Pandas', 'NumPy', 'Docker'],
        postedBy: recruiter._id,
        status: 'active'
      }
    ];

    await Job.insertMany(jobs);
    console.log('Seeded Jobs successfully.');

    // Seed initial notification
    await Notification.create({
      user: student._id,
      title: 'Welcome to Platform!',
      message: 'Upload your first resume in PDF or DOCX format to get an instant ATS compatibility analysis.',
      type: 'info',
      isRead: false
    });
    
    await Notification.create({
      user: recruiter._id,
      title: 'Job Posting Ready',
      message: 'Your seed jobs are active and ready to accept applicants.',
      type: 'success',
      isRead: false
    });

    console.log('Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  seedDatabase();
}
