from __future__ import annotations

from typing import Any

from .profiles import ATSProfile, ATS_PROFILES


# ============================================================================
# GENERAL HELPERS
# ============================================================================

def _clamp(
    value: float,
    minimum: float = 0.0,
    maximum: float = 100.0,
) -> float:
    return max(minimum, min(maximum, value))


def _score(
    value: Any,
) -> int | None:
    if value is None:
        return None

    try:
        numeric = float(value)
    except (TypeError, ValueError):
        return None

    return round(_clamp(numeric))


def _status(
    value: int | None,
) -> str:
    if value is None:
        return "unknown"

    if value >= 85:
        return "excellent"

    if value >= 70:
        return "good"

    if value >= 40:
        return "fair"

    return "poor"


# ============================================================================
# FORMATTING / PARSEABILITY
# ============================================================================

def calculate_formatting_score(
    resume_profile: dict[str, Any],
    profile: ATSProfile,
) -> dict[str, Any]:
    """
    Estimate ATS parseability from the structured resume representation.

    This is a VeeBee compatibility estimate, not a proprietary ATS parser.
    """

    raw_text = str(
        resume_profile.get("raw_text", "") or ""
    ).strip()

    sections = (
        resume_profile.get("sections")
        or {}
    )

    if not raw_text:
        return {
            "score": 0,
            "status": "poor",
            "positives": [],
            "deductions": [
                "No extractable resume text was found."
            ],
        }

    score = 100.0

    positives: list[str] = []
    deductions: list[str] = []

    lines = [
        line.strip()
        for line in raw_text.splitlines()
        if line.strip()
    ]

    # ------------------------------------------------------------------
    # Amount of extractable text
    # ------------------------------------------------------------------

    if len(raw_text) < 300:
        score -= 20
        deductions.append(
            "Very little extractable resume text."
        )
    elif len(raw_text) >= 600:
        positives.append(
            "Sufficient extractable resume text."
        )

    # ------------------------------------------------------------------
    # Recognized sections
    # ------------------------------------------------------------------

    recognized_sections = {
        key
        for key, value in sections.items()
        if value
    }

    core_sections = {
        "experience",
        "education",
        "skills",
    }

    missing_core = (
        core_sections - recognized_sections
    )

    if not missing_core:
        score += 0
        positives.append(
            "Core resume sections were detected."
        )
    else:
        score -= 12 * len(missing_core)

        for section in sorted(missing_core):
            deductions.append(
                f"Core section not detected: {section}."
            )

    # ------------------------------------------------------------------
    # Overall section coverage
    # ------------------------------------------------------------------

    if len(recognized_sections) == 1:
        score -= 10
    elif len(recognized_sections) == 2:
        score -= 5
    elif len(recognized_sections) >= 4:
        positives.append(
            "Multiple recognizable resume sections."
        )

    # ------------------------------------------------------------------
    # Very long extracted lines
    # ------------------------------------------------------------------

    very_long_lines = sum(
        len(line) > 220
        for line in lines
    )

    if very_long_lines:
        penalty = min(
            10,
            very_long_lines * 2,
        )

        score -= penalty

        deductions.append(
            "Some extracted lines are unusually long."
        )

    # ------------------------------------------------------------------
    # Highly formatting-sensitive ATS profiles
    # ------------------------------------------------------------------

    if (
        profile.formatting_sensitivity >= 0.85
        and len(recognized_sections) < 3
    ):
        score -= 8

        deductions.append(
            "This ATS profile is modeled as highly sensitive "
            "to resume structure and parseability."
        )

    return {
        "score": _score(score),
        "status": _status(_score(score)),
        "positives": positives,
        "deductions": deductions,
    }


# ============================================================================
# KEYWORD MATCH
# ============================================================================

