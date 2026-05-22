const axios = require('axios');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

const aiClient = axios.create({
  baseURL: AI_SERVICE_URL,
  timeout: 10000, // 10s timeout
  headers: {
    'Content-Type': 'application/json'
  }
});

const SKILL_DATABASE = [
  "JavaScript", "TypeScript", "Python", "Java", "C++", "C#", "Go", "Rust", "Ruby", "PHP", "SQL", "HTML", "CSS", "Swift", "Kotlin", "Scala", "R", "Shell Scripting",
  "React", "Angular", "Vue.js", "Node.js", "Express.js", "Django", "FastAPI", "Spring Boot", "Flask", "ASP.NET", "Next.js", "Nuxt.js", "Tailwind CSS", "Bootstrap", "Redux", "GraphQL", "jQuery",
  "PyTorch", "TensorFlow", "Keras", "Scikit-Learn", "Pandas", "NumPy", "Machine Learning", "Deep Learning", "NLP", "Computer Vision", "Data Science", "Tableau", "Power BI",
  "MongoDB", "PostgreSQL", "MySQL", "Redis", "Firebase", "SQLite", "Elasticsearch", "Cassandra", "AWS", "GCP", "Azure", "Docker", "Kubernetes", "Jenkins", "Git", "GitHub Actions", "AWS Lambda", "S3", "EC2",
  "REST API", "RESTful API", "Microservices", "System Design", "Webpack", "Vite", "Jira", "Confluence",
  "Agile", "Scrum", "Project Management", "Leadership", "Teamwork", "Communication", "Problem Solving", "Critical Thinking", "Time Management", "Product Management", "UI/UX", "Wireframing"
];

/**
 * Extract skills using regex matching
 */
function extractSkills(text) {
  if (!text) return [];
  const textLower = text.toLowerCase();
  const found = new Set();
  
  for (const skill of SKILL_DATABASE) {
    const escaped = skill.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    let pattern;
    if (skill.endsWith('+') || skill.endsWith('#') || skill.startsWith('.')) {
      pattern = new RegExp(`(?:^|\\s)${escaped}(?:$|\\s|\\,|\\.|\\;|\\:)`, 'i');
    } else {
      pattern = new RegExp(`\\b${escaped}\\b`, 'i');
    }
    if (pattern.test(textLower)) {
      found.add(skill);
    }
  }
  return Array.from(found).sort();
}

/**
 * Calculate Jaccard word intersection similarity between resume and JD
 */
function calculateSimilarity(resumeText, jobDescription) {
  if (!resumeText || !jobDescription) return 0;
  
  const rSet = new Set(resumeText.toLowerCase().match(/\b\w+\b/g) || []);
  const jdSet = new Set(jobDescription.toLowerCase().match(/\b\w+\b/g) || []);
  if (rSet.size === 0 || jdSet.size === 0) return 0;
  
  const intersection = new Set([...rSet].filter(x => jdSet.has(x)));
  const similarity = (intersection.size / Math.max(1, jdSet.size)) * 100;
  const boosted = similarity * 2.2; // Boost factor for realistic similarity output
  return Math.max(20, Math.min(95, Math.round(boosted)));
}

/**
 * Call FastAPI to analyze resume (with full feature JS fallback if offline)
 */
