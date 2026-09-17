from io import BytesIO

import fitz
import pytesseract
from docx import Document
from fastapi import APIRouter, File, HTTPException, UploadFile
from PIL import Image

router = APIRouter(prefix="/resume", tags=["Resume Parser"])

MAX_FILE_SIZE = 10 * 1024 * 1024


def extract_pdf_text(file_bytes: bytes) -> str:
    """Extract text from PDF. OCR scanned pages when needed."""

    try:
        pdf = fitz.open(
            stream=file_bytes,
            filetype="pdf",
        )

        pages = []

        for page in pdf:

            # First try normal PDF text extraction
            text = page.get_text("text")

            if text and text.strip():
                pages.append(text.strip())
                continue

            # If this page has no text, OCR it
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
                pages.append(
                    ocr_text.strip()
                )

        pdf.close()

        return "\n\n".join(pages).strip()

    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Unable to read PDF: {exc}",
        )


def extract_docx_text(file_bytes: bytes) -> str:

    try:
        document = Document(
            BytesIO(file_bytes)
        )

        paragraphs = []

        for paragraph in document.paragraphs:

            text = paragraph.text.strip()

            if text:
                paragraphs.append(text)

        # Also extract text from tables
        for table in document.tables:

            for row in table.rows:

                row_text = []

                for cell in row.cells:

                    text = cell.text.strip()

                    if text:
                        row_text.append(text)

                if row_text:
                    paragraphs.append(
                        " | ".join(row_text)
                    )

        return "\n".join(paragraphs).strip()

    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Unable to read DOCX: {exc}",
        )


def extract_txt_text(file_bytes: bytes) -> str:

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
    file: UploadFile = File(...)
):

    filename = file.filename or ""

    extension = (
        filename.lower().rsplit(".", 1)[-1]
        if "." in filename
        else ""
    )

    if extension not in {
        "pdf",
        "docx",
        "txt",
    }:

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
                "No readable text was found "
                "in this file. OCR could not "
                "extract any text."
            ),
        )

    return {
        "success": True,
        "filename": filename,
        "text": text,
        "word_count": len(text.split()),
        "file_type": extension,
    }