def calculate_keyword_score(
    skill_result: dict[str, Any],
    profile: ATSProfile,
) -> dict[str, Any]:
    """
    Convert VeeBee's existing canonical skill matching into
    ATS-specific keyword compatibility.
    """

    matched = (
        skill_result.get("matched")
        or []
    )

    missing = (
        skill_result.get("missing")
        or []
    )

    total = len(matched) + len(missing)

    if total == 0:
        return {
            "score": None,
            "matched_count": 0,
            "missing_count": 0,
            "matched": [],
            "missing": [],
            "status": "unknown",
            "reason": (
                "No structured JD skill requirements were available."
            ),
        }

    exact_ratio = (
        len(matched) / total
    )

    score = exact_ratio * 100.0

    # ------------------------------------------------------------------
    # Platform behavior
    # ------------------------------------------------------------------

    # Strict keyword systems penalize missing terms more aggressively.
    if profile.strict_required_keywords and missing:
        missing_ratio = (
            len(missing) / total
        )

        score -= (
            missing_ratio * 15
        )

    # Tolerant systems are given a modest semantic allowance.
    if profile.semantic_matching:
        score += 4

    # Very low abbreviation tolerance means canonical exact matching
    # should remain conservative.
    if profile.abbreviation_tolerance <= 0.30:
        score -= 3

    score = _score(score)

    return {
        "score": score,
        "matched_count": len(matched),
        "missing_count": len(missing),
        "matched": matched,
        "missing": missing,
        "status": _status(score),
        "reason": (
            f"{len(matched)} of {total} "
            f"structured skill requirement(s) matched."
        ),
    }


# ============================================================================
# SECTION SCORE
# ============================================================================

def calculate_section_score(
    resume_profile: dict[str, Any],
    profile: ATSProfile,
) -> dict[str, Any]:
    sections = (
        resume_profile.get("sections")
        or {}
    )

    expected = [
        "summary",
        "experience",
        "education",
        "skills",
        "projects",
        "certifications",
    ]

    detected = [
        section
        for section in expected
        if sections.get(section)
    ]

    missing = [
        section
        for section in expected
        if section not in detected
    ]

    if not detected:
        return {
            "score": 0,
            "detected": [],
            "missing": missing,
            "status": "poor",
            "reason": (
                "No recognized resume sections were detected."
            ),
        }

    # Basic section coverage.
    score = (
        len(detected) /
        len(expected)
    ) * 100.0

    # Core ATS fields receive additional importance.
    core = {
        "experience",
        "education",
        "skills",
    }

    missing_core = (
        core - set(detected)
    )

    score -= (
        len(missing_core) * 15
    )

    score = _score(score)

    return {
        "score": score,
        "detected": detected,
        "missing": missing,
        "status": _status(score),
        "reason": (
            f"{len(detected)} of {len(expected)} "
            "recommended sections were recognized."
        ),
    }


# ============================================================================
# EXPERIENCE
# ============================================================================

def calculate_experience_score(
    experience_result: dict[str, Any],
    resume_profile: dict[str, Any],
) -> dict[str, Any]:
    """
    Prevent '100 experience' when no actual experience-year evidence exists.
    """

    required_years = experience_result.get(
        "required_years"
    )

    resume_years = experience_result.get(
        "resume_years"
    )

    existing_score = _score(
        experience_result.get("score")
    )

    # ------------------------------------------------------------------
    # If neither side has a year value, experience cannot be 100.
    # ------------------------------------------------------------------

    if (
        required_years is None
        and resume_years is None
    ):
        return {
            "score": None,
            "status": "unknown",
            "required_years": None,
            "resume_years": None,
            "reason": (
                "No structured experience duration was available."
            ),
        }

    # ------------------------------------------------------------------
    # JD does not specify years but resume contains years.
    # ------------------------------------------------------------------

    if (
        required_years is None
        and resume_years is not None
    ):
        score = 75

        return {
            "score": score,
            "status": "good",
            "required_years": None,
            "resume_years": resume_years,
            "reason": (
                f"Resume evidence indicates approximately "
                f"{resume_years:g} year(s) of experience; "
                "the JD did not specify a minimum."
            ),
        }

    # ------------------------------------------------------------------
    # JD requires experience but resume duration is unknown.
    # ------------------------------------------------------------------

    if (
        required_years is not None
        and resume_years is None
    ):
        return {
            "score": 25,
            "status": "poor",
            "required_years": required_years,
            "resume_years": None,
            "reason": (
                "The JD specifies a minimum experience requirement, "
                "but no structured experience duration was detected."
            ),
        }

    # ------------------------------------------------------------------
    # Both values available.
    # ------------------------------------------------------------------

    assert required_years is not None
    assert resume_years is not None

    if resume_years >= required_years:
        score = 100
    else:
        ratio = (
            resume_years /
            required_years
            if required_years > 0
            else 0
        )

        score = min(
            100,
            ratio * 100,
        )

    return {
        "score": _score(score),
        "status": _status(_score(score)),
        "required_years": required_years,
        "resume_years": resume_years,
        "reason": (
            f"Required: {required_years:g} year(s); "
            f"detected: {resume_years:g} year(s)."
        ),
    }


