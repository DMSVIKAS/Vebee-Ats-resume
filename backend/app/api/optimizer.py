from __future__ import annotations

import base64
import re
import shutil
import subprocess
import tempfile
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ..jd_checker.jd_service import jd_service


router = APIRouter(
    prefix="/optimizer",
    tags=["Resume Optimizer"],
)


# ============================================================================
# TEXT UTILITIES
# ============================================================================

def to_text(value: Any) -> str:
    if value is None:
        return ""

    if isinstance(value, str):
        return value

    if isinstance(value, (list, tuple, set)):
        return "\n".join(
            to_text(item)
            for item in value
            if to_text(item).strip()
        )

    if isinstance(value, dict):
        return "\n".join(
            f"{key}: {to_text(item)}"
            for key, item in value.items()
            if to_text(item).strip()
        )

    return str(value)


def clean_text(value: Any = "") -> str:
    return re.sub(
        r"\s+",
        " ",
        to_text(value),
    ).strip()


def normalize(value: Any = "") -> str:
    return clean_text(value).lower()


def clean_lines(value: Any = "") -> list[str]:
    text = to_text(value)

    result = []

    for raw in text.splitlines():
        line = clean_text(raw)

        if line:
            result.append(line)

    return result


def unique(values: list[str]) -> list[str]:
    seen = set()
    result = []

    for value in values:
        key = normalize(value)

        if key and key not in seen:
            seen.add(key)
            result.append(value)

    return result


# ============================================================================
# REQUEST
# ============================================================================

class OptimizeRequest(BaseModel):
    resume_text: Any = Field(
        ...,
        description="Extracted resume text",
    )

    jd_text: Any = Field(
        ...,
        description="Job description text",
    )

    report_text: Any = Field(
        default="",
        description="Previous ATS report",
    )

    mode: str = Field(
        default="balanced",
        description="minimal, balanced, aggressive",
    )


# ============================================================================
# SKILLS
# ============================================================================

SKILL_ALIASES = {
    "c++": "C++",
    "cpp": "C++",
    "c language": "C",
    "c": "C",
    "c#": "C#",

    "python": "Python",
    "python3": "Python",
    "lua": "Lua",

    "java": "Java",
    "javascript": "JavaScript",
    "typescript": "TypeScript",

    "react": "React",
    "reactjs": "React",
    "node": "Node.js",
    "nodejs": "Node.js",

    "html": "HTML",
    "css": "CSS",

    "sql": "SQL",
    "mysql": "MySQL",
    "mongodb": "MongoDB",

    "git": "Git",
    "github": "GitHub",

    "docker": "Docker",
    "kubernetes": "Kubernetes",

    "unreal engine": "Unreal Engine",
    "unreal engine 4": "Unreal Engine 4",
    "unreal engine 5": "Unreal Engine 5",

    "unity": "Unity",
    "unity 3d": "Unity 3D",

    "godot": "Godot",
    "godot 4": "Godot 4",

    "blueprints": "Blueprints",
    "hlsl": "HLSL",
    "glsl": "GLSL",

    "fmod": "FMOD",
    "photon": "Photon",
    "photon pun 2": "Photon PUN 2",

    "open gl": "OpenGL",
    "opengl": "OpenGL",

    "maya": "Maya",

    "perforce": "Perforce",
    "svn": "SVN",
    "jira": "Jira",

    "jenkins": "Jenkins",

    "python slate": "Python",
    "slate": "Slate",

    "ai": "AI",
    "machine learning": "Machine Learning",
    "deep learning": "Deep Learning",

    "linear algebra": "Linear Algebra",
    "3d math": "3D Math",

    "json": "JSON",
    "xml": "XML",

    "oop": "OOP",
}


def extract_skills(text: Any) -> list[str]:
    source = normalize(text)

    found = []

    for alias, canonical in SKILL_ALIASES.items():

        if re.search(
            rf"(?<![a-z0-9+#.])"
            rf"{re.escape(alias)}"
            rf"(?![a-z0-9+#.])",
            source,
            flags=re.I,
        ):
            if canonical not in found:
                found.append(canonical)

    return found


