import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Plus, FileText, Filter, ChevronLeft, ChevronRight,
  Loader2, BookOpen, Award, Clock, Archive,
} from 'lucide-react';
import { workService } from '../../services/workService';
import { useAuth } from '../../contexts/AuthContext';
import { Role } from '../../types';

const StatusLabels: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Bản nháp', color: '#94a3b8' },
  SUBMITTED: { label: 'Đã nộp', color: '#3b82f6' },
  OUTLINE_REVIEW: { label: 'Duyệt đề cương', color: '#8b5cf6' },
  PROPOSAL_REVIEW: { label: 'Duyệt thuyết minh', color: '#6366f1' },
  IN_PROGRESS: { label: 'Đang thực hiện', color: '#f59e0b' },
  REVIEW: { label: 'Phản biện', color: '#ec4899' },
  REVISION: { label: 'Chỉnh sửa', color: '#f97316' },
  ACCEPTED: { label: 'Nghiệm thu', color: '#10b981' },
  REJECTED: { label: 'Từ chối', color: '#ef4444' },
  ARCHIVED: { label: 'Lưu trữ', color: '#64748b' },
};

const LevelLabels: Record<string, string> = {
  UNIVERSITY: 'Cấp Trường', MINISTRY: 'Cấp Bộ', STATE: 'Cấp Nhà nước',
};

const TypeLabels: Record<string, string> = {
  JOURNAL_ARTICLE: 'Bài báo', CONFERENCE_PAPER: 'Hội nghị', RESEARCH_PROJECT: 'Đề tài NCKH',
  PATENT: 'Bằng sáng chế', TEXTBOOK: 'Giáo trình', THESIS: 'Luận văn',
};

export default function WorkList() {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), limit: '10' };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const res = await workService.getAll(params);
      setData(res);
    } catch { /* ignore */ }
    setLoading(false);
  }, [page, search, statusFilter]);

  useEffect(() => { load(); }, [load]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em' }}>Quản lý Công trình Khoa học</h1>
          <p style={{ color: 'var(--on-surface-muted)', marginTop: 4 }}>Danh sách đề tài, bài báo, công trình nghiên cứu</p>
        </div>
        {hasRole(Role.ADMIN, Role.LECTURER, Role.STUDENT) && (
          <button className="btn-signature" onClick={() => navigate('/projects/new')} style={{ padding: '10px 20px', fontSize: '0.875rem' }}>
            <Plus size={18} /> Đăng ký mới
          </button>
        )}
      </div>

      {/* Search + Filter */}
      <div className="surface-card" style={{ padding: '14px 18px', display: 'flex', gap: 12, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={18} color="var(--on-surface-muted)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (setPage(1), load())}
            placeholder="Tìm theo tên đề tài, tác giả, từ khóa..." style={{ width: '100%', padding: '10px 14px 10px 40px', border: '1.5px solid var(--surface-variant)', borderRadius: 10, fontSize: '0.9rem', fontFamily: 'inherit', outline: 'none', background: 'var(--surface)' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Filter size={16} color="var(--on-surface-muted)" />
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            style={{ padding: '10px 12px', border: '1.5px solid var(--surface-variant)', borderRadius: 10, fontSize: '0.85rem', fontFamily: 'inherit', outline: 'none', background: 'var(--surface-lowest)', cursor: 'pointer' }}>
            <option value="">Tất cả trạng thái</option>
            {Object.entries(StatusLabels).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
      </div>

      {/* Works List */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <Loader2 size={32} color="var(--primary-indigo)" className="spin" />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {data?.data?.map((w: any) => {
            const st = StatusLabels[w.status] || { label: w.status, color: '#94a3b8' };
            return (
              <div key={w.id} className="surface-card" style={{ padding: '18px 22px', cursor: 'pointer', transition: 'box-shadow 0.2s' }}
                onClick={() => navigate(`/projects/${w.id}`)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: 'var(--surface-low)', color: 'var(--on-surface-muted)', textTransform: 'uppercase' }}>
                        {LevelLabels[w.level] || w.level}
                      </span>
                      <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--on-surface-muted)' }}>
                        {TypeLabels[w.type] || w.type}
                      </span>
                    </div>
                    <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 4, lineHeight: 1.4 }}>{w.title}</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--on-surface-muted)', marginBottom: 8 }}>{w.authors}</p>
                    <div style={{ display: 'flex', gap: 16, fontSize: '0.75rem', color: 'var(--on-surface-muted)' }}>
                      {w._count?.files > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><FileText size={12} /> {w._count.files} file</span>}
                      {w._count?.reviews > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><BookOpen size={12} /> {w._count.reviews} nhận xét</span>}
                      {w.aiScore && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Award size={12} /> AI: {w.aiScore}/100</span>}
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={12} /> {new Date(w.createdAt).toLocaleDateString('vi-VN')}</span>
                    </div>
                  </div>
                  <span style={{ padding: '5px 12px', borderRadius: 8, fontSize: '0.75rem', fontWeight: 700, background: `${st.color}15`, color: st.color, whiteSpace: 'nowrap' }}>
                    {st.label}
                  </span>
                </div>
              </div>
            );
          })}
          {(!data || data.data.length === 0) && (
            <div className="surface-card" style={{ padding: 48, textAlign: 'center', color: 'var(--on-surface-muted)' }}>
              <Archive size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
              <p>Chưa có công trình nào</p>
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {data?.meta?.totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, alignItems: 'center' }}>
          <button disabled={page <= 1} onClick={() => setPage(page - 1)}
            style={{ ...pgBtn, opacity: page <= 1 ? 0.4 : 1 }}><ChevronLeft size={16} /></button>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, padding: '0 12px' }}>{page} / {data.meta.totalPages}</span>
          <button disabled={page >= data.meta.totalPages} onClick={() => setPage(page + 1)}
            style={{ ...pgBtn, opacity: page >= data.meta.totalPages ? 0.4 : 1 }}><ChevronRight size={16} /></button>
        </div>
      )}

      <style>{`.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

const pgBtn: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, border: '1.5px solid var(--surface-variant)', background: 'var(--surface-lowest)', cursor: 'pointer' };
