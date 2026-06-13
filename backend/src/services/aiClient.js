const axios = require('axios');
const { analyzeWithGemini, isGeminiAvailable } = require('./geminiClient');
const { analyzeWithGrok, isGrokAvailable } = require('./grokClient');
const { analyzeWithOpenRouter, isOpenRouterAvailable } = require('./openrouterClient');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
const DEFAULT_PROVIDER = process.env.AI_PROVIDER || 'local'; // 'local' | 'gemini' | 'grok'

const aiClient = axios.create({
  baseURL: AI_SERVICE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' }
});

const SKILL_DATABASE = [
  "JavaScript", "TypeScript", "Python", "Java", "C++", "C#", "Go", "Rust", "Ruby", "PHP", "SQL", "HTML", "CSS", "Swift", "Kotlin", "Scala", "R", "Shell Scripting",
  "React", "Angular", "Vue.js", "Node.js", "Express.js", "Django", "FastAPI", "Spring Boot", "Flask", "ASP.NET", "Next.js", "Nuxt.js", "Tailwind CSS", "Bootstrap", "Redux", "GraphQL", "jQuery",
  "PyTorch", "TensorFlow", "Keras", "Scikit-Learn", "Pandas", "NumPy", "Machine Learning", "Deep Learning", "NLP", "Computer Vision", "Data Science", "Tableau", "Power BI",
  "MongoDB", "PostgreSQL", "MySQL", "Redis", "Firebase", "SQLite", "Elasticsearch", "Cassandra", "AWS", "GCP", "Azure", "Docker", "Kubernetes", "Jenkins", "Git", "GitHub Actions", "AWS Lambda", "S3", "EC2",
  "REST API", "RESTful API", "Microservices", "System Design", "Webpack", "Vite", "Jira", "Confluence",
  "Agile", "Scrum", "Project Management", "Leadership", "Teamwork", "Communication", "Problem Solving", "Critical Thinking", "Time Management", "Product Management", "UI/UX", "Wireframing"
];

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
    if (pattern.test(textLower)) found.add(skill);
  }
  return Array.from(found).sort();
}

function calculateSimilarity(resumeText, jobDescription) {
  if (!resumeText || !jobDescription) return 0;
  const rSet = new Set(resumeText.toLowerCase().match(/\b\w+\b/g) || []);
  const jdSet = new Set(jobDescription.toLowerCase().match(/\b\w+\b/g) || []);
  if (rSet.size === 0 || jdSet.size === 0) return 0;
  const intersection = new Set([...rSet].filter(x => jdSet.has(x)));
  const similarity = (intersection.size / Math.max(1, jdSet.size)) * 100;
  return Math.max(20, Math.min(95, Math.round(similarity * 2.2)));
}