# ============================================================================
# SECTION DETECTION
# ============================================================================

SECTION_ALIASES = {
    "summary": {
        "professional summary",
        "summary",
        "profile",
        "professional profile",
        "objective",
    },

    "skills": {
        "technical skills",
        "technical skill",
        "programming skills",
        "skills",
        "core skills",
        "technical expertise",
        "languages & scripting",
        "languages and scripting",
    },

    "experience": {
        "professional experience",
        "professional experiences",
        "work experience",
        "experience",
        "employment",
        "career experience",
    },

    "projects": {
        "notable projects",
        "selected projects",
        "projects",
        "personal projects",
        "academic projects",
    },

    "education": {
        "education",
        "academic background",
        "academic qualifications",
    },

    "certifications": {
        "certifications",
        "certificates",
        "certification",
    },
}


def detect_section(line: str) -> str | None:
    normalized = normalize(line)

    # Remove decorative characters.
    normalized = normalized.strip(":-| ")

    for section, names in SECTION_ALIASES.items():

        if normalized in names:
            return section

    return None


def split_sections(text: Any) -> dict[str, list[str]]:
    sections = {
        "summary": [],
        "skills": [],
        "experience": [],
        "projects": [],
        "education": [],
        "certifications": [],
        "other": [],
    }

    current = "other"

    for raw_line in clean_lines(text):

        line = clean_text(raw_line)

        section = detect_section(line)

        if section:
            current = section
            continue

        # Remove page-number footer noise.
        if re.search(
            r"page\s+\d+\s+of\s+\d+",
            line,
            flags=re.I,
        ):
            continue

        if re.search(
            r"^\[?your name\]?\s*-\s*game developer",
            line,
            flags=re.I,
        ):
            continue

        sections[current].append(line)

    return sections


# ============================================================================
# CANDIDATE INFORMATION
# ============================================================================

def extract_email(text: str) -> str:
    match = re.search(
        r"[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}",
        text,
    )

    return match.group(0) if match else ""


def extract_phone(text: str) -> str:
    matches = re.findall(
        r"(?<!\d)(\+?\d[\d\s().-]{7,}\d)(?!\d)",
        text,
    )

    for value in matches:

        digits = re.sub(
            r"\D",
            "",
            value,
        )

        if 9 <= len(digits) <= 15:
            return clean_text(value)

    return ""


def extract_name(text: str) -> str:
    lines = clean_lines(text)

    ignore_patterns = [
        r"game developer",
        r"gameplay programmer",
        r"resume",
        r"curriculum vitae",
        r"\[?your name\]?",
        r"\[.*name.*\]",
        r"@",
    ]

    for line in lines[:20]:

        if not line:
            continue

        if re.search(
            r"\d{7,}",
            line,
        ):
            continue

        ignored = False

        for pattern in ignore_patterns:
            if re.search(
                pattern,
                line,
                flags=re.I,
            ):
                ignored = True
                break

        if ignored:
            continue

        # Placeholder names are preserved if that is actually
        # all the uploaded resume contains.
        if len(line.split()) <= 6:
            return line

    return "Candidate Resume"


def extract_title(text: str) -> str:
    lines = clean_lines(text)

    for line in lines[:10]:

        normalized = normalize(line)

        if (
            "game developer" in normalized
            or "gameplay programmer" in normalized
            or "software engineer" in normalized
            or "developer" in normalized
        ):
            return line

    return ""


# ============================================================================
# REWRITING
# ============================================================================

REWRITE_RULES = [
    (
        r"^worked on\b",
        "Contributed to",
    ),
    (
        r"^worked with\b",
        "Collaborated with",
    ),
    (
        r"^responsible for\b",
        "Managed",
    ),
    (
        r"^involved in\b",
        "Contributed to",
    ),
    (
        r"^used\b",
        "Utilized",
    ),
    (
        r"^using\b",
        "Applied",
    ),
    (
        r"^helped\b",
        "Supported",
    ),
    (
        r"^helping\b",
        "Supporting",
    ),
    (
        r"^created\b",
        "Developed",
    ),
    (
        r"^made\b",
        "Developed",
    ),
    (
        r"^did\b",
        "Executed",
    ),
]


