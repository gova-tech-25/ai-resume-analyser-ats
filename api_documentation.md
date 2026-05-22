# ATSify API Documentation 🎯

This document provides a detailed description of the API endpoints, request/response payloads, authentication mechanisms, and microservice communication patterns within the ATSify platform.

---

## 🔑 Authentication Mechanics (Simulated Auth)

To simplify developer workflow and allow instant role testing without registration friction, the backend uses simulated auth headers. All authenticated routes require the following headers:

| Header Name | Required Value | Purpose |
| :--- | :--- | :--- |
| `x-user-role` | `student` \| `recruiter` \| `admin` | The active role checking authorization limits. |
| `x-user-id` | `[MongoDB ObjectId]` | The database identifier of the mock profile. |

If headers are missing on protected routes, the API returns:
- Status `401 Unauthorized` with body `{"error": "Missing simulated auth headers. Please provide x-user-role and x-user-id."}`
- Status `430 Access Denied` if the role is unauthorized for that route.

---

## 🏗️ Backend API Endpoints (Port 5000)

All backend endpoints are prefixed with `/api`.

### 1. Mock Authentication & Profile Selection

#### `GET /api/auth/profiles`
Retrieve all seed profiles available for user emulation.
- **Access**: Public
- **Response `200 OK`**:
  ```json
  [
    {
      "_id": "60c72b2f9b1d8b2bad000001",
      "username": "Alex Student",
      "email": "alex.student@example.com",
      "role": "student",
      "profileImage": "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex",
      "createdAt": "2026-05-22T11:00:00.000Z"
    }
  ]
  ```

#### `GET /api/auth/me`
Retrieve user profile details for the active headers.
- **Access**: Public (Attempts parsing headers, falls back to default role profile)
- **Headers**: Optional `x-user-role` & `x-user-id`
- **Response `200 OK`**:
  ```json
  {
    "_id": "60c72b2f9b1d8b2bad000001",
    "username": "Alex Student",
    "email": "alex.student@example.com",
    "role": "student",
    "profileImage": "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex"
  }
  ```

---

### 2. Resume & ATS Analysis (Student Portal)

#### `POST /api/resumes/upload`
Upload a new resume file (PDF or DOCX format) and trigger a full AI ATS analysis.
- **Access**: `student` \| `admin`
- **Body**: `multipart/form-data` containing:
  - `resume`: Binary file (PDF or DOCX, size limit: 5MB)
- **Response `201 Created`**:
  ```json
  {
    "message": "Resume uploaded and analyzed successfully.",
    "resume": {
      "_id": "60c72b2f9b1d8b2bad000021",
      "user": "60c72b2f9b1d8b2bad000001",
      "fileName": "resume.pdf",
      "filePath": "backend/uploads/resume-1716382000000.pdf",
      "fileType": "pdf",
      "parsedText": "John Doe... Technical Skills: JavaScript, React...",
      "skills": ["JavaScript", "React"],
      "createdAt": "2026-05-22T12:00:00.000Z"
    },
    "report": {
      "_id": "60c72b2f9b1d8b2bad000022",
      "resume": "60c72b2f9b1d8b2bad000021",
      "atsScore": 85,
      "grammarScore": 90,
      "sectionsScore": 95,
      "matchingKeywords": ["React", "JavaScript"],
      "missingKeywords": ["Redux"],
      "improvements": [
        {
          "original": "Worked on frontend features.",
          "improved": "Engineered responsive frontend interfaces using React, boosting page load speeds by 20%.",
          "reason": "Quantified impact and emphasized stack tool usage."
        }
      ],
      "suggestedProjects": ["Build a SaaS Dashboard using Next.js"],
      "suggestedCertifications": ["AWS Certified Solutions Architect"]
    }
  }
  ```

#### `GET /api/resumes/history`
Retrieve the logged-in student's complete upload history and corresponding reports.
- **Access**: `student` \| `admin`
- **Response `200 OK`**:
  ```json
  [
    {
      "resume": { ... },
      "report": { ... }
    }
  ]
  ```

