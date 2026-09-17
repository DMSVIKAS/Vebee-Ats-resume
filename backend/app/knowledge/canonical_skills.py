from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from .skill_knowledge import get_dataset_term_records


PROJECT_ROOT = Path(__file__).resolve().parents[3]

OUTPUT_PATH = (
    PROJECT_ROOT
    / "data"
    / "processed"
    / "canonical_skills.json"
)


# ---------------------------------------------------------
# Dataset/process vocabulary exclusions
# ---------------------------------------------------------

PROCESS_TERMS = {
    "application",
    "applications",
    "apply",
    "applicant",
    "candidate",
    "candidates",
    "interview",
    "interviews",
    "interview process",
    "interview question",
    "interview questions",
    "technical interview",
    "behavioral interview",
    "behavioral questions",
    "situational questions",
    "phone screen",
    "screening",
    "resume screening",
    "resume shortlisting",
    "selection process",
    "hiring process",
    "recruiter",
    "recruiting",
    "recruitment",
    "hiring manager",
    "hr interview",
    "offer",
    "no offer",
    "selected",
    "rejected",
    "declined",
    "online application",
    "online assessment",
    "campus recruiting",
    "campus recruitment",
    "walk-in interview",
}


GENERAL_NON_SKILL_TERMS = {
    "experience",
    "experiences",
    "requirements",
    "requirement",
    "responsibilities",
    "responsibility",
    "qualifications",
    "qualification",
    "education",
    "skills",
    "skill",
    "work",
    "working",
    "company",
    "companies",
    "role",
    "position",
    "job",
    "team",
    "teams",
}


def normalise_term(term: str) -> str:
    return " ".join(
        term.strip().lower().split()
    )


def is_obvious_process_term(term: str) -> bool:
    normalized = normalise_term(term)

    if normalized in PROCESS_TERMS:
        return True

    fragments = (
        "interview question",
        "tell me about yourself",
        "describe a time",
        "selection process",
        "application process",
        "resume walkthrough",
        "resume shortlisting",
        "online assessment",
        "classification:",
        "no technical round",
        "no offer",
    )

    return any(
        fragment in normalized
        for fragment in fragments
    )


def is_general_non_skill(term: str) -> bool:
    return (
        normalise_term(term)
        in GENERAL_NON_SKILL_TERMS
    )


def looks_like_skill_candidate(term: str) -> bool:
    """
    Conservative structural filtering.

    This does not invent skills.
    It only removes obvious process/general text.
    """

    normalized = normalise_term(term)

    if not normalized:
        return False

    if is_obvious_process_term(normalized):
        return False

    if is_general_non_skill(normalized):
        return False

    if normalized.endswith("?"):
        return False

    if len(normalized.split()) > 8:
        return False

    if len(normalized) > 80:
        return False

    return True


def build_canonical_candidates() -> list[dict[str, Any]]:
    records = get_dataset_term_records()

    candidates: dict[str, dict[str, Any]] = {}

    for record in records:
        raw_term = str(
            record.get("term", "")
        ).strip()

        if not looks_like_skill_candidate(
            raw_term
        ):
            continue

        key = normalise_term(raw_term)

        try:
            evidence_count = int(
                record.get(
                    "evidence_count",
                    0,
                )
            )
        except (TypeError, ValueError):
            evidence_count = 0

        companies = record.get(
            "companies",
            [],
        )

        if not isinstance(
            companies,
            list,
        ):
            companies = []

        if key not in candidates:
            candidates[key] = {
                "canonical": raw_term,
                "normalized": key,
                "evidence_count": 0,
                "companies": set(),
                "source": (
                    "100_company_skills_only(1).docx"
                ),
            }

        candidates[key][
            "evidence_count"
        ] += evidence_count

        candidates[key][
            "companies"
        ].update(
            str(company).strip()
            for company in companies
            if str(company).strip()
        )

    output: list[dict[str, Any]] = []

    for item in candidates.values():
        companies = sorted(
            item["companies"]
        )

        output.append(
            {
                "canonical": item["canonical"],
                "normalized": item["normalized"],
                "evidence_count": item[
                    "evidence_count"
                ],
                "company_count": len(
                    companies
                ),
                "companies": companies,
                "status": "candidate",
                "source": item["source"],
            }
        )

    output.sort(
        key=lambda item: (
            -item["evidence_count"],
            item["canonical"].lower(),
        )
    )

    return output


def save_canonical_candidates() -> list[dict[str, Any]]:
    candidates = build_canonical_candidates()

    payload = {
        "source_dataset": (
            "100_company_skills_only(1).docx"
        ),
        "candidate_count": len(
            candidates
        ),
        "note": (
            "Dataset-derived ATS skill candidates. "
            "These are not a final ontology and "
            "retain source evidence."
        ),
        "skills": candidates,
    }

    OUTPUT_PATH.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    with OUTPUT_PATH.open(
        "w",
        encoding="utf-8",
    ) as file:
        json.dump(
            payload,
            file,
            indent=2,
            ensure_ascii=False,
        )

    return candidates


def load_canonical_skills() -> list[dict[str, Any]]:
    """
    Load the already-generated canonical skill dataset.

    Generate it only when the processed file does not exist.
    This prevents expensive dataset processing during every
    application startup.
    """

    if OUTPUT_PATH.exists():
        try:
            with OUTPUT_PATH.open(
                "r",
                encoding="utf-8",
            ) as file:
                data = json.load(file)

            skills = data.get(
                "skills",
                [],
            )

            if isinstance(skills, list):
                return [
                    item
                    for item in skills
                    if isinstance(item, dict)
                ]

        except (
            OSError,
            json.JSONDecodeError,
        ):
            pass

    return save_canonical_candidates()


CANONICAL_SKILLS = load_canonical_skills()