# ============================================================================
# EDUCATION
# ============================================================================

def calculate_education_score(
    education_result: dict[str, Any],
    resume_profile: dict[str, Any],
) -> dict[str, Any]:
    """
    Prevent an absent education assessment from becoming 100.
    """

    matched = (
        education_result.get("matched")
        or []
    )

    missing = (
        education_result.get("missing")
        or []
    )

    original_score = _score(
        education_result.get("score")
    )

    has_requirements = bool(
        matched or missing
    )

    # ------------------------------------------------------------------
    # No education requirement.
    # ------------------------------------------------------------------

    if not has_requirements:
        education_section = (
            resume_profile
            .get("sections", {})
            .get("education")
        )

        if education_section:
            return {
                "score": 75,
                "status": "good",
                "matched": [],
                "missing": [],
                "reason": (
                    "Education is present, but the JD did not "
                    "provide a structured education requirement."
                ),
            }

        return {
            "score": None,
            "status": "unknown",
            "matched": [],
            "missing": [],
            "reason": (
                "No structured education requirement "
                "or education section was available."
            ),
        }

    total = (
        len(matched) +
        len(missing)
    )

    if total == 0:
        return {
            "score": None,
            "status": "unknown",
            "matched": [],
            "missing": [],
            "reason": (
                "No structured education comparison was available."
            ),
        }

    score = (
        len(matched) /
        total
    ) * 100

    return {
        "score": _score(score),
        "status": _status(_score(score)),
        "matched": matched,
        "missing": missing,
        "reason": (
            f"{len(matched)} of {total} education "
            "requirement(s) matched."
        ),
    }


# ============================================================================
# ROLE FIT
# ============================================================================

def extract_role_fit(match_report: dict[str, Any]) -> dict[str, Any]:
    """Prefer semantic NIM role analysis, with deterministic fallback."""
    role_profile = match_report.get("roleProfile") or {}
    role_result = match_report.get("role") or {}
    semantic_score = _score(role_result.get("score"))
    semantic_mismatch = bool(role_result.get("hard_mismatch", False))
    if role_profile:
        deterministic_score = _score(role_profile.get("score"))
        score = (round(semantic_score * .60 + deterministic_score * .40)
                 if semantic_score is not None and deterministic_score is not None
                 else (semantic_score if semantic_score is not None else deterministic_score))
        return {
            "score": _score(score),
            "hard_mismatch": bool(role_profile.get("hardMismatch", role_profile.get("hard_mismatch", False)) or semantic_mismatch),
            "reason": role_result.get("reason") or role_profile.get("reason", ""),
            "matched": role_profile.get("matched") or [],
            "missing": role_profile.get("missing") or [],
        }
    if role_result:
        return {
            "score": semantic_score,
            "hard_mismatch": semantic_mismatch,
            "reason": role_result.get("reason", ""),
            "matched": role_result.get("matched") or [],
            "missing": role_result.get("missing") or [],
        }
    return {"score": None, "hard_mismatch": False, "reason": "No role-fit analysis was available.", "matched": [], "missing": []}


# ============================================================================
# VEEBEE INTERNAL SCORE
# ============================================================================

