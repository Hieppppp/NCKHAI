-- ============================================================
-- NCKH AI - PostgreSQL Functions
-- Version: 2.0.0
--
-- Deploy:
--   docker cp back-end/prisma/functions/nckhai_functions.sql nckhai-db:/tmp/
--   docker compose exec db psql -U nckhai -d nckhai_db -f /tmp/nckhai_functions.sql
-- ============================================================

-- Extension cho text similarity
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ────────────────────────────────────────────────────────────
-- 1. DASHBOARD STATS (thay 7 queries → 1 function)
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fn_dashboard_stats()
RETURNS JSON
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  v_result JSON;
BEGIN
  WITH status_agg AS (
    SELECT status, COUNT(*)::INT AS cnt FROM "ScientificWork" GROUP BY status
  ),
  type_agg AS (
    SELECT type, COUNT(*)::INT AS cnt FROM "ScientificWork" GROUP BY type
  ),
  level_agg AS (
    SELECT level, COUNT(*)::INT AS cnt FROM "ScientificWork" GROUP BY level
  ),
  recent AS (
    SELECT json_agg(row_to_json(r)) AS data FROM (
      SELECT sw.id, sw.title, sw.authors, sw.status, sw.type, sw.level,
             sw."aiScore", sw."createdAt",
             json_build_object('id', u.id, 'name', u.name) AS "user"
      FROM "ScientificWork" sw
      LEFT JOIN "User" u ON sw."userId" = u.id
      ORDER BY sw."createdAt" DESC LIMIT 8
    ) r
  )
  SELECT json_build_object(
    'totalWorks',      (SELECT COUNT(*)::INT FROM "ScientificWork"),
    'totalUsers',      (SELECT COUNT(*)::INT FROM "User" WHERE "isActive" = true),
    'pendingReviews',  (SELECT COUNT(*)::INT FROM "ScientificWork" WHERE status IN ('SUBMITTED','REVIEW','OUTLINE_REVIEW','PROPOSAL_REVIEW')),
    'accepted',        COALESCE((SELECT cnt FROM status_agg WHERE status = 'ACCEPTED'), 0),
    'byStatus',        COALESCE((SELECT json_object_agg(status, cnt) FROM status_agg), '{}'::JSON),
    'byType',          COALESCE((SELECT json_object_agg(type, cnt) FROM type_agg), '{}'::JSON),
    'byLevel',         COALESCE((SELECT json_object_agg(level, cnt) FROM level_agg), '{}'::JSON),
    'recentWorks',     COALESCE((SELECT data FROM recent), '[]'::JSON)
  ) INTO v_result;

  RETURN v_result;
END;
$$;


-- ────────────────────────────────────────────────────────────
-- 2. FINANCE STATS (thay 5 queries → 1 function)
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fn_finance_stats()
RETURNS JSON
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  v_budget   FLOAT;
  v_disbursed FLOAT;
  v_active   INT;
  v_rewards  FLOAT;
  v_by_dept  JSON;
BEGIN
  SELECT COALESCE(SUM("totalAmount"), 0),
         COALESCE(SUM("disbursedAmount"), 0)
  INTO v_budget, v_disbursed FROM "Budget";

  SELECT COUNT(*)::INT INTO v_active
  FROM "ScientificWork" WHERE status IN ('IN_PROGRESS','REVIEW','REVISION');

  SELECT COALESCE(SUM(amount), 0) INTO v_rewards
  FROM "Reward" WHERE status = 'AWARDED';

  SELECT COALESCE(json_agg(d), '[]'::JSON) INTO v_by_dept FROM (
    SELECT json_build_object(
      'department', department,
      '_sum', json_build_object('totalAmount', SUM("totalAmount"), 'disbursedAmount', SUM("disbursedAmount"))
    ) AS d
    FROM "Budget" WHERE department IS NOT NULL GROUP BY department
  ) sub;

  RETURN json_build_object(
    'totalBudget', v_budget, 'totalDisbursed', v_disbursed,
    'activeProjects', v_active, 'totalRewards', v_rewards,
    'byDepartment', v_by_dept
  );
END;
$$;