#### `DELETE /api/resumes/history`
Delete all uploaded files on disk and clear all database logs of `Resume` and `ATSReport` collections associated with the user.
- **Access**: `student` \| `admin`
- **Response `200 OK`**:
  ```json
  {
    "message": "Resume history and associated reports cleared successfully."
  }
  ```

#### `POST /api/resumes/analyze`
Compare an existing resume against a specific job posting or dynamic raw job description text.
- **Access**: `student` \| `admin`
- **Body**:
  ```json
  {
    "resumeId": "60c72b2f9b1d8b2bad000021",
    "jobId": "60c72b2f9b1d8b2bad000010", 
    "jobDescriptionText": "Optional raw text if jobId is not supplied"
  }
  ```
- **Response `200 OK`**: Returns a new `ATSReport` JSON object (similar to the report payload in `/upload`).

---

### 3. Job Board & Applications

#### `POST /api/jobs`
Post a new job requisition.
- **Access**: `recruiter` \| `admin`
- **Body**:
  ```json
  {
    "title": "Full Stack Engineer",
    "company": "ByteCorp Industries",
    "location": "New York, NY",
    "description": "We are seeking a developer proficient in React and Node.js...",
    "requirements": ["React", "Node.js", "MongoDB"],
    "skillsRequired": ["React", "Node.js", "MongoDB"],
    "salaryRange": "$120,000 - $140,000"
  }
  ```
- **Response `201 Created`**: Returns standard `job` record object.

#### `GET /api/jobs`
List all active job postings, showing applicant count metrics.
- **Access**: Public
- **Query Parameter**: `myJobs=true` (If passed, filters listings by current Recruiter ID)
- **Response `200 OK`**:
  ```json
  [
    {
      "_id": "60c72b2f9b1d8b2bad000010",
      "title": "Full Stack Engineer",
      "company": "ByteCorp Industries",
      "location": "New York, NY",
      "salaryRange": "$120,000 - $140,000",
      "description": "...",
      "requirements": ["React", "Node.js"],
      "skillsRequired": ["React", "Node.js"],
      "postedBy": {
        "_id": "60c72b2f9b1d8b2bad000002",
        "username": "Sarah Recruiter"
      },
      "status": "active",
      "applicantCount": 3
    }
  ]
  ```

#### `POST /api/applications/apply`
Submit an application to a job. Automatically runs AI evaluation comparing the resume with the target job's details to write a match compatibility score.
- **Access**: `student` \| `admin`
- **Body**:
  ```json
  {
    "jobId": "60c72b2f9b1d8b2bad000010",
    "resumeId": "60c72b2f9b1d8b2bad000021"
  }
  ```
- **Response `201 Created`**:
  ```json
  {
    "message": "Application submitted successfully.",
    "application": {
      "_id": "60c72b2f9b1d8b2bad000030",
      "student": "60c72b2f9b1d8b2bad000001",
      "job": "60c72b2f9b1d8b2bad000010",
      "resume": "60c72b2f9b1d8b2bad000021",
      "similarityScore": 78,
      "atsScore": 82,
      "status": "applied",
      "appliedAt": "2026-05-22T12:05:00.000Z"
    }
  }
  ```

#### `GET /api/applications/student`
Fetch all applications submitted by the logged-in student.
- **Access**: `student` \| `admin`
- **Response `200 OK`**: List of application objects, populated with `job` and `resume` files metadata.

#### `GET /api/applications/recruiter`
Fetch all applications received across all jobs managed by the logged-in recruiter.
- **Access**: `recruiter` \| `admin`
- **Response `200 OK`**: List of application objects, populated with candidate user and resume skills.

#### `GET /api/jobs/:id/applicants`
Fetch applicant list for a single job, pre-sorted by `similarityScore` descending (AI Semantic Score Ranking).
- **Access**: `recruiter` \| `admin`
- **Response `200 OK`**:
  ```json
  {
    "job": { ... },
    "applications": [
      {
        "_id": "60c72b2f9b1d8b2bad000030",
        "student": {
          "_id": "60c72b2f9b1d8b2bad000001",
          "username": "Alex Student",
          "email": "alex.student@example.com"
        },
        "resume": {
          "fileName": "resume.pdf",
          "skills": ["React", "JavaScript"]
        },
        "similarityScore": 92,
        "atsScore": 88,
        "status": "applied"
      }
    ]
  }
  ```

