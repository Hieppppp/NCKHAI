import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, FileText, Users, Clock, Award, BarChart3, Sparkles, Loader2 } from 'lucide-react';
import { dashboardService } from '../services/dashboardService';
import { useAuth } from '../contexts/AuthContext';

const StatusLabels: Record<string, string> = {
  DRAFT: 'Bản nháp', SUBMITTED: 'Đã nộp', IN_PROGRESS: 'Đang thực hiện',
  REVIEW: 'Phản biện', ACCEPTED: 'Nghiệm thu', ARCHIVED: 'Lưu trữ',
  OUTLINE_REVIEW: 'Duyệt đề cương', PROPOSAL_REVIEW: 'Duyệt thuyết minh',
  REVISION: 'Chỉnh sửa', REJECTED: 'Từ chối',
};
const StatusColors: Record<string, string> = {
  DRAFT: '#94a3b8', SUBMITTED: '#3b82f6', IN_PROGRESS: '#f59e0b',
  REVIEW: '#ec4899', ACCEPTED: '#10b981', ARCHIVED: '#64748b',
  OUTLINE_REVIEW: '#8b5cf6', PROPOSAL_REVIEW: '#6366f1', REVISION: '#f97316', REJECTED: '#ef4444',
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardService.getStats().then(setStats).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Loader2 size={36} className="spin" color="var(--primary-indigo)" /><style>{`.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <section>
        <h1 style={{ color: 'var(--primary-indigo)', marginBottom: 4, fontSize: '1.75rem', fontWeight: 800 }}>
          Xin chào, {user?.name || 'Người dùng'}
        </h1>
        <p style={{ color: 'var(--on-surface-muted)' }}>
          Hệ thống có {stats?.totalWorks || 0} công trình và {stats?.pendingReviews || 0} đề tài đang chờ xử lý.
        </p>
      </section>

      {/* Stats Cards */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <StatCard icon={FileText} label="Tổng công trình" value={stats?.totalWorks || 0} color="#6366f1" />
        <StatCard icon={Clock} label="Chờ xử lý" value={stats?.pendingReviews || 0} color="#f59e0b" />
        <StatCard icon={Award} label="Đã nghiệm thu" value={stats?.accepted || 0} color="#10b981" />
        <StatCard icon={Users} label="Người dùng" value={stats?.totalUsers || 0} color="#8b5cf6" />
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'start' }}>
        {/* Left: Status distribution + Recent works */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Status bar chart */}
          <div className="surface-card">
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16 }}>Phân bố trạng thái</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {Object.entries(stats?.byStatus || {}).map(([status, count]) => (
                <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: '0.8rem', width: 120, color: 'var(--on-surface-muted)' }}>{StatusLabels[status] || status}</span>
                  <div style={{ flex: 1, height: 10, borderRadius: 5, background: 'var(--surface-low)' }}>
                    <div style={{ width: `${Math.min(((count as number) / (stats?.totalWorks || 1)) * 100, 100)}%`, height: '100%', borderRadius: 5, background: StatusColors[status] || '#94a3b8', transition: 'width 0.5s' }} />
                  </div>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, minWidth: 24, textAlign: 'right' }}>{count as number}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Works Table */}
          <div className="surface-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>Công trình gần đây</h2>
              <button onClick={() => navigate('/projects')} style={{ fontSize: '0.8rem', color: 'var(--primary-violet)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Xem tất cả →</button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--surface-low)' }}>
                  {['Tên đề tài', 'Tác giả', 'Trạng thái', 'AI Score'].map((h) => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: 'var(--on-surface-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stats?.recentWorks?.slice(0, 5).map((w: any) => {
                  const sc = StatusColors[w.status] || '#94a3b8';
                  return (
                    <tr key={w.id} style={{ borderBottom: '1px solid var(--surface-variant)', cursor: 'pointer' }} onClick={() => navigate(`/projects/${w.id}`)}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem', lineHeight: 1.3 }}>{w.title.length > 50 ? w.title.slice(0, 50) + '...' : w.title}</div>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '0.8rem', color: 'var(--on-surface-muted)' }}>{w.user?.name || w.authors}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ padding: '3px 10px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 700, background: `${sc}15`, color: sc }}>{StatusLabels[w.status] || w.status}</span>
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 700, fontSize: '0.85rem', color: w.aiScore ? (w.aiScore >= 80 ? '#10b981' : '#f59e0b') : '#94a3b8' }}>
                        {w.aiScore ? `${w.aiScore}/100` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* By Type */}
          <div className="surface-card">
            <h3 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: 12 }}>Phân bố loại hình</h3>
            {Object.entries(stats?.byType || {}).map(([type, count]) => (
              <div key={type} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--surface-variant)', fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--on-surface-muted)' }}>{type.replace(/_/g, ' ')}</span>
                <span style={{ fontWeight: 700 }}>{count as number}</span>
              </div>
            ))}
          </div>

          {/* By Level */}
          <div className="surface-card">
            <h3 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: 12 }}>Phân bố cấp đề tài</h3>
            {Object.entries(stats?.byLevel || {}).map(([level, count]) => {
              const labels: Record<string, string> = { UNIVERSITY: 'Cấp Trường', MINISTRY: 'Cấp Bộ', STATE: 'Cấp Nhà nước' };
              const colors: Record<string, string> = { UNIVERSITY: '#3b82f6', MINISTRY: '#8b5cf6', STATE: '#dc2626' };
              return (
                <div key={level} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: colors[level] || '#94a3b8' }} />
                  <span style={{ fontSize: '0.85rem', flex: 1 }}>{labels[level] || level}</span>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{count as number}</span>
                </div>
              );
            })}
          </div>

          {/* AI tip */}
          <div className="surface-card" style={{ background: '#fdf2ff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <Sparkles size={16} color="var(--primary-violet)" />
              <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--primary-indigo)' }}>Gợi ý từ AI</span>
            </div>
            <p style={{ fontSize: '0.85rem', lineHeight: 1.6, fontStyle: 'italic', color: 'var(--on-surface)' }}>
              Sử dụng trang "Trợ lý AI" để upload bài báo và tự động trích xuất thông tin, kiểm tra đạo văn, và phân tích xu hướng nghiên cứu.
            </p>
            <button className="btn-signature" onClick={() => navigate('/ai')} style={{ width: '100%', marginTop: 12, padding: '8px', fontSize: '0.8rem' }}>
              <Sparkles size={14} /> Mở Trợ lý AI
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: typeof TrendingUp; label: string; value: number; color: string }) {
  return (
    <div className="surface-card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ width: 48, height: 48, borderRadius: 12, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
        <Icon size={24} />
      </div>
      <div>
        <div style={{ fontSize: '1.5rem', fontWeight: 800, color }}>{value}</div>
        <div className="label-sm">{label}</div>
      </div>
    </div>
  );
}
