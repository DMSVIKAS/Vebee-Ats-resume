from fastapi import APIRouter
from pydantic import BaseModel

from ..nlp.nlp_service import nlp_service


router = APIRouter(
    prefix="/nlp",
    tags=["NLP"],
)


class TextRequest(BaseModel):
    text: str


class JDCheckRequest(BaseModel):
    resume_text: str
    jd_text: str


@router.post("/extract")
def extract_entities(request: TextRequest):
    result = nlp_service.extract(request.text)

    return {
        "success": True,
        "data": result,
    }


@router.post("/compare")
def compare_resume_to_jd(request: JDCheckRequest):
    result = nlp_service.compare(
        resume_text=request.resume_text,
        jd_text=request.jd_text,
    )

    return {
        "success": True,
        "data": result,
    }