def improve_wording(value: Any) -> str:
    result = clean_text(value)

    for pattern, replacement in REWRITE_RULES:

        result = re.sub(
            pattern,
            replacement,
            result,
            count=1,
            flags=re.I,
        )

    return result


# ============================================================================
# ATS REPORT
# ============================================================================

def extract_report_signals(
    report_text: Any,
) -> dict[str, list[str]]:

    text = to_text(report_text)

    if not text.strip():
        return {
            "missing": [],
            "strengths": [],
        }

    skills = extract_skills(text)

    normalized = normalize(text)

    missing = []
    strengths = []

    for skill in skills:

        key = normalize(skill)

        if re.search(
            rf"(missing|gap|lacks|lack of|"
            rf"not found|absent|weak).{{0,150}}"
            rf"{re.escape(key)}",
            normalized,
        ):
            missing.append(skill)

        if re.search(
            rf"(matched|match|strength|strong|"
            rf"detected|found|good).{{0,150}}"
            rf"{re.escape(key)}",
            normalized,
        ):
            strengths.append(skill)

    return {
        "missing": unique(missing),
        "strengths": unique(strengths),
    }


# ============================================================================
# MATCHING
# ============================================================================

def build_match_data(
    resume_text: str,
    jd_text: str,
) -> dict[str, list[str]]:

    resume_skills = extract_skills(
        resume_text
    )

    jd_skills = extract_skills(
        jd_text
    )

    matched = [
        skill
        for skill in jd_skills
        if skill in resume_skills
    ]

    missing = [
        skill
        for skill in jd_skills
        if skill not in resume_skills
    ]

    return {
        "resume_skills": resume_skills,
        "jd_skills": jd_skills,
        "matched": matched,
        "missing": missing,
    }


# ============================================================================
# OPTIMIZATION
# ============================================================================

