"""Lightweight NLP utilities for Vietnamese + English text processing."""

import re
from collections import Counter
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# ─── Stop words ──────────────────────────────────────────

STOP_WORDS_VI = set(
    "của và các là được trong có cho với về từ đã này những không một để người "
    "đến theo trên nhiều tại khi như hay hoặc nhưng cũng nên bởi vì nếu thì "
    "mà còn đó hơn rất qua sẽ vào ra bị giữa sau trước lại hết nào đang rằng".split()
)

STOP_WORDS_EN = set(
    "the a an is are was were be been being have has had do does did will would "
    "could should may might can shall to of in for on with at by from as into "
    "through during before after above below between and but or not no nor so "
    "yet both either neither this that these those it its he she they we you i "
    "me him her us them my your his our their which who whom what where when how "
    "all each every some any few more most other than such only also very".split()
)

STOP_WORDS = STOP_WORDS_VI | STOP_WORDS_EN


# ─── Keyword extraction ──────────────────────────────────

def extract_keywords_tfidf(text: str, top_n: int = 15) -> list[str]:
    """Extract keywords using TF-IDF on n-grams."""
    if not text or len(text.strip()) < 10:
        return []

    # Clean text
    cleaned = re.sub(r"[^\w\sàáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]", " ", text.lower())
    words = [w for w in cleaned.split() if len(w) > 2 and w not in STOP_WORDS and not w.isdigit()]

    if len(words) < 3:
        return words[:top_n]

    # Use TF-IDF for better keyword extraction
    try:
        doc = " ".join(words)
        vectorizer = TfidfVectorizer(
            max_features=200,
            ngram_range=(1, 2),
            max_df=0.95,
            min_df=1,
        )
        tfidf = vectorizer.fit_transform([doc])
        feature_names = vectorizer.get_feature_names_out()
        scores = tfidf.toarray()[0]

        ranked = sorted(zip(feature_names, scores), key=lambda x: x[1], reverse=True)
        return [word for word, _ in ranked[:top_n]]
    except Exception:
        # Fallback to frequency
        freq = Counter(words)
        return [w for w, _ in freq.most_common(top_n)]


def extract_keywords_freq(text: str, top_n: int = 10) -> list[str]:
    """Simple frequency-based keyword extraction."""
    cleaned = re.sub(r"[^\w\sàáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]", " ", text.lower())
    words = [w for w in cleaned.split() if len(w) > 2 and w not in STOP_WORDS and not w.isdigit()]
    freq = Counter(words)
    return [w for w, _ in freq.most_common(top_n)]


# ─── Metadata extraction ─────────────────────────────────

def extract_metadata(text: str) -> dict:
    """Extract title, authors, abstract, keywords from document text."""
    lines = [l.strip() for l in text.split("\n") if l.strip()]

    # Title: first substantial line
    title = None
    for line in lines[:10]:
        if 10 < len(line) < 300 and not re.match(r"^(abstract|tóm tắt|keywords|từ khóa)", line, re.I):
            title = line
            break

    # Abstract
    abstract = None
    for i, line in enumerate(lines):
        if re.match(r"^(abstract|tóm tắt)", line, re.I):
            parts = []
            for j in range(i + 1, min(i + 20, len(lines))):
                if re.match(r"^(keywords|từ khóa|introduction|giới thiệu|1\.|I\.)", lines[j], re.I):
                    break
                parts.append(lines[j])
            abstract = " ".join(parts)[:2000]
            break

    # Authors: lines with emails or "by/tác giả"
    authors = None
    for line in lines[:15]:
        if "@" in line or re.match(r"^(by|tác giả|authors?)", line, re.I):
            authors = re.sub(r"^(by|tác giả|authors?):?\s*", "", line, flags=re.I)
            break

    # Explicit keywords
    doc_keywords = []
    for i, line in enumerate(lines):
        if re.match(r"^(keywords|từ khóa)", line, re.I):
            kw_text = re.sub(r"^(keywords|từ khóa):?\s*", "", line, flags=re.I)
            if not kw_text and i + 1 < len(lines):
                kw_text = lines[i + 1]
            doc_keywords = [k.strip() for k in re.split(r"[,;·•]", kw_text) if k.strip()]
            break

    # Auto-extract keywords if none found
    if not doc_keywords:
        doc_keywords = extract_keywords_tfidf(text, 10)

    return {
        "title": title,
        "authors": authors,
        "abstract": abstract,
        "keywords": doc_keywords,
    }


# ─── Similarity ──────────────────────────────────────────

def compute_similarity(text1: str, text2: str) -> float:
    """Compute cosine similarity between two texts using TF-IDF."""
    if not text1.strip() or not text2.strip():
        return 0.0

    try:
        vectorizer = TfidfVectorizer(max_features=5000)
        tfidf = vectorizer.fit_transform([text1, text2])
        sim = cosine_similarity(tfidf[0:1], tfidf[1:2])[0][0]
        return round(float(sim) * 100, 2)
    except Exception:
        return 0.0


def batch_similarity(text: str, corpus: list[dict]) -> list[dict]:
    """Compare text against a corpus of documents. Returns sorted by similarity."""
    if not text.strip() or not corpus:
        return []

    texts = [text] + [doc.get("text", "") for doc in corpus]
    try:
        vectorizer = TfidfVectorizer(max_features=5000)
        tfidf = vectorizer.fit_transform(texts)
        sims = cosine_similarity(tfidf[0:1], tfidf[1:])[0]

        results = []
        for i, sim_score in enumerate(sims):
            pct = round(float(sim_score) * 100, 2)
            if pct > 3:
                results.append({
                    "workId": corpus[i].get("id"),
                    "title": corpus[i].get("title", ""),
                    "similarity": pct,
                })
        results.sort(key=lambda x: x["similarity"], reverse=True)
        return results[:10]
    except Exception:
        return []
