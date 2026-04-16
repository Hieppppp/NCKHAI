-- ============================================================
-- Function: Tìm kiếm đề tài tương tự (hỗ trợ chống đạo văn)
-- Sử dụng pg_trgm cho text similarity tại DB level
-- ============================================================

-- Cần extension pg_trgm
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Function: Tìm đề tài có title/abstract tương tự
CREATE OR REPLACE FUNCTION find_similar_works(
  p_text TEXT,
  p_exclude_id INT DEFAULT NULL,
  p_threshold FLOAT DEFAULT 0.15,
  p_limit INT DEFAULT 10
)
RETURNS TABLE (
  work_id INT,
  title TEXT,
  authors TEXT,
  title_similarity FLOAT,
  abstract_similarity FLOAT,
  combined_score FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sw.id AS work_id,
    sw.title,
    sw.authors,
    COALESCE(similarity(sw.title, p_text), 0)::FLOAT AS title_similarity,
    COALESCE(similarity(COALESCE(sw.abstract, ''), p_text), 0)::FLOAT AS abstract_similarity,
    (
      COALESCE(similarity(sw.title, p_text), 0) * 0.6 +
      COALESCE(similarity(COALESCE(sw.abstract, ''), p_text), 0) * 0.4
    )::FLOAT AS combined_score
  FROM "ScientificWork" sw
  WHERE (p_exclude_id IS NULL OR sw.id != p_exclude_id)
    AND (
      similarity(sw.title, p_text) > p_threshold
      OR similarity(COALESCE(sw.abstract, ''), p_text) > p_threshold
    )
  ORDER BY combined_score DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- Function: Thống kê nhanh cho Library
-- ============================================================

CREATE OR REPLACE FUNCTION get_library_stats()
RETURNS JSON AS $$
BEGIN
  RETURN (
    SELECT json_build_object(
      'total', (SELECT COUNT(*) FROM "LibraryDocument"),
      'totalViews', (SELECT COALESCE(SUM("viewCount"), 0) FROM "LibraryDocument"),
      'totalDownloads', (SELECT COALESCE(SUM("downloadCount"), 0) FROM "LibraryDocument"),
      'byType', (
        SELECT COALESCE(json_agg(json_build_object('type', type, 'count', cnt)), '[]'::json)
        FROM (SELECT type, COUNT(*) AS cnt FROM "LibraryDocument" GROUP BY type) t
      ),
      'byLevel', (
        SELECT COALESCE(json_agg(json_build_object('level', level, 'count', cnt)), '[]'::json)
        FROM (SELECT level, COUNT(*) AS cnt FROM "LibraryDocument" WHERE level IS NOT NULL GROUP BY level) l
      ),
      'topTags', (
        SELECT COALESCE(json_agg(json_build_object('name', tag, 'count', cnt) ORDER BY cnt DESC), '[]'::json)
        FROM (
          SELECT unnest(tags) AS tag, COUNT(*) AS cnt
          FROM "LibraryDocument"
          GROUP BY tag
          ORDER BY cnt DESC
          LIMIT 20
        ) tg
      )
    )
  );
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- Function: Tìm kiếm full-text thư viện (nhanh hơn ILIKE)
-- ============================================================

-- Index cho tìm kiếm
CREATE INDEX IF NOT EXISTS idx_library_title_trgm ON "LibraryDocument" USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_library_authors_trgm ON "LibraryDocument" USING gin (authors gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_work_title_trgm ON "ScientificWork" USING gin (title gin_trgm_ops);
