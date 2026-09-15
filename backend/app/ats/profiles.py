"""
VeeBee ATS platform profiles.

These are VeeBee's modeled compatibility profiles based on documented
and researched characteristics of ATS platforms. They are NOT proprietary
vendor scoring algorithms.
"""

from dataclasses import dataclass
from typing import Dict


@dataclass(frozen=True)
class ATSProfile:
    name: str
    vendor: str
    keyword_strategy: str

    # Relative weights. They will be normalized during scoring.
    weights: Dict[str, float]

    # Behavioral rules used by VeeBee's compatibility model.
    strict_required_keywords: bool
    section_sensitivity: float
    formatting_sensitivity: float
    abbreviation_tolerance: float
    semantic_matching: bool


ATS_PROFILES: Dict[str, ATSProfile] = {

    "workday": ATSProfile(
        name="Workday",
        vendor="Workday",
        keyword_strategy="exact_plus_ai_assisted",
        weights={
            "formatting": 0.25,
            "keywords": 0.30,
            "sections": 0.15,
            "experience": 0.20,
            "education": 0.10,
        },
        strict_required_keywords=True,
        section_sensitivity=0.90,
        formatting_sensitivity=0.90,
        abbreviation_tolerance=0.45,
        semantic_matching=True,
    ),

    "taleo": ATSProfile(
        name="Taleo",
        vendor="Oracle",
        keyword_strategy="literal_exact",
        weights={
            "formatting": 0.20,
            "keywords": 0.40,
            "sections": 0.15,
            "experience": 0.15,
            "education": 0.10,
        },
        strict_required_keywords=True,
        section_sensitivity=0.90,
        formatting_sensitivity=0.85,
        abbreviation_tolerance=0.20,
        semantic_matching=False,
    ),

    "icims": ATSProfile(
        name="iCIMS",
        vendor="iCIMS",
        keyword_strategy="semantic_ml",
        weights={
            "formatting": 0.15,
            "keywords": 0.30,
            "sections": 0.15,
            "experience": 0.30,
            "education": 0.10,
        },
        strict_required_keywords=False,
        section_sensitivity=0.70,
        formatting_sensitivity=0.55,
        abbreviation_tolerance=0.80,
        semantic_matching=True,
    ),

    "greenhouse": ATSProfile(
        name="Greenhouse",
        vendor="Greenhouse",
        keyword_strategy="semantic_human_review",
        weights={
            "formatting": 0.10,
            "keywords": 0.25,
            "sections": 0.20,
            "experience": 0.30,
            "education": 0.15,
        },
        strict_required_keywords=False,
        section_sensitivity=0.70,
        formatting_sensitivity=0.50,
        abbreviation_tolerance=0.80,
        semantic_matching=True,
    ),

    "lever": ATSProfile(
        name="Lever",
        vendor="Employ",
        keyword_strategy="stemming_search",
        weights={
            "formatting": 0.15,
            "keywords": 0.35,
            "sections": 0.15,
            "experience": 0.25,
            "education": 0.10,
        },
        strict_required_keywords=False,
        section_sensitivity=0.65,
        formatting_sensitivity=0.60,
        abbreviation_tolerance=0.35,
        semantic_matching=False,
    ),

    "successfactors": ATSProfile(
        name="SuccessFactors",
        vendor="SAP",
        keyword_strategy="taxonomy_normalization",
        weights={
            "formatting": 0.15,
            "keywords": 0.30,
            "sections": 0.15,
            "experience": 0.25,
            "education": 0.15,
        },
        strict_required_keywords=False,
        section_sensitivity=0.75,
        formatting_sensitivity=0.65,
        abbreviation_tolerance=0.75,
        semantic_matching=True,
    ),
}


def get_ats_profile(platform: str) -> ATSProfile:
    """Return an ATS profile by name."""
    key = platform.strip().lower().replace(" ", "").replace("-", "")

    aliases = {
        "workday": "workday",
        "taleo": "taleo",
        "oracle": "taleo",
        "icims": "icims",
        "greenhouse": "greenhouse",
        "lever": "lever",
        "successfactors": "successfactors",
        "successfactorssap": "successfactors",
    }

    if key not in aliases:
        raise ValueError(f"Unsupported ATS platform: {platform}")

    return ATS_PROFILES[aliases[key]]