def calculate_veebee_score(*, formatting_score: int | None, keyword_score: int | None, section_score: int | None, experience_score: int | None, education_score: int | None, role_fit_score: int | None, hard_role_mismatch: bool, profile: ATSProfile | None = None) -> int | None:
    """Calculate platform-aware deterministic VeeBee compatibility."""
    dimensions = {"formatting": formatting_score, "keywords": keyword_score, "sections": section_score, "experience": experience_score, "education": education_score, "role_fit": role_fit_score}
    platform_weights = {
        "Workday": {"formatting": .18, "keywords": .22, "sections": .12, "experience": .15, "education": .08, "role_fit": .25},
        "Taleo": {"formatting": .15, "keywords": .34, "sections": .10, "experience": .14, "education": .06, "role_fit": .21},
        "iCIMS": {"formatting": .08, "keywords": .20, "sections": .07, "experience": .20, "education": .10, "role_fit": .35},
        "Greenhouse": {"formatting": .07, "keywords": .15, "sections": .10, "experience": .24, "education": .10, "role_fit": .34},
        "Lever": {"formatting": .08, "keywords": .30, "sections": .07, "experience": .19, "education": .08, "role_fit": .28},
        "SuccessFactors": {"formatting": .12, "keywords": .24, "sections": .10, "experience": .18, "education": .10, "role_fit": .26},
    }
    weights = platform_weights.get(profile.name if profile else "", {"formatting": .10, "keywords": .25, "sections": .10, "experience": .10, "education": .10, "role_fit": .35})
    weighted = 0.0; total_weight = 0.0
    for dimension, value in dimensions.items():
        if value is None: continue
        weighted += value * weights[dimension]; total_weight += weights[dimension]
    if total_weight == 0: return None
    score = weighted / total_weight
    if section_score == 0: score -= 12 if profile and profile.name in {"Workday", "Taleo"} else 7
    if formatting_score is not None and formatting_score < 35: score = min(score, 60)
    if hard_role_mismatch: score = min(score, 20)
    elif role_fit_score is not None:
        if role_fit_score < 20: score = min(score, 30)
        elif role_fit_score < 35: score = min(score, 45)
    return _score(score)


# ============================================================================
# NIM SCORE NORMALIZATION
# ============================================================================

def extract_nim_score(
    match_report: dict[str, Any],
) -> int | None:
    """
    Read the AI/NIM score.

    New service:
        match_report["nim_score"]

    Backwards compatible:
        match_report["overall_score"]
    """

    nim_score = _score(
        match_report.get("nim_score")
    )

    if nim_score is not None:
        return nim_score

    return _score(
        match_report.get(
            "overall_score"
        )
    )


# ============================================================================
# FINAL 60/40 SCORE
# ============================================================================

def calculate_final_score(
    *,
    nim_score: int | None,
    veebee_score: int | None,
    role_fit_score: int | None,
    hard_role_mismatch: bool,
) -> int | None:
    """
    Combine:

        NVIDIA NIM      = 60%
        VeeBee engine   = 40%
    """

    if (
        nim_score is None
        and veebee_score is None
    ):
        return None

    if nim_score is None:
        final = float(veebee_score)
    elif veebee_score is None:
        final = float(nim_score)
    else:
        final = (
            nim_score * 0.60
            +
            veebee_score * 0.40
        )

    # ------------------------------------------------------------------
    # Strong role mismatch protection.
    # ------------------------------------------------------------------

    if hard_role_mismatch:
        final = min(final, 20)
    elif role_fit_score is not None and role_fit_score < 20:
        final = min(final, 30)
    elif role_fit_score is not None and role_fit_score < 35:
        final = min(final, 45)

    return _score(final)


# ============================================================================
# RECOMMENDATION
# ============================================================================

def get_recommendation(
    score: int | None,
) -> str:

    if score is None:
        return "INSUFFICIENT DATA"

    if score >= 85:
        return "STRONG MATCH"

    if score >= 70:
        return "SHORTLIST"

    if score >= 50:
        return "REVIEW"

    return "LOW MATCH"


# ============================================================================
# CONFIDENCE
# ============================================================================

