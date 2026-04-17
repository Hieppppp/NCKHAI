"""
OCR Service: Tesseract (Vietnamese + English) with full bbox annotation.
- PDF: PyPDF2 text extract → fallback pdf2image + Tesseract OCR per page
- Image: Tesseract with word-level bounding boxes
- Output: structured JSON with annotations (text, bbox, confidence, page)
"""

import io
import logging
from PIL import Image
import pytesseract
from PyPDF2 import PdfReader

logger = logging.getLogger("ocr-service")


def _ocr_image_with_bbox(image: Image.Image, lang: str = "vie+eng", page_no: int = 1) -> dict:
    """OCR a PIL image, return text + word-level bbox annotations."""
    data = pytesseract.image_to_data(image, lang=lang, output_type=pytesseract.Output.DICT)

    annotations = []
    lines: dict[tuple, list] = {}  # group words by (block, par, line)
    n = len(data["text"])

    for i in range(n):
        word = data["text"][i].strip()
        conf = int(data["conf"][i])
        if not word or conf < 0:
            continue

        key = (data["block_num"][i], data["par_num"][i], data["line_num"][i])
        if key not in lines:
            lines[key] = []
        lines[key].append(i)

        annotations.append({
            "text": word,
            "type": "word",
            "confidence": round(conf / 100, 2),
            "page": page_no,
            "bbox": {
                "x": data["left"][i],
                "y": data["top"][i],
                "width": data["width"][i],
                "height": data["height"][i],
            },
            "block": data["block_num"][i],
            "line": data["line_num"][i],
        })

    # Build line-level annotations (grouped)
    line_annotations = []
    for key, indices in lines.items():
        words = [data["text"][i].strip() for i in indices]
        confs = [int(data["conf"][i]) for i in indices]
        x_min = min(data["left"][i] for i in indices)
        y_min = min(data["top"][i] for i in indices)
        x_max = max(data["left"][i] + data["width"][i] for i in indices)
        y_max = max(data["top"][i] + data["height"][i] for i in indices)

        line_annotations.append({
            "text": " ".join(words),
            "type": "line",
            "confidence": round(sum(confs) / len(confs) / 100, 2) if confs else 0,
            "page": page_no,
            "bbox": {
                "x": x_min,
                "y": y_min,
                "width": x_max - x_min,
                "height": y_max - y_min,
            },
        })

    confs = [a["confidence"] for a in annotations]
    avg_conf = sum(confs) / len(confs) if confs else 0

    full_text = pytesseract.image_to_string(image, lang=lang)

    return {
        "text": full_text.strip(),
        "confidence": round(avg_conf * 100, 2),
        "wordAnnotations": annotations,
        "lineAnnotations": line_annotations,
        "page": page_no,
        "pageSize": {"width": image.width, "height": image.height},
    }


def _extract_pdf_text(file_bytes: bytes) -> tuple[str, int, list[dict]]:
    """Extract text từ digital PDF per-page với số trang rõ ràng.
    Returns: (full_text, num_pages, pages_info)
    """
    reader = PdfReader(io.BytesIO(file_bytes))
    pages_text = []
    pages_info = []
    for i, page in enumerate(reader.pages):
        t = page.extract_text() or ""
        pages_text.append(t)
        pages_info.append({
            "page": i + 1,
            "width": int(float(page.mediabox.width)) if hasattr(page, 'mediabox') else 595,
            "height": int(float(page.mediabox.height)) if hasattr(page, 'mediabox') else 842,
            "textLength": len(t),
            "wordCount": len(t.split()),
        })
    return "\n\n---- PAGE ----\n\n".join(pages_text), len(reader.pages), pages_info


