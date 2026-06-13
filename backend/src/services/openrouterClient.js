const axios = require('axios');

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

const FREE_MODELS = [
  'nvidia/nemotron-3-ultra-550b-a55b:free',
  'google/gemma-4-31b-it:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
  'openai/gpt-oss-120b:free',
  'google/gemma-4-26b-a4b-it:free',
  'qwen/qwen3-coder:free',
  'nvidia/nemotron-3-nano-30b-a3b:free'
];

let cachedModel = null;
let lastModelError = null;

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
- Scan the RESUME TEXT below and identify 3-4 actual bullet points that contain weak phrasing (helped, assisted, responsible for, worked on, handled, participated, was part of, etc.)
- The "original" field MUST be the EXACT VERBATIM text extracted from the resume — do not modify it
- Rewrite each with strong action verbs (engineered, spearheaded, optimized, designed, implemented, architected, etc.) and add specific quantifiable metrics/outcomes where possible
- The "reason" field should explain specifically what was weak about the original and how the rewrite improves it
- IMPORTANT: If the resume has fewer than 3 weak bullet points, select the most impactful experience entries and rewrite them to be stronger even if they don't contain obvious weak verbs

RESUME TEXT:
{resume_text}

JOB DESCRIPTION (if provided):
{job_description}

Return ONLY the JSON object, no other text.`;

async function tryModel(modelName, resumeText, jobDescription) {
  const prompt = ANALYSIS_PROMPT
    .replace('{resume_text}', resumeText)
    .replace('{job_description}', jobDescription || 'Not provided');

  const response = await axios.post(OPENROUTER_API_URL, {
    model: modelName,
    messages: [
      { role: 'system', content: 'You are an ATS resume analysis expert. Always respond with valid JSON only. No markdown, no code fences, no explanations.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.3,
    max_tokens: 4000
  }, {
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://github.com/atsify',
      'X-OpenRouter-Title': 'ATSify Resume Analyzer'
    },
    timeout: 60000
  });

  const text = response.data.choices[0].message.content;

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Invalid response format');
  }

  const analysis = JSON.parse(jsonMatch[0]);

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

async function analyzeWithOpenRouter(resumeText, jobDescription = null) {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OpenRouter API key not configured');
  }

  if (cachedModel) {
    try {
      console.log(`[OpenRouter] Trying cached model: ${cachedModel}`);
      return await tryModel(cachedModel, resumeText, jobDescription);
    } catch (err) {
      console.warn(`[OpenRouter] Cached model ${cachedModel} failed: ${err.message.slice(0, 80)}`);
      cachedModel = null;
    }
  }

  for (const modelName of FREE_MODELS) {
    try {
      console.log(`[OpenRouter] Trying model: ${modelName}`);
      const result = await tryModel(modelName, resumeText, jobDescription);
      console.log(`[OpenRouter] Model ${modelName} succeeded`);
      cachedModel = modelName;
      return result;
    } catch (err) {
      console.warn(`[OpenRouter] Model ${modelName} failed: ${err.message.slice(0, 80)}`);
      lastModelError = err.message;
    }
  }

  throw new Error(lastModelError || 'No available OpenRouter model');
}

module.exports = { analyzeWithOpenRouter, isOpenRouterAvailable: () => !!OPENROUTER_API_KEY };