def calculate_confidence(
    *,
    nim_score: int | None,
    veebee_score: int | None,
    role_fit_score: int | None,
    keyword_score: int | None,
    formatting_score: int | None,
) -> str:

    available = sum(
        value is not None
        for value in (
            nim_score,
            veebee_score,
            role_fit_score,
            keyword_score,
            formatting_score,
        )
    )

    if (
        available >= 5
        and role_fit_score is not None
    ):
        return "HIGH"

    if available >= 3:
        return "MEDIUM"

    return "LOW"


# ============================================================================
# PLATFORM-SPECIFIC EXPLANATION
# ============================================================================

def build_platform_explanation(
    *,
    profile: ATSProfile,
    overall_score: int | None,
    formatting_score: int | None,
    keyword_score: int | None,
    section_score: int | None,
    experience_score: int | None,
    education_score: int | None,
    role_fit_score: int | None,
    hard_role_mismatch: bool,
) -> list[str]:

    reasons: list[str] = []

    if hard_role_mismatch:
        reasons.append(
            "The candidate shows a major mismatch with the target role."
        )

    if role_fit_score is not None:
        if role_fit_score >= 80:
            reasons.append(
                "Strong evidence for the selected role."
            )
        elif role_fit_score < 40:
            reasons.append(
                "Limited direct evidence for the selected role."
            )

    if keyword_score is not None:
        if keyword_score >= 80:
            reasons.append(
                "Strong required-skill coverage."
            )
        elif keyword_score < 40:
            reasons.append(
                "Many required or role-relevant keywords are missing."
            )

    if formatting_score is not None:
        if formatting_score < 50:
            reasons.append(
                "Resume structure may reduce machine parseability."
            )

    if section_score is not None:
        if section_score < 50:
            reasons.append(
                "Several expected resume sections were not detected."
            )

    if experience_score is not None:
        if experience_score >= 80:
            reasons.append(
                "Experience evidence is reasonably aligned."
            )
        elif experience_score < 40:
            reasons.append(
                "Experience evidence does not strongly satisfy the target."
            )

    if education_score is not None:
        if education_score >= 80:
            reasons.append(
                "Education evidence satisfies most evaluated requirements."
            )
        elif education_score < 40:
            reasons.append(
                "Education evidence has notable gaps."
            )

    if not reasons:
        reasons.append(
            "Insufficient structured evidence for a detailed explanation."
        )

    return reasons


# ============================================================================
# SINGLE ATS REPORT
# ============================================================================