-- ────────────────────────────────────────────────────────────
-- 3. LIBRARY STATS (thay 4 queries → 1 function)
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fn_library_stats()
RETURNS JSON
LANGUAGE plpgsql STABLE
AS $$
BEGIN
  RETURN json_build_object(
    'total',          (SELECT COUNT(*)::INT FROM "LibraryDocument"),
    'totalViews',     (SELECT COALESCE(SUM("viewCount"), 0)::INT FROM "LibraryDocument"),
    'totalDownloads', (SELECT COALESCE(SUM("downloadCount"), 0)::INT FROM "LibraryDocument"),
    'byType', COALESCE((
      SELECT json_agg(json_build_object('type', type, 'count', cnt))
      FROM (SELECT type, COUNT(*)::INT AS cnt FROM "LibraryDocument" GROUP BY type) t
    ), '[]'::JSON),
    'byLevel', COALESCE((
      SELECT json_agg(json_build_object('level', level, 'count', cnt))
      FROM (SELECT level, COUNT(*)::INT AS cnt FROM "LibraryDocument" WHERE level IS NOT NULL GROUP BY level) l
    ), '[]'::JSON),
    'topTags', COALESCE((
      SELECT json_agg(json_build_object('name', tag, 'count', cnt) ORDER BY cnt DESC)
      FROM (SELECT unnest(tags) AS tag, COUNT(*)::INT AS cnt FROM "LibraryDocument" GROUP BY tag ORDER BY cnt DESC LIMIT 20) tg
    ), '[]'::JSON)
  );
END;
$$;


-- ────────────────────────────────────────────────────────────
-- 4. USER STATS (thay 4 queries → 1 function)
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fn_user_stats()
RETURNS JSON
LANGUAGE plpgsql STABLE
AS $$
BEGIN
  RETURN json_build_object(
    'total',    (SELECT COUNT(*)::INT FROM "User"),
    'active',   (SELECT COUNT(*)::INT FROM "User" WHERE "isActive" = true),
    'inactive', (SELECT COUNT(*)::INT FROM "User" WHERE "isActive" = false),
    'byRole',   COALESCE((
      SELECT json_object_agg(role, cnt)
      FROM (SELECT role::TEXT, COUNT(*)::INT AS cnt FROM "User" GROUP BY role) r
    ), '{}'::JSON)
  );
END;
$$;