function fallbackAnalysis(resumeText, jobDescription) {
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

  const sections = {
    contact: ["email", "phone", "contact", "address", "linkedin", "github"],
    education: ["education", "university", "college", "bachelor", "master", "phd", "degree", "gpa"],
    experience: ["experience", "employment", "work history", "job", "position", "intern", "developer", "engineer"],
    skills: ["skills", "technologies", "languages", "tools", "expertise"],
    projects: ["projects", "portfolio", "personal projects", "hackathon"]
  };

  const textLower = resumeText.toLowerCase();
  let foundSections = 0;
  for (const [, keywords] of Object.entries(sections)) {
    if (keywords.some(kw => textLower.includes(kw))) foundSections++;
  }
  const sectionsScore = Math.round((foundSections / 5) * 100);

  const hasBullets = /[•\-*]\s/.test(resumeText);
  const weakVerbs = ["helped", "assisted", "responsible for", "worked on", "handled", "managed"];
  let weakVerbsCount = 0;
  for (const wv of weakVerbs) {
    const regex = new RegExp(`\\b${wv}\\b`, 'gi');
    const matches = textLower.match(regex);
    if (matches) weakVerbsCount += matches.length;
  }
  const grammarScore = Math.max(50, Math.min(100, 80 - Math.min(40, weakVerbsCount * 5) + (hasBullets ? 20 : 0)));

  let atsScore = 70;
  if (jobDescription) {
    const total = matchingKeywords.length + missingKeywords.length;
    const matchPct = total > 0 ? (matchingKeywords.length / total) * 100 : 100;
    atsScore = Math.round((sectionsScore * 0.3) + (matchPct * 0.4) + (grammarScore * 0.3));
  } else {
    atsScore = Math.round((sectionsScore * 0.4) + (Math.min(100, (skills.length / 12) * 100) * 0.3) + (grammarScore * 0.3));
  }
  atsScore = Math.max(20, Math.min(99, atsScore));

  const lines = resumeText.split('\n');
  const bulletLines = lines.map(l => l.trim()).filter(l => l.length > 20 && /^[•\-*]\s/.test(l));
  const improvements = [];
  const contextSkills = skills.length > 0 ? skills.slice(0, 3).join(', ') : 'software development';
  const contextMissing = missingKeywords.length > 0 ? missingKeywords[0] : '';

  const actionVerbs = ['Engineered', 'Spearheaded', 'Architected', 'Optimized', 'Designed', 'Implemented', 'Orchestrated', 'Delivered', 'Accelerated', 'Championed'];

  let rewrittenCount = 0;
  for (const bullet of bulletLines) {
    if (rewrittenCount >= 3) break;
    const clean = bullet.replace(/^[•\-*]\s+/, '').trim();
    const cleanLower = clean.toLowerCase();
    for (const wv of weakVerbs) {
      if (cleanLower.includes(wv)) {
        const remaining = clean.replace(new RegExp(wv, 'i'), '').trim();
        const verb = actionVerbs[rewrittenCount % actionVerbs.length];
        const skillPhrase = contextSkills ? ` using ${contextSkills}` : '';
        let improved, reason;
        if (wv === "helped" || wv === "assisted") {
          improved = `${verb} cross-functional delivery of ${remaining.charAt(0).toLowerCase() + remaining.slice(1)}${skillPhrase}, resulting in a 25% efficiency gain and improved team velocity.`;
          reason = `Replaced weak verb '${wv}' with '${verb.toLowerCase()}' to demonstrate direct ownership and added measurable team impact.`;
        } else if (wv === "worked on" || wv === "handled" || wv === "managed") {
          improved = `${verb} end-to-end development of ${remaining.charAt(0).toLowerCase() + remaining.slice(1)}${skillPhrase}, reducing delivery timelines by 30% through automated workflows.`;
          reason = `Upgraded vague verb '${wv}' to '${verb.toLowerCase()}' to convey leadership and technical depth with quantifiable results.`;
        } else {
          improved = `${verb} comprehensive ${remaining.charAt(0).toLowerCase() + remaining.slice(1)}${skillPhrase}, exceeding project milestones by 20% ahead of schedule.`;
          reason = `Transformed passive phrasing '${wv}' into an impact-driven action statement with specific outcomes.`;
        }
        improvements.push({ original: clean, improved, reason });
        rewrittenCount++;
        break;
      }
    }
  }

  if (improvements.length === 0) {
    const meaningfulLines = lines.map(l => l.trim()).filter(l => l.length > 30 && !/^[•\-*]\s/.test(l) && !/^[A-Z\s]{3,}:?$/.test(l) && !/^(education|experience|skills|projects|contact|summary)/i.test(l));
    for (let i = 0; i < Math.min(3, meaningfulLines.length); i++) {
      const verb = actionVerbs[i % actionVerbs.length];
      improvements.push({
        original: meaningfulLines[i],
        improved: `${verb} strategic initiatives focused on ${contextSkills}, driving measurable improvements in performance and team productivity.`,
        reason: `Restructured generic experience statement with a powerful action verb and added relevant skill context for greater impact.`
      });
    }
  }

  const suggestedProjects = [];
  const suggestedCerts = [];
  const skillsLower = skills.map(s => s.toLowerCase());
  const missingLower = missingKeywords.map(m => m.toLowerCase());
  if (skillsLower.includes("python") || missingLower.includes("machine learning")) { suggestedProjects.push("End-to-End Predictive Analytics Pipeline using Python and Scikit-Learn"); suggestedCerts.push("TensorFlow Developer Certificate or Google Professional Data Engineer"); }
  if (skillsLower.includes("react") || missingLower.includes("react")) { suggestedProjects.push("Real-Time Multi-tenant SaaS Dashboard with React, Tailwind CSS, and WebSockets"); suggestedCerts.push("Meta Front-End Developer Professional Certificate"); }
  if (skillsLower.includes("node.js") || missingLower.includes("mongodb")) { suggestedProjects.push("Microservices-Based E-Commerce Backend using Node.js, Express, and MongoDB"); suggestedCerts.push("MongoDB Certified Developer Associate"); }
  if (missingLower.includes("aws") || skillsLower.includes("aws")) { suggestedProjects.push("Serverless File Processing Infrastructure on AWS (S3, Lambda, and DynamoDB)"); suggestedCerts.push("AWS Certified Solutions Architect - Associate"); }
  if (missingLower.includes("docker") || missingLower.includes("kubernetes")) { suggestedProjects.push("Multi-Container Deployment orchestration with Docker Compose and Kubernetes CI/CD"); suggestedCerts.push("Certified Kubernetes Administrator (CKA)"); }
  if (suggestedProjects.length === 0) suggestedProjects.push("Full-Stack Collaborative Project Manager Platform with Real-time Updates", "RESTful API Gateway Service with OAuth2 and Rate Limiting Middleware");
  if (suggestedCerts.length === 0) suggestedCerts.push("CompTIA Security+ or Certified ScrumMaster (CSM)", "Google Cloud Associate Cloud Engineer");

  // Generate interview questions based on skills & missing keywords
  const interviewQuestions = [];
  if (skillsLower.includes("react") || missingLower.includes("react")) interviewQuestions.push("Explain the Virtual DOM and how React optimizes re-renders.");
  if (skillsLower.includes("node.js") || missingLower.includes("node.js")) interviewQuestions.push("How does the Node.js event loop work? Describe the order of execution of microtasks and macrotasks.");
  if (skillsLower.includes("python")) interviewQuestions.push("Describe Python decorators and provide an example use case in web development.");
  if (missingLower.includes("aws") || skillsLower.includes("aws")) interviewQuestions.push("Explain the differences between S3, EBS, and EFS storage options in AWS.");
  if (missingLower.includes("docker") || skillsLower.includes("docker")) interviewQuestions.push("What is the difference between a Docker image and a container? How do you optimize Docker image sizes?");
  if (missingLower.includes("kubernetes")) interviewQuestions.push("Describe Kubernetes architecture: what are Pods, Deployments, and Services?");
  if (skillsLower.includes("mongodb") || missingLower.includes("mongodb")) interviewQuestions.push("Explain indexing in MongoDB and how you would optimize a slow query.");
  if (skillsLower.includes("sql") || skillsLower.includes("postgresql") || missingLower.includes("postgresql")) interviewQuestions.push("What is the difference between a LEFT JOIN and an INNER JOIN? Provide an example scenario.");
  if (skillsLower.includes("typescript")) interviewQuestions.push("What are TypeScript utility types? Explain Pick, Omit, and Partial with examples.");
  if (skillsLower.includes("machine learning") || skillsLower.includes("deep learning")) interviewQuestions.push("Explain the bias-variance tradeoff in machine learning models.");
  interviewQuestions.push("Tell me about a challenging technical problem you solved and how you approached it.");
  interviewQuestions.push("How do you stay current with new technologies and tools in your field?");

  return {
    ats_score: atsScore,
    matching_keywords: matchingKeywords,
    missing_keywords: missingKeywords,
    grammar_score: grammarScore,
    sections_score: sectionsScore,
    improvements,
    suggested_projects: suggestedProjects,
    suggested_certifications: suggestedCerts,
    skills_extracted: skills,
    interview_questions: interviewQuestions
  };
}

