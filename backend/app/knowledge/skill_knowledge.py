from __future__ import annotations

import json
from pathlib import Path
from typing import Any


PROJECT_ROOT = Path(__file__).resolve().parents[3]

VOCABULARY_PATH = (
    PROJECT_ROOT
    / "data"
    / "processed"
    / "dataset_vocabulary.json"
)


def load_dataset_vocabulary() -> dict[str, Any]:
    """Load the VeeBee dataset-derived vocabulary."""

    if not VOCABULARY_PATH.exists():
        raise FileNotFoundError(
            f"Dataset vocabulary not found at: {VOCABULARY_PATH}"
        )

    with VOCABULARY_PATH.open(
        "r",
        encoding="utf-8",
    ) as file:
        data = json.load(file)

    if not isinstance(data, dict):
        raise ValueError(
            "dataset_vocabulary.json must contain a JSON object."
        )

    return data


def get_dataset_term_records() -> list[dict[str, Any]]:
    """
    Return the complete vocabulary records generated from
    100_company_skills_only(1).docx.
    """

    data = load_dataset_vocabulary()

    terms = data.get("terms", [])

    if not isinstance(terms, list):
        raise ValueError(
            "The 'terms' field must be a list."
        )

    records: list[dict[str, Any]] = []

    for item in terms:
        if not isinstance(item, dict):
            continue

        term = item.get("term")

        if not isinstance(term, str):
            continue

        term = term.strip()

        if not term:
            continue

        records.append(item)

    return records


def get_dataset_terms() -> list[str]:
    """Return only the raw dataset term strings."""

    return sorted(
        {
            record["term"].strip()
            for record in get_dataset_term_records()
            if record.get("term")
        },
        key=str.lower,
    )


DATASET_TERM_RECORDS = get_dataset_term_records()
DATASET_TERMS = [
    record["term"]
    for record in DATASET_TERM_RECORDS
]