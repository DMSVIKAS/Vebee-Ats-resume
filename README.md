# 🚀 VeeBee ATS

### AI-Powered Resume Intelligence & Job Matching Platform

VeeBee ATS is an AI-powered resume analysis platform that helps job seekers understand how well their resume matches a Job Description, identify missing skills and keywords, improve their resume, and generate an ATS-friendly optimized version.

It brings resume analysis, Job Description matching, optimization, AI suggestions, and ATS compatibility analysis into one platform.

---

## 🌐 Live Demo

### 🔗 VeeBee ATS
https://vebee-ats-resume-nkwkgi5di-dms-vikass-projects.vercel.app/

### ⚙️ Backend API
https://vebee-ats-resume.onrender.com

### ❤️ API Health Check
https://vebee-ats-resume.onrender.com/health

---

## ✨ Features

### 📄 Resume Analysis
Upload or provide your resume and extract important information for analysis.

- Resume text extraction
- Skill identification
- Keyword analysis
- Resume content analysis
- Structured resume processing

### 🎯 Job Description Checker

Compare your resume with a target Job Description and understand:

- Matching skills
- Missing skills
- Relevant keywords
- Job requirements
- Resume-JD compatibility
- Improvement areas

### 🤖 Resume Optimizer

Optimize your resume according to a target Job Description.

The optimizer can help with:

- ATS-friendly resume content
- Keyword optimization
- Skill alignment
- Resume bullet improvements
- Job-specific customization
- LaTeX resume generation
- PDF generation

### 🧠 AI Suggester

Get actionable suggestions for improving your resume based on the requirements of the target role.

### 📊 ATS Compatibility Analysis

VeeBee analyzes the relationship between your resume and the Job Description to provide a compatibility estimate and highlight areas that may need improvement.

### 📥 Resume Templates

VeeBee provides multiple LaTeX resume templates that can be downloaded and used for resume generation.

---

## 🛠️ Tech Stack

### Frontend

- React
- Vite
- React Router
- JavaScript
- Lucide React
- Mammoth
- PDF.js

### Backend

- Python
- FastAPI
- Uvicorn
- Pydantic
- scikit-learn
- spaCy
- Sentence Transformers
- Transformers
- PyTorch
- XGBoost
- LightGBM

### Resume Processing

- PDF processing
- DOCX processing
- TXT processing
- NLP-based analysis
- Skill normalization
- LaTeX generation
- ATS-oriented resume optimization

### Deployment

- Vercel — Frontend
- Render — Backend
- GitHub — Source Code

---

## 🏗️ Project Structure

```text
Vebee-Ats-resume/
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── jd_checker.py
│   │   │   ├── nlp.py
│   │   │   └── optimizer.py
│   │   │
│   │   ├── knowledge/
│   │   ├── templates/
│   │   └── main.py
│   │
│   ├── Dockerfile
│   └── requirements.txt
│
├── data/
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── lib/
│   │   ├── pages/
│   │   └── main.jsx
│   │
│   ├── package.json
│   ├── package-lock.json
│   └── vercel.json
│
└── README.md