def _ocr_pdf_pages(file_bytes: bytes, lang: str = "vie+eng") -> dict:
    """Convert PDF pages to images, OCR each page with bbox."""
    from pdf2image import convert_from_bytes

    images = convert_from_bytes(file_bytes, dpi=200, fmt="jpeg")

    all_text = []
    all_word_annotations = []
    all_line_annotations = []
    pages_info = []
    total_conf = 0

    for idx, img in enumerate(images):
        page_result = _ocr_image_with_bbox(img, lang=lang, page_no=idx + 1)
        all_text.append(page_result["text"])
        all_word_annotations.extend(page_result["wordAnnotations"])
        all_line_annotations.extend(page_result["lineAnnotations"])
        pages_info.append({
            "page": idx + 1,
            "width": img.width,
            "height": img.height,
        })
        total_conf += page_result["confidence"]

    avg_conf = total_conf / len(images) if images else 0

    return {
        "text": "\n\n".join(all_text),
        "confidence": round(avg_conf, 2),
        "annotations": all_word_annotations,
        "lineAnnotations": all_line_annotations,
        "engine": "tesseract-ocr",
        "pages": pages_info,
    }


def process_file(file_bytes: bytes, filename: str) -> dict:
    """
    Main entry: process any file type.
    Returns structured JSON: {text, confidence, annotations[], lineAnnotations[], engine, pages[]}
    """
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    # Plain text
    if ext in ("txt", "md"):
        text = file_bytes.decode("utf-8", errors="replace")
        return {
            "text": text,
            "confidence": 100.0,
            "annotations": [],
            "lineAnnotations": [],
            "engine": "plaintext",
            "pages": [],
        }

    # PDF: try text extract first, fallback to OCR
    if ext == "pdf":
        text, num_pages, pages_info = _extract_pdf_text(file_bytes)

        if len(text.strip()) > 100:
            # Digital PDF - extracted text directly (no OCR needed)
            # Generate synthetic line annotations per-page để hiển thị cấu trúc
            line_annotations = []
            pages_with_lines = text.split("\n\n---- PAGE ----\n\n")
            for page_idx, page_text in enumerate(pages_with_lines):
                page_size = pages_info[page_idx] if page_idx < len(pages_info) else {"width": 595, "height": 842}
                lines = [ln.strip() for ln in page_text.split("\n") if ln.strip()]
                y_offset = 50
                line_height = max(15, (page_size["height"] - 100) // max(len(lines), 1))
                for line_idx, line in enumerate(lines[:100]):  # Cap at 100 lines/page
                    line_annotations.append({
                        "text": line,
                        "type": "line",
                        "confidence": 1.0,
                        "page": page_idx + 1,
                        "bbox": {
                            "x": 50,
                            "y": y_offset + line_idx * line_height,
                            "width": page_size["width"] - 100,
                            "height": line_height - 2,
                        },
                    })

            return {
                "text": text,
                "confidence": 99.0,
                "annotations": [],  # Word-level không có cho digital PDF
                "lineAnnotations": line_annotations,
                "engine": "pypdf2-text",
                "pages": pages_info,
            }

        # Scanned PDF - OCR each page with bbox
        try:
            logger.info(f"PDF is scanned, running OCR on {num_pages} pages...")
            return _ocr_pdf_pages(file_bytes)
        except Exception as e:
            logger.error(f"PDF OCR failed: {e}")
            return {
                "text": text,
                "confidence": 30.0,
                "annotations": [],
                "lineAnnotations": [],
                "engine": "pypdf2-partial",
                "pages": pages_info,
                "note": f"OCR thất bại: {e}",
            }

    # Image: Tesseract OCR with full bbox
    if ext in ("png", "jpg", "jpeg", "tiff", "bmp", "webp"):
        try:
            image = Image.open(io.BytesIO(file_bytes))
            result = _ocr_image_with_bbox(image, page_no=1)
            return {
                "text": result["text"],
                "confidence": result["confidence"],
                "annotations": result["wordAnnotations"],
                "lineAnnotations": result["lineAnnotations"],
                "engine": "tesseract-ocr",
                "pages": [result["pageSize"]],
            }
        except Exception as e:
            logger.error(f"Image OCR failed: {e}")
            return {
                "text": "",
                "confidence": 0,
                "annotations": [],
                "lineAnnotations": [],
                "engine": "error",
                "note": str(e),
            }

    return {
        "text": "",
        "confidence": 0,
        "annotations": [],
        "lineAnnotations": [],
        "engine": "unsupported",
        "pages": [],
        "note": f"Định dạng .{ext} chưa được hỗ trợ",
    }
