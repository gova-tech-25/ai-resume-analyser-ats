from pydantic import BaseModel, Field
from typing import List, Optional, Dict

class SkillsExtractionRequest(BaseModel):
    text: str

class SkillsExtractionResponse(BaseModel):
    skills: List[str]

class SimilarityRequest(BaseModel):
    resume_text: str
    job_description: str

class SimilarityResponse(BaseModel):
    similarity_score: float

class ATSAnalysisRequest(BaseModel):
    resume_text: str
    job_description: Optional[str] = None

class BulletImprovement(BaseModel):
    original: str
    improved: str
    reason: str

class ATSAnalysisResponse(BaseModel):
    ats_score: int
    matching_keywords: List[str]
    missing_keywords: List[str]
    grammar_score: int
    sections_score: int
    improvements: List[BulletImprovement]
    suggested_projects: List[str]
    suggested_certifications: List[str]
    skills_extracted: List[str]
