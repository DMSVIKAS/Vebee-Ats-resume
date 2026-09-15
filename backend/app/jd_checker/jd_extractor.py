from __future__ import annotations

import re
from typing import Any


SECTION_ALIASES = {
    "requirements": {
        "requirements",
        "required qualifications",
        "minimum qualifications",
        "qualifications",
        "required skills",
        "technical requirements",
    },
    "preferred": {
        "preferred qualifications",
        "preferred skills",
        "nice to have",
        "nice-to-have",
        "preferred",
    },
    "responsibilities": {
        "responsibilities",
        "what you'll do",
        "what you will do",
        "duties",
        "job responsibilities",
        "role responsibilities",
    },
    "education": {
        "education",
        "educational requirements",
        "academic requirements",
        "qualifications and education",
    },
}


EDUCATION_PATTERNS = (
    r"\bbachelor(?:'s|s)?\b",
    r"\bmaster(?:'s|s)?\b",
    r"\bph\.?d\.?\b",
    r"\bmba\b",
    r"\bb\.?tech\b",
    r"\bm\.?tech\b",
    r"\bb\.?e\.?\b",
    r"\bm\.?e\.?\b",
    r"\bundergraduate degree\b",
    r"\bgraduate degree\b",
)


def clean_text(
    text: str,
) -> str:

    text = text.replace(
        "\r\n",
        "\n",
    ).replace(
        "\r",
        "\n",
    )

    lines = [
        line.strip()
        for line in text.split("\n")
    ]

    cleaned = []
    previous_blank = False

    for line in lines:

        if not line:

            if not previous_blank:
                cleaned.append("")

            previous_blank = True
            continue

        cleaned.append(line)
        previous_blank = False

    return "\n".join(
        cleaned
    ).strip()


def normalise_heading(
    text: str,
) -> str:

    text = text.strip().lower()

    text = re.sub(
        r"[:\-|]+$",
        "",
        text,
    )

    text = re.sub(
        r"\s+",
        " ",
        text,
    )

    return text


def detect_section(
    line: str,
) -> str | None:

    heading = normalise_heading(
        line
    )

    for section, aliases in (
        SECTION_ALIASES.items()
    ):
        if heading in aliases:
            return section

    return None


def extract_role(
    text: str,
) -> str | None:

    lines = [
        line.strip()
        for line in text.split("\n")
        if line.strip()
    ]

    patterns = [
        re.compile(
            r"^(?:job\s*title|position|role)"
            r"\s*[:\-]\s*(.+)$",
            re.IGNORECASE,
        ),
        re.compile(
            r"^(?:we are looking for|hiring)"
            r"\s+(?:a|an)?\s*(.+)$",
            re.IGNORECASE,
        ),
    ]

    for line in lines[:20]:

        for pattern in patterns:

            match = pattern.match(
                line
            )

            if match:

                role = (
                    match.group(1)
                    .strip()
                )

                if role:
                    return role

    ignored = {
        "requirements",
        "qualifications",
        "responsibilities",
        "education",
        "experience",
        "skills",
        "job description",
        "about the role",
        "about us",
    }

    for line in lines[:8]:

        normalized = normalise_heading(
            line
        )

        if normalized in ignored:
            continue

        if 1 <= len(
            line.split()
        ) <= 8:

            return line

    return None


def extract_min_experience(
    text: str,
) -> float | None:

    patterns = [
        # 2+ years of experience
        re.compile(
            r"(\d+(?:\.\d+)?)\s*\+?\s*"
            r"years?\s*(?:of\s*)?experience",
            re.IGNORECASE,
        ),

        # minimum of 2 years
        re.compile(
            r"minimum\s*(?:of\s*)?"
            r"(\d+(?:\.\d+)?)\s*years?",
            re.IGNORECASE,
        ),

        # at least 2 years
        re.compile(
            r"at\s*least\s*"
            r"(\d+(?:\.\d+)?)\s*years?",
            re.IGNORECASE,
        ),

        # Work Experience: 1+ Years
        re.compile(
            r"work\s*experience\s*[:\-]?\s*"
            r"(\d+(?:\.\d+)?)\s*\+?\s*years?",
            re.IGNORECASE,
        ),

        # Experience: 1+ Years
        re.compile(
            r"experience\s*[:\-]?\s*"
            r"(\d+(?:\.\d+)?)\s*\+?\s*years?",
            re.IGNORECASE,
        ),

        # 1+ years experience
        re.compile(
            r"(\d+(?:\.\d+)?)\s*\+?\s*"
            r"years?\s+experience",
            re.IGNORECASE,
        ),
    ]

    values: list[float] = []

    for pattern in patterns:
        for value in pattern.findall(text):
            try:
                values.append(float(value))
            except ValueError:
                continue

    if not values:
        return None

    # For a JD, the strongest explicit minimum requirement
    # should be retained.
    return max(values)


def extract_education(
    text: str,
) -> list[str]:

    results: list[str] = []

    for line in text.split("\n"):

        stripped = line.strip()

        if not stripped:
            continue

        # Only inspect lines containing
        # explicit education language.
        matches = any(
            re.search(
                pattern,
                stripped,
                re.IGNORECASE,
            )
            for pattern
            in EDUCATION_PATTERNS
        )

        if matches and (
            stripped not in results
        ):
            results.append(
                stripped
            )

    return results[:20]


def extract_sections(
    text: str,
) -> dict[str, list[str]]:

    sections: dict[
        str,
        list[str],
    ] = {
        "unclassified": []
    }

    current_section = "unclassified"

    for line in text.split("\n"):

        stripped = line.strip()

        if not stripped:
            continue

        section = detect_section(
            stripped
        )

        if section:

            current_section = section

            sections.setdefault(
                section,
                [],
            )

            continue

        sections.setdefault(
            current_section,
            [],
        )

        sections[
            current_section
        ].append(stripped)

    return sections


def extract_responsibilities(
    text: str,
) -> list[str]:

    sections = extract_sections(
        text
    )

    responsibility_lines = (
        sections.get(
            "responsibilities",
            [],
        )
    )

    results: list[str] = []

    for line in responsibility_lines:

        cleaned = re.sub(
            r"^[•*\-–—]\s*",
            "",
            line,
        ).strip()

        if cleaned and (
            cleaned not in results
        ):
            results.append(
                cleaned
            )

    return results[:100]


def extract_requirement_lines(
    text: str,
) -> list[str]:

    sections = extract_sections(
        text
    )

    results: list[str] = []

    for section_name in (
        "requirements",
        "preferred",
    ):

        for line in sections.get(
            section_name,
            [],
        ):

            cleaned = re.sub(
                r"^[•*\-–—]\s*",
                "",
                line,
            ).strip()

            if cleaned and (
                cleaned not in results
            ):
                results.append(
                    cleaned
                )

    return results[:100]


def parse_job_description(
    text: str,
) -> dict[str, Any]:

    cleaned = clean_text(text)

    if not cleaned:

        return {
            "success": False,
            "error": (
                "Job description is empty."
            ),
            "profile": None,
        }

    profile = {
        "role": extract_role(
            cleaned
        ),

        "minimum_experience_years": (
            extract_min_experience(
                cleaned
            )
        ),

        "education": (
            extract_education(
                cleaned
            )
        ),

        "responsibilities": (
            extract_responsibilities(
                cleaned
            )
        ),

        "requirement_lines": (
            extract_requirement_lines(
                cleaned
            )
        ),

        "sections": extract_sections(
            cleaned
        ),

        "raw_text": cleaned,
    }

    return {
        "success": True,
        "profile": profile,
    }