async function analyzeResume(resumeText, jobDescription = null) {
  const errors = [];

  // Priority 1: Gemini
  if (isGeminiAvailable()) {
    try {
      console.log('[AI] Trying Gemini provider...');
      const result = await analyzeWithGemini(resumeText, jobDescription);
      console.log('[AI] Gemini succeeded');
      return { ...result, providerUsed: 'gemini', providerError: null };
    } catch (err) {
      console.warn(`[AI] Gemini failed: ${err.message}`);
      errors.push(`Gemini: ${err.message.includes('429') ? 'quota exceeded' : err.message.slice(0, 80)}`);
    }
  }

  // Priority 2: OpenRouter (free tier)
  if (isOpenRouterAvailable()) {
    try {
      console.log('[AI] Trying OpenRouter provider...');
      const result = await analyzeWithOpenRouter(resumeText, jobDescription);
      console.log('[AI] OpenRouter succeeded');
      return { ...result, providerUsed: 'openrouter', providerError: null };
    } catch (err) {
      console.warn(`[AI] OpenRouter failed: ${err.message}`);
      errors.push(`OpenRouter: ${err.message.slice(0, 80)}`);
    }
  }

  // Priority 3: Local FastAPI
  try {
    console.log('[AI] Using local FastAPI service');
    const response = await aiClient.post('/analyze-resume', {
      resume_text: resumeText,
      job_description: jobDescription
    });
    const providerError = errors.length > 0 ? `External APIs failed (${errors.join('; ')}). Used local NLP.` : null;
    return { ...response.data, providerUsed: 'local', providerError };
  } catch (err) {
    console.log('[AI] Local service offline. Using JS fallback.');
    const providerError = errors.length > 0
      ? `External APIs failed (${errors.join('; ')}). Local service offline — used fallback engine.`
      : 'Local service offline — used fallback engine.';
    return { ...fallbackAnalysis(resumeText, jobDescription), providerUsed: 'local-fallback', providerError };
  }
}

function getAvailableProviders() {
  return {
    local: true,
    gemini: isGeminiAvailable(),
    grok: isGrokAvailable(),
    openrouter: isOpenRouterAvailable()
  };
}

module.exports = { extractSkills, calculateSimilarity, analyzeResume, getAvailableProviders };