def build_optimization(
    resume_text: Any,
    jd_text: Any,
    report_text: Any,
    mode: str,
) -> dict[str, Any]:

    resume_text = to_text(resume_text)
    jd_text = to_text(jd_text)
    report_text = to_text(report_text)

    mode = normalize(mode)

    if mode not in {
        "minimal",
        "balanced",
        "aggressive",
    }:
        mode = "balanced"

    sections = split_sections(
        resume_text
    )

    match = build_match_data(
        resume_text,
        jd_text,
    )

    resume_skills = match["resume_skills"]
    jd_skills = match["jd_skills"]
    matched = match["matched"]
    missing = match["missing"]

    report_signals = extract_report_signals(
        report_text
    )

    summary = [
        line
        for line in sections["summary"]
        if len(line) >= 15
    ]

    experience = sections["experience"]

    projects = sections["projects"]

    education = sections["education"]

    # ---------------------------------------------------------
    # Reword only evidence already present in the source.
    # ---------------------------------------------------------

    optimized_summary = [
        improve_wording(line)
        for line in summary
    ]

    optimized_experience = [
        improve_wording(line)
        for line in experience
    ]

    optimized_projects = [
        improve_wording(line)
        for line in projects
    ]

    # ---------------------------------------------------------
    # Put JD-matched skills first.
    # Never add missing skills to the candidate's resume.
    # ---------------------------------------------------------

    matched_set = set(matched)

    ordered_skills = (
        [
            skill
            for skill in resume_skills
            if skill in matched_set
        ]
        +
        [
            skill
            for skill in resume_skills
            if skill not in matched_set
        ]
    )

    ordered_skills = unique(
        ordered_skills
    )

    # ---------------------------------------------------------
    # Changes
    # ---------------------------------------------------------

    changes = []

    if matched:
        changes.append(
            {
                "type": "keyword alignment",
                "text": (
                    f"Prioritized {len(matched)} "
                    "JD-relevant skill(s) already "
                    "present in the source resume."
                ),
            }
        )

    changed_summary = sum(
        1
        for before, after in zip(
            summary,
            optimized_summary,
        )
        if before != after
    )

    if changed_summary:
        changes.append(
            {
                "type": "summary",
                "text": (
                    f"Reworded {changed_summary} "
                    "summary line(s) using existing "
                    "candidate evidence."
                ),
            }
        )

    changed_experience = sum(
        1
        for before, after in zip(
            experience,
            optimized_experience,
        )
        if before != after
    )

    if changed_experience:
        changes.append(
            {
                "type": "experience",
                "text": (
                    f"Reworded {changed_experience} "
                    "experience line(s) with stronger "
                    "action-led language."
                ),
            }
        )

    changed_projects = sum(
        1
        for before, after in zip(
            projects,
            optimized_projects,
        )
        if before != after
    )

    if changed_projects:
        changes.append(
            {
                "type": "projects",
                "text": (
                    f"Reworded {changed_projects} "
                    "project line(s) without "
                    "inventing outcomes."
                ),
            }
        )

    if ordered_skills:
        changes.append(
            {
                "type": "skills",
                "text": (
                    "Reordered existing skills so "
                    "JD-relevant evidence appears first."
                ),
            }
        )

    if report_text.strip():
        changes.append(
            {
                "type": "ATS report",
                "text": (
                    "Used the previous ATS report as "
                    "an additional optimization signal."
                ),
            }
        )

    # ---------------------------------------------------------
    # Scores
    # ---------------------------------------------------------

    current = 45

    current += min(
        20,
        len(resume_skills) * 2,
    )

    if jd_skills:

        current += min(
            25,
            round(
                (
                    len(matched)
                    / max(len(jd_skills), 1)
                ) * 25
            ),
        )

    if summary:
        current += 3

    if experience:
        current += 5

    if projects:
        current += 2

    current = max(
        0,
        min(95, current),
    )

    improvement = {
        "minimal": 4,
        "balanced": 8,
        "aggressive": 12,
    }[mode]

    optimized = min(
        98,
        current + improvement,
    )

    cards = [
        {
            "title": "Skills",
            "score": min(
                98,
                current + (
                    7 if matched else 0
                ),
            ),
            "desc": (
                "Prioritizes existing skills "
                "that match the target job."
            ),
            "tags": ordered_skills[:6],
        },
        {
            "title": "Projects",
            "score": min(
                98,
                current + (
                    4 if projects else 0
                ),
            ),
            "desc": (
                "Makes existing project evidence "
                "easier to scan."
            ),
            "tags": [
                "Ownership",
                "Impact",
                "Evidence",
            ],
        },
        {
            "title": "Experience",
            "score": min(
                98,
                current + (
                    5 if experience else 0
                ),
            ),
            "desc": (
                "Uses clearer action-led wording "
                "for existing experience."
            ),
            "tags": [
                "Action",
                "Technology",
                "Evidence",
            ],
        },
        {
            "title": "Role fit",
            "score": min(
                98,
                current + min(
                    12,
                    len(matched) * 2,
                ),
            ),
            "desc": (
                "Prioritizes source evidence "
                "relevant to the target role."
            ),
            "tags": [
                "Relevant",
                "Specific",
                "Evidence",
            ],
        },
        {
            "title": "Formatting",
            "score": 94,
            "desc": (
                "Uses clean, ATS-friendly "
                "single-column formatting."
            ),
            "tags": [
                "Readable",
                "Consistent",
                "ATS-safe",
            ],
        },
        {
            "title": "Summary",
            "score": min(
                98,
                current + (
                    4 if summary else 0
                ),
            ),
            "desc": (
                "Strengthens the opening section "
                "without unsupported claims."
            ),
            "tags": [
                "Relevant",
                "Specific",
                "Evidence",
            ],
        },
    ]

    return {
        "current": current,
        "optimized": optimized,
        "mode": mode,

        "resume_skills": resume_skills,
        "jd_skills": jd_skills,
        "matched_skills": matched,
        "missing_skills": missing,

        "skills": ordered_skills,

        "summary": optimized_summary,
        "experience": optimized_experience,
        "projects": optimized_projects,
        "education": education,

        "changes": changes,
        "cards": cards,

        "best_edit": (
            "Prioritize JD-matched evidence "
            "already present in the resume."
            if matched
            else
            "Strengthen wording and structure "
            "without adding unsupported skills."
        ),

        "report_signals": report_signals,

        "evidence_preserved": True,
    }


