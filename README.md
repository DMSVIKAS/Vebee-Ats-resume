
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

<img width="1086" height="1448" alt="ChatGPT Image Sep 15, 2026, 11_01_56 PM" src="https://github.com/user-attachments/assets/c41dfc0f-fe61-4fa2-aa3a-631ffb12da23" />
<img width="1086" height="1448" alt="ChatGPT Image Sep 15, 2026, 11_03_05 PM" src="https://github.com/user-attachments/assets/41c3e59f-4fcc-495b-8458-4295b278192a" />
<img width="1086" height="1448" alt="ChatGPT Image Sep 15, 2026, 11_04_46 PM" src="https://github.com/user-attachments/assets/85a89d41-19d5-4b1e-a2e7-6185320375cd" />
<img width="1254" height="1254" alt="ChatGPT Image Sep 15, 2026, 10_58_37 PM" src="https://github.com/user-attachments/assets/89b62a6a-a956-4340-be35-e41b55a19864" />
<img width="1086" height="1448" alt="ChatGPT Image Sep 15, 2026, 10_59_42 PM" src="https://github.com/user-attachments/assets/76933fa1-dc30-4e0c-98b6-1dad293e0475" />
<img width="1086" height="1448" alt="ChatGPT Image Sep 15, 2026, 11_00_50 PM" src="https://github.com/user-attachments/assets/af8f4895-03eb-4677-a87e-ec00c746631d" />

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
