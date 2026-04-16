-- ============================================================
-- NCKH AI - PostgreSQL Functions & Procedures
-- Chạy: docker compose exec db psql -U nckhai -d nckhai_db -f /tmp/run_all.sql
-- ============================================================

\echo '>>> Creating research hours functions...'
\i /tmp/001_research_hours.sql

\echo '>>> Creating dashboard stats functions...'
\i /tmp/002_dashboard_stats.sql

\echo '>>> Creating plagiarism check functions...'
\i /tmp/003_plagiarism_check.sql

\echo '>>> All functions created successfully!'