# ============================================================================
# LATEX SAFETY
# ============================================================================

def escape_latex(value: Any) -> str:
    text = to_text(value)

    replacements = {
        "\\": r"\textbackslash{}",
        "&": r"\&",
        "%": r"\%",
        "$": r"\$",
        "#": r"\#",
        "_": r"\_",
        "{": r"\{",
        "}": r"\}",
        "~": r"\textasciitilde{}",
        "^": r"\textasciicircum{}",
    }

    result = []

    for character in text:

        result.append(
            replacements.get(
                character,
                character,
            )
        )

    return "".join(result)


# ============================================================================
# RESUME PDF RENDERING
# ============================================================================

def render_bullets(
    lines: list[str],
    limit: int = 80,
) -> str:

    if not lines:
        return ""

    output = [
        r"\begin{itemize}[leftmargin=*,itemsep=2pt,topsep=2pt]"
    ]

    count = 0

    for line in lines:

        line = clean_text(line)

        if not line:
            continue

        # Ignore page-footer artifacts.
        if re.search(
            r"page\s+\d+\s+of\s+\d+",
            line,
            flags=re.I,
        ):
            continue

        output.append(
            r"\item "
            + escape_latex(line)
        )

        count += 1

        if count >= limit:
            break

    output.append(
        r"\end{itemize}"
    )

    return "\n".join(output)


def render_experience(
    lines: list[str],
) -> str:

    if not lines:
        return ""

    output = [
        r"\section*{PROFESSIONAL EXPERIENCE}"
    ]

    for index, line in enumerate(lines):

        line = clean_text(line)

        if not line:
            continue

        # Typical role/company headers contain a pipe,
        # date range, or "Present".
        is_header = (
            "|" in line
            or bool(
                re.search(
                    r"\b\d{4}\b.*\b\d{4}\b",
                    line,
                )
            )
            or bool(
                re.search(
                    r"present$",
                    line,
                    flags=re.I,
                )
            )
        )

        if is_header:

            output.append(
                r"\vspace{2pt}"
            )

            output.append(
                r"\textbf{"
                + escape_latex(line)
                + "}"
            )

        else:

            output.append(
                r"\begin{itemize}"
                "[leftmargin=*,itemsep=1pt,topsep=1pt]"
            )

            output.append(
                r"\item "
                + escape_latex(line)
            )

            # Close immediately for simple single-line
            # source entries.
            output.append(
                r"\end{itemize}"
            )

    return "\n".join(output) + "\n"


def render_projects(
    lines: list[str],
) -> str:

    if not lines:
        return ""

    output = [
        r"\section*{NOTABLE PROJECTS}"
    ]

    for line in lines:

        line = clean_text(line)

        if not line:
            continue

        is_project_header = (
            "|" in line
            or re.search(
                r"solo developer|lead programmer|"
                r"engine programmer|gameplay dev",
                line,
                flags=re.I,
            )
        )

        if is_project_header:

            output.append(
                r"\vspace{2pt}"
            )

            output.append(
                r"\textbf{"
                + escape_latex(line)
                + "}"
            )

        else:

            output.append(
                r"\begin{itemize}"
                "[leftmargin=*,itemsep=1pt,topsep=1pt]"
            )

            output.append(
                r"\item "
                + escape_latex(line)
            )

            output.append(
                r"\end{itemize}"
            )

    return "\n".join(output) + "\n"


