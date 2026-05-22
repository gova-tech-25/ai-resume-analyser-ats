import re
import numpy as np
from typing import List, Dict, Tuple, Optional
from .schemas import BulletImprovement

# Try to load SentenceTransformer for semantic matching, fall back to TF-IDF if unavailable
try:
    from sentence_transformers import SentenceTransformer
    # Using the standard, lightweight, fast model
    model = SentenceTransformer('all-MiniLM-L6-v2')
    HAS_SENTENCE_TRANSFORMER = True
except Exception as e:
    print(f"Warning: Could not load sentence-transformers: {e}. Falling back to TF-IDF similarity.")
    HAS_SENTENCE_TRANSFORMER = False

# Try to load spaCy for tokenization
try:
    import spacy
    nlp = spacy.load("en_core_web_sm")
    HAS_SPACY = True
except Exception as e:
    print(f"Warning: Could not load spaCy: {e}. Falling back to basic regex tokenizer.")
    HAS_SPACY = False

# Dictionary of technical and soft skills to match against
SKILL_DATABASE = {
    # Programming Languages
    "javascript", "typescript", "python", "java", "c++", "c#", "go", "rust", "ruby", "php", "sql", "html", "css", "swift", "kotlin", "scala", "r", "shell",
    # Frameworks & Libraries
    "react", "angular", "vue", "node.js", "express", "django", "fastapi", "spring boot", "flask", "asp.net", "next.js", "nuxt.js", "tailwind css", "bootstrap", "redux", "graphql", "jquery",
    # AI & Data Science
    "pytorch", "tensorflow", "keras", "scikit-learn", "pandas", "numpy", "machine learning", "deep learning", "nlp", "computer vision", "data science", "tableau", "power bi",
    # Databases & Cloud
    "mongodb", "postgresql", "mysql", "redis", "firebase", "sqlite", "elasticsearch", "cassandra", "aws", "gcp", "azure", "docker", "kubernetes", "jenkins", "git", "github actions", "aws lambda", "s3", "ec2",
    # Architecture & Tools
    "rest api", "restful api", "microservices", "system design", "graphql", "webpack", "vite", "jira", "confluence",
    # Soft & Management Skills
    "agile", "scrum", "project management", "leadership", "teamwork", "communication", "problem solving", "critical thinking", "time management", "product management", "ui/ux", "wireframing"
}

