from __future__ import annotations

import json
import os
import re
from typing import Any

from dotenv import load_dotenv
from openai import OpenAI

from ..knowledge.canonical_skills import (
    CANONICAL_SKILLS,
)
from ..nlp.nlp_service import (
    nlp_service,
)
from .jd_extractor import (
    parse_job_description,
)
from .matcher import (
    build_match_report,
)
from .resume_parser import (
    parse_resume,
)
from ..ats.scoring import (
    build_all_ats_reports,
    build_ats_summary,
)


# ---------------------------------------------------------
# Environment / NVIDIA NIM client
# ---------------------------------------------------------

load_dotenv()

NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY")

nvidia_client = (
    OpenAI(
        base_url="https://integrate.api.nvidia.com/v1",
        api_key=NVIDIA_API_KEY,
    )
    if NVIDIA_API_KEY
    else None
)


def _normalize_status(value: Any) -> str:
    status = (
        str(value or "")
        .strip()
        .lower()
        .replace("-", "_")
        .replace(" ", "_")
    )

    mapping = {
        "match": "matched",
        "matched": "matched",
        "strong_match": "matched",
        "strong": "matched",
        "partial": "partial",
        "partial_match": "partial",
        "moderate": "partial",
        "moderate_match": "partial",
        "weak": "weak_match",
        "weak_match": "weak_match",
        "missing": "missing",
        "no_match": "missing",
        "not_found": "missing",
        "not_specified": "not_specified",
        "unknown": "unknown",
    }

    return mapping.get(status, "unknown")


def _normalize_score(value: Any) -> int | None:
    try:
        if value is None:
            return None

        score = int(float(value))
        return max(0, min(100, score))
    except (TypeError, ValueError):
        return None


def _score_from_status(value: Any) -> int | None:
    status = _normalize_status(value)

    if status == "matched":
        return 100
    if status == "partial":
        return 60
    if status == "weak_match":
        return 30
    if status == "missing":
        return 0

    return None