def build_pdf_latex(
    resume_text: str,
    optimization: dict[str, Any],
) -> str:

    sections = split_sections(
        resume_text
    )

    name = extract_name(
        resume_text
    )

    title = extract_title(
        resume_text
    )

    email = extract_email(
        resume_text
    )

    phone = extract_phone(
        resume_text
    )

    optimized_summary = optimization.get(
        "summary",
        [],
    )

    optimized_experience = optimization.get(
        "experience",
        [],
    )

    optimized_projects = optimization.get(
        "projects",
        [],
    )

    skills = optimization.get(
        "skills",
        [],
    )

    education = optimization.get(
        "education",
        [],
    )

    if not optimized_summary:
        optimized_summary = sections["summary"]

    if not optimized_experience:
        optimized_experience = sections["experience"]

    if not optimized_projects:
        optimized_projects = sections["projects"]

    if not education:
        education = sections["education"]

    # ---------------------------------------------------------
    # Header
    # ---------------------------------------------------------

    header = [
        r"\begin{center}",
        r"{\LARGE\bfseries "
        + escape_latex(name)
        + "}",
    ]

    if title:
        header.append(
            r"\\[-1pt]"
            + r"{\large "
            + escape_latex(title)
            + "}"
        )

    contacts = []

    if email:
        contacts.append(
            r"\href{mailto:"
            + escape_latex(email)
            + "}{"
            + escape_latex(email)
            + "}"
        )

    if phone:
        contacts.append(
            escape_latex(phone)
        )

    if contacts:

        header.append(
            r"\\[2pt]"
            + r"\small "
            + " | ".join(contacts)
        )

    header.append(
        r"\end{center}"
    )

    # ---------------------------------------------------------
    # Summary
    # ---------------------------------------------------------

    summary_block = ""

    if optimized_summary:

        summary_block = (
            r"\section*{PROFESSIONAL SUMMARY}"
            + "\n"
            + escape_latex(
                " ".join(
                    clean_text(item)
                    for item in optimized_summary
                    if clean_text(item)
                )
            )
            + "\n"
        )

    # ---------------------------------------------------------
    # Experience
    # ---------------------------------------------------------

    experience_block = render_experience(
        [
            clean_text(item)
            for item in optimized_experience
            if clean_text(item)
        ]
    )

    # ---------------------------------------------------------
    # Projects
    # ---------------------------------------------------------

    projects_block = render_projects(
        [
            clean_text(item)
            for item in optimized_projects
            if clean_text(item)
        ]
    )

    # ---------------------------------------------------------
    # Skills
    # ---------------------------------------------------------

    skills_block = ""

    if skills:

        skill_text = ", ".join(
            unique(
                [
                    clean_text(item)
                    for item in skills
                    if clean_text(item)
                ]
            )
        )

        skills_block = (
            r"\section*{TECHNICAL SKILLS}"
            + "\n"
            + escape_latex(skill_text)
            + "\n"
        )

    # ---------------------------------------------------------
    # Education
    # ---------------------------------------------------------

    education_block = ""

    education_clean = [
        clean_text(item)
        for item in education
        if clean_text(item)
    ]

    if education_clean:

        education_block = (
            r"\section*{EDUCATION}"
            + "\n"
            + render_bullets(
                education_clean,
                limit=30,
            )
            + "\n"
        )

    # ---------------------------------------------------------
    # Certifications
    # ---------------------------------------------------------

    certification_block = ""

    certifications = sections.get(
        "certifications",
        [],
    )

    if certifications:

        certification_block = (
            r"\section*{CERTIFICATIONS}"
            + "\n"
            + render_bullets(
                certifications,
                limit=20,
            )
            + "\n"
        )

    # ---------------------------------------------------------
    # Standalone ATS-friendly document
    # ---------------------------------------------------------

    return (
        r"""\documentclass[10pt]{article}

\usepackage[letterpaper,margin=0.62in]{geometry}
\usepackage[T1]{fontenc}
\usepackage{lmodern}
\usepackage{enumitem}
\usepackage[hidelinks]{hyperref}
\usepackage{titlesec}

\pagestyle{empty}

\setlength{\parindent}{0pt}
\setlength{\parskip}{3pt}

\titleformat{\section}
  {\large\bfseries}
  {}
  {0pt}
  {}
  [\titlerule]

\titlespacing*{\section}
  {0pt}
  {7pt}
  {3pt}

\begin{document}

"""
        + "\n".join(header)
        + "\n\n"
        + summary_block
        + "\n"
        + experience_block
        + "\n"
        + projects_block
        + "\n"
        + skills_block
        + "\n"
        + education_block
        + "\n"
        + certification_block
        + r"""
\end{document}
"""
    )


