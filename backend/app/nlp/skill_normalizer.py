from __future__ import annotations

import re


SKILL_ALIASES = {
    "python": "Python",
    "python 3": "Python",

    "javascript": "JavaScript",
    "java script": "JavaScript",
    "js": "JavaScript",

    "typescript": "TypeScript",
    "ts": "TypeScript",

    "c++": "C++",
    "cpp": "C++",

    "c#": "C#",
    "c sharp": "C#",

    ".net": ".NET",
    "dotnet": ".NET",

    "react": "React",
    "reactjs": "React",
    "react js": "React",
    "react.js": "React",

    "node": "Node.js",
    "nodejs": "Node.js",
    "node js": "Node.js",
    "node.js": "Node.js",

    "fastapi": "FastAPI",
    "fast api": "FastAPI",

    "django": "Django",
    "flask": "Flask",

    "spring": "Spring",
    "spring boot": "Spring Boot",

    "mongodb": "MongoDB",
    "mongo": "MongoDB",

    "mysql": "MySQL",

    "postgresql": "PostgreSQL",
    "postgres": "PostgreSQL",

    "sql": "SQL",

    "aws": "AWS",
    "amazon web services": "AWS",

    "azure": "Azure",
    "microsoft azure": "Azure",

    "gcp": "Google Cloud",
    "google cloud": "Google Cloud",

    "tensorflow": "TensorFlow",
    "pytorch": "PyTorch",

    "scikit-learn": "scikit-learn",
    "sklearn": "scikit-learn",

    "pandas": "Pandas",
    "numpy": "NumPy",

    "docker": "Docker",

    "kubernetes": "Kubernetes",
    "k8s": "Kubernetes",

    "git": "Git",
    "github": "GitHub",

    "rest api": "REST APIs",
    "rest apis": "REST APIs",
    "restful api": "REST APIs",
    "restful apis": "REST APIs",

    "machine learning": "Machine Learning",
    "ml": "Machine Learning",

    "deep learning": "Deep Learning",
    "dl": "Deep Learning",

    "nlp": "NLP",
    "natural language processing": "NLP",

    "html": "HTML",
    "css": "CSS",

    "tailwind": "Tailwind CSS",
    "tailwind css": "Tailwind CSS",
}


def normalize_key(value: str) -> str:
    value = str(value).strip().lower()
    value = re.sub(r"\s+", " ", value)
    return value


def normalize_skill(value: str) -> str:
    key = normalize_key(value)
    return SKILL_ALIASES.get(key, value.strip())


def normalize_skills(skills: list[str]) -> list[str]:
    normalized = [normalize_skill(skill) for skill in skills]

    # Remove duplicates while preserving order.
    return list(dict.fromkeys(normalized))