#### `POST /api/applications/:id/status`
Update status (shortlist or reject) of an applicant.
- **Access**: `recruiter` \| `admin`
- **Body**:
  ```json
  {
    "status": "shortlisted" | "rejected",
    "feedback": "Great frontend profile, matches core requirements."
  }
  ```
- **Response `200 OK`**: Returns the updated `application` object and dispatches an automated notification alert to the applicant.

---

### 4. Admin Management

#### `GET /api/admin/users`
Get complete list of profiles in the system.
- **Access**: `admin`

#### `POST /api/admin/users`
Create a new user account.
- **Access**: `admin`
- **Body**:
  ```json
  {
    "username": "New User",
    "email": "new.user@example.com",
    "role": "student" | "recruiter" | "admin"
  }
  ```

#### `PUT /api/admin/users/:id`
Update an existing user's username, email, or role profile.
- **Access**: `admin`
- **Body**: Supports partial updates for fields: `username`, `email`, `role`.

#### `DELETE /api/admin/users/:id`
Delete a user and clean up all their related data cascadingly (resumes, jobs, applications, reports).
- **Access**: `admin`

#### `GET /api/admin/analytics`
Fetch aggregate system performance metrics.
- **Access**: `admin`
- **Response `200 OK`**:
  ```json
  {
    "counts": {
      "totalUsers": 12,
      "studentsCount": 8,
      "recruitersCount": 3,
      "adminsCount": 1,
      "totalJobs": 5,
      "totalResumes": 10,
      "totalApplications": 15,
      "avgAtsScore": 76
    },
    "systemActivity": [
      { "month": "Jan", "resumes": 15, "applications": 25, "jobs": 4 },
      ...
    ]
  }
  ```

---

### 5. Notification Dispatcher

#### `GET /api/notifications`
Fetch latest 20 notifications targeted to the active user.
- **Access**: Public (Matches authenticated session)
- **Response `200 OK`**: List of notification items including dynamic status markers (`isRead`).

#### `PUT /api/notifications/:id/read`
Mark notification message as read.
- **Access**: Public
- **Response `200 OK`**: Returns updated notification item.

---

## 🧠 Python NLP Microservice Endpoints (Port 8000)

We communicate privately with the backend server via HTTP.

#### `GET /`
Service Health Check.
- **Response `200 OK`**: `{"message": "AI Resume Analyzer Microservice is running!"}`

#### `POST /extract-skills`
Extract core technical and functional skills list from unstructured text blocks.
- **Request Body**:
  ```json
  {
    "text": "Senior frontend developer with 5 years working in Angular, TypeScript, and AWS architecture."
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "skills": ["Frontend", "Angular", "TypeScript", "AWS"]
  }
  ```

#### `POST /calculate-similarity`
Determine semantic cosine similarity score using sentence transformers between resume content and job requisitions.
- **Request Body**:
  ```json
  {
    "resume_text": "...Resume core details...",
    "job_description": "...Job requirements..."
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "similarity_score": 82.45
  }
  ```

#### `POST /analyze-resume`
Extract multi-dimensional ATS validation metrics, checklist matches, missing key skills, grammar validity, and bullet points restructuring.
- **Request Body**:
  ```json
  {
    "resume_text": "...Resume content...",
    "job_description": "...Optional target job description details..."
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "ats_score": 78,
    "matching_keywords": ["Python", "Docker"],
    "missing_keywords": ["Kubernetes", "CI/CD"],
    "grammar_score": 85,
    "sections_score": 90,
    "improvements": [
      {
        "original": "maintaining databases",
        "improved": "Engineered secure PostgreSQL database architectures, reducing query latency by 15%",
        "reason": "Replaced generic action verbs with industry power phrases and quantified performance metrics."
      }
    ],
    "suggested_projects": ["Build a containerized pipeline with Kubernetes and GitHub Actions"],
    "suggested_certifications": ["CKA: Certified Kubernetes Administrator"],
    "skills_extracted": ["Python", "Docker", "Database Design"]
  }
  ```