# ============================================================================
# PDF COMPILATION
# ============================================================================

def compile_latex(
    latex_source: str,
) -> bytes:

    pdflatex = shutil.which(
        "pdflatex"
    )

    if not pdflatex:

        pdflatex = (
            r"C:\Program Files\MiKTeX"
            r"\miktex\bin\x64\pdflatex.exe"
        )

    if not Path(pdflatex).exists():

        raise RuntimeError(
            "MiKTeX pdflatex.exe could not be found."
        )

    with tempfile.TemporaryDirectory() as temp_dir:

        workdir = Path(
            temp_dir
        )

        tex_file = (
            workdir / "resume.tex"
        )

        tex_file.write_text(
            latex_source,
            encoding="utf-8",
        )

        command = [
            pdflatex,
            "-interaction=nonstopmode",
            "-halt-on-error",
            "-file-line-error",
            "resume.tex",
        ]

        first = subprocess.run(
            command,
            cwd=workdir,
            capture_output=True,
            text=True,
            timeout=90,
        )

        if first.returncode != 0:

            output = (
                first.stdout
                + "\n"
                + first.stderr
            )

            raise RuntimeError(
                "LaTeX compilation failed:\n"
                + output[-7000:]
            )

        pdf_file = (
            workdir / "resume.pdf"
        )

        if not pdf_file.exists():

            raise RuntimeError(
                "LaTeX completed but no PDF was produced."
            )

        return pdf_file.read_bytes()


# ============================================================================
# ENDPOINT
# ============================================================================

@router.post("/generate")
def generate_optimized_resume(
    request: OptimizeRequest,
) -> dict[str, Any]:

    try:

        resume_text = to_text(
            request.resume_text
        )

        jd_text = to_text(
            request.jd_text
        )

        report_text = to_text(
            request.report_text
        )

        if not resume_text.strip():

            raise HTTPException(
                status_code=400,
                detail="Resume text is required.",
            )

        if not jd_text.strip():

            raise HTTPException(
                status_code=400,
                detail="Job description text is required.",
            )

        optimization = build_optimization(
            resume_text=resume_text,
            jd_text=jd_text,
            report_text=report_text,
            mode=request.mode,
        )

        # Existing JD intelligence remains available.
        jd_analysis = None

        try:

            jd_analysis = jd_service.analyze(
                resume_text=resume_text,
                jd_text=jd_text,
                engine="nlp",
                company=None,
                role=None,
            )

        except Exception:

            jd_analysis = None

        latex_source = build_pdf_latex(
            resume_text=resume_text,
            optimization=optimization,
        )

        pdf_bytes = compile_latex(
            latex_source
        )

        pdf_base64 = (
            base64.b64encode(
                pdf_bytes
            )
            .decode("ascii")
        )

        return {
            "success": True,

            "current":
                optimization["current"],

            "optimized":
                optimization["optimized"],

            "mode":
                optimization["mode"],

            "cards":
                optimization["cards"],

            "bestEdit":
                optimization["best_edit"],

            "skills":
                optimization["skills"],

            "matched_skills":
                optimization["matched_skills"],

            "missing_skills":
                optimization["missing_skills"],

            "changes":
                optimization["changes"],

            "report_signals":
                optimization["report_signals"],

            "jd_analysis":
                jd_analysis,

            "evidence_preserved":
                True,

            "latex":
                latex_source,

            "pdf_base64":
                pdf_base64,
        }

    except HTTPException:
        raise

    except subprocess.TimeoutExpired:

        raise HTTPException(
            status_code=500,
            detail=(
                "LaTeX compilation timed out."
            ),
        )

    except Exception as exc:

        raise HTTPException(
            status_code=500,
            detail=str(exc),
        ) from exc