-- ────────────────────────────────────────────────────────────
-- 5. RESEARCH HOURS CALCULATION (thay 6 queries → 1 function)
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fn_calculate_research_hours(
  p_user_id     INT,
  p_academic_year TEXT
)
RETURNS TABLE (
  publication_points FLOAT,
  project_points     FLOAT,
  review_points      FLOAT,
  total_points       FLOAT,
  required_points    FLOAT,
  pub_count          INT,
  project_count      INT,
  review_count       INT,
  completion_status  TEXT,
  percentage         FLOAT
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_start DATE;
  v_end   DATE;
  v_year  INT;
  v_pub   FLOAT := 0;
  v_proj  FLOAT := 0;
  v_rev   FLOAT := 0;
  v_total FLOAT;
  v_req   FLOAT := 50;
  v_pc    INT := 0;
  v_pjc   INT := 0;
  v_rc    INT := 0;
  rec     RECORD;
BEGIN
  v_year  := split_part(p_academic_year, '-', 1)::INT;
  v_start := make_date(v_year, 9, 1);
  v_end   := make_date(v_year + 1, 8, 31);

  -- Định mức từ config
  SELECT value::FLOAT INTO v_req FROM "SystemConfig" WHERE key = 'research.required_hours';
  IF v_req IS NULL THEN v_req := 50; END IF;

  -- Điểm công bố
  FOR rec IN
    SELECT p.id,
           COALESCE(
             jr.points,
             CASE jr.quartile
               WHEN 'Q1' THEN 2.0  WHEN 'Q2' THEN 1.5
               WHEN 'Q3' THEN 1.0  WHEN 'Q4' THEN 0.75
               WHEN 'ESCI' THEN 0.75 ELSE NULL
             END,
             CASE
               WHEN p."conferenceName" IS NOT NULL AND p.doi IS NOT NULL THEN 0.75
               WHEN p."conferenceName" IS NOT NULL THEN 0.25
               WHEN p."journalName" IS NOT NULL THEN 0.5
               ELSE 0.25
             END
           ) AS pts
    FROM "Publication" p
    LEFT JOIN "JournalRanking" jr
      ON jr."isActive" = true
     AND ((p."journalName" IS NOT NULL AND jr.name ILIKE '%' || p."journalName" || '%')
       OR (p.issn IS NOT NULL AND jr.issn = p.issn))
    WHERE p."userId" = p_user_id
      AND p.status = 'CONFIRMED'
      AND p."createdAt" BETWEEN v_start AND v_end
  LOOP
    v_pub := v_pub + rec.pts;
    v_pc  := v_pc + 1;
  END LOOP;

  -- Điểm đề tài
  FOR rec IN
    SELECT CASE level
             WHEN 'STATE' THEN 100 WHEN 'MINISTRY' THEN 50
             WHEN 'UNIVERSITY' THEN 25 ELSE 10
           END AS pts
    FROM "ScientificWork"
    WHERE "userId" = p_user_id
      AND status IN ('ACCEPTED','IN_PROGRESS','REVIEW')
      AND "createdAt" BETWEEN v_start AND v_end
  LOOP
    v_proj := v_proj + rec.pts;
    v_pjc  := v_pjc + 1;
  END LOOP;

  -- Điểm phản biện
  SELECT COUNT(*)::INT INTO v_rc
  FROM "Review" WHERE "reviewerId" = p_user_id
    AND "createdAt" BETWEEN v_start AND v_end;
  v_rev := v_rc * 2;

  v_total := v_pub + v_proj + v_rev;

  -- Upsert
  INSERT INTO "ResearchHours" (
    "userId","academicYear","publicationPoints","projectPoints",
    "reviewPoints","totalPoints","requiredPoints","status","createdAt","updatedAt"
  ) VALUES (
    p_user_id, p_academic_year, v_pub, v_proj,
    v_rev, v_total, v_req, 'CALCULATING', NOW(), NOW()
  )
  ON CONFLICT ("userId","academicYear")
  DO UPDATE SET
    "publicationPoints" = v_pub, "projectPoints" = v_proj,
    "reviewPoints" = v_rev, "totalPoints" = v_total,
    "requiredPoints" = v_req, "updatedAt" = NOW();

  RETURN QUERY SELECT
    v_pub, v_proj, v_rev, v_total, v_req, v_pc, v_pjc, v_rc,
    CASE WHEN v_total >= v_req THEN 'ĐẠT'
         ELSE 'THIẾU ' || ROUND((v_req - v_total)::NUMERIC, 1) || ' điểm'
    END,
    LEAST(100.0, (v_total / NULLIF(v_req, 0)) * 100);
END;
$$;


-- ────────────────────────────────────────────────────────────
-- 6. RESEARCH HOURS SUMMARY (tổng hợp toàn trường)
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fn_research_hours_summary(p_academic_year TEXT)
RETURNS JSON
LANGUAGE plpgsql STABLE
AS $$
BEGIN
  RETURN (
    WITH stats AS (
      SELECT rh.*, u.name AS user_name, u.email, u.department, u.role
      FROM "ResearchHours" rh
      JOIN "User" u ON rh."userId" = u.id
      WHERE rh."academicYear" = p_academic_year
    ),
    dept_agg AS (
      SELECT department,
             COUNT(*)::INT AS cnt,
             COUNT(*) FILTER (WHERE "totalPoints" >= "requiredPoints")::INT AS completed,
             ROUND(AVG("totalPoints")::NUMERIC, 1)::FLOAT AS avg_pts
      FROM stats GROUP BY department
    )
    SELECT json_build_object(
      'academicYear', p_academic_year,
      'total',     (SELECT COUNT(*)::INT FROM stats),
      'completed', (SELECT COUNT(*)::INT FROM stats WHERE "totalPoints" >= "requiredPoints"),
      'avgPoints', COALESCE((SELECT ROUND(AVG("totalPoints")::NUMERIC, 1)::FLOAT FROM stats), 0),
      'byDepartment', COALESCE((
        SELECT json_object_agg(department, json_build_object('count', cnt, 'completed', completed, 'avgPoints', avg_pts))
        FROM dept_agg
      ), '{}'::JSON),
      'records', COALESCE((
        SELECT json_agg(json_build_object(
          'id', id, 'userId', "userId", 'academicYear', "academicYear",
          'publicationPoints', "publicationPoints", 'projectPoints', "projectPoints",
          'reviewPoints', "reviewPoints", 'totalPoints', "totalPoints",
          'requiredPoints', "requiredPoints", 'status', status,
          'user', json_build_object('name', user_name, 'email', email, 'department', department, 'role', role)
        ) ORDER BY "totalPoints" DESC)
        FROM stats
      ), '[]'::JSON)
    )
  );
END;
$$;


-- ────────────────────────────────────────────────────────────
-- 7. FIND SIMILAR WORKS (chống đạo văn nội bộ - pg_trgm)
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fn_find_similar_works(
  p_text       TEXT,
  p_exclude_id INT DEFAULT NULL,
  p_threshold  FLOAT DEFAULT 0.15,
  p_limit      INT DEFAULT 10
)
RETURNS TABLE (
  work_id            INT,
  title              TEXT,
  authors            TEXT,
  title_similarity   FLOAT,
  abstract_similarity FLOAT,
  combined_score     FLOAT
)
LANGUAGE plpgsql STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    sw.id,
    sw.title,
    sw.authors,
    similarity(sw.title, p_text)::FLOAT,
    similarity(COALESCE(sw.abstract, ''), p_text)::FLOAT,
    (similarity(sw.title, p_text) * 0.6 + similarity(COALESCE(sw.abstract, ''), p_text) * 0.4)::FLOAT
  FROM "ScientificWork" sw
  WHERE (p_exclude_id IS NULL OR sw.id != p_exclude_id)
    AND (similarity(sw.title, p_text) > p_threshold
      OR similarity(COALESCE(sw.abstract, ''), p_text) > p_threshold)
  ORDER BY 6 DESC
  LIMIT p_limit;
END;
$$;


-- ────────────────────────────────────────────────────────────
-- 8. SYSTEM INFO (thay 4 count queries → 1 function)
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fn_system_info()
RETURNS JSON
LANGUAGE plpgsql STABLE
AS $$
BEGIN
  RETURN json_build_object(
    'users',        (SELECT COUNT(*)::INT FROM "User"),
    'works',        (SELECT COUNT(*)::INT FROM "ScientificWork"),
    'publications', (SELECT COUNT(*)::INT FROM "Publication"),
    'library',      (SELECT COUNT(*)::INT FROM "LibraryDocument"),
    'committees',   (SELECT COUNT(*)::INT FROM "Committee"),
    'budgets',      (SELECT COUNT(*)::INT FROM "Budget"),
    'rewards',      (SELECT COUNT(*)::INT FROM "Reward"),
    'journals',     (SELECT COUNT(*)::INT FROM "JournalRanking" WHERE "isActive" = true)
  );
END;
$$;


-- ────────────────────────────────────────────────────────────
-- 9. TRENDS ANALYSIS (thay 4 queries → 1 function)
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fn_research_trends()
RETURNS JSON
LANGUAGE plpgsql STABLE
AS $$
BEGIN
  RETURN json_build_object(
    'topKeywords', COALESCE((
      SELECT json_agg(json_build_object('keyword', kw, 'count', cnt) ORDER BY cnt DESC)
      FROM (SELECT unnest(keywords) AS kw, COUNT(*)::INT AS cnt FROM "ScientificWork" GROUP BY kw ORDER BY cnt DESC LIMIT 20) k
    ), '[]'::JSON),
    'byYear', COALESCE((
      SELECT json_agg(json_build_object('year', yr, 'count', cnt) ORDER BY yr)
      FROM (SELECT EXTRACT(YEAR FROM "createdAt")::INT AS yr, COUNT(*)::INT AS cnt FROM "ScientificWork" GROUP BY yr ORDER BY yr) y
    ), '[]'::JSON),
    'byType', COALESCE((
      SELECT json_agg(json_build_object('type', type, 'count', cnt))
      FROM (SELECT type::TEXT, COUNT(*)::INT AS cnt FROM "ScientificWork" GROUP BY type) t
    ), '[]'::JSON),
    'byLevel', COALESCE((
      SELECT json_agg(json_build_object('level', level, 'count', cnt))
      FROM (SELECT level::TEXT, COUNT(*)::INT AS cnt FROM "ScientificWork" GROUP BY level) l
    ), '[]'::JSON)
  );
END;
$$;


-- ────────────────────────────────────────────────────────────
-- INDEXES cho tìm kiếm nhanh
-- ────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_lib_title_trgm   ON "LibraryDocument" USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_lib_authors_trgm ON "LibraryDocument" USING gin (authors gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_work_title_trgm  ON "ScientificWork"  USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_pub_title_trgm   ON "Publication"     USING gin (title gin_trgm_ops);

-- ────────────────────────────────────────────────────────────
\echo '>>> All NCKH AI functions created successfully!'
