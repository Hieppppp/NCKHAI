import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp, FileText, Users, Clock, Award, Sparkles, Loader2,
  BookOpen, DollarSign, Library, ChevronRight, Plus,
  BarChart3, Bell, Calendar, ArrowUpRight, Brain, Shield,
  Lightbulb, BookMarked, Trophy,
} from 'lucide-react';
import { dashboardService } from '../services/dashboardService';
import { notificationService } from '../services/notificationService';
import { useAuth } from '../contexts/AuthContext';
import { RoleLabels, Role } from '../types';

// Đồng bộ theo bộ trạng thái rút gọn 5 nhóm (giống màn Công trình khoa học)
const StatusLabels: Record<string, string> = {
  DRAFT: 'Bản nháp', SUBMITTED: 'Chờ duyệt', OUTLINE_REVIEW: 'Chờ duyệt', PROPOSAL_REVIEW: 'Chờ duyệt',
  IN_PROGRESS: 'Đang thực hiện', REVIEW: 'Đang thực hiện', REVISION: 'Đang thực hiện',
  ACCEPTED: 'Đã nghiệm thu', ARCHIVED: 'Đã nghiệm thu', REJECTED: 'Từ chối',
};
const StatusColors: Record<string, string> = {
  DRAFT: '#94a3b8', SUBMITTED: '#3b82f6', OUTLINE_REVIEW: '#3b82f6', PROPOSAL_REVIEW: '#3b82f6',
  IN_PROGRESS: '#f59e0b', REVIEW: '#f59e0b', REVISION: '#f59e0b',
  ACCEPTED: '#10b981', ARCHIVED: '#10b981', REJECTED: '#ef4444',
};
const LevelLabels: Record<string, string> = { UNIVERSITY: 'Cấp Trường', MINISTRY: 'Cấp Bộ', STATE: 'Cấp Nhà nước' };
const LevelColors: Record<string, string> = { UNIVERSITY: '#3b82f6', MINISTRY: '#8b5cf6', STATE: '#dc2626' };
const TypeLabels: Record<string, string> = {
  JOURNAL_ARTICLE: 'Bài báo', CONFERENCE_PAPER: 'Hội nghị', RESEARCH_PROJECT: 'Đề tài NCKH',
  PATENT: 'Bằng sáng chế', TEXTBOOK: 'Giáo trình', THESIS: 'Luận văn',
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      dashboardService.getStats(),
      notificationService.getAll().catch(() => []),
    ]).then(([s, n]) => { setStats(s); setNotifications(n.slice(0, 5)); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="dash-loading"><Loader2 size={36} className="spin" color="var(--primary-indigo)" /></div>;

  const totalWorks = stats?.totalWorks || 0;
  const pending = stats?.pendingReviews || 0;
  const accepted = stats?.accepted || 0;
  const totalUsers = stats?.totalUsers || 0;

  return (
    <div className="dash">
      {/* Hero Banner */}
      <section className="dash-hero">
        <div className="hero-left">
          <div className="hero-greeting">
            <h1>Xin chào, {user?.name || 'Người dùng'}</h1>
            <span className="hero-role"><Shield size={12} /> {user ? RoleLabels[user.role] : ''}</span>
          </div>
          <p className="hero-desc">
            Hệ thống đang quản lý <strong>{totalWorks}</strong> công trình nghiên cứu, <strong>{pending}</strong> đề tài chờ xử lý
            và <strong>{accepted}</strong> đề tài đã nghiệm thu thành công.
          </p>
          <div className="hero-actions">
            <button className="btn-hero primary" onClick={() => navigate('/projects/new')}><Plus size={16} /> Đăng ký công trình mới</button>
            <button className="btn-hero secondary" onClick={() => navigate('/publications')}><Trophy size={16} /> Công trình thành công</button>
            <button className="btn-hero secondary" onClick={() => navigate('/ai')}><Brain size={16} /> Trợ lý AI</button>
          </div>
        </div>
        <div className="hero-right">
          <div className="hero-stat-ring">
            <svg viewBox="0 0 36 36" className="ring-svg">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e2e8f0" strokeWidth="2.5" />
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#10b981" strokeWidth="2.5"
                strokeDasharray={`${totalWorks > 0 ? (accepted / totalWorks) * 100 : 0} ${100 - (totalWorks > 0 ? (accepted / totalWorks) * 100 : 0)}`}
                strokeLinecap="round" transform="rotate(-90 18 18)" />
            </svg>
            <div className="ring-center">
              <span className="ring-pct">{totalWorks > 0 ? ((accepted / totalWorks) * 100).toFixed(0) : 0}%</span>
              <span className="ring-label">Hoàn thành</span>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Cards */}
      <section className="stats-grid">
        <StatCard icon={FileText} label="Tổng công trình" value={totalWorks} color="#2563eb" sub={`${Object.keys(stats?.byType || {}).length} loại hình`} onClick={() => navigate('/projects')} />
        <StatCard icon={Clock} label="Chờ xử lý" value={pending} color="#f59e0b" sub="cần phản biện / duyệt" onClick={() => navigate('/projects')} />
        <StatCard icon={Award} label="Đã nghiệm thu" value={accepted} color="#10b981" sub={`${totalWorks > 0 ? ((accepted / totalWorks) * 100).toFixed(0) : 0}% tổng số`} onClick={() => navigate('/projects')} />
        <StatCard icon={Users} label="Người dùng" value={totalUsers} color="#8b5cf6" sub="giảng viên, sinh viên" onClick={() => hasRole(Role.ADMIN) ? navigate('/admin/users') : navigate('/profile')} />
      </section>

      {/* Quick Links */}
      <section className="quick-links">
        {([
          { icon: BookOpen, label: 'Công trình KH', path: '/projects', color: '#2563eb' },
          { icon: Lightbulb, label: 'Bằng sáng chế', path: '/patents', color: '#7c3aed' },
          { icon: BookMarked, label: 'Giáo trình', path: '/textbooks', color: '#0d9488' },
          { icon: Trophy, label: 'Công trình thành công', path: '/publications', color: '#3b82f6' },
          { icon: Library, label: 'Thư viện số', path: '/library', color: '#059669' },
          { icon: Brain, label: 'Trợ lý AI', path: '/ai', color: '#dc2626' },
          { icon: Users, label: 'Hội đồng', path: '/committees', color: '#0891b2', roles: [Role.ADMIN, Role.REVIEWER] },
          { icon: DollarSign, label: 'Tài chính', path: '/finance', color: '#d97706', roles: [Role.ADMIN] },
        ] as { icon: any; label: string; path: string; color: string; roles?: Role[] }[])
          .filter(q => !q.roles || hasRole(...q.roles))
          .map(q => (
          <div key={q.path} className="quick-card surface-card" onClick={() => navigate(q.path)}>
            <div className="quick-icon" style={{ background: `${q.color}12`, color: q.color }}><q.icon size={20} /></div>
            <span className="quick-label">{q.label}</span>
            <ChevronRight size={14} className="quick-arrow" />
          </div>
        ))}
      </section>

      <div className="dash-grid">
        {/* Left Column */}
        <div className="dash-left">
          {/* Status Distribution */}
          <div className="surface-card">
            <div className="card-head">
              <BarChart3 size={18} color="var(--primary-indigo)" />
              <h2>Phân bố trạng thái</h2>
            </div>
            <div className="status-bars">
              {Object.entries(stats?.byStatus || {}).map(([status, count]) => {
                const pct = totalWorks > 0 ? ((count as number) / totalWorks) * 100 : 0;
                return (
                  <div key={status} className="status-bar-row">
                    <span className="bar-label">{StatusLabels[status] || status}</span>
                    <div className="bar-track">
                      <div className="bar-fill" style={{ width: `${pct}%`, background: StatusColors[status] || '#94a3b8' }} />
                    </div>
                    <span className="bar-count">{count as number}</span>
                    <span className="bar-pct">{pct.toFixed(0)}%</span>
                  </div>
                );
              })}
              {Object.keys(stats?.byStatus || {}).length === 0 && (
                <p className="empty-text">Chưa có dữ liệu</p>
              )}
            </div>
          </div>

          {/* Recent Works */}
          <div className="surface-card table-card">
            <div className="card-head">
              <FileText size={18} color="var(--primary-indigo)" />
              <h2>Công trình gần đây</h2>
              <button className="btn-see-all" onClick={() => navigate('/projects')}>Xem tất cả <ChevronRight size={14} /></button>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Tên đề tài</th>
                    <th>Tác giả</th>
                    <th>Loại</th>
                    <th>Trạng thái</th>
                    <th>AI</th>
                  </tr>
                </thead>
                <tbody>
                  {stats?.recentWorks?.slice(0, 6).map((w: any) => {
                    const sc = StatusColors[w.status] || '#94a3b8';
                    return (
                      <tr key={w.id} onClick={() => navigate(`/projects/${w.id}`)}>
                        <td className="td-title">{w.title.length > 45 ? w.title.slice(0, 45) + '...' : w.title}</td>
                        <td className="td-muted">{w.user?.name || w.authors}</td>
                        <td><span className="type-chip">{TypeLabels[w.type] || w.type}</span></td>
                        <td><span className="status-chip" style={{ background: `${sc}15`, color: sc }}>{StatusLabels[w.status] || w.status}</span></td>
                        <td className="td-ai">{w.aiScore ? <span className={w.aiScore >= 70 ? 'ai-good' : 'ai-warn'}>{w.aiScore}</span> : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {(!stats?.recentWorks || stats.recentWorks.length === 0) && (
                <p className="empty-text" style={{ padding: '2rem', textAlign: 'center' }}>Chưa có công trình</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="dash-right">
          {/* By Level */}
          <div className="surface-card">
            <div className="card-head"><Award size={16} /><h3>Cấp đề tài</h3></div>
            {Object.entries(stats?.byLevel || {}).map(([level, count]) => (
              <div key={level} className="level-row">
                <div className="level-dot" style={{ background: LevelColors[level] || '#94a3b8' }} />
                <span className="level-name">{LevelLabels[level] || level}</span>
                <span className="level-count">{count as number}</span>
              </div>
            ))}
            {Object.keys(stats?.byLevel || {}).length === 0 && <p className="empty-text">Chưa có dữ liệu</p>}
          </div>

          {/* By Type */}
          <div className="surface-card">
            <div className="card-head"><BarChart3 size={16} /><h3>Loại hình</h3></div>
            {Object.entries(stats?.byType || {}).map(([type, count]) => (
              <div key={type} className="type-row">
                <span className="type-name">{TypeLabels[type] || type.replace(/_/g, ' ')}</span>
                <span className="type-count">{count as number}</span>
              </div>
            ))}
          </div>

          {/* Notifications */}
          <div className="surface-card">
            <div className="card-head"><Bell size={16} /><h3>Thông báo mới</h3></div>
            {notifications.length > 0 ? (
              <div className="notif-list">
                {notifications.map((n: any) => (
                  <div key={n.id} className={`notif-item ${n.isRead ? '' : 'unread'}`} onClick={() => n.link && navigate(n.link)}>
                    <div className="notif-dot" />
                    <div className="notif-content">
                      <span className="notif-title">{n.title}</span>
                      <span className="notif-time">{new Date(n.createdAt).toLocaleDateString('vi-VN')}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty-text">Không có thông báo mới</p>
            )}
          </div>

          {/* AI Tip */}
          <div className="surface-card ai-tip-card">
            <div className="card-head"><Sparkles size={16} /><h3>Gợi ý từ AI</h3></div>
            <p className="ai-tip-text">
              Upload tài liệu tại "Trợ lý AI" để tự động trích xuất tiêu đề, tác giả, từ khóa,
              kiểm tra đạo văn và phân tích xu hướng nghiên cứu.
            </p>
            <button className="btn-ai-tip" onClick={() => navigate('/ai')}>
              <Sparkles size={14} /> Mở Trợ lý AI <ArrowUpRight size={14} />
            </button>
          </div>
        </div>
      </div>

      <style>{dashStyles}</style>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, sub, onClick }: { icon: typeof TrendingUp; label: string; value: number; color: string; sub?: string; onClick?: () => void }) {
  return (
    <div className="surface-card stat-card" onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      <div className="stat-icon" style={{ background: `${color}12`, color }}><Icon size={22} /></div>
      <div className="stat-info">
        <span className="stat-value" style={{ color }}>{value}</span>
        <span className="stat-label">{label}</span>
        {sub && <span className="stat-sub">{sub}</span>}
      </div>
    </div>
  );
}

const dashStyles = `
  .dash { display: flex; flex-direction: column; gap: 1.5rem; padding-bottom: 3rem; }
  .dash-loading { display: flex; justify-content: center; padding: 80px; }

  /* Hero */
  .dash-hero { background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 40%, #2563eb 100%); border-radius: 20px; padding: 2.5rem; display: flex; justify-content: space-between; align-items: center; color: white; }
  .hero-left { flex: 1; }
  .hero-greeting { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
  .hero-greeting h1 { font-size: 1.75rem; font-weight: 800; color: white; }
  .hero-role { display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: 100px; background: rgba(255,255,255,0.15); font-size: 0.7rem; font-weight: 700; }
  .hero-desc { font-size: 0.9rem; opacity: 0.85; line-height: 1.6; max-width: 520px; margin-bottom: 1.5rem; }
  .hero-desc strong { color: #cbd5e1; font-weight: 800; }
  .hero-actions { display: flex; gap: 8px; flex-wrap: wrap; }
  .btn-hero { display: flex; align-items: center; gap: 6px; padding: 10px 18px; border-radius: 10px; font-weight: 700; font-size: 0.8125rem; cursor: pointer; border: none; transition: transform 0.15s; }
  .btn-hero:hover { transform: translateY(-1px); }
  .btn-hero.primary { background: white; color: #1e3a8a; }
  .btn-hero.secondary { background: rgba(255,255,255,0.12); color: white; border: 1.5px solid rgba(255,255,255,0.2); }
  .hero-right { flex-shrink: 0; margin-left: 2rem; }
  .hero-stat-ring { position: relative; width: 140px; height: 140px; }
  .ring-svg { width: 100%; height: 100%; }
  .ring-center { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; }
  .ring-pct { display: block; font-size: 1.75rem; font-weight: 800; }
  .ring-label { font-size: 0.65rem; opacity: 0.7; font-weight: 600; }

  /* Stats */
  .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; }
  .stat-card { display: flex; align-items: center; gap: 1rem; transition: transform 0.15s; }
  .stat-card:hover { transform: translateY(-2px); }
  .stat-icon { width: 48px; height: 48px; border-radius: 14px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .stat-value { font-size: 1.75rem; font-weight: 800; display: block; line-height: 1; }
  .stat-label { font-size: 0.8rem; font-weight: 600; color: var(--on-surface-muted); }
  .stat-sub { font-size: 0.65rem; color: var(--on-surface-variant); }

  /* Quick Links */
  .quick-links { display: grid; grid-template-columns: repeat(6, 1fr); gap: 0.75rem; }
  .quick-card { display: flex; align-items: center; gap: 10px; padding: 1rem !important; cursor: pointer; transition: all 0.15s; }
  .quick-card:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,0,0.06); }
  .quick-icon { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .quick-label { font-weight: 700; font-size: 0.8rem; flex: 1; }
  .quick-arrow { color: var(--on-surface-variant); }

  /* Main Grid */
  .dash-grid { display: grid; grid-template-columns: 1fr 320px; gap: 1.5rem; align-items: start; }
  .dash-left { display: flex; flex-direction: column; gap: 1.5rem; }
  .dash-right { display: flex; flex-direction: column; gap: 1rem; }

  .card-head { display: flex; align-items: center; gap: 8px; margin-bottom: 1rem; }
  .card-head h2, .card-head h3 { font-size: 0.9375rem; font-weight: 700; flex: 1; }
  .btn-see-all { display: flex; align-items: center; gap: 4px; background: none; border: none; color: var(--primary-indigo); font-weight: 700; font-size: 0.75rem; cursor: pointer; }

  /* Status bars */
  .status-bars { display: flex; flex-direction: column; gap: 8px; }
  .status-bar-row { display: flex; align-items: center; gap: 10px; }
  .bar-label { font-size: 0.75rem; width: 110px; color: var(--on-surface-muted); font-weight: 500; }
  .bar-track { flex: 1; height: 8px; background: var(--surface-low); border-radius: 4px; overflow: hidden; }
  .bar-fill { height: 100%; border-radius: 4px; transition: width 0.6s ease; }
  .bar-count { font-size: 0.75rem; font-weight: 800; min-width: 20px; text-align: right; }
  .bar-pct { font-size: 0.65rem; color: var(--on-surface-muted); min-width: 30px; text-align: right; }

  /* Table */
  .table-card { padding: 0 !important; overflow: hidden; }
  .table-card .card-head { padding: 1.25rem 1.5rem 0; }
  .table-wrap { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; }
  thead tr { background: var(--surface-low); }
  th { padding: 10px 16px; text-align: left; font-size: 0.65rem; font-weight: 800; color: var(--on-surface-muted); text-transform: uppercase; letter-spacing: 0.05em; }
  tbody tr { border-bottom: 1px solid var(--surface-variant); cursor: pointer; transition: background 0.15s; }
  tbody tr:hover { background: var(--surface-low); }
  td { padding: 12px 16px; font-size: 0.8125rem; }
  .td-title { font-weight: 600; max-width: 280px; }
  .td-muted { color: var(--on-surface-muted); font-size: 0.75rem; }
  .type-chip { padding: 2px 8px; border-radius: 4px; font-size: 0.65rem; font-weight: 700; background: var(--surface-low); color: var(--on-surface-muted); }
  .status-chip { padding: 3px 10px; border-radius: 6px; font-size: 0.65rem; font-weight: 700; white-space: nowrap; }
  .td-ai { font-weight: 700; font-size: 0.8rem; }
  .ai-good { color: #10b981; }
  .ai-warn { color: #f59e0b; }

  /* Right sidebar cards */
  .level-row { display: flex; align-items: center; gap: 8px; padding: 8px 0; border-bottom: 1px solid var(--surface-variant); }
  .level-row:last-child { border: none; }
  .level-dot { width: 10px; height: 10px; border-radius: 50%; }
  .level-name { flex: 1; font-size: 0.8125rem; }
  .level-count { font-weight: 800; font-size: 1rem; }

  .type-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid var(--surface-variant); font-size: 0.8125rem; }
  .type-row:last-child { border: none; }
  .type-name { color: var(--on-surface-muted); }
  .type-count { font-weight: 700; }

  /* Notifications */
  .notif-list { display: flex; flex-direction: column; gap: 2px; }
  .notif-item { display: flex; align-items: flex-start; gap: 8px; padding: 8px 0; cursor: pointer; border-bottom: 1px solid var(--surface-variant); }
  .notif-item:last-child { border: none; }
  .notif-item.unread .notif-title { font-weight: 700; }
  .notif-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--primary-indigo); margin-top: 6px; flex-shrink: 0; opacity: 0.3; }
  .notif-item.unread .notif-dot { opacity: 1; }
  .notif-content { flex: 1; }
  .notif-title { font-size: 0.8rem; display: block; }
  .notif-time { font-size: 0.65rem; color: var(--on-surface-muted); }

  /* AI tip */
  .ai-tip-card { background: #fdf2ff !important; }
  .ai-tip-text { font-size: 0.8rem; line-height: 1.6; color: var(--on-surface-muted); margin-bottom: 12px; }
  .btn-ai-tip { width: 100%; background: var(--signature-gradient); color: white; border: none; padding: 10px; border-radius: 10px; font-weight: 700; font-size: 0.8rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; }

  .empty-text { color: var(--on-surface-muted); font-size: 0.8125rem; }
  .spin { animation: spin 1s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  @media (max-width: 1200px) {
    .stats-grid { grid-template-columns: repeat(2, 1fr); }
    .quick-links { grid-template-columns: repeat(3, 1fr); }
    .dash-grid { grid-template-columns: 1fr; }
    .dash-hero { flex-direction: column; text-align: center; }
    .hero-right { margin: 1.5rem 0 0; }
    .hero-actions { justify-content: center; }
  }
`;
