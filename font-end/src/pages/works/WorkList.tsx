import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Plus, FileText, Filter, ChevronLeft, ChevronRight,
  Loader2, Award, Clock, Archive, LayoutGrid, List,
  Eye, Calendar, X,
} from 'lucide-react';
import { workService } from '../../services/workService';
import { useAuth } from '../../contexts/AuthContext';
import { Role } from '../../types';
import type { WorksModule } from '../../config/worksModules';

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
const LevelLabels: Record<string, string> = { UNIVERSITY: 'Cấp Trường', MINISTRY: 'Cấp Bộ', STATE: 'Cấp Nhà nước' };
const LevelColors: Record<string, string> = { UNIVERSITY: '#3b82f6', MINISTRY: '#8b5cf6', STATE: '#dc2626' };
const TypeLabels: Record<string, string> = {
  JOURNAL_ARTICLE: 'Bài báo', CONFERENCE_PAPER: 'Hội nghị', RESEARCH_PROJECT: 'Đề tài NCKH',
  PATENT: 'Bằng sáng chế', TEXTBOOK: 'Giáo trình', THESIS: 'Luận văn',
};

type ViewMode = 'grid' | 'list';

export default function WorkList({ mod }: { mod: WorksModule }) {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const singleType = mod.types.length === 1;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), limit: '12', category: mod.category };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.type = typeFilter;
      if (levelFilter) params.level = levelFilter;
      setData(await workService.getAll(params));
    } catch { /* ignore */ }
    setLoading(false);
  }, [page, search, statusFilter, typeFilter, levelFilter, mod.category]);

  useEffect(() => { load(); }, [load]);

  const works = data?.data || [];
  const meta = data?.meta || { total: 0, page: 1, totalPages: 1 };
  const hasFilters = statusFilter || typeFilter || levelFilter;

  return (
    <div className="wl">
      <header className="wl-header">
        <div>
          <h1>{mod.listTitle}</h1>
          <p className="wl-sub">{mod.listSubtitle}</p>
        </div>
        {hasRole(Role.ADMIN, Role.LECTURER, Role.STUDENT) && (
          <button className="btn-create" onClick={() => navigate(`${mod.basePath}/new`)}><Plus size={18} /> Đăng ký mới</button>
        )}
      </header>

      <div className="wl-toolbar surface-card">
        <div className="wl-search">
          <Search size={18} color="var(--on-surface-muted)" />
          <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { setPage(1); load(); } }} placeholder="Tìm theo tên đề tài, tác giả, từ khóa..." />
        </div>
        <button className={`wl-filter-btn ${showFilters ? 'active' : ''}`} onClick={() => setShowFilters(!showFilters)}>
          <Filter size={16} /> Bộ lọc {hasFilters && <span className="filter-badge" />}
        </button>
        <div className="wl-view-toggle">
          <button className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')}><List size={16} /></button>
          <button className={viewMode === 'grid' ? 'active' : ''} onClick={() => setViewMode('grid')}><LayoutGrid size={16} /></button>
        </div>
      </div>

      {showFilters && (
        <div className="wl-filters">
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="">Trạng thái</option>
            {Object.entries(StatusLabels).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          {!singleType && (
            <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }}>
              <option value="">Loại hình</option>
              {mod.types.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          )}
          {mod.showLevel && (
            <select value={levelFilter} onChange={e => { setLevelFilter(e.target.value); setPage(1); }}>
              <option value="">Cấp độ</option>
              {Object.entries(LevelLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          )}
          {hasFilters && <button className="wl-clear" onClick={() => { setStatusFilter(''); setTypeFilter(''); setLevelFilter(''); setPage(1); }}><X size={14} /> Xóa</button>}
          <span className="wl-result-count">{meta.total} kết quả</span>
        </div>
      )}

      {loading ? (
        <div className="wl-loading"><Loader2 size={32} className="spin" color="var(--primary-indigo)" /></div>
      ) : works.length === 0 ? (
        <div className="wl-empty surface-card"><Archive size={48} style={{ opacity: 0.3 }} /><p>Chưa có {mod.itemNoun} nào</p></div>
      ) : viewMode === 'list' ? (
        <div className="wl-list">
          {works.map((w: any) => {
            const st = StatusLabels[w.status] || { label: w.status, color: '#94a3b8' };
            return (
              <div key={w.id} className="surface-card wl-item" onClick={() => navigate(`${mod.basePath}/${w.id}`)}>
                <div className="wl-item-left">
                  <div className="wl-badges">
                    {mod.showLevel && <span className="badge-level" style={{ background: `${LevelColors[w.level] || '#3b82f6'}15`, color: LevelColors[w.level] || '#3b82f6' }}>{LevelLabels[w.level] || w.level}</span>}
                    <span className="badge-type">{TypeLabels[w.type] || w.type}</span>
                  </div>
                  <h3>{w.title}</h3>
                  <p className="wl-authors">{w.authors}</p>
                  <div className="wl-kws">
                    {w.keywords?.slice(0, 3).map((kw: string) => <span key={kw} className="kw">{kw}</span>)}
                    {w.keywords?.length > 3 && <span className="kw more">+{w.keywords.length - 3}</span>}
                  </div>
                </div>
                <div className="wl-item-right">
                  <span className="wl-status" style={{ background: `${st.color}15`, color: st.color }}>{st.label}</span>
                  <div className="wl-meta">
                    {w._count?.files > 0 && <span><FileText size={12} /> {w._count.files}</span>}
                    {w._count?.reviews > 0 && <span><Eye size={12} /> {w._count.reviews}</span>}
                    {w.aiScore && <span className="ai"><Award size={12} /> {w.aiScore}</span>}
                  </div>
                  <span className="wl-date"><Calendar size={12} /> {new Date(w.createdAt).toLocaleDateString('vi-VN')}</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="wl-grid">
          {works.map((w: any) => {
            const st = StatusLabels[w.status] || { label: w.status, color: '#94a3b8' };
            return (
              <div key={w.id} className="surface-card wl-card" onClick={() => navigate(`${mod.basePath}/${w.id}`)}>
                <div className="wl-card-top">
                  {mod.showLevel
                    ? <span className="badge-level sm" style={{ background: `${LevelColors[w.level] || '#3b82f6'}15`, color: LevelColors[w.level] || '#3b82f6' }}>{LevelLabels[w.level] || w.level}</span>
                    : <span className="badge-type">{TypeLabels[w.type] || w.type}</span>}
                  <span className="wl-status sm" style={{ background: `${st.color}15`, color: st.color }}>{st.label}</span>
                </div>
                <h3 className="wl-card-title">{w.title}</h3>
                <p className="wl-card-authors">{w.authors}</p>
                <div className="wl-card-foot">
                  <span className="badge-type">{TypeLabels[w.type] || w.type}</span>
                  {w.aiScore && <span className="ai"><Award size={11} /> {w.aiScore}</span>}
                  <span className="wl-date ml"><Calendar size={11} /> {new Date(w.createdAt).toLocaleDateString('vi-VN')}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {meta.totalPages > 1 && (
        <div className="wl-pag">
          <button className="pg" disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft size={16} /></button>
          {Array.from({ length: Math.min(meta.totalPages, 7) }, (_, i) => {
            const s = Math.max(1, page - 3); const p = s + i;
            if (p > meta.totalPages) return null;
            return <button key={p} className={`pg ${page === p ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>;
          })}
          <button className="pg" disabled={page >= meta.totalPages} onClick={() => setPage(page + 1)}><ChevronRight size={16} /></button>
          <span className="pg-info">{meta.total} kết quả</span>
        </div>
      )}

      <style>{`
        .wl{display:flex;flex-direction:column;gap:1.25rem;padding-bottom:3rem}
        .wl-header{display:flex;justify-content:space-between;align-items:flex-start}
        .wl-header h1{font-size:1.75rem;font-weight:800}
        .wl-sub{color:var(--on-surface-muted);font-size:.875rem;margin-top:2px}
        .btn-create{background:var(--signature-gradient);color:#fff;border:none;padding:10px 20px;border-radius:12px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:6px;font-size:.875rem}
        .wl-toolbar{display:flex;align-items:center;gap:10px;padding:10px 14px!important}
        .wl-search{flex:1;display:flex;align-items:center;gap:8px}
        .wl-search input{flex:1;border:none;outline:none;font-size:.875rem;background:transparent;padding:8px 0}
        .wl-filter-btn{display:flex;align-items:center;gap:6px;padding:8px 14px;border-radius:8px;border:1.5px solid var(--surface-variant);background:var(--surface-lowest);cursor:pointer;font-weight:700;font-size:.8rem;color:var(--on-surface-muted);position:relative}
        .wl-filter-btn.active{border-color:var(--primary-indigo);color:var(--primary-indigo)}
        .filter-badge{position:absolute;top:-2px;right:-2px;width:8px;height:8px;border-radius:50%;background:#ef4444}
        .wl-view-toggle{display:flex;border:1.5px solid var(--surface-variant);border-radius:8px;overflow:hidden}
        .wl-view-toggle button{padding:8px 10px;border:none;background:var(--surface-lowest);cursor:pointer;color:var(--on-surface-muted);display:flex;align-items:center}
        .wl-view-toggle button.active{background:var(--primary-indigo);color:#fff}
        .wl-filters{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
        .wl-filters select{padding:8px 12px;border:1.5px solid var(--surface-variant);border-radius:8px;font-size:.8rem;font-weight:600;background:var(--surface-lowest);cursor:pointer}
        .wl-clear{display:flex;align-items:center;gap:4px;padding:6px 12px;border:none;background:#fee2e2;color:#dc2626;border-radius:8px;font-weight:700;font-size:.75rem;cursor:pointer}
        .wl-result-count{font-size:.75rem;color:var(--on-surface-muted);margin-left:auto}
        .wl-loading{display:flex;justify-content:center;padding:4rem}
        .wl-empty{display:flex;flex-direction:column;align-items:center;gap:1rem;padding:4rem!important;text-align:center;color:var(--on-surface-muted)}
        .wl-list{display:flex;flex-direction:column;gap:.75rem}
        .wl-item{display:flex;justify-content:space-between;align-items:flex-start;gap:1.5rem;padding:1.25rem 1.5rem!important;cursor:pointer;transition:all .15s}
        .wl-item:hover{transform:translateY(-1px);box-shadow:0 8px 20px rgba(0,0,0,.06)}
        .wl-item-left{flex:1;min-width:0}
        .wl-badges{display:flex;gap:6px;margin-bottom:6px}
        .badge-level{padding:2px 8px;border-radius:4px;font-size:.65rem;font-weight:800;text-transform:uppercase;letter-spacing:.03em}
        .badge-level.sm{font-size:.6rem;padding:2px 6px}
        .badge-type{font-size:.65rem;font-weight:600;color:var(--on-surface-muted)}
        .wl-item-left h3{font-weight:700;font-size:1rem;line-height:1.4;margin-bottom:4px}
        .wl-authors{font-size:.8rem;color:var(--on-surface-muted);margin-bottom:8px}
        .wl-kws{display:flex;gap:4px;flex-wrap:wrap}
        .kw{padding:2px 8px;border-radius:4px;background:#eef2ff;color:var(--primary-indigo);font-size:.65rem;font-weight:700}
        .kw.more{background:var(--surface-low);color:var(--on-surface-muted)}
        .wl-item-right{display:flex;flex-direction:column;align-items:flex-end;gap:8px;flex-shrink:0}
        .wl-status{padding:4px 12px;border-radius:8px;font-size:.7rem;font-weight:700;white-space:nowrap}
        .wl-status.sm{font-size:.6rem;padding:3px 8px;border-radius:6px}
        .wl-meta{display:flex;gap:10px;font-size:.7rem;color:var(--on-surface-muted)}
        .wl-meta span{display:flex;align-items:center;gap:3px}
        .ai{color:var(--primary-violet);font-weight:700;display:flex;align-items:center;gap:3px}
        .wl-date{font-size:.7rem;color:var(--on-surface-variant);display:flex;align-items:center;gap:4px}
        .wl-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:1rem}
        .wl-card{padding:1.25rem!important;cursor:pointer;transition:all .15s;display:flex;flex-direction:column;gap:8px}
        .wl-card:hover{transform:translateY(-2px);box-shadow:0 8px 20px rgba(0,0,0,.06)}
        .wl-card-top{display:flex;justify-content:space-between;align-items:center}
        .wl-card-title{font-weight:700;font-size:.9375rem;line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
        .wl-card-authors{font-size:.8rem;color:var(--on-surface-muted)}
        .wl-card-foot{display:flex;align-items:center;gap:10px;margin-top:auto;padding-top:8px;font-size:.7rem;color:var(--on-surface-muted)}
        .ml{margin-left:auto}
        .wl-pag{display:flex;align-items:center;justify-content:center;gap:4px}
        .pg{width:34px;height:34px;border:none;border-radius:8px;background:#fff;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--on-surface-muted);font-size:.8rem}
        .pg.active{background:var(--primary-indigo);color:#fff}
        .pg:disabled{opacity:.3;cursor:not-allowed}
        .pg-info{font-size:.75rem;color:var(--on-surface-muted);margin-left:12px}
        .spin{animation:spin 1s linear infinite}
        @keyframes spin{to{transform:rotate(360deg)}}
        @media(max-width:768px){.wl-item{flex-direction:column;gap:10px}.wl-grid{grid-template-columns:1fr}}
      `}</style>
    </div>
  );
}
