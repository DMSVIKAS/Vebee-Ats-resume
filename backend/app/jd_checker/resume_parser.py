from __future__ import annotations

import re
from typing import Any


SECTION_ALIASES = {
    "summary": {
        "summary",
        "professional summary",
        "profile",
        "objective",
        "career objective",
    },
    "experience": {
        "experience",
        "work experience",
        "professional experience",
        "employment",
        "employment history",
    },
    "education": {
        "education",
        "academic background",
        "academic qualifications",
    },
    "projects": {
        "projects",
        "academic projects",
        "personal projects",
    },
    "skills": {
        "skills",
        "technical skills",
        "core skills",
        "technologies",
        "technical proficiency",
    },
    "certifications": {
        "certifications",
        "certificates",
    },
}


def clean_text(text: str) -> str:
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

    return "\n".join(cleaned).strip()


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


def extract_sections(
    text: str,
) -> dict[str, str]:

    sections: dict[
        str,
        list[str],
    ] = {
        "header": []
    }

    current_section = "header"

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

    return {
        section: "\n".join(lines).strip()
        for section, lines
        in sections.items()
        if "\n".join(lines).strip()
    }


def extract_candidate_name(
    text: str,
) -> str | None:

    cleaned = clean_text(text)

    if not cleaned:
        return None

    for line in cleaned.split(
        "\n"
    )[:8]:

        candidate = line.strip()

        if not candidate:
            continue

        lower = candidate.lower()

        if any(
            marker in lower
            for marker in (
                "@",
                "http://",
                "https://",
                "linkedin",
                "github",
                "+91",
            )
        ):
            continue

        words = candidate.split()

        if not (
            2 <= len(words) <= 5
        ):
            continue

        if all(
            re.match(
                r"^[A-Za-z][A-Za-z.'-]*$",
                word,
            )
            for word in words
        ):
            return candidate

    return None


def extract_experience_years(
    text: str,
) -> float | None:

    pattern = re.compile(
        r"(\d+(?:\.\d+)?)\s*\+?\s*"
        r"years?\s*(?:of\s*)?experience",
        re.IGNORECASE,
    )

    matches = pattern.findall(
        text
    )

    if not matches:
        return None

    values = [
        float(value)
        for value in matches
    ]

    return max(values)


def parse_resume(
    text: str,
) -> dict[str, Any]:

    cleaned = clean_text(text)

    if not cleaned:

        return {
            "success": False,
            "error": "Resume text is empty.",
            "profile": None,
        }

    sections = extract_sections(
        cleaned
    )

    profile = {
        "name": extract_candidate_name(
            cleaned
        ),
        "experience_years": (
            extract_experience_years(
                cleaned
            )
        ),
        "sections": sections,
        "raw_text": cleaned,
    }

    return {
        "success": True,
        "profile": profile,
    }