def build_ats_report(
    *,
    profile: ATSProfile,
    resume_profile: dict[str, Any],
    match_report: dict[str, Any],
) -> dict[str, Any]:

    formatting = calculate_formatting_score(
        resume_profile,
        profile,
    )

    skills = (
        match_report.get("skills")
        or {}
    )

    keyword = calculate_keyword_score(
        skills,
        profile,
    )

    sections = calculate_section_score(
        resume_profile,
        profile,
    )

    experience_result = calculate_experience_score(
        match_report.get("experience")
        or {},
        resume_profile,
    )

    education_result = calculate_education_score(
        match_report.get("education")
        or {},
        resume_profile,
    )

    role = extract_role_fit(
        match_report
    )

    role_fit_score = role.get(
        "score"
    )

    hard_role_mismatch = bool(
        role.get("hard_mismatch")
    )

    nim_score = extract_nim_score(
        match_report
    )

    veebee_score = calculate_veebee_score(
        formatting_score=formatting.get(
            "score"
        ),
        keyword_score=keyword.get(
            "score"
        ),
        section_score=sections.get(
            "score"
        ),
        experience_score=experience_result.get(
            "score"
        ),
        education_score=education_result.get(
            "score"
        ),
        role_fit_score=role_fit_score,
        hard_role_mismatch=hard_role_mismatch,
        profile=profile,
    )

    final_score = calculate_final_score(
        nim_score=nim_score,
        veebee_score=veebee_score,
        role_fit_score=role_fit_score,
        hard_role_mismatch=hard_role_mismatch,
    )

    recommendation = get_recommendation(
        final_score
    )

    confidence = calculate_confidence(
        nim_score=nim_score,
        veebee_score=veebee_score,
        role_fit_score=role_fit_score,
        keyword_score=keyword.get(
            "score"
        ),
        formatting_score=formatting.get(
            "score"
        ),
    )

    explanation = build_platform_explanation(
        profile=profile,
        overall_score=final_score,
        formatting_score=formatting.get(
            "score"
        ),
        keyword_score=keyword.get(
            "score"
        ),
        section_score=sections.get(
            "score"
        ),
        experience_score=experience_result.get(
            "score"
        ),
        education_score=education_result.get(
            "score"
        ),
        role_fit_score=role_fit_score,
        hard_role_mismatch=hard_role_mismatch,
    )

    return {
        "platform": profile.name,
        "vendor": profile.vendor,

        "keyword_strategy": (
            profile.keyword_strategy
        ),

        "overall_score": final_score,

        "recommendation": recommendation,

        "confidence": confidence,

        "score_components": {
            "nim_score": nim_score,
            "veebee_score": veebee_score,
            "final_score": final_score,
            "weights": {
                "nim": 0.60,
                "veebee": 0.40,
            },
            "veebee_platform_dimensions": {
                "formatting": formatting.get("score"),
                "keywords": keyword.get("score"),
                "sections": sections.get("score"),
                "experience": experience_result.get("score"),
                "education": education_result.get("score"),
                "role_fit": role_fit_score,
            },
            "model_note": "Platform-specific weights are VeeBee compatibility assumptions, not proprietary vendor scoring formulas.",
        },

        "dimensions": {
            "formatting": formatting,
            "keyword_match": keyword,
            "sections": sections,
            "experience": experience_result,
            "education": education_result,
            "role_fit": {
                "score": role_fit_score,
                "status": _status(
                    role_fit_score
                ),
                "hard_mismatch": hard_role_mismatch,
                "matched": role.get(
                    "matched",
                    [],
                ),
                "missing": role.get(
                    "missing",
                    [],
                ),
                "reason": role.get(
                    "reason",
                    "",
                ),
            },
        },

        "explanation": explanation,

        "disclaimer": (
            "VeeBee ATS Compatibility Score. "
            "This is an independent estimate based on "
            "VeeBee's researched ATS profile and available "
            "resume/JD evidence. It is not a proprietary "
            "score returned by the ATS vendor."
        ),
    }


# ============================================================================
# ALL ATS REPORTS
# ============================================================================

def build_all_ats_reports(
    *,
    resume_profile: dict[str, Any],
    match_report: dict[str, Any],
) -> list[dict[str, Any]]:

    reports: list[dict[str, Any]] = []

    for profile in ATS_PROFILES.values():
        report = build_ats_report(
            profile=profile,
            resume_profile=resume_profile,
            match_report=match_report,
        )

        reports.append(report)

    reports.sort(
        key=lambda report: (
            report.get(
                "overall_score"
            )
            if report.get(
                "overall_score"
            ) is not None
            else -1
        ),
        reverse=True,
    )

    return reports


# ============================================================================
# ATS SUMMARY
# ============================================================================

def build_ats_summary(
    reports: list[dict[str, Any]],
) -> dict[str, Any]:

    valid = [
        report.get(
            "overall_score"
        )
        for report in reports
        if report.get(
            "overall_score"
        ) is not None
    ]

    average = (
        round(
            sum(valid) /
            len(valid)
        )
        if valid
        else None
    )

    highest = max(
        reports,
        key=lambda report: (
            report.get(
                "overall_score"
            )
            if report.get(
                "overall_score"
            ) is not None
            else -1
        ),
        default=None,
    )

    lowest = min(
        reports,
        key=lambda report: (
            report.get(
                "overall_score"
            )
            if report.get(
                "overall_score"
            ) is not None
            else 101
        ),
        default=None,
    )

    return {
        "platform_count": len(reports),

        "average_score": average,

        "highest_platform": (
            highest.get("platform")
            if highest
            else None
        ),

        "highest_score": (
            highest.get("overall_score")
            if highest
            else None
        ),

        "lowest_platform": (
            lowest.get("platform")
            if lowest
            else None
        ),

        "lowest_score": (
            lowest.get("overall_score")
            if lowest
            else None
        ),
    }