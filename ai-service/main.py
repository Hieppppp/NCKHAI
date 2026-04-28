"""
AI Microservice v2 for NCKH AI Platform.
- OCR: Tesseract (Vietnamese + English) with bbox annotation + pdf2image
- NLP: TF-IDF keywords, cosine similarity
- LLM: Ollama local (qwen2.5:3b) hoặc DeepSeek API
- Storage: MinIO (S3-compatible)
"""

import os
import uuid
import time
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import minio_client
import ocr_service
import nlp_utils
import llm_client

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ai-service")


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        minio_client.get_client()
        logger.info("MinIO connected, bucket ready.")
    except Exception as e:
        logger.warning(f"MinIO not ready yet: {e}")

    engine = llm_client.get_engine()
    logger.info(f"LLM engine: {engine}")
    yield


app = FastAPI(title="NCKH AI Service", version="2.0.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


# ─── Health ───────────────────────────────────────────────

@app.get("/health")
def health():
    return {
        "status": "ok",
        "version": "2.0.0",
        "engines": {
            "ocr": "tesseract + pdf2image (vie+eng, bbox)",
            "nlp": "scikit-learn tfidf",
            "llm": llm_client.get_engine(),
        },
    }


# ─── Upload chỉ vào MinIO (không OCR) - cho async queue ──

@app.post("/upload-only")
async def upload_only(file: UploadFile = File(...)):
    """
    Upload nhanh vào MinIO, KHÔNG chạy OCR.
    Dùng cho luồng async: backend push job vào queue, worker mới chạy /reprocess.
    """
    file_bytes = await file.read()
    if len(file_bytes) == 0:
        raise HTTPException(400, "File rỗng")

    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else "bin"
    object_name = f"{uuid.uuid4().hex}.{ext}"

    try:
        minio_client.upload_file(object_name, file_bytes, file.content_type or "application/octet-stream")
    except Exception as e:
        logger.error(f"MinIO upload failed: {e}")
        raise HTTPException(500, f"Lỗi lưu file: {e}")

    return {
        "objectName": object_name,
        "originalName": file.filename,
        "size": len(file_bytes),
        "mimeType": file.content_type,
    }


# ─── Upload + OCR + Extract ──────────────────────────────

@app.post("/process")
async def upload_and_process(
    file: UploadFile = File(...),
    work_id: int | None = Form(None),
    use_llm: bool = Form(False),
):
    """
    Upload → MinIO → Tesseract OCR (bbox + annotation) → NLP extract.
    use_llm=true: also run Ollama/DeepSeek for smart metadata extraction.
    """
    start = time.time()

    file_bytes = await file.read()
    if len(file_bytes) == 0:
        raise HTTPException(400, "File rỗng")

    # 1. Upload to MinIO
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else "bin"
    object_name = f"{uuid.uuid4().hex}.{ext}"

    try:
        minio_client.upload_file(object_name, file_bytes, file.content_type or "application/octet-stream")
    except Exception as e:
        logger.error(f"MinIO upload failed: {e}")
        raise HTTPException(500, f"Lỗi lưu file: {e}")

    # 2. OCR (Tesseract with bbox)
    ocr_result = ocr_service.process_file(file_bytes, file.filename)
    text = ocr_result.get("text", "")

    # 3. NLP metadata extraction (local, fast)
    metadata = nlp_utils.extract_metadata(text) if text else {
        "title": None, "authors": None, "abstract": None, "keywords": []
    }

    # 4. LLM-enhanced extraction (optional)
    llm_metadata = None
    if use_llm and llm_client.is_available() and text:
        llm_metadata = llm_client.extract_metadata_ai(text)
        if llm_metadata:
            if not metadata["title"] and llm_metadata.get("title"):
                metadata["title"] = llm_metadata["title"]
            if not metadata["authors"] and llm_metadata.get("authors"):
                metadata["authors"] = llm_metadata["authors"]
            if not metadata["abstract"] and llm_metadata.get("abstract"):
                metadata["abstract"] = llm_metadata["abstract"]
            if not metadata["keywords"] and llm_metadata.get("keywords"):
                metadata["keywords"] = llm_metadata["keywords"]

    elapsed = round(time.time() - start, 2)

    return {
        "file": {
            "objectName": object_name,
            "originalName": file.filename,
            "size": len(file_bytes),
            "mimeType": file.content_type,
            "workId": work_id,
        },
        "ocr": {
            "text": text[:5000],
            "fullTextLength": len(text),
            "confidence": ocr_result.get("confidence", 0),
            "engine": ocr_result.get("engine", "unknown"),
            "note": ocr_result.get("note"),
        },
        "annotations": ocr_result.get("annotations", [])[:500],
        "lineAnnotations": ocr_result.get("lineAnnotations", [])[:200],
        "pages": ocr_result.get("pages", []),
        "extraction": metadata,
        "llmExtraction": llm_metadata,
        "processingTime": elapsed,
    }


# ─── Reprocess existing MinIO file (for job queue worker) ─

@app.post("/reprocess")
def reprocess_file(object_name: str):
    """Reprocess file đã có sẵn trong MinIO - cho job queue worker gọi."""
    try:
        file_bytes = minio_client.download_file(object_name)
    except Exception as e:
        raise HTTPException(404, f"File không tồn tại: {e}")

    ocr_result = ocr_service.process_file(file_bytes, object_name)
    text = ocr_result.get("text", "")
    metadata = nlp_utils.extract_metadata(text) if text else {
        "title": None, "authors": None, "abstract": None, "keywords": []
    }

    return {
        "file": {"objectName": object_name},
        "ocr": {
            "text": text[:5000],
            "fullTextLength": len(text),
            "confidence": ocr_result.get("confidence", 0),
            "engine": ocr_result.get("engine", "unknown"),
        },
        "annotations": ocr_result.get("annotations", [])[:500],
        "lineAnnotations": ocr_result.get("lineAnnotations", [])[:200],
        "pages": ocr_result.get("pages", []),
        "extraction": metadata,
    }


# ─── Similarity / Plagiarism ─────────────────────────────

class SimilarityRequest(BaseModel):
    text: str
    corpus: list[dict] = []

@app.post("/similarity")
def check_similarity(req: SimilarityRequest):
    if len(req.text.strip()) < 20:
        raise HTTPException(400, "Văn bản phải có ít nhất 20 ký tự")
    results = nlp_utils.batch_similarity(req.text, req.corpus)
    max_sim = results[0]["similarity"] if results else 0
    return {"maxSimilarity": max_sim, "results": results}


# ─── Keyword extraction ──────────────────────────────────

class KeywordRequest(BaseModel):
    text: str
    top_n: int = 15

@app.post("/keywords")
def extract_keywords(req: KeywordRequest):
    if not req.text:
        raise HTTPException(400, "Thiếu text")
    keywords = nlp_utils.extract_keywords_tfidf(req.text, req.top_n)
    return {"keywords": keywords}


# ─── Expert matching ──────────────────────────────────────

class ExpertMatchRequest(BaseModel):
    work_keywords: list[str]
    work_text: str
    experts: list[dict]

@app.post("/match-experts")
def match_experts(req: ExpertMatchRequest):
    work_tokens = set(nlp_utils.extract_keywords_freq(req.work_text, 30))
    work_tokens.update(kw.lower() for kw in req.work_keywords)

    results = []
    for expert in req.experts:
        expert_text = " ".join([expert.get("specialization", ""), expert.get("works_text", "")])
        expert_tokens = set(nlp_utils.extract_keywords_freq(expert_text, 50))
        matched = work_tokens & expert_tokens
        sim_score = nlp_utils.compute_similarity(req.work_text, expert_text) if expert_text.strip() else 0

        if matched or sim_score > 5:
            results.append({
                "id": expert["id"],
                "name": expert.get("name", ""),
                "matchScore": len(matched),
                "matchedKeywords": list(matched)[:15],
                "textSimilarity": sim_score,
                "totalScore": len(matched) * 10 + sim_score,
            })

    results.sort(key=lambda x: x["totalScore"], reverse=True)
    return results[:10]


# ─── LLM endpoints (Ollama / DeepSeek) ───────────────────

class SummarizeRequest(BaseModel):
    text: str
    max_words: int = 200

@app.post("/summarize")
def summarize(req: SummarizeRequest):
    if not llm_client.is_available():
        raise HTTPException(503, "LLM chưa sẵn sàng. Khởi động Ollama hoặc cấu hình DeepSeek API key.")
    result = llm_client.summarize(req.text, req.max_words)
    if not result:
        raise HTTPException(500, "LLM không phản hồi")
    return {"summary": result, "engine": llm_client.get_engine()}


class ChatRequest(BaseModel):
    question: str
    context: str = ""

@app.post("/chat")
def chat(req: ChatRequest):
    if not llm_client.is_available():
        raise HTTPException(503, "LLM chưa sẵn sàng. Khởi động Ollama hoặc cấu hình DeepSeek API key.")
    result = llm_client.chatbot(req.question, req.context)
    if not result:
        raise HTTPException(500, "LLM không phản hồi")
    return {"answer": result, "engine": llm_client.get_engine()}


# ─── MinIO file operations ───────────────────────────────

@app.get("/files/{object_name}/url")
def get_file_url(object_name: str):
    try:
        url = minio_client.get_presigned_url(object_name)
        return {"url": url}
    except Exception as e:
        raise HTTPException(404, f"File không tồn tại: {e}")

@app.delete("/files/{object_name}")
def delete_file(object_name: str):
    try:
        minio_client.delete_file(object_name)
        return {"message": "Đã xóa"}
    except Exception as e:
        raise HTTPException(500, f"Lỗi xóa file: {e}")


# ─── Word/DOCX to HTML conversion ──────────────────────

@app.post("/convert-docx")
async def convert_docx_to_html(file: UploadFile = File(...)):
    """Convert Word .docx file to HTML for template editor."""
    if not file.filename.endswith(('.docx', '.doc')):
        raise HTTPException(400, "Chỉ hỗ trợ file .docx")

    file_bytes = await file.read()
    if len(file_bytes) == 0:
        raise HTTPException(400, "File rỗng")

    try:
        import mammoth
        result = mammoth.convert_to_html(io.BytesIO(file_bytes), style_map=[
            "p[style-name='Heading 1'] => h1:fresh",
            "p[style-name='Heading 2'] => h2:fresh",
            "p[style-name='Heading 3'] => h3:fresh",
        ])
        html = result.value
        messages = [m.message for m in result.messages]

        # Also store original file in MinIO
        object_name = f"templates/{uuid.uuid4().hex}.docx"
        minio_client.upload_file(object_name, file_bytes, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")

        return {
            "html": html,
            "objectName": object_name,
            "originalName": file.filename,
            "warnings": messages,
        }
    except ImportError:
        # Fallback: just store file, return empty HTML
        object_name = f"templates/{uuid.uuid4().hex}.docx"
        minio_client.upload_file(object_name, file_bytes, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
        return {
            "html": f"<p>[File {file.filename} đã upload - cần cài mammoth để convert]</p>",
            "objectName": object_name,
            "originalName": file.filename,
            "warnings": ["mammoth chưa cài - chạy: pip install mammoth"],
        }