async function analyzeResume(resumeText, jobDescription = null) {
  try {
    const response = await aiClient.post('/analyze-resume', {
      resume_text: resumeText,
      job_description: jobDescription
    });
    return response.data;
  } catch (error) {
    console.log('AI Microservice offline. Using upgraded JS fallback analysis engine.');
    
    // JS Fallback analysis
    const skills = extractSkills(resumeText);
    const matchingKeywords = [];
    const missingKeywords = [];
    
    if (jobDescription) {
      const jdSkills = extractSkills(jobDescription);
      for (const s of jdSkills) {
        if (skills.some(sk => sk.toLowerCase() === s.toLowerCase())) {
          matchingKeywords.push(s);
        } else {
          missingKeywords.push(s);
        }
      }
    }
    
    // Section completeness
    const sections = {
      contact: ["email", "phone", "contact", "address", "linkedin", "github"],
      education: ["education", "university", "college", "bachelor", "master", "phd", "degree", "gpa"],
      experience: ["experience", "employment", "work history", "job", "position", "intern", "developer", "engineer"],
      skills: ["skills", "technologies", "languages", "tools", "expertise"],
      projects: ["projects", "portfolio", "personal projects", "hackathon"]
    };
    
    const textLower = resumeText.toLowerCase();
    let foundSections = 0;
    for (const [name, keywords] of Object.entries(sections)) {
      if (keywords.some(kw => textLower.includes(kw))) {
        foundSections++;
      }
    }
    const sectionsScore = Math.round((foundSections / 5) * 100);
    
    // Grammar & formatting checks
    const hasBullets = /[•\-*]\s/.test(resumeText);
    const bulletBonus = hasBullets ? 20 : 0;
    
    const weakVerbs = ["helped", "assisted", "responsible for", "worked on", "handled", "managed"];
    let weakVerbsCount = 0;
    for (const wv of weakVerbs) {
      const regex = new RegExp(`\\b${wv}\\b`, 'gi');
      const matches = textLower.match(regex);
      if (matches) {
        weakVerbsCount += matches.length;
      }
    }
    const verbPenalty = Math.min(40, weakVerbsCount * 5);
    const grammarScore = Math.max(50, Math.min(100, 80 - verbPenalty + bulletBonus));
    
    // ATS Score Calculation
    let atsScore = 70;
    if (jobDescription) {
      const totalKeywords = matchingKeywords.length + missingKeywords.length;
      const matchPct = totalKeywords > 0 ? (matchingKeywords.length / totalKeywords) * 100 : 100;
      atsScore = Math.round((sectionsScore * 0.3) + (matchPct * 0.4) + (grammarScore * 0.3));
    } else {
      const skillCountPct = Math.min(100, (skills.length / 12) * 100);
      atsScore = Math.round((sectionsScore * 0.4) + (skillCountPct * 0.3) + (grammarScore * 0.3));
    }
    atsScore = Math.max(20, Math.min(99, atsScore));
    
    // Bullet points weak verb rewriter
    const lines = resumeText.split('\n');
    const bulletLines = lines
      .map(line => line.trim())
      .filter(line => line.length > 20 && /^[•\-*]\s/.test(line));
      
    const improvements = [];
    const genericImprovements = [
      {
        original: "Worked on the backend system using Node.js and MongoDB.",
        improved: "Engineered and optimized backend REST APIs using Node.js and MongoDB, reducing server response times by 35%.",
        reason: "Replaced weak verb 'worked on' with 'engineered and optimized' and added quantifiable impact metrics."
      },
      {
        original: "Helped team with front-end React development.",
        improved: "Spearheaded the integration of React state management using Redux, improving modular code reusability across 4 departments.",
        reason: "Replaced weak verb 'helped' with action-oriented 'spearheaded' and specified domain of impact."
      },
      {
        original: "Responsible for testing and fixing bugs.",
        improved: "Implemented automated Jest unit testing, raising test coverage from 45% to 88% and preventing critical production regressions.",
        reason: "Avoided passive phrase 'responsible for' and detailed automated testing impact."
      }
    ];
    
    let rewrittenCount = 0;
    for (const bullet of bulletLines) {
      if (rewrittenCount >= 3) break;
      const cleanBullet = bullet.replace(/^[•\-*]\s+/, '').trim();
      const cleanBulletLower = cleanBullet.toLowerCase();
      
      let matchedWeak = null;
      for (const wv of weakVerbs) {
        if (cleanBulletLower.includes(wv)) {
          matchedWeak = wv;
          break;
        }
      }
      
      if (matchedWeak) {
        let improved = "";
        let reason = "";
        const remaining = cleanBullet.replace(new RegExp(matchedWeak, 'i'), '').trim();
        
        if (matchedWeak === "helped" || matchedWeak === "assisted") {
          improved = `Collaborated with cross-functional teams to design and implement ${remaining.charAt(0).toLowerCase() + remaining.slice(1)}, enhancing workflow delivery speeds by 15%.`;
          reason = `Replaced weak verb '${matchedWeak}' with collaborative action verb and appended metric framework.`;
        } else if (matchedWeak === "worked on" || matchedWeak === "handled" || matchedWeak === "managed") {
          improved = `Orchestrated and managed critical technical deployments of ${remaining.charAt(0).toLowerCase() + remaining.slice(1)}, minimizing downtime to under 0.1%.`;
          reason = `Upgraded action verb '${matchedWeak}' to highlight leadership and technical ownership.`;
        } else {
          improved = `Spearheaded and executed development for ${remaining.charAt(0).toLowerCase() + remaining.slice(1)}, delivering project 2 weeks ahead of schedule.`;
          reason = `Transformed weak responsibility statement '${matchedWeak}' to direct project impact statement.`;
        }
        
        improvements.push({ original: cleanBullet, improved, reason });
        rewrittenCount++;
      }
    }
    
    if (improvements.length === 0) {
      improvements.push(...genericImprovements);
    }
    
    // Skill-based Project & Certification recommendations
    const suggested_projects = [];
    const suggested_certifications = [];
    
    const skillsLower = skills.map(s => s.toLowerCase());
    const missingLower = missingKeywords.map(m => m.toLowerCase());
    
    if (skillsLower.includes("python") || missingLower.includes("machine learning")) {
      suggested_projects.push("End-to-End Predictive Analytics Pipeline using Python and Scikit-Learn");
      suggested_certifications.push("TensorFlow Developer Certificate or Google Professional Data Engineer");
    }
    if (skillsLower.includes("react") || missingLower.includes("react")) {
      suggested_projects.push("Real-Time Multi-tenant SaaS Dashboard with React, Tailwind CSS, and WebSockets");
      suggested_certifications.push("Meta Front-End Developer Professional Certificate");
    }
    if (skillsLower.includes("node.js") || missingLower.includes("mongodb")) {
      suggested_projects.push("Microservices-Based E-Commerce Backend using Node.js, Express, and MongoDB");
      suggested_certifications.push("MongoDB Certified Developer Associate");
    }
    if (missingLower.includes("aws") || skillsLower.includes("aws")) {
      suggested_projects.push("Serverless File Processing Infrastructure on AWS (S3, Lambda, and DynamoDB)");
      suggested_certifications.push("AWS Certified Solutions Architect – Associate");
    }
    if (missingLower.includes("docker") || missingLower.includes("kubernetes")) {
      suggested_projects.push("Multi-Container Deployment orchestration with Docker Compose and Kubernetes CI/CD");
      suggested_certifications.push("Certified Kubernetes Administrator (CKA)");
    }
    
    if (suggested_projects.length === 0) {
      suggested_projects.push(
        "Full-Stack Collaborative Project Manager Platform with Real-time Updates",
        "RESTful API Gateway Service with OAuth2 and Rate Limiting Middleware"
      );
    }
    if (suggested_certifications.length === 0) {
      suggested_certifications.push(
        "CompTIA Security+ or Certified ScrumMaster (CSM)",
        "Google Cloud Associate Cloud Engineer"
      );
    }
    
    return {
      ats_score: atsScore,
      matching_keywords: matchingKeywords,
      missing_keywords: missingKeywords,
      grammar_score: grammarScore,
      sections_score: sectionsScore,
      improvements,
      suggested_projects,
      suggested_certifications,
      skills_extracted: skills
    };
  }
}

module.exports = {
  extractSkills,
  calculateSimilarity,
  analyzeResume
};
