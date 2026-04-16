-- ============================================================
-- Function: Tính giờ chuẩn NCKH cho 1 giảng viên
-- Thay thế 6 queries riêng lẻ bằng 1 function duy nhất
-- ============================================================

CREATE OR REPLACE FUNCTION calculate_research_hours(
  p_user_id INT,
  p_academic_year TEXT
)
RETURNS TABLE (
  publication_points FLOAT,
  project_points FLOAT,
  review_points FLOAT,
  total_points FLOAT,
  required_points FLOAT,
  pub_count INT,
  project_count INT,
  review_count INT,
  completion_status TEXT,
  percentage FLOAT
) AS $$
DECLARE
  v_start_date DATE;
  v_end_date DATE;
  v_start_year INT;
  v_pub_pts FLOAT := 0;
  v_proj_pts FLOAT := 0;
  v_rev_pts FLOAT := 0;
  v_total FLOAT;
  v_required FLOAT := 50;
  v_pub_count INT := 0;
  v_proj_count INT := 0;
  v_rev_count INT := 0;
  r RECORD;
BEGIN
  -- Parse năm học "2025-2026" → Sep 2025 - Aug 2026
  v_start_year := split_part(p_academic_year, '-', 1)::INT;
  v_start_date := make_date(v_start_year, 9, 1);
  v_end_date := make_date(v_start_year + 1, 8, 31);

  -- Lấy định mức từ SystemConfig
  SELECT value::FLOAT INTO v_required
  FROM "SystemConfig"
  WHERE key = 'research.required_hours';
  IF v_required IS NULL THEN v_required := 50; END IF;

  -- 1. Tính điểm công bố khoa học
  FOR r IN
    SELECT p.id, p."journalName", p."conferenceName", p.issn, p.doi,
           COALESCE(jr.points,
             CASE
               WHEN jr.quartile = 'Q1' THEN 2.0
               WHEN jr.quartile = 'Q2' THEN 1.5
               WHEN jr.quartile = 'Q3' THEN 1.0
               WHEN jr.quartile = 'Q4' THEN 0.75
               WHEN jr.quartile = 'ESCI' THEN 0.75
               ELSE NULL
             END,
             CASE
               WHEN p."conferenceName" IS NOT NULL AND p.doi IS NOT NULL THEN 0.75
               WHEN p."conferenceName" IS NOT NULL THEN 0.25
               WHEN p."journalName" IS NOT NULL THEN 0.5
               ELSE 0.25
             END
           ) AS pts
    FROM "Publication" p
    LEFT JOIN "JournalRanking" jr ON (
      jr."isActive" = true AND (
        (jr.name ILIKE '%' || p."journalName" || '%' AND p."journalName" IS NOT NULL)
        OR (jr.issn = p.issn AND p.issn IS NOT NULL)
      )
    )
    WHERE p."userId" = p_user_id
      AND p.status = 'CONFIRMED'
      AND p."createdAt" BETWEEN v_start_date AND v_end_date
  LOOP
    v_pub_pts := v_pub_pts + r.pts;
    v_pub_count := v_pub_count + 1;
  END LOOP;

  -- 2. Tính điểm đề tài NCKH
  FOR r IN
    SELECT sw.id,
      CASE sw.level
        WHEN 'STATE' THEN 100
        WHEN 'MINISTRY' THEN 50
        WHEN 'UNIVERSITY' THEN 25
        ELSE 10
      END AS pts
    FROM "ScientificWork" sw
    WHERE sw."userId" = p_user_id
      AND sw.status IN ('ACCEPTED', 'IN_PROGRESS', 'REVIEW')
      AND sw."createdAt" BETWEEN v_start_date AND v_end_date
  LOOP
    v_proj_pts := v_proj_pts + r.pts;
    v_proj_count := v_proj_count + 1;
  END LOOP;

  -- 3. Tính điểm phản biện
  SELECT COUNT(*) INTO v_rev_count
  FROM "Review" rv
  WHERE rv."reviewerId" = p_user_id
    AND rv."createdAt" BETWEEN v_start_date AND v_end_date;
  v_rev_pts := v_rev_count * 2;

  -- 4. Tổng hợp
  v_total := v_pub_pts + v_proj_pts + v_rev_pts;

  -- 5. Upsert ResearchHours
  INSERT INTO "ResearchHours" (
    "userId", "academicYear", "publicationPoints", "projectPoints",
    "reviewPoints", "totalPoints", "requiredPoints", "status",
    "createdAt", "updatedAt"
  ) VALUES (
    p_user_id, p_academic_year, v_pub_pts, v_proj_pts,
    v_rev_pts, v_total, v_required, 'CALCULATING',
    NOW(), NOW()
  )
  ON CONFLICT ("userId", "academicYear")
  DO UPDATE SET
    "publicationPoints" = v_pub_pts,
    "projectPoints" = v_proj_pts,
    "reviewPoints" = v_rev_pts,
    "totalPoints" = v_total,
    "requiredPoints" = v_required,
    "updatedAt" = NOW();

  -- Return
  RETURN QUERY SELECT
    v_pub_pts,
    v_proj_pts,
    v_rev_pts,
    v_total,
    v_required,
    v_pub_count,
    v_proj_count,
    v_rev_count,
    CASE WHEN v_total >= v_required THEN 'ĐẠT'
         ELSE 'THIẾU ' || ROUND((v_required - v_total)::NUMERIC, 1) || ' điểm'
    END,
    LEAST(100, (v_total / NULLIF(v_required, 0)) * 100);
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- Function: Tổng hợp giờ chuẩn toàn trường
-- ============================================================

CREATE OR REPLACE FUNCTION summary_research_hours(
  p_academic_year TEXT
)
RETURNS TABLE (
  total_lecturers INT,
  completed INT,
  not_completed INT,
  avg_points FLOAT,
  completion_rate FLOAT
) AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT
      rh."userId",
      rh."totalPoints",
      rh."requiredPoints",
      CASE WHEN rh."totalPoints" >= rh."requiredPoints" THEN 1 ELSE 0 END AS is_completed
    FROM "ResearchHours" rh
    WHERE rh."academicYear" = p_academic_year
  )
  SELECT
    COUNT(*)::INT AS total_lecturers,
    SUM(is_completed)::INT AS completed,
    (COUNT(*) - SUM(is_completed))::INT AS not_completed,
    COALESCE(AVG("totalPoints"), 0)::FLOAT AS avg_points,
    CASE WHEN COUNT(*) > 0
      THEN (SUM(is_completed)::FLOAT / COUNT(*) * 100)
      ELSE 0
    END AS completion_rate
  FROM stats;
END;
$$ LANGUAGE plpgsql;
