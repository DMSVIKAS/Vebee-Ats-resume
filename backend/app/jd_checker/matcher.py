from __future__ import annotations

from typing import Any


def _clean_skill_name(
    value: Any,
) -> str:

    return str(
        value or ""
    ).strip()


def _skill_key(
    value: Any,
) -> str:

    return _clean_skill_name(
        value
    ).lower()


def match_detected_skills(
    jd_detected_skills: list[
        dict[str, Any]
    ],
    resume_detected_skills: list[
        dict[str, Any]
    ],
) -> dict[str, Any]:

    jd_map: dict[
        str,
        dict[str, Any],
    ] = {}

    resume_map: dict[
        str,
        dict[str, Any],
    ] = {}

    for item in jd_detected_skills:

        skill = _clean_skill_name(
            item.get(
                "canonical",
                item.get(
                    "text",
                    "",
                ),
            )
        )

        if not skill:
            continue

        jd_map[
            _skill_key(skill)
        ] = item

    for item in resume_detected_skills:

        skill = _clean_skill_name(
            item.get(
                "canonical",
                item.get(
                    "text",
                    "",
                ),
            )
        )

        if not skill:
            continue

        resume_map[
            _skill_key(skill)
        ] = item

    matched: list[
        dict[str, Any]
    ] = []

    missing: list[
        dict[str, Any]
    ] = []

    for key, jd_item in jd_map.items():

        skill = _clean_skill_name(
            jd_item.get(
                "canonical",
                jd_item.get(
                    "text",
                    "",
                ),
            )
        )

        result = {
            "skill": skill,
            "status": (
                "matched"
                if key in resume_map
                else "missing"
            ),
            "evidence_count": jd_item.get(
                "evidence_count",
                0,
            ),
            "company_count": jd_item.get(
                "company_count",
                0,
            ),
            "companies": jd_item.get(
                "companies",
                [],
            ),
        }

        if key in resume_map:
            matched.append(result)
        else:
            missing.append(result)

    total = (
        len(matched)
        + len(missing)
    )

    score = (
        round(
            len(matched)
            / total
            * 100
        )
        if total
        else None
    )

    return {
        "matched": matched,
        "missing": missing,
        "jd_skill_count": total,
        "matched_count": len(matched),
        "missing_count": len(missing),
        "skill_match_score": score,
    }


def match_role(
    jd_role: str | None,
    resume_text: str,
) -> dict[str, Any]:

    if not jd_role:
        return {
            "status": "unknown",
            "jd_role": None,
            "score": None,
        }

    # Avoid a second string-matching implementation here.
    # A strict exact phrase check is acceptable for the
    # initial role alignment layer.
    role_lower = jd_role.lower().strip()
    resume_lower = resume_text.lower()

    if role_lower in resume_lower:
        return {
            "status": "matched",
            "jd_role": jd_role,
            "score": 100,
        }

    return {
        "status": "uncertain",
        "jd_role": jd_role,
        "score": None,
    }


def match_experience(
    required_years: float | None,
    resume_years: float | None,
) -> dict[str, Any]:

    if required_years is None:

        return {
            "status": "not_specified",
            "required_years": None,
            "resume_years": resume_years,
            "score": None,
        }

    if resume_years is None:

        return {
            "status": "unknown",
            "required_years": required_years,
            "resume_years": None,
            "score": None,
        }

    if resume_years >= required_years:

        return {
            "status": "matched",
            "required_years": required_years,
            "resume_years": resume_years,
            "score": 100,
        }

    ratio = max(
        0.0,
        min(
            1.0,
            resume_years
            / required_years,
        ),
    )

    return {
        "status": "partial",
        "required_years": required_years,
        "resume_years": resume_years,
        "score": round(
            ratio * 100
        ),
    }


def match_education(
    required_education: list[str],
    resume_text: str,
) -> dict[str, Any]:

    if not required_education:

        return {
            "status": "not_specified",
            "matched": [],
            "missing": [],
            "score": None,
        }

    resume_lower = (
        resume_text.lower()
    )

    matched: list[str] = []
    missing: list[str] = []

    for requirement in (
        required_education
    ):

        requirement_lower = (
            requirement.lower()
        )

        if (
            requirement_lower
            in resume_lower
        ):
            matched.append(
                requirement
            )
        else:
            missing.append(
                requirement
            )

    total = (
        len(matched)
        + len(missing)
    )

    score = (
        round(
            len(matched)
            / total
            * 100
        )
        if total
        else None
    )

    return {
        "status": (
            "matched"
            if not missing
            else "partial"
            if matched
            else "missing"
        ),
        "matched": matched,
        "missing": missing,
        "score": score,
    }


def calculate_overall_score(
    skill_score: int | None,
    role_score: int | None,
    experience_score: int | None,
    education_score: int | None,
) -> int | None:

    signals: list[
        tuple[float, float]
    ] = []

    if skill_score is not None:
        signals.append(
            (
                0.50,
                float(skill_score),
            )
        )

    if role_score is not None:
        signals.append(
            (
                0.20,
                float(role_score),
            )
        )

    if experience_score is not None:
        signals.append(
            (
                0.20,
                float(experience_score),
            )
        )

    if education_score is not None:
        signals.append(
            (
                0.10,
                float(education_score),
            )
        )

    if not signals:
        return None

    total_weight = sum(
        weight
        for weight, _ in signals
    )

    weighted_score = sum(
        weight * score
        for weight, score in signals
    )

    return round(
        weighted_score
        / total_weight
    )


def build_match_report(
    *,
    jd_profile: dict[str, Any],
    resume_profile: dict[str, Any],
    jd_detected_skills: list[
        dict[str, Any]
    ],
    resume_detected_skills: list[
        dict[str, Any]
    ],
) -> dict[str, Any]:

    skill_result = (
        match_detected_skills(
            jd_detected_skills=(
                jd_detected_skills
            ),
            resume_detected_skills=(
                resume_detected_skills
            ),
        )
    )

    role_result = match_role(
        jd_role=jd_profile.get(
            "role"
        ),
        resume_text=resume_profile.get(
            "raw_text",
            "",
        ),
    )

    experience_result = (
        match_experience(
            required_years=jd_profile.get(
                "minimum_experience_years"
            ),
            resume_years=resume_profile.get(
                "experience_years"
            ),
        )
    )

    education_result = (
        match_education(
            required_education=(
                jd_profile.get(
                    "education",
                    [],
                )
            ),
            resume_text=resume_profile.get(
                "raw_text",
                "",
            ),
        )
    )

    overall_score = (
        calculate_overall_score(
            skill_score=skill_result.get(
                "skill_match_score"
            ),
            role_score=role_result.get(
                "score"
            ),
            experience_score=(
                experience_result.get(
                    "score"
                )
            ),
            education_score=(
                education_result.get(
                    "score"
                )
            ),
        )
    )

    return {
        "overall_score": overall_score,
        "role": role_result,
        "skills": skill_result,
        "experience": experience_result,
        "education": education_result,
    }