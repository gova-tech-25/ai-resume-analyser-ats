const { GoogleGenerativeAI } = require('@google/generative-ai');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite',
  'gemini-3-flash-preview',
  'gemini-2.0-flash'
];

let genAI = null;
let cachedModel = null;
let lastModelError = null;

if (GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
}

async function getWorkingModel() {
  if (cachedModel) return cachedModel;

  for (const modelName of GEMINI_MODELS) {
    try {
      const m = genAI.getGenerativeModel({ model: modelName });
      const r = await m.generateContent('reply with just the word "ok"');
      const txt = (await r.response).text().trim();
      if (txt.toLowerCase().includes('ok')) {
        console.log(`[Gemini] Using model: ${modelName}`);
        cachedModel = m;
        return m;
      }
    } catch (e) {
      console.log(`[Gemini] Model ${modelName} unavailable: ${e.message?.slice(0, 60)}`);
      lastModelError = e.message;
    }
  }

  throw new Error(lastModelError || 'No available Gemini model');
}

const ANALYSIS_PROMPT = `You are an expert ATS (Applicant Tracking System) and resume optimization specialist.

Analyze the following resume and return a JSON object with this EXACT structure (no markdown, no code fences, just raw JSON):
{
  "ats_score": <number 0-100>,
  "matching_keywords": [<array of matching skills found in resume>],
  "missing_keywords": [<array of important skills NOT found in resume>],
  "grammar_score": <number 0-100, based on writing quality>,
  "sections_score": <number 0-100, based on section completeness>,
  "improvements": [
    {
      "original": "<original weak bullet point>",
      "improved": "<rewritten strong bullet point>",
      "reason": "<explanation of improvement>"
    }
  ],
  "suggested_projects": [<array of 3-5 specific, resume-tailored project ideas that would strengthen the candidate's portfolio>],
  "suggested_certifications": [<array of 2-4 certification recommendations>],
  "skills_extracted": [<array of ALL skills/technologies found in resume>],
  "interview_questions": [<array of 6-8 specific interview questions combining technical questions (based on job requirements) and behavioral questions (based on resume experience). Include both coding/system-design and behavioral/soft-skill questions.>]
}

For scoring:
- ATS Score: weighted combination of keyword match, section completeness, and writing quality
- Grammar Score: assess writing quality, action verbs, quantifiable achievements
- Sections Score: check for contact info, education, experience, skills, projects sections

For improvements:
- Find 3 bullet points with weak verbs (helped, assisted, responsible for, worked on, handled)
- Rewrite them with strong action verbs and quantifiable metrics

RESUME TEXT:
{resume_text}

JOB DESCRIPTION (if provided):
{job_description}

Return ONLY the JSON object, no other text.`;

async function analyzeWithGemini(resumeText, jobDescription = null) {
  const m = await getWorkingModel();

  const prompt = ANALYSIS_PROMPT
    .replace('{resume_text}', resumeText)
    .replace('{job_description}', jobDescription || 'Not provided');

  const result = await m.generateContent(prompt);
  const response = await result.response;
  const text = response.text();

  // Parse JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Invalid response format from Gemini');
  }

  const analysis = JSON.parse(jsonMatch[0]);

  // Validate and normalize scores
  return {
    ats_score: Math.max(0, Math.min(100, analysis.ats_score || 0)),
    matching_keywords: Array.isArray(analysis.matching_keywords) ? analysis.matching_keywords : [],
    missing_keywords: Array.isArray(analysis.missing_keywords) ? analysis.missing_keywords : [],
    grammar_score: Math.max(0, Math.min(100, analysis.grammar_score || 0)),
    sections_score: Math.max(0, Math.min(100, analysis.sections_score || 0)),
    improvements: Array.isArray(analysis.improvements) ? analysis.improvements : [],
    suggested_projects: Array.isArray(analysis.suggested_projects) ? analysis.suggested_projects : [],
    suggested_certifications: Array.isArray(analysis.suggested_certifications) ? analysis.suggested_certifications : [],
    skills_extracted: Array.isArray(analysis.skills_extracted) ? analysis.skills_extracted : [],
    interview_questions: Array.isArray(analysis.interview_questions) ? analysis.interview_questions : []
  };
}

module.exports = { analyzeWithGemini, isGeminiAvailable: () => !!genAI };