def _safe_number(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _deterministic_role_score(
    role: str | None,
    resume_text: str,
) -> tuple[int | None, bool, str]:
    """Conservative deterministic role-family evidence signal."""
    if not role:
        return None, False, "Target role was not provided."

    role_text = re.sub(r"\s+", " ", str(role).strip().lower())
    resume_lower = re.sub(r"\s+", " ", resume_text.lower())

    families = {
        "designer": (["designer", "design", "ux", "ui"], [
            "ux designer", "ui designer", "product designer",
            "graphic designer", "interaction designer", "visual designer",
            "user experience", "user research", "wireframe", "prototype",
            "figma", "sketch", "design system",
        ]),
        "frontend": (["frontend", "front-end", "web developer", "ui engineer"], [
            "frontend engineer", "frontend developer", "react developer",
            "react", "javascript", "typescript", "html", "css",
            "responsive design", "browser",
        ]),
        "backend": (["backend", "back-end", "api developer", "server-side"], [
            "backend engineer", "backend developer", "api developer",
            "fastapi", "django", "flask", "spring boot", "microservices",
            "rest api", "rest apis", "postgresql", "mysql", "mongodb",
        ]),
        "machine learning": (["machine learning", "ml engineer", "machine learning engineer"], [
            "machine learning engineer", "ml engineer", "model training",
            "model deployment", "pytorch", "tensorflow", "scikit-learn",
            "deep learning", "feature engineering", "mlops",
        ]),
        "ai engineer": (["ai engineer", "artificial intelligence", "nlp engineer", "computer vision engineer"], [
            "ai engineer", "artificial intelligence engineer", "nlp",
            "natural language processing", "computer vision", "llm",
            "large language model", "generative ai", "transformers", "rag",
        ]),
        "data scientist": (["data scientist", "data science"], [
            "data scientist", "data science", "statistics", "machine learning",
            "pandas", "numpy", "scikit-learn", "experimentation",
        ]),
        "data engineer": (["data engineer", "data engineering"], [
            "data engineer", "etl", "data pipeline", "data warehouse",
            "apache spark", "airflow", "snowflake", "databricks", "kafka",
        ]),
        "devops": (["devops", "sre", "site reliability", "platform engineer"], [
            "devops engineer", "site reliability engineer", "sre", "ci/cd",
            "kubernetes", "docker", "terraform", "ansible", "observability",
        ]),
        "cloud": (["cloud engineer", "cloud architect", "cloud"], [
            "cloud engineer", "cloud architect", "aws", "azure", "gcp",
            "terraform", "infrastructure", "iam",
        ]),
        "cybersecurity": (["security", "cybersecurity", "cyber security", "infosec"], [
            "security engineer", "cybersecurity engineer", "application security",
            "penetration testing", "vulnerability assessment", "siem", "owasp",
        ]),
        "qa": (["qa", "quality assurance", "test engineer", "sdet", "testing"], [
            "qa engineer", "test engineer", "sdet", "test automation",
            "selenium", "playwright", "cypress", "pytest", "api testing",
        ]),
        "mobile": (["mobile", "android", "ios"], [
            "android developer", "android engineer", "ios developer",
            "ios engineer", "swift", "kotlin", "jetpack compose", "mobile app",
        ]),
        "embedded": (["embedded", "firmware", "embedded systems"], [
            "embedded engineer", "firmware engineer", "embedded systems",
            "microcontroller", "rtos", "device drivers", "stm32", "arm",
        ]),
        "software": (["software engineer", "software developer", "application developer", "systems software", "programmer", "developer"], [
            "software engineer", "software developer", "application developer",
            "systems software engineer", "full stack developer", "full-stack developer",
            "python developer", "java developer", "c++ developer", "programmer",
            "software development", "api", "rest", "microservices", "git",
            "github", "sql", "docker", "javascript", "typescript", "python",
            "java", "c++", "c#", "coding", "programming",
        ]),
    }

    family = "software"
    best_len = -1
    for family_name, (role_terms, _) in families.items():
        for term in role_terms:
            if term in role_text and len(term) > best_len:
                family = family_name
                best_len = len(term)

    role_terms, evidence_terms = families[family]
    evidence_hits = [t for t in evidence_terms if t in resume_lower]

    conflicts = {
        "designer": ["graphic designer", "ux designer", "ui designer", "product designer"],
        "sales": ["sales representative", "account executive", "sales manager"],
        "hr": ["human resources", "hr specialist", "recruiter", "talent acquisition"],
        "finance": ["accountant", "financial analyst", "finance manager"],
        "marketing": ["marketing manager", "digital marketing", "brand manager"],
    }
    conflict_domains = [d for d, terms in conflicts.items()
                         if d != family and any(t in resume_lower for t in terms)]

    title_hit = any(t in resume_lower for t in role_terms if len(t) >= 5)

    if conflict_domains and not evidence_hits and not title_hit:
        return (5, True, f"Primary resume evidence points to {', '.join(conflict_domains)}, not {family}.")

    if not evidence_hits and not title_hit:
        return (10, False, f"Little direct evidence was found for the {role} role.")

    score = 20
    if title_hit:
        score += 30
    score += min(42, len(evidence_hits) * 7)
    score = min(100, score)
    return (score, False, f"Detected {len(evidence_hits)} {family} role-evidence signal(s).")


def _veebee_base_score(matching: dict[str, Any], role_score: int | None, hard_role_mismatch: bool) -> int | None:
    """Build the deterministic 40% component independently of the LLM."""
    skills = matching.get("skills", {}) or {}
    experience = matching.get("experience", {}) or {}
    education = matching.get("education", {}) or {}

    skill_score = _normalize_score(skills.get("skill_match_score"))
    experience_score = _normalize_score(experience.get("score"))
    education_score = _normalize_score(education.get("score"))

    signals: list[tuple[float, int]] = []
    if skill_score is not None:
        signals.append((0.45, skill_score))
    if role_score is not None:
        signals.append((0.35, role_score))
    if experience_score is not None:
        signals.append((0.12, experience_score))
    if education_score is not None:
        signals.append((0.08, education_score))

    if not signals:
        return None

    total_weight = sum(weight for weight, _ in signals)
    result = round(sum(weight * score for weight, score in signals) / total_weight)

    if hard_role_mismatch:
        result = min(result, 20)

    return max(0, min(100, result))


def _extract_skill_names(values: Any) -> list[str]:
    if not isinstance(values, list):
        return []

    results: list[str] = []

    for value in values:
        if isinstance(value, dict):
            value = value.get(
                "skill",
                value.get(
                    "name",
                    value.get(
                        "text",
                        "",
                    ),
                ),
            )

        skill = str(value or "").strip()

        if skill and skill not in results:
            results.append(skill)

    return results


def _education_semantic_fallback(
    jd_education: list[str],
    resume_text: str,
) -> dict[str, Any] | None:
    """
    Conservative deterministic fallback for common degree/field
    equivalences. This is only used when NIM does not provide a
    usable education score/status.
    """

    if not jd_education:
        return None

    jd_lower = " ".join(jd_education).lower()
    resume_lower = resume_text.lower()

    degree_match = bool(
        re.search(
            r"\b(bachelor|bachelor's|btech|b\.tech|b\.e|be|undergraduate)\b",
            jd_lower,
        )
        and re.search(
            r"\b(bachelor|bachelor's|btech|b\.tech|b\.e|be|undergraduate)\b",
            resume_lower,
        )
    )

    field_terms = [
        "computer science",
        "artificial intelligence",
        "computer engineering",
        "information technology",
        "software engineering",
        "data science",
    ]

    jd_fields = [
        field
        for field in field_terms
        if field in jd_lower
    ]

    resume_fields = [
        field
        for field in field_terms
        if field in resume_lower
    ]

    if degree_match and jd_fields and any(
        field in resume_fields
        for field in jd_fields
    ):
        return {
            "status": "matched",
            "score": 100,
            "reason": (
                "The resume contains a bachelor's-level degree "
                "in a field that satisfies the stated education requirement."
            ),
        }

    return None


def _normalize_llm_matching(
    llm_result: dict[str, Any],
    jd_profile: dict[str, Any],
    resume_profile: dict[str, Any],
) -> dict[str, Any]:
    """
    Normalize NVIDIA NIM output.

    IMPORTANT:
    We do NOT trust the model's overall_score.

    The final NIM score is calculated from independently
    normalized dimensions so one hallucinated high score
    cannot dominate the result.
    """

    # ---------------------------------------------------------
    # Helper
    # ---------------------------------------------------------

    def get_dict(value: Any) -> dict[str, Any]:
        return value if isinstance(value, dict) else {}

    # ---------------------------------------------------------
    # Extract sections
    # ---------------------------------------------------------

    role_raw = get_dict(
        llm_result.get("role")
        or llm_result.get("role_analysis")
    )

    skills_raw = get_dict(
        llm_result.get("skills")
    )

    experience_raw = get_dict(
        llm_result.get("experience")
        or llm_result.get("experience_analysis")
    )

    education_raw = get_dict(
        llm_result.get("education")
        or llm_result.get("education_analysis")
    )

    projects_raw = get_dict(
        llm_result.get("projects")
        or llm_result.get("project_analysis")
    )

    evidence_raw = get_dict(
        llm_result.get("evidence")
        or llm_result.get("evidence_quality")
    )

    # ---------------------------------------------------------
    # Skills
    # ---------------------------------------------------------

    matched_skills = _extract_skill_names(
        skills_raw.get(
            "matched",
            llm_result.get("matched_skills", []),
        )
    )

    missing_skills = _extract_skill_names(
        skills_raw.get(
            "missing",
            llm_result.get("missing_skills", []),
        )
    )

    matched_key = {
        skill.strip().lower()
        for skill in matched_skills
    }

    missing_skills = [
        skill
        for skill in missing_skills
        if skill.strip().lower() not in matched_key
    ]

    skill_total = (
        len(matched_skills)
        + len(missing_skills)
    )

    skill_score = _normalize_score(
        skills_raw.get("score")
    )

    # Deterministic fallback if NIM did not provide skill score.
    if skill_score is None and skill_total:
        skill_score = round(
            len(matched_skills)
            / skill_total
            * 100
        )

    # ---------------------------------------------------------
    # Role
    # ---------------------------------------------------------

    role_status = _normalize_status(
        role_raw.get("status")
    )

    role_score = _normalize_score(
        role_raw.get("score")
    )

    if role_score is None:
        role_score = _score_from_status(
            role_status
        )

    # ---------------------------------------------------------
    # Experience
    # ---------------------------------------------------------

    experience_status = _normalize_status(
        experience_raw.get("status")
    )

    experience_score = _normalize_score(
        experience_raw.get("score")
    )

    if experience_score is None:
        experience_score = _score_from_status(
            experience_status
        )

    # ---------------------------------------------------------
    # Education
    # ---------------------------------------------------------

    education_status = _normalize_status(
        education_raw.get("status")
    )

    education_score = _normalize_score(
        education_raw.get("score")
    )

    if education_score is None:
        education_score = _score_from_status(
            education_status
        )

    education_reason = education_raw.get(
        "reason",
        "",
    )

    if (
        education_status in {"unknown", "not_specified"}
        or education_score is None
    ):
        fallback = _education_semantic_fallback(
            jd_education=jd_profile.get(
                "education",
                [],
            ),
            resume_text=resume_profile.get(
                "raw_text",
                "",
            ),
        )

        if fallback is not None:
            education_status = fallback["status"]
            education_score = fallback["score"]
            education_reason = fallback["reason"]

    # ---------------------------------------------------------
    # Projects
    # ---------------------------------------------------------

    projects_score = _normalize_score(
        projects_raw.get("score")
    )

    # ---------------------------------------------------------
    # Evidence quality
    # ---------------------------------------------------------

    evidence_score = _normalize_score(
        evidence_raw.get("score")
    )

    # ---------------------------------------------------------
    # HARD MISMATCH
    #
    # The model must explicitly identify incompatible
    # professional domains.
    # ---------------------------------------------------------

    hard_mismatch = bool(
        role_raw.get("hard_mismatch", False)
        or llm_result.get("hard_mismatch", False)
    )

    hard_mismatch_reason = (
        role_raw.get("hard_mismatch_reason")
        or llm_result.get("hard_mismatch_reason")
        or ""
    )

    # ---------------------------------------------------------
    # NORMALIZE MISSING COMPONENTS
    #
    # Unknown ≠ 100.
    # Unknown ≠ free points.
    #
    # We use conservative neutral values when a dimension
    # cannot be evaluated.
    # ---------------------------------------------------------

    component_values = {
        "role": role_score,
        "skills": skill_score,
        "experience": experience_score,
        "education": education_score,
        "projects": projects_score,
        "evidence": evidence_score,
    }

    # ---------------------------------------------------------
    # NIM WEIGHTING
    #
    # Role is deliberately high because role mismatch should
    # dominate generic keyword overlap.
    # ---------------------------------------------------------

    weights = {
        "role": 0.30,
        "skills": 0.25,
        "experience": 0.15,
        "projects": 0.12,
        "education": 0.08,
        "evidence": 0.10,
    }

    weighted_sum = 0.0
    weight_sum = 0.0

    for component, weight in weights.items():
        value = component_values.get(component)

        if value is None:
            continue

        weighted_sum += (
            value * weight
        )
        weight_sum += weight

    if weight_sum > 0:
        nim_score = round(
            weighted_sum / weight_sum
        )
    else:
        nim_score = 0

    # ---------------------------------------------------------
    # HARD MISMATCH PROTECTION
    # ---------------------------------------------------------

    if hard_mismatch:
        nim_score = min(
            nim_score,
            20,
        )

    # A very low role score must prevent a huge AI score.
    if (
        role_score is not None
        and role_score < 25
    ):
        nim_score = min(
            nim_score,
            30,
        )

    # Extremely weak role + skills combination.
    if (
        role_score is not None
        and skill_score is not None
        and role_score < 35
        and skill_score < 35
    ):
        nim_score = min(
            nim_score,
            25,
        )

    # ---------------------------------------------------------
    # Recommendation is calculated by VeeBee.
    # Do not blindly trust NIM's label.
    # ---------------------------------------------------------

    if nim_score >= 85:
        recommendation = "STRONG_MATCH"
    elif nim_score >= 70:
        recommendation = "MATCH"
    elif nim_score >= 50:
        recommendation = "PARTIAL_MATCH"
    elif nim_score >= 30:
        recommendation = "WEAK_MATCH"
    else:
        recommendation = "NO_MATCH"

    # ---------------------------------------------------------
    # Return normalized structure
    # ---------------------------------------------------------

    return {
        "overall_score": nim_score,

        "score_method": (
            "VeeBee weighted aggregation of NVIDIA NIM "
            "component scores; model overall_score ignored"
        ),

        "recommendation": recommendation,

        "summary": llm_result.get(
            "summary",
            "",
        ),

        "role": {
            "status": role_status,
            "score": role_score,
            "hard_mismatch": hard_mismatch,
            "hard_mismatch_reason": (
                hard_mismatch_reason
            ),
            "reason": role_raw.get(
                "reason",
                "",
            ),
        },

        "skills": {
            "matched": [
                {"skill": skill}
                for skill in matched_skills
            ],
            "missing": [
                {"skill": skill}
                for skill in missing_skills
            ],
            "matched_count": len(
                matched_skills
            ),
            "missing_count": len(
                missing_skills
            ),
            "jd_skill_count": skill_total,
            "skill_match_score": skill_score,
            "reason": skills_raw.get(
                "reason",
                "",
            ),
        },

        "experience": {
            "status": experience_status,
            "score": experience_score,
            "reason": experience_raw.get(
                "reason",
                "",
            ),
        },

        "education": {
            "status": education_status,
            "score": education_score,
            "reason": education_reason,
        },

        "projects": {
            "score": projects_score,
            "reason": projects_raw.get(
                "reason",
                "",
            ),
        },

        "evidence": {
            "score": evidence_score,
            "reason": evidence_raw.get(
                "reason",
                "",
            ),
        },

        "strengths": llm_result.get(
            "strengths",
            [],
        ),

        "responsibility_alignment": llm_result.get(
            "responsibility_alignment",
            [],
        ),

        "risks": llm_result.get(
            "risks",
            [],
        ),
    }
class JDCheckerService:

    def analyze(
        self,
        resume_text: str,
        jd_text: str,
        engine: str = "llm",
        company: str | None = None,
        role: str | None = None,
    ) -> dict[str, Any]:

        engine = engine.strip().lower()

        if engine not in {
            "nlp",
            "llm",
        }:
            return {
                "success": False,
                "error": (
                    "Invalid engine. "
                    "Use 'nlp' or 'llm'."
                ),
            }

        if not resume_text.strip():
            return {
                "success": False,
                "error": "Resume text is empty.",
            }

        if not jd_text.strip() and not role:
            return {
                "success": False,
                "error": "Provide a job description or a target role.",
            }

        # -----------------------------------------------------
        # Resume structure
        # -----------------------------------------------------

        resume_result = parse_resume(resume_text)

        if not resume_result.get("success"):
            return {
                "success": False,
                "error": resume_result.get(
                    "error",
                    "Resume parsing failed.",
                ),
            }

        # -----------------------------------------------------
        # JD structure
        # -----------------------------------------------------

        if jd_text.strip():
            jd_result = parse_job_description(jd_text)

            if not jd_result.get("success"):
                return {
                    "success": False,
                    "error": jd_result.get(
                        "error",
                        "JD parsing failed.",
                    ),
                }

            jd_profile = jd_result["profile"]
        else:
            jd_profile = {
                "role": role,
                "minimum_experience_years": None,
                "education": [],
                "responsibilities": [],
            }

        resume_profile = resume_result["profile"]

        # UI-selected role is authoritative when supplied.
        if role:
            jd_profile["role"] = role

        # -----------------------------------------------------
        # NLP ENGINE
        # -----------------------------------------------------

        if engine == "nlp":
            resume_nlp = nlp_service.extract(resume_text)
            jd_nlp = nlp_service.extract(jd_text)

            deterministic_role_score, hard_role_mismatch, role_reason = _deterministic_role_score(
                role=role or jd_profile.get("role"),
                resume_text=resume_text,
            )

            matching = build_match_report(
                jd_profile=jd_profile,
                resume_profile=resume_profile,
                jd_detected_skills=jd_nlp.get(
                    "skill_entities",
                    [],
                ),
                resume_detected_skills=resume_nlp.get(
                    "skill_entities",
                    [],
                ),
            )

            veebee_score = _veebee_base_score(
                matching=matching,
                role_score=deterministic_role_score,
                hard_role_mismatch=hard_role_mismatch,
            )

            # NLP mode has no NIM component. It remains available as a deterministic fallback.
            ats_reports = build_all_ats_reports(
                resume_profile=resume_profile,
                match_report=matching,
            )
            ats_summary = build_ats_summary(ats_reports)

            return {
                "success": True,
                "engine": "nlp",
                "data": {
                    "job_description": {
                        "role": jd_profile.get("role"),
                        "experience": {
                            "minimum_years": jd_profile.get(
                                "minimum_experience_years"
                            )
                        },
                        "education": jd_profile.get(
                            "education",
                            [],
                        ),
                        "skills": [
                            item["canonical"]
                            for item in jd_nlp.get(
                                "skill_entities",
                                [],
                            )
                        ],
                        "responsibilities": jd_profile.get(
                            "responsibilities",
                            [],
                        ),
                    },
                    "resume": {
                        "name": resume_profile.get("name"),
                        "experience_years": resume_profile.get(
                            "experience_years"
                        ),
                        "skills": [
                            item["canonical"]
                            for item in resume_nlp.get(
                                "skill_entities",
                                [],
                            )
                        ],
                        "sections": resume_profile.get(
                            "sections",
                            {},
                        ),
                    },
                    "matching": matching,
                    "scoring": {
                        "nim_score": None,
                        "veebee_score": veebee_score,
                        "final_score": veebee_score,
                        "weights": {"nim": 0.0, "veebee": 1.0},
                        "role_fit": {
                            "score": deterministic_role_score,
                            "hard_mismatch": hard_role_mismatch,
                            "reason": role_reason,
                        },
                    },
                    "ats": {
                        "summary": ats_summary,
                        "platforms": ats_reports,
                    },
                    "metadata": {
                        "skill_knowledge_source": (
                            "100_company_skills_only(1).docx"
                        ),
                        "canonical_skill_candidates": len(
                            CANONICAL_SKILLS
                        ),
                        "nlp_model": "en_core_web_sm",
                        "extraction_method": (
                            "spaCy PhraseMatcher + "
                            "VeeBee dataset vocabulary"
                        ),
                    },
                },
            }

        # -----------------------------------------------------
        # LLM ENGINE - NVIDIA NIM
        # -----------------------------------------------------

        if nvidia_client is None:
            return {
                "success": False,
                "engine": "llm",
                "error": "NVIDIA_API_KEY is not configured.",
            }

        # -----------------------------------------------------
        # VeeBee NLP extraction used as supporting evidence
        # -----------------------------------------------------

        resume_nlp = nlp_service.extract(resume_text)
        jd_nlp = nlp_service.extract(jd_text)

        detected_resume_skills = [
            item.get(
                "canonical",
                item.get("text", ""),
            )
            for item in resume_nlp.get(
                "skill_entities",
                [],
            )
            if item.get(
                "canonical",
                item.get("text", ""),
            )
        ]

        detected_jd_skills = [
            item.get(
                "canonical",
                item.get("text", ""),
            )
            for item in jd_nlp.get(
                "skill_entities",
                [],
            )
            if item.get(
                "canonical",
                item.get("text", ""),
            )
        ]

        prompt = f"""
You are the semantic evaluation engine inside VeeBee ATS.

Your job is to evaluate ONE CANDIDATE against ONE TARGET ROLE.

You are NOT a generic resume reviewer.

You must determine whether the candidate actually demonstrates evidence
for the requested professional role.

========================================
ABSOLUTE RULES
========================================

1. NEVER invent candidate facts.

2. NEVER assume a candidate has a skill because it is common for the role.

3. NEVER infer years of experience that are not supported.

4. NEVER treat a keyword alone as proof of professional experience.

5. Distinguish:
   - exact evidence
   - strong semantic evidence
   - weak related evidence
   - no evidence

6. A resume containing a technology keyword does NOT automatically mean
   the candidate is qualified for the requested role.

7. Professional role alignment is more important than generic keywords.

8. A candidate whose primary demonstrated profession is from an unrelated
   domain must receive a very low role score.

9. Projects can demonstrate technical capability, but projects must not
   automatically equal professional employment experience.

10. Education should be judged semantically:
    equivalent degree names and fields may satisfy the requirement.

11. Missing information must remain missing.
    Never convert unknown into a positive match.

12. Do not use demographic, protected, or personal characteristics in scoring.

========================================
TARGET
========================================

COMPANY:
{company or "Not specified"}

TARGET ROLE:
{role or jd_profile.get("role") or "Not specified"}

========================================
JOB DESCRIPTION
========================================

{jd_text}

========================================
RESUME
========================================

{resume_text}

========================================
STRUCTURED JOB DESCRIPTION
========================================

{json.dumps(jd_profile, ensure_ascii=False)}

========================================
STRUCTURED RESUME
========================================

{json.dumps(resume_profile, ensure_ascii=False)}

========================================
VEEBEE DETECTED JD SKILLS
========================================

{json.dumps(detected_jd_skills, ensure_ascii=False)}

========================================
VEEBEE DETECTED RESUME SKILLS
========================================

{json.dumps(detected_resume_skills, ensure_ascii=False)}

========================================
RETURN ONLY JSON
========================================

Return exactly this structure:

{{
  "role": {{
    "status": "matched | partial | weak_match | missing | unknown",
    "score": 0,
    "hard_mismatch": false,
    "hard_mismatch_reason": "",
    "reason": ""
  }},

  "skills": {{
    "matched": [],
    "missing": [],
    "score": 0,
    "reason": ""
  }},

  "experience": {{
    "status": "matched | partial | weak_match | missing | unknown",
    "score": 0,
    "reason": ""
  }},

  "education": {{
    "status": "matched | partial | weak_match | missing | unknown",
    "score": 0,
    "reason": ""
  }},

  "projects": {{
    "score": 0,
    "reason": ""
  }},

  "evidence": {{
    "score": 0,
    "reason": ""
  }},

  "strengths": [],
  "responsibility_alignment": [],
  "risks": [],
  "summary": ""
}}

========================================
ROLE SCORE
========================================

0-10:
Clearly unrelated professional role/domain.

11-30:
Major role mismatch with little relevant evidence.

31-49:
Weak relationship to target role.

50-69:
Partial alignment.

70-84:
Strong alignment.

85-100:
Direct, demonstrated alignment with substantial evidence.

IMPORTANT:
If the candidate is primarily a Designer, Graphic Designer, HR professional,
Sales professional, Accountant, etc. and the target role is Software Engineer,
do NOT score role fit highly simply because the resume contains words such as
Python, SQL, JavaScript, or Git.

========================================
SKILL SCORE
========================================

Score based on:

- required skills
- preferred skills
- semantic equivalence
- depth of evidence
- frequency/context
- whether the skill is demonstrated through work/projects

A skill appearing once without meaningful context is weaker evidence than
multiple concrete examples.

Do NOT claim an exact match when only a vaguely related technology appears.

========================================
EXPERIENCE SCORE
========================================

Evaluate:

- required years
- relevant professional experience
- relevant responsibilities
- seniority
- continuity

Do not count unrelated professional experience as equivalent merely because
the number of years is large.

========================================
PROJECT SCORE
========================================

Projects can support capability.

Strong project evidence includes:

- concrete implementation
- technical ownership
- architecture
- measurable outcomes
- technologies used
- meaningful complexity

A project should not automatically be treated as employment experience.

========================================
EDUCATION SCORE
========================================

Compare:

- degree level
- academic field
- explicit requirements

Recognize legitimate equivalent degree naming.

========================================
EVIDENCE SCORE
========================================

Evaluate how much of the decision is supported by explicit resume evidence.

High score:
multiple concrete evidence sources.

Low score:
mostly keywords, vague claims, or missing sections.

========================================
HARD MISMATCH
========================================

Set hard_mismatch = true when the candidate's demonstrated primary
professional domain is clearly incompatible with the requested role.

Examples:

Software Engineer vs Graphic Designer -> true

Machine Learning Engineer vs Human Resources Specialist -> true

Accountant vs Backend Engineer -> true

Do NOT mark hard mismatch merely because the candidate is missing
one or two skills.

========================================
NO OVERALL SCORE
========================================

DO NOT RETURN overall_score.

VeeBee ATS will calculate the final NIM score from the individual
component scores using its own deterministic weighting.
"""

        # -----------------------------------------------------
        # NVIDIA NIM API call
        # -----------------------------------------------------

        try:
            messages = [
                {
                    "role": "system",
                    "content": (
                        "You are the semantic evaluation engine inside VeeBee ATS. "
                        "Return only valid JSON."
                    ),
                },
                {"role": "user", "content": prompt},
            ]

            try:
                response = nvidia_client.chat.completions.create(
                    model="openai/gpt-oss-20b",
                    messages=messages,
                    temperature=0.05,
                    max_tokens=4096,
                    response_format={"type": "json_object"},
                    stream=False,
                )
            except Exception:
                response = nvidia_client.chat.completions.create(
                    model="openai/gpt-oss-20b",
                    messages=messages,
                    temperature=0.05,
                    max_tokens=4096,
                    stream=False,
                )

            raw_output = (
                response.choices[0].message.content.strip()
            )

            if raw_output.startswith("```"):
                raw_output = (
                    raw_output
                    .replace("```json", "", 1)
                    .replace("```", "")
                    .strip()
                )

            llm_result = json.loads(raw_output)

        except json.JSONDecodeError:
            return {
                "success": False,
                "engine": "llm",
                "error": "NVIDIA NIM returned invalid JSON.",
            }

        except Exception as exc:
            return {
                "success": False,
                "engine": "llm",
                "error": (
                    "NVIDIA NIM API request failed: "
                    f"{str(exc)}"
                ),
            }

        matching = _normalize_llm_matching(
            llm_result=llm_result,
            jd_profile=jd_profile,
            resume_profile=resume_profile,
        )

        deterministic_role_score, hard_role_mismatch, role_reason = _deterministic_role_score(
            role=role or jd_profile.get("role"),
            resume_text=resume_text,
        )

        veebee_score = _veebee_base_score(
            matching=matching,
            role_score=deterministic_role_score,
            hard_role_mismatch=hard_role_mismatch,
        )

        # IMPORTANT: matching["overall_score"] is the VeeBee-controlled
        # weighted NIM score generated by _normalize_llm_matching().
        # Never trust a raw model overall score here.
        nim_score = _normalize_score(
            matching.get("overall_score")
        )

        if nim_score is None:
            nim_score = 0

        if veebee_score is None:
            veebee_score = 0

        final_score = round(
            nim_score * 0.60 + veebee_score * 0.40
        )

        semantic_hard_mismatch = bool(
            matching.get("role", {}).get("hard_mismatch", False)
        )

        if hard_role_mismatch or semantic_hard_mismatch:
            final_score = min(final_score, 30)

        ats_matching = {
            **matching,
            "overall_score": final_score,
            "role": {
                **matching.get("role", {}),
                "deterministic_score": deterministic_role_score,
                "deterministic_reason": role_reason,
                "hard_mismatch": (
                    hard_role_mismatch or semantic_hard_mismatch
                ),
            },
        }

        ats_reports = build_all_ats_reports(
            resume_profile=resume_profile,
            match_report=ats_matching,
        )
        ats_summary = build_ats_summary(ats_reports)

        return {
            "success": True,
            "engine": "llm",
            "data": {
                "job_description": {
                    "role": jd_profile.get("role"),
                    "experience": {
                        "minimum_years": jd_profile.get(
                            "minimum_experience_years"
                        )
                    },
                    "education": jd_profile.get(
                        "education",
                        [],
                    ),
                    "skills": detected_jd_skills,
                    "responsibilities": jd_profile.get(
                        "responsibilities",
                        [],
                    ),
                },
                "resume": {
                    "name": resume_profile.get("name"),
                    "experience_years": resume_profile.get(
                        "experience_years"
                    ),
                    "skills": detected_resume_skills,
                    "sections": resume_profile.get(
                        "sections",
                        {},
                    ),
                },
                "matching": matching,
                "scoring": {
                    "nim_score": nim_score,
                    "veebee_score": veebee_score,
                    "final_score": final_score,
                    "weights": {
                        "nim": 0.60,
                        "veebee": 0.40,
                    },
                    "role_fit": {
                        "score": deterministic_role_score,
                        "hard_mismatch": hard_role_mismatch,
                        "reason": role_reason,
                    },
                },
                "ats": {
                    "summary": ats_summary,
                    "platforms": ats_reports,
                },
                "metadata": {
                    "llm_provider": "NVIDIA NIM",
                    "llm_model": "openai/gpt-oss-20b",
                    "skill_knowledge_source": (
                        "VeeBee dataset vocabulary"
                    ),
                    "canonical_skill_candidates": len(
                        CANONICAL_SKILLS
                    ),
                    "extraction_method": (
                        "spaCy + VeeBee dataset vocabulary + "
                        "NVIDIA NIM semantic analysis"
                    ),
                },
            },
        }


jd_service = JDCheckerService()