def clean_text(text: str) -> str:
    """Basic text cleanup."""
    if not text:
        return ""
    text = text.lower()
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def extract_skills(text: str) -> List[str]:
    """Extract skills from text using boundary matching."""
    cleaned = clean_text(text)
    extracted = []
    
    # We use regex word boundaries to avoid matching substrings like "go" inside "google"
    for skill in SKILL_DATABASE:
        # Create regex pattern for the skill
        # Escape special characters in skill name (e.g. c++, node.js)
        escaped_skill = re.escape(skill)
        
        # Word boundary handles standard text, but we must be careful with special chars like C++
        if skill.endswith('+') or skill.endswith('#') or skill.startswith('.'):
            # For special characters at boundaries, we don't use \b
            pattern = r'(?:^|\s)' + escaped_skill + r'(?:$|\s|\,|\.|\;|\:)'
        else:
            # Standard word boundary
            pattern = r'\b' + escaped_skill + r'\b'
            
        if re.search(pattern, cleaned):
            extracted.append(skill)
            
    # Return formatted list (title case or proper casing)
    casing_map = {
        "javascript": "JavaScript", "typescript": "TypeScript", "python": "Python", "java": "Java", 
        "c++": "C++", "c#": "C#", "go": "Go", "rust": "Rust", "ruby": "Ruby", "php": "PHP", 
        "sql": "SQL", "html": "HTML", "css": "CSS", "swift": "Swift", "kotlin": "Kotlin", 
        "scala": "Scala", "r": "R", "shell": "Shell Scripting",
        "react": "React", "angular": "Angular", "vue": "Vue.js", "node.js": "Node.js", 
        "express": "Express.js", "django": "Django", "fastapi": "FastAPI", "spring boot": "Spring Boot", 
        "flask": "Flask", "asp.net": "ASP.NET", "next.js": "Next.js", "nuxt.js": "Nuxt.js", 
        "tailwind css": "Tailwind CSS", "bootstrap": "Bootstrap", "redux": "Redux", "graphql": "GraphQL", 
        "jquery": "jQuery", "pytorch": "PyTorch", "tensorflow": "TensorFlow", "keras": "Keras", 
        "scikit-learn": "Scikit-Learn", "pandas": "Pandas", "numpy": "NumPy", "machine learning": "Machine Learning", 
        "deep learning": "Deep Learning", "nlp": "NLP", "computer vision": "Computer Vision", 
        "data science": "Data Science", "tableau": "Tableau", "power bi": "Power BI", 
        "mongodb": "MongoDB", "postgresql": "PostgreSQL", "mysql": "MySQL", "redis": "Redis", 
        "firebase": "Firebase", "sqlite": "SQLite", "elasticsearch": "Elasticsearch", 
        "cassandra": "Cassandra", "aws": "AWS", "gcp": "GCP", "azure": "Azure", 
        "docker": "Docker", "kubernetes": "Kubernetes", "jenkins": "Jenkins", "git": "Git", 
        "github actions": "GitHub Actions", "aws lambda": "AWS Lambda", "s3": "AWS S3", "ec2": "AWS EC2", 
        "rest api": "REST API", "restful api": "RESTful API", "microservices": "Microservices", 
        "system design": "System Design", "webpack": "Webpack", "vite": "Vite", "jira": "Jira", 
        "confluence": "Confluence", "agile": "Agile", "scrum": "Scrum", "project management": "Project Management", 
        "leadership": "Leadership", "teamwork": "Teamwork", "communication": "Communication", 
        "problem solving": "Problem Solving", "critical thinking": "Critical Thinking", 
        "time management": "Time Management", "product management": "Product Management", 
        "ui/ux": "UI/UX", "wireframing": "Wireframing"
    }
    
    return sorted(list({casing_map.get(s, s.title()) for s in extracted}))

def calculate_similarity(resume_text: str, job_description: str) -> float:
    """Calculate semantic similarity between resume and job description."""
    if not resume_text or not job_description:
        return 0.0
        
    if HAS_SENTENCE_TRANSFORMER:
        try:
            # Encode both texts to get embeddings
            embeddings = model.encode([resume_text, job_description])
            # Cosine similarity
            dot_product = np.dot(embeddings[0], embeddings[1])
            norm_a = np.linalg.norm(embeddings[0])
            norm_b = np.linalg.norm(embeddings[1])
            similarity = (dot_product / (norm_a * norm_b)) * 100
            # Clamp between 0 and 100
            return float(max(0.0, min(100.0, similarity)))
        except Exception as e:
            print(f"Error computing SentenceTransformer similarity: {e}. Falling back to token matching.")
            
    # Fallback bag-of-words similarity
    res_tokens = set(clean_text(resume_text).split())
    jd_tokens = set(clean_text(job_description).split())
    if not res_tokens or not jd_tokens:
        return 0.0
    intersection = res_tokens.intersection(jd_tokens)
    # Jaccard index weighted towards standard match
    jaccard = (len(intersection) / len(res_tokens.union(jd_tokens))) * 100
    # Boost factor to align closer with semantic scales
    boosted = jaccard * 2.5
    return float(max(0.0, min(95.0, boosted)))

def analyze_resume(resume_text: str, job_description: Optional[str] = None) -> Tuple[int, List[str], List[str], int, int, List[BulletImprovement], List[str], List[str], List[str]]:
    """
    Analyzes resume text. Returns:
    - ats_score
    - matching_keywords
    - missing_keywords
    - grammar_score
    - sections_score
    - improvements
    - suggested_projects
    - suggested_certifications
    - skills_extracted
    """
    skills_extracted = extract_skills(resume_text)
    
    # 1. Matching/Missing Keywords
    matching_keywords = []
    missing_keywords = []
    if job_description:
        jd_skills = extract_skills(job_description)
        for s in jd_skills:
            if s.lower() in [se.lower() for se in skills_extracted]:
                matching_keywords.append(s)
            else:
                missing_keywords.append(s)
                
    # 2. Section Completeness Check
    sections = {
        "contact": ["email", "phone", "contact", "address", "linkedin", "github"],
        "education": ["education", "university", "college", "bachelor", "master", "phd", "degree", "gpa"],
        "experience": ["experience", "employment", "work history", "job", "position", "intern", "developer", "engineer"],
        "skills": ["skills", "technologies", "languages", "tools", "expertise"],
        "projects": ["projects", "portfolio", "personal projects", "hackathon"]
    }
    
    cleaned_resume = resume_text.lower()
    found_sections = 0
    for name, keywords in sections.items():
        if any(kw in cleaned_resume for kw in keywords):
            found_sections += 1
            
    sections_score = int((found_sections / len(sections)) * 100)
    
    # 3. Simple Grammar/Readability Heuristics
    # Check average sentence length, spelling mistakes, or passive voice indicators
    # We will simulate a score based on presence of bullet points, active verbs, and structure.
    has_bullets = bool(re.search(r'[•\-*]\s', resume_text))
    bullet_bonus = 20 if has_bullets else 0
    
    # Check for weak action verbs (e.g. worked, helped)
    weak_verbs = ["helped", "assisted", "responsible for", "worked on", "handled", "managed"]
    weak_verbs_count = sum(1 for wv in weak_verbs if wv in cleaned_resume)
    verb_penalty = max(0, weak_verbs_count * 5)
    
    grammar_score = max(50, 100 - verb_penalty + bullet_bonus)
    grammar_score = min(100, grammar_score)
    
    # 4. ATS Scoring Algorithm
    # Base parts: Sections completeness (30%), Keywords match (40%), Grammar & structure (30%)
    if job_description:
        keyword_match_pct = 100
        if len(matching_keywords) + len(missing_keywords) > 0:
            keyword_match_pct = (len(matching_keywords) / (len(matching_keywords) + len(missing_keywords))) * 100
            
        ats_score = int(
            (sections_score * 0.3) +
            (keyword_match_pct * 0.4) +
            (grammar_score * 0.3)
        )
    else:
        # Without job description, ATS score is based on skill count, sections completeness, and grammar
        skill_count_pct = min(100, (len(skills_extracted) / 12) * 100)
        ats_score = int(
            (sections_score * 0.4) +
            (skill_count_pct * 0.3) +
            (grammar_score * 0.3)
        )
        
    ats_score = max(20, min(99, ats_score)) # cap between 20 and 99 for realism
    
    # 5. Suggest Bullet Improvements
    improvements = []
    # Identify paragraphs/lines that look like bullet points
    lines = resume_text.split('\n')
    bullet_lines = [l.strip() for l in lines if len(l.strip()) > 20 and l.strip().startswith(('-', '*', '•'))]
    
    # Default bullet improvements if none found in text
    generic_improvements = [
        BulletImprovement(
            original="Worked on the backend system using Node.js and MongoDB.",
            improved="Engineered and optimized backend REST APIs using Node.js and MongoDB, reducing server response times by 35%.",
            reason="Replaced weak verb 'worked on' with 'engineered and optimized' and added quantifiable impact metrics."
        ),
        BulletImprovement(
            original="Helped team with front-end React development.",
            improved="Spearheaded the integration of React state management using Redux, improving modular code reusability across 4 departments.",
            reason="Replaced weak verb 'helped' with action-oriented 'spearheaded' and specified domain of impact."
        ),
        BulletImprovement(
            original="Responsible for testing and fixing bugs.",
            improved="Implemented automated Jest unit testing, raising test coverage from 45% to 88% and preventing critical production regressions.",
            reason="Avoided passive phrase 'responsible for' and detailed automated testing impact."
        )
    ]
    
    # If the user's resume has weak-verb bullets, rewrite them
    rewritten_count = 0
    for line in bullet_lines:
        line_clean = line.strip('-*• ').strip()
        for wv in weak_verbs:
            if wv in line_clean.lower() and rewritten_count < 3:
                # Suggest a rewrite
                if "help" in wv or "assist" in wv:
                    improved_text = "Collaborated with cross-functional teams to design and implement " + line_clean.replace(wv, "").strip() + ", enhancing workflow delivery speeds by 15%."
                    reason = f"Replaced weak verb '{wv}' with collaborative action verb and appended metric framework."
                elif "work" in wv or "handle" in wv or "manage" in wv:
                    improved_text = "Orchestrated and managed critical technical deployments of " + line_clean.replace(wv, "").strip() + ", minimizing downtime to under 0.1%."
                    reason = f"Upgraded action verb '{wv}' to highlight leadership and technical ownership."
                else:
                    improved_text = "Spearheaded and executed development for " + line_clean.replace(wv, "").strip() + ", delivering project 2 weeks ahead of schedule."
                    reason = f"Transformed weak responsibility statement '{wv}' to direct project impact statement."
                    
                improvements.append(BulletImprovement(original=line_clean, improved=improved_text, reason=reason))
                rewritten_count += 1
                break
                
    if not improvements:
        improvements = generic_improvements
        
    # 6. Suggested Projects & Certifications based on skills and missing keywords
    suggested_projects = []
    suggested_certifications = []
    
    # Skill-based suggestions
    skills_lower = [s.lower() for s in skills_extracted]
    missing_lower = [m.lower() for m in missing_keywords]
    
    if "python" in skills_lower or "machine learning" in missing_lower:
        suggested_projects.append("End-to-End Predictive Analytics Pipeline using Python and Scikit-Learn")
        suggested_certifications.append("TensorFlow Developer Certificate or Google Professional Data Engineer")
        
    if "react" in skills_lower or "react" in missing_lower:
        suggested_projects.append("Real-Time Multi-tenant SaaS Dashboard with React, Tailwind CSS, and WebSockets")
        suggested_certifications.append("Meta Front-End Developer Professional Certificate")
        
    if "node.js" in skills_lower or "mongodb" in missing_lower:
        suggested_projects.append("Microservices-Based E-Commerce Backend using Node.js, Express, and MongoDB")
        suggested_certifications.append("MongoDB Certified Developer Associate")
        
    if "aws" in missing_lower or "aws" in skills_lower:
        suggested_projects.append("Serverless File Processing Infrastructure on AWS (S3, Lambda, and DynamoDB)")
        suggested_certifications.append("AWS Certified Solutions Architect – Associate")
        
    if "docker" in missing_lower or "kubernetes" in missing_lower:
        suggested_projects.append("Multi-Container Deployment orchestration with Docker Compose and Kubernetes CI/CD")
        suggested_certifications.append("Certified Kubernetes Administrator (CKA)")
        
    # Fill defaults if suggestions empty
    if not suggested_projects:
        suggested_projects = [
            "Full-Stack Collaborative Project Manager Platform with Real-time Updates",
            "RESTful API Gateway Service with OAuth2 and Rate Limiting Middleware"
        ]
    if not suggested_certifications:
        suggested_certifications = [
            "CompTIA Security+ or Certified ScrumMaster (CSM)",
            "Google Cloud Associate Cloud Engineer"
        ]
        
    return (
        ats_score,
        matching_keywords,
        missing_keywords,
        grammar_score,
        sections_score,
        improvements,
        suggested_projects,
        suggested_certifications,
        skills_extracted
    )
