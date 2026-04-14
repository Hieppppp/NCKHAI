"""
LLM Client: Ollama (local) hoặc DeepSeek API (cloud).
Priority: Ollama local → DeepSeek API → disabled

Model đề xuất cho sinh viên (laptop 8GB RAM):
- qwen2.5:3b  (~2GB, nhanh, hỗ trợ tiếng Việt tốt)
- phi3:mini    (~2.3GB, Microsoft, cũng tốt)
- gemma2:2b   (~1.6GB, Google, siêu nhẹ)
"""

import os
import json
import logging
import httpx

logger = logging.getLogger("llm-client")

# ─── Config ──────────────────────────────────────────────

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://ollama:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5:3b")

DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "")
DEEPSEEK_BASE_URL = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com")
DEEPSEEK_MODEL = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")


# ─── Engine detection ────────────────────────────────────

def get_engine() -> str:
    """Check which LLM engine is available."""
    # Try Ollama first (local, free)
    try:
        with httpx.Client(timeout=3) as c:
            resp = c.get(f"{OLLAMA_URL}/api/tags")
            if resp.status_code == 200:
                return "ollama"
    except Exception:
        pass

    # Try DeepSeek API
    if DEEPSEEK_API_KEY:
        return "deepseek"

    return "none"


def is_available() -> bool:
    return get_engine() != "none"


# ─── Ollama call ─────────────────────────────────────────

def _call_ollama(prompt: str, system: str = "", max_tokens: int = 2000) -> str | None:
    try:
        with httpx.Client(timeout=120) as c:
            resp = c.post(
                f"{OLLAMA_URL}/api/generate",
                json={
                    "model": OLLAMA_MODEL,
                    "prompt": prompt,
                    "system": system,
                    "stream": False,
                    "options": {
                        "num_predict": max_tokens,
                        "temperature": 0.3,
                    },
                },
            )
            resp.raise_for_status()
            return resp.json().get("response", "")
    except Exception as e:
        logger.error(f"Ollama error: {e}")
        return None


# ─── DeepSeek call ───────────────────────────────────────

def _call_deepseek(prompt: str, system: str = "", max_tokens: int = 2000) -> str | None:
    try:
        with httpx.Client(timeout=60) as c:
            resp = c.post(
                f"{DEEPSEEK_BASE_URL}/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": DEEPSEEK_MODEL,
                    "messages": [
                        {"role": "system", "content": system} if system else None,
                        {"role": "user", "content": prompt},
                    ],
                    "max_tokens": max_tokens,
                    "temperature": 0.3,
                },
            )
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"]
    except Exception as e:
        logger.error(f"DeepSeek error: {e}")
        return None


# ─── Unified call ────────────────────────────────────────

def generate(prompt: str, system: str = "", max_tokens: int = 2000) -> str | None:
    """Call LLM: try Ollama first, fallback to DeepSeek."""
    engine = get_engine()

    if engine == "ollama":
        return _call_ollama(prompt, system, max_tokens)
    elif engine == "deepseek":
        return _call_deepseek(prompt, system, max_tokens)

    return None


# ─── High-level AI functions ─────────────────────────────

def extract_metadata_ai(ocr_text: str) -> dict | None:
    """Extract structured metadata from OCR text using LLM."""
    if not ocr_text or len(ocr_text.strip()) < 30:
        return None

    system = (
        "Bạn là AI trích xuất thông tin bài báo khoa học. "
        "Trả về JSON thuần (không markdown, không ```) với các trường: "
        "title, authors, abstract, keywords (array), journal, doi, publish_date. "
        "Nếu không tìm thấy thì để null. CHỈ trả JSON, không giải thích."
    )
    prompt = f"Trích xuất từ văn bản OCR:\n\n{ocr_text[:3000]}"

    result = generate(prompt, system, max_tokens=800)
    if not result:
        return None

    try:
        cleaned = result.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[1].rsplit("```", 1)[0]
        return json.loads(cleaned)
    except json.JSONDecodeError:
        logger.warning(f"LLM returned non-JSON: {result[:200]}")
        return None


def summarize(text: str, max_words: int = 200) -> str | None:
    """Summarize scientific text in Vietnamese."""
    if not text or len(text.strip()) < 50:
        return None

    system = f"Tóm tắt văn bản khoa học bằng tiếng Việt, tối đa {max_words} từ. Chỉ trả text thuần."
    return generate(text[:5000], system, max_tokens=500)


def chatbot(question: str, context: str = "") -> str | None:
    """Answer questions about research regulations."""
    system = (
        "Bạn là trợ lý AI cho hệ thống quản lý nghiên cứu khoa học đại học. "
        "Trả lời câu hỏi về quy trình đăng ký đề tài, quy định, biểu mẫu, "
        "định mức giờ nghiên cứu. Trả lời tiếng Việt, ngắn gọn, chính xác."
    )
    if context:
        system += f"\n\nTài liệu tham khảo:\n{context[:2000]}"

    return generate(question, system, max_tokens=800)


def analyze_trends_ai(keywords_data: str, works_summary: str) -> str | None:
    """AI analysis of research trends."""
    system = (
        "Bạn là chuyên gia phân tích xu hướng nghiên cứu khoa học. "
        "Phân tích dữ liệu và đưa ra: 1) Xu hướng nổi bật, 2) Đề xuất hướng mới, "
        "3) Nhận xét điểm mạnh/yếu. Tiếng Việt, ngắn gọn."
    )
    prompt = f"Dữ liệu từ khóa:\n{keywords_data}\n\nCông trình:\n{works_summary}"
    return generate(prompt, system, max_tokens=1000)
