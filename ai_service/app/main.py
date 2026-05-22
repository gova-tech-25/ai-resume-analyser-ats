import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from .schemas import (
    SkillsExtractionRequest,
    SkillsExtractionResponse,
    SimilarityRequest,
    SimilarityResponse,
    ATSAnalysisRequest,
    ATSAnalysisResponse
)
from .nlp import extract_skills, calculate_similarity, analyze_resume

app = FastAPI(
    title="Resume Analyzer & ATS AI Service",
    description="NLP-powered microservice for skills extraction, resume analysis, and job description mapping.",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins in development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "AI Resume Analyzer Microservice is running!"}

@app.post("/extract-skills", response_model=SkillsExtractionResponse)
async def api_extract_skills(payload: SkillsExtractionRequest):
    try:
        skills = extract_skills(payload.text)
        return SkillsExtractionResponse(skills=skills)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Skill extraction failed: {str(e)}")

@app.post("/calculate-similarity", response_model=SimilarityResponse)
async def api_calculate_similarity(payload: SimilarityRequest):
    try:
        score = calculate_similarity(payload.resume_text, payload.job_description)
        return SimilarityResponse(similarity_score=score)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Similarity calculation failed: {str(e)}")

@app.post("/analyze-resume", response_model=ATSAnalysisResponse)
async def api_analyze_resume(payload: ATSAnalysisRequest):
    try:
        (
            ats_score,
            matching_keywords,
            missing_keywords,
            grammar_score,
            sections_score,
            improvements,
            suggested_projects,
            suggested_certifications,
            skills_extracted
        ) = analyze_resume(payload.resume_text, payload.job_description)
        
        return ATSAnalysisResponse(
            ats_score=ats_score,
            matching_keywords=matching_keywords,
            missing_keywords=missing_keywords,
            grammar_score=grammar_score,
            sections_score=sections_score,
            improvements=improvements,
            suggested_projects=suggested_projects,
            suggested_certifications=suggested_certifications,
            skills_extracted=skills_extracted
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"ATS analysis failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    # Bind to port 8000
    uvicorn.run(app, host="0.0.0.0", port=8000)
