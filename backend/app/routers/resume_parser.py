
from io import BytesIO

import fitz
from docx import Document
from fastapi import APIRouter, File, HTTPException, UploadFile


router = APIRouter(
    prefix="/resume",
    tags=["Resume Parser"],
)


MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


def extract_pdf_text(file_bytes: bytes) -> str:
    """Extract text from a PDF using PyMuPDF."""

    try:
        pdf = fitz.open(
            stream=file_bytes,
            filetype="pdf",
        )

        pages = []

        for page in pdf:
            text = page.get_text("text")

            if text:
                pages.append(text.strip())

        pdf.close()

        return "\n\n".join(
            page for page in pages if page
        ).strip()

    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Unable to read PDF: {exc}",
        )


def extract_docx_text(file_bytes: bytes) -> str:
    """Extract text from a DOCX file."""

    try:
        document = Document(
            BytesIO(file_bytes)
        )

        paragraphs = [
            paragraph.text.strip()
            for paragraph in document.paragraphs
            if paragraph.text.strip()
        ]

        return "\n".join(paragraphs).strip()

    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Unable to read DOCX: {exc}",
        )


def extract_txt_text(file_bytes: bytes) -> str:
    """Extract text from a TXT file."""

    try:
        return file_bytes.decode(
            "utf-8",
            errors="replace",
        ).strip()

    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Unable to read TXT: {exc}",
        )


@router.post("/extract")
async def extract_resume(
    file: UploadFile = File(...),
):
    """
    Extract resume text from PDF, DOCX, or TXT.

    This endpoint performs document parsing on the backend
    so mobile browsers do not need to run PDF.js.
    """

    filename = file.filename or ""

    extension = (
        filename.lower()
        .rsplit(".", 1)[-1]
        if "." in filename
        else ""
    )

    allowed_extensions = {
        "pdf",
        "docx",
        "txt",
    }

    if extension not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=(
                "Unsupported file type. "
                "Please upload PDF, DOCX, or TXT."
            ),
        )

    file_bytes = await file.read()

    if not file_bytes:
        raise HTTPException(
            status_code=400,
            detail="The uploaded file is empty.",
        )

    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail="File is too large. Maximum size is 10 MB.",
        )

    if extension == "pdf":
        text = extract_pdf_text(file_bytes)

    elif extension == "docx":
        text = extract_docx_text(file_bytes)

    else:
        text = extract_txt_text(file_bytes)

    if not text:
        raise HTTPException(
            status_code=422,
            detail=(
                "No readable text was found in this file. "
                "If this is a scanned PDF, OCR support is required."
            ),
        )

    word_count = len(
        text.split()
    )

    return {
        "success": True,
        "filename": filename,
        "text": text,
        "word_count": word_count,
        "file_type": extension,
    }
