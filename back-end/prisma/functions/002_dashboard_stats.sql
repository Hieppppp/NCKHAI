-- ============================================================
-- Function: Dashboard thống kê tổng quan
-- Thay thế 5+ queries riêng lẻ trong DashboardService
-- ============================================================

CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'totalWorks', (SELECT COUNT(*) FROM "ScientificWork"),
    'totalUsers', (SELECT COUNT(*) FROM "User" WHERE "isActive" = true),
    'pendingReviews', (
      SELECT COUNT(*) FROM "ScientificWork"
      WHERE status IN ('SUBMITTED', 'REVIEW', 'OUTLINE_REVIEW', 'PROPOSAL_REVIEW')
    ),
    'accepted', (SELECT COUNT(*) FROM "ScientificWork" WHERE status = 'ACCEPTED'),
    'byStatus', (
      SELECT json_object_agg(status, cnt)
      FROM (SELECT status, COUNT(*) AS cnt FROM "ScientificWork" GROUP BY status) s
    ),
    'byType', (
      SELECT json_object_agg(type, cnt)
      FROM (SELECT type, COUNT(*) AS cnt FROM "ScientificWork" GROUP BY type) t
    ),
    'byLevel', (
      SELECT json_object_agg(level, cnt)
      FROM (SELECT level, COUNT(*) AS cnt FROM "ScientificWork" GROUP BY level) l
    ),
    'recentWorks', (
      SELECT json_agg(w)
      FROM (
        SELECT sw.id, sw.title, sw.authors, sw.status, sw.type, sw.level,
               sw."aiScore", sw."createdAt",
               json_build_object('id', u.id, 'name', u.name) AS "user"
        FROM "ScientificWork" sw
        LEFT JOIN "User" u ON sw."userId" = u.id
        ORDER BY sw."createdAt" DESC
        LIMIT 8
      ) w
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- Function: Finance stats tổng quan
-- ============================================================

CREATE OR REPLACE FUNCTION get_finance_stats()
RETURNS JSON AS $$
DECLARE
  v_total_budget FLOAT;
  v_total_disbursed FLOAT;
  v_active INT;
  v_rewards FLOAT;
  v_by_dept JSON;
BEGIN
  SELECT COALESCE(SUM("totalAmount"), 0), COALESCE(SUM("disbursedAmount"), 0)
  INTO v_total_budget, v_total_disbursed
  FROM "Budget";

  SELECT COUNT(*) INTO v_active FROM "ScientificWork"
  WHERE status IN ('IN_PROGRESS', 'REVIEW', 'REVISION');

  SELECT COALESCE(SUM(amount), 0) INTO v_rewards
  FROM "Reward" WHERE status = 'AWARDED';

  SELECT COALESCE(json_agg(d), '[]'::json) INTO v_by_dept
  FROM (
    SELECT json_build_object(
      'department', department,
      '_sum', json_build_object(
        'totalAmount', SUM("totalAmount"),
        'disbursedAmount', SUM("disbursedAmount")
      )
    ) AS d
    FROM "Budget" WHERE department IS NOT NULL GROUP BY department
  ) sub;

  RETURN json_build_object(
    'totalBudget', v_total_budget,
    'totalDisbursed', v_total_disbursed,
    'activeProjects', v_active,
    'totalRewards', v_rewards,
    'byDepartment', v_by_dept
  );
END;
$$ LANGUAGE plpgsql;
