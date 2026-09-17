from io import BytesIO

import fitz
import pytesseract
from docx import Document
from fastapi import APIRouter, File, HTTPException, UploadFile
from PIL import Image


router = APIRouter(
    prefix="/resume",
    tags=["Resume Parser"],
)


MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


def extract_pdf_text(file_bytes: bytes) -> str:
    """Extract text from a PDF, with OCR fallback for scanned PDFs."""

    try:
        pdf = fitz.open(
            stream=file_bytes,
            filetype="pdf",
        )

        # ---------------------------------------------------------
        # 1. Try normal text extraction first
        # ---------------------------------------------------------
        pages = []

        for page in pdf:
            text = page.get_text("text")

            if text and text.strip():
                pages.append(text.strip())

        text = "\n\n".join(
            page for page in pages if page
        ).strip()

        # Normal text-based PDF
        if text:
            pdf.close()
            return text

        # ---------------------------------------------------------
        # 2. No text found → OCR scanned/image PDF
        # ---------------------------------------------------------
        ocr_pages = []

        for page in pdf:
            pixmap = page.get_pixmap(
                dpi=150,
                alpha=False,
            )

            image = Image.open(
                BytesIO(
                    pixmap.tobytes("png")
                )
            )

            ocr_text = pytesseract.image_to_string(
                image
            )

            if ocr_text and ocr_text.strip():
                ocr_pages.append(
                    ocr_text.strip()
                )

        pdf.close()

        return "\n\n".join(
            ocr_pages
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

        return "\n".join(
            paragraphs
        ).strip()

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

    PDF extraction uses PyMuPDF first and
    Tesseract OCR for scanned/image-only PDFs.
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
            detail=(
                "File is too large. "
                "Maximum size is 10 MB."
            ),
        )

    if extension == "pdf":
        text = extract_pdf_text(
            file_bytes
        )

    elif extension == "docx":
        text = extract_docx_text(
            file_bytes
        )

    else:
        text = extract_txt_text(
            file_bytes
        )

    if not text:
        raise HTTPException(
            status_code=422,
            detail=(
                "No readable text was found in this file. "
                "OCR could not extract any text."
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
