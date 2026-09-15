from __future__ import annotations

from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel, Field

from ..jd_checker.jd_service import jd_service


router = APIRouter(
    prefix="/jd-checker",
    tags=["JD Checker"],
)


class JDAnalyzeRequest(BaseModel):
    resume_text: str = Field(
        ...,
        min_length=1,
        description="Extracted resume text",
    )

    jd_text: str = Field(
        default="",
        description="Job description text",
    )

    company: str | None = Field(
        default=None,
        description="Selected or custom company name",
    )

    role: str | None = Field(
        default=None,
        description="Selected or custom target role",
    )

    engine: str = Field(
        default="llm",
        description="Analysis engine: nlp or llm",
    )


@router.post("/analyze")
def analyze_jd(
    request: JDAnalyzeRequest,
) -> dict[str, Any]:

    return jd_service.analyze(
        resume_text=request.resume_text,
        jd_text=request.jd_text,
        engine=request.engine,
        company=request.company,
        role=request.role,
    )