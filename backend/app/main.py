from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from .api.nlp import router as nlp_router
from .api.jd_checker import router as jd_checker_router
from .api.optimizer import router as optimizer_router


app = FastAPI(
    title="VeeBee AI Resume Intelligence API",
    version="0.2.0",
    description=(
        "VeeBee resume intelligence, JD matching, "
        "resume optimization, and AI-powered ATS "
        "compatibility analysis."
    ),
)


# ============================================================================
# CORS
# ============================================================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# HEALTH
# ============================================================================

@app.get("/health")
def health():
    return {
        "success": True,
        "message": "VeeBee API is running",
    }


# ============================================================================
# RESUME TEMPLATE DOWNLOADS
# ============================================================================

TEMPLATES_DIR = Path(__file__).resolve().parent / "templates"


@app.get("/templates/{template_id}")
def download_template(template_id: int):
    """
    Download one of the six VeeBee resume templates.
    """

    if template_id not in range(1, 7):
        raise HTTPException(
            status_code=404,
            detail="Template not found. Available templates are 1 through 6.",
        )

    template_path = TEMPLATES_DIR / f"{template_id}.tex"

    if not template_path.is_file():
        raise HTTPException(
            status_code=404,
            detail=f"Template {template_id}.tex does not exist.",
        )

    return FileResponse(
        path=template_path,
        media_type="application/x-tex",
        filename=f"{template_id}.tex",
    )


# ============================================================================
# EXISTING ROUTERS
# ============================================================================

app.include_router(
    nlp_router,
)

app.include_router(
    jd_checker_router,
)


# ============================================================================
# RESUME OPTIMIZER
# ============================================================================

app.include_router(
    optimizer_router,
)
