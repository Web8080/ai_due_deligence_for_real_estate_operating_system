# Author: Victor.I
import os
import shutil
from pathlib import Path

from PIL import Image
from pypdf import PdfReader
import pytesseract


def extract_text(path: Path) -> str:
    suffix = path.suffix.lower()
    if suffix == ".txt":
        return path.read_text(encoding="utf-8", errors="ignore")
    if suffix == ".pdf":
        return _extract_pdf_text(path)
    if suffix in {".png", ".jpg", ".jpeg", ".webp"}:
        return _ocr_image(path)
    raise ValueError(f"Unsupported file type: {suffix}")


def _extract_pdf_text(path: Path) -> str:
    reader = PdfReader(str(path))
    pages = []
    for page in reader.pages:
        pages.append(page.extract_text() or "")
    return "\n".join(pages).strip()


def _ocr_image(path: Path) -> str:
    if os.getenv("REOS_OCR_MODE", "").lower() == "basic":
        return ""
    if shutil.which("tesseract") is None:
        return ""
    try:
        image = Image.open(path)
        return pytesseract.image_to_string(image)
    except Exception as exc:
        raise ValueError(f"OCR failed: {exc}") from exc
