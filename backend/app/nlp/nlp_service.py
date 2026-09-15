from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import spacy
from spacy.matcher import PhraseMatcher
from spacy.util import filter_spans

from .skill_normalizer import normalize_skills


PROJECT_ROOT = Path(__file__).resolve().parents[3]

CANONICAL_SKILLS_PATH = (
    PROJECT_ROOT
    / "data"
    / "processed"
    / "canonical_skills.json"
)


class NLPService:

    def __init__(self) -> None:
        self.nlp = spacy.load(
            "en_core_web_sm"
        )

        self.skill_records = (
            self._load_skill_records()
        )

        self.skill_lookup: dict[
            str,
            dict[str, Any],
        ] = {}

        self.matcher = PhraseMatcher(
            self.nlp.vocab,
            attr="LOWER",
        )

        self._build_skill_matcher()

    # ---------------------------------------------------------
    # Dataset loading
    # ---------------------------------------------------------

    def _load_skill_records(
        self,
    ) -> list[dict[str, Any]]:

        if not CANONICAL_SKILLS_PATH.exists():
            raise FileNotFoundError(
                "canonical_skills.json not found at: "
                f"{CANONICAL_SKILLS_PATH}"
            )

        with CANONICAL_SKILLS_PATH.open(
            "r",
            encoding="utf-8",
        ) as file:
            data = json.load(file)

        records = data.get(
            "skills",
            [],
        )

        if not isinstance(
            records,
            list,
        ):
            raise ValueError(
                "'skills' must be a list "
                "in canonical_skills.json"
            )

        return [
            record
            for record in records
            if isinstance(
                record,
                dict,
            )
            and isinstance(
                record.get(
                    "canonical"
                ),
                str,
            )
        ]

    # ---------------------------------------------------------
    # spaCy matcher
    # ---------------------------------------------------------

    def _build_skill_matcher(
        self,
    ) -> None:

        patterns = []

        for record in self.skill_records:

            term = record[
                "canonical"
            ].strip()

            if not term:
                continue

            normalized = (
                term.lower().strip()
            )

            self.skill_lookup[
                normalized
            ] = record

            doc = self.nlp.make_doc(
                term
            )

            if len(doc) == 0:
                continue

            patterns.append(doc)

        if patterns:
            self.matcher.add(
                "VEEBEE_SKILL",
                patterns,
            )

    # ---------------------------------------------------------
    # Extraction
    # ---------------------------------------------------------

    def extract(
        self,
        text: str,
    ) -> dict[str, Any]:

        if not text or not text.strip():
            return {
                "text": "",
                "entities": [],
                "skills": [],
                "skill_entities": [],
            }

        doc = self.nlp(text)

        matches = self.matcher(doc)

        skill_spans = [
            doc[start:end]
            for _, start, end in matches
        ]

        # Remove nested/overlapping matches.
        skill_spans = filter_spans(
            skill_spans
        )

        skill_entities = []

        for span in skill_spans:

            text_value = span.text.strip()

            record = self.skill_lookup.get(
                text_value.lower().strip()
            )

            if not record:
                continue

            skill_entities.append(
                {
                    "text": text_value,
                    "canonical": record.get(
                        "canonical",
                        text_value,
                    ),
                    "label": "SKILL",
                    "start": span.start_char,
                    "end": span.end_char,
                    "evidence_count": record.get(
                        "evidence_count",
                        0,
                    ),
                    "company_count": record.get(
                        "company_count",
                        0,
                    ),
                    "companies": record.get(
                        "companies",
                        [],
                    ),
                }
            )

        # Prevent spaCy's general NER from overriding
        # dataset-derived skill spans.
        skill_ranges = {
            (
                span.start_char,
                span.end_char,
            )
            for span in skill_spans
        }

        general_entities = []

        for entity in doc.ents:

            overlaps_skill = False

            for start, end in skill_ranges:

                if (
                    entity.start_char < end
                    and entity.end_char > start
                ):
                    overlaps_skill = True
                    break

            if overlaps_skill:
                continue

            general_entities.append(
                {
                    "text": entity.text,
                    "label": entity.label_,
                    "start": entity.start_char,
                    "end": entity.end_char,
                }
            )

        # Existing normalizer remains part of the pipeline.
        detected_names = [
            item["canonical"]
            for item in skill_entities
        ]

        normalized_skills = (
            normalize_skills(
                detected_names
            )
        )

        return {
            "text": text,
            "entities": (
                general_entities
                + skill_entities
            ),
            "skills": normalized_skills,
            "skill_entities": skill_entities,
        }

    # ---------------------------------------------------------
    # Resume ↔ JD skill comparison
    # ---------------------------------------------------------

    def compare(
        self,
        resume_text: str,
        jd_text: str,
    ) -> dict[str, Any]:

        resume = self.extract(
            resume_text
        )

        jd = self.extract(
            jd_text
        )

        resume_skills = {
            str(
                item.get(
                    "canonical",
                    item.get(
                        "text",
                        "",
                    ),
                )
            ).lower().strip()
            for item in resume[
                "skill_entities"
            ]
        }

        jd_skills = {
            str(
                item.get(
                    "canonical",
                    item.get(
                        "text",
                        "",
                    ),
                )
            ).lower().strip()
            for item in jd[
                "skill_entities"
            ]
        }

        matched = sorted(
            jd_skills.intersection(
                resume_skills
            )
        )

        missing = sorted(
            jd_skills.difference(
                resume_skills
            )
        )

        total = len(jd_skills)

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
            "resume": resume,
            "jd": jd,
            "matched_skills": matched,
            "missing_skills": missing,
            "skill_match_score": score,
        }


nlp_service = NLPService()