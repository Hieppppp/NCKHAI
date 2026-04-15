import { useState, useEffect, useRef } from 'react';
import {
  Search,
  Filter,
  FileText,
  BookOpen,
  Eye,
  Download,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  MessageCircle,
  Send,
  X,
  Tag,
  Plus,
  ArrowLeft,
  Calendar,
  User,
  Loader2,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react';
import { libraryService } from '../services/libraryService';
import { useAuth } from '../contexts/AuthContext';
import { Role } from '../types';

interface LibDoc {
  id: number;
  title: string;
  authors: string;
  abstract?: string;
  keywords: string[];
  tags: string[];
  category?: string;
  type: string;
  level?: string;
  aiScore?: number;
  viewCount: number;
  downloadCount: number;
  createdAt: string;
  updatedAt?: string;
  user?: { id: number; name: string };
  publication?: { journalName?: string; conferenceName?: string; doi?: string; publishedDate?: string; issn?: string };
  work?: { id: number; title: string };
}

interface ChatMessage {
  role: 'user' | 'bot';
  text: string;
}

const TYPE_LABELS: Record<string, string> = {
  JOURNAL_ARTICLE: 'Bai bao', CONFERENCE_PAPER: 'Hoi nghi', RESEARCH_PROJECT: 'De tai NC',
  PATENT: 'Bang sang che', TEXTBOOK: 'Giao trinh', THESIS: 'Luan van',
};

const LEVEL_LABELS: Record<string, string> = { UNIVERSITY: 'Cap truong', MINISTRY: 'Cap bo', STATE: 'Cap nha nuoc' };
const LEVEL_COLORS: Record<string, string> = { UNIVERSITY: '#3b82f6', MINISTRY: '#8b5cf6', STATE: '#ef4444' };

export default function LibraryPage() {
  const { hasRole } = useAuth();
  const isLecturerOrAdmin = hasRole(Role.ADMIN, Role.LECTURER);

  const [docs, setDocs] = useState<LibDoc[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{ total: number; topTags: { name: string; count: number }[] } | null>(null);

  // Detail view
  const [detail, setDetail] = useState<LibDoc | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [copied, setCopied] = useState(false);

  // Chat
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMsg, setChatMsg] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    { role: 'bot', text: 'Xin chao! Toi co the giup ban tim kiem tai lieu, goi y bai bao lien quan, hoac trich dan tu dong.' },
  ]);
  const [chatLoading, setChatLoading] = useState(false);
  const chatBodyRef = useRef<HTMLDivElement>(null);

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: '', authors: '', abstract: '', keywords: '', tags: '', category: '', type: 'JOURNAL_ARTICLE', level: 'UNIVERSITY',
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchDocs = async (page = 1) => {
    setLoading(true);
    try {
      const res = await libraryService.findAll({ page, limit: 10, search: search || undefined, type: typeFilter || undefined, level: levelFilter || undefined });
      setDocs(res.data);
      setMeta(res.meta);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => {
    fetchDocs();
    libraryService.getStats().then(setStats).catch(() => {});
  }, []);

  const handleSearch = () => fetchDocs(1);

  const openDetail = async (id: number) => {
    setLoadingDetail(true);
    try {
      const doc = await libraryService.findOne(id);
      setDetail(doc);
    } catch { /* ignore */ }
    setLoadingDetail(false);
  };

  const handleCopyBibTeX = () => {
    if (!detail) return;
    const bib = `@article{${detail.id},\n  title={${detail.title}},\n  author={${detail.authors}},\n  year={${new Date(detail.createdAt).getFullYear()}},\n  ${detail.publication?.journalName ? `journal={${detail.publication.journalName}},` : ''}\n  ${detail.publication?.doi ? `doi={${detail.publication.doi}},` : ''}\n}`;
    navigator.clipboard.writeText(bib);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleChat = async () => {
    if (!chatMsg.trim() || chatLoading) return;
    const userMsg = chatMsg.trim();
    setChatMsg('');
    setChatHistory(prev => [...prev, { role: 'user', text: userMsg }]);
    setChatLoading(true);

    try {
      const res = await libraryService.chat(userMsg);
      setChatHistory(prev => [...prev, { role: 'bot', text: res.reply || res.response || 'Xin loi, toi chua the tra loi cau hoi nay.' }]);
    } catch {
      setChatHistory(prev => [...prev, { role: 'bot', text: 'Xin loi, dich vu AI dang khong kha dung. Vui long thu lai sau.' }]);
    }
    setChatLoading(false);
    setTimeout(() => chatBodyRef.current?.scrollTo({ top: chatBodyRef.current.scrollHeight, behavior: 'smooth' }), 100);
  };

  const handleCreate = async () => {
    setSubmitting(true);
    try {
      await libraryService.create({
        title: createForm.title,
        authors: createForm.authors,
        abstract: createForm.abstract || undefined,
        keywords: createForm.keywords ? createForm.keywords.split(',').map(k => k.trim()) : [],
        tags: createForm.tags ? createForm.tags.split(',').map(t => t.trim()) : [],
        category: createForm.category || undefined,
        type: createForm.type,
        level: createForm.level || undefined,
      });
      setShowCreate(false);
      setCreateForm({ title: '', authors: '', abstract: '', keywords: '', tags: '', category: '', type: 'JOURNAL_ARTICLE', level: 'UNIVERSITY' });
      fetchDocs();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Tao tai lieu that bai');
    }
    setSubmitting(false);
  };

  // --- Detail View ---
  if (detail) {
    return (
      <div className="library-page">
        <button className="btn-back" onClick={() => setDetail(null)}>
          <ArrowLeft size={16} /> Quay lai thu vien
        </button>

        <div className="detail-layout">
          <article className="surface-card detail-main">
            <div className="detail-header">
              {detail.level && (
                <span className="level-badge" style={{ background: LEVEL_COLORS[detail.level] || '#3b82f6' }}>
                  {LEVEL_LABELS[detail.level] || detail.level}
                </span>
              )}
              <span className="type-chip">{TYPE_LABELS[detail.type] || detail.type}</span>
            </div>

            <h1 className="detail-title">{detail.title}</h1>

            <div className="detail-authors">
              <User size={16} /> {detail.user?.name || detail.authors}
            </div>

            {detail.publication?.journalName && (
              <div className="detail-journal">
                <BookOpen size={14} /> {detail.publication.journalName}
                {detail.publication.publishedDate && ` - ${new Date(detail.publication.publishedDate).toLocaleDateString('vi-VN')}`}
              </div>
            )}

            {detail.abstract && (
              <div className="detail-section">
                <h3>Tom tat</h3>
                <p>{detail.abstract}</p>
              </div>
            )}

            {detail.keywords.length > 0 && (
              <div className="detail-section">
                <h3>Tu khoa</h3>
                <div className="tags-wrap">
                  {detail.keywords.map(k => <span key={k} className="tag-chip">{k}</span>)}
                </div>
              </div>
            )}

            {detail.tags.length > 0 && (
              <div className="detail-section">
                <h3>Tags</h3>
                <div className="tags-wrap">
                  {detail.tags.map(t => <span key={t} className="tag-chip alt">{t}</span>)}
                </div>
              </div>
            )}
          </article>

          <aside className="detail-sidebar">
            {/* Stats */}
            <div className="surface-card" style={{ padding: '1.5rem' }}>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '1rem' }}>Thong tin</h4>
              <div className="detail-stats">
                <div className="dstat-row"><Eye size={14} /> <span>Luot xem</span> <strong>{detail.viewCount}</strong></div>
                <div className="dstat-row"><Download size={14} /> <span>Luot tai</span> <strong>{detail.downloadCount}</strong></div>
                <div className="dstat-row"><Calendar size={14} /> <span>Ngay tao</span> <strong>{new Date(detail.createdAt).toLocaleDateString('vi-VN')}</strong></div>
                {detail.aiScore && (
                  <div className="dstat-row"><Sparkles size={14} /> <span>AI Score</span> <strong>{detail.aiScore.toFixed(2)}</strong></div>
                )}
              </div>
            </div>

            {/* DOI & Citation */}
            {detail.publication?.doi && (
              <div className="surface-card" style={{ padding: '1.5rem' }}>
                <h4 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.75rem' }}>DOI</h4>
                <a href={`https://doi.org/${detail.publication.doi}`} target="_blank" rel="noreferrer"
                  style={{ fontSize: '0.8125rem', color: 'var(--primary-indigo)', display: 'flex', alignItems: 'center', gap: 4, wordBreak: 'break-all' }}>
                  {detail.publication.doi} <ExternalLink size={12} />
                </a>
              </div>
            )}

            <div className="surface-card" style={{ padding: '1.5rem' }}>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.75rem' }}>Trich dan</h4>
              <button className="btn-cite" onClick={handleCopyBibTeX}>
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Da copy BibTeX!' : 'Copy BibTeX'}
              </button>
            </div>
          </aside>
        </div>

        <style>{libraryStyles}</style>
      </div>
    );
  }

  // --- List View ---
  return (
    <div className="library-page">
      <header className="page-header">
        <div>
          <p className="breadcrumb">Quan ly Nghien cuu</p>
          <h1>Kho luu tru so Thong minh</h1>
          <p className="subtitle">
            Truy cap hon {stats?.total || 0} tai lieu, bai bao va cong trinh nghien cuu. Su dung AI de tim kiem chinh xac,
            goi y noi dung va trich dan tu dong.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-filter-toggle" onClick={() => setShowFilters(!showFilters)}>
            <Filter size={18} /> Tim nang cao
          </button>
          {isLecturerOrAdmin && (
            <button className="btn-create-lib" onClick={() => setShowCreate(true)}>
              <Plus size={18} /> Them tai lieu
            </button>
          )}
        </div>
      </header>

      {/* Search Bar */}
      <div className="search-bar-row">
        <div className="search-input-wrap">
          <Search size={20} color="var(--on-surface-muted)" />
          <input type="text" placeholder="Hoi toi bat cu dieu gi: ten bai, tac gia, tu khoa..."
            value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} />
        </div>
        <button className="btn-search" onClick={handleSearch}>Tim kiem</button>
      </div>

      {/* Filter Chips */}
      {showFilters && (
        <div className="filter-row">
          <div className="filter-group">
            <span className="filter-label">BO LOC NANG CAO</span>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="">LOAI TAI LIEU</option>
              {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)}>
              <option value="">TRINH DO / CAP DO</option>
              {Object.entries(LEVEL_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <button className="btn-apply-filter" onClick={() => fetchDocs(1)}>Ap dung</button>
            {(typeFilter || levelFilter) && (
              <button className="btn-clear-filter" onClick={() => { setTypeFilter(''); setLevelFilter(''); fetchDocs(1); }}>Xoa bo loc</button>
            )}
          </div>
        </div>
      )}

      <div className="library-layout">
        <div className="docs-column">
          {loading ? (
            <div className="loading-state"><Loader2 size={32} className="spin" /><p>Dang tai...</p></div>
          ) : docs.length === 0 ? (
            <div className="empty-state">
              <BookOpen size={48} color="var(--on-surface-muted)" />
              <p>Chua co tai lieu nao trong thu vien.</p>
            </div>
          ) : (
            <>
              <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface-muted)', marginBottom: 4 }}>
                Hien thi {docs.length} / {meta.total} tai lieu (trang {meta.page}/{meta.totalPages})
              </p>
              {docs.map((doc) => (
                <article key={doc.id} className="doc-card surface-card" onClick={() => openDetail(doc.id)}>
                  <div className="doc-card-header">
                    {doc.level && (
                      <span className="level-badge" style={{ background: LEVEL_COLORS[doc.level] || '#3b82f6' }}>
                        {LEVEL_LABELS[doc.level] || doc.level}
                      </span>
                    )}
                    <span className="type-chip">{TYPE_LABELS[doc.type] || doc.type}</span>
                    <span className="meta-views"><Eye size={14} /> {doc.viewCount}</span>
                    <span className="meta-views"><Download size={14} /> {doc.downloadCount}</span>
                  </div>
                  <h3 className="doc-title">{doc.title}</h3>
                  {doc.abstract && <p className="doc-abstract">{doc.abstract.slice(0, 200)}...</p>}
                  <div className="doc-meta">
                    <span className="doc-author"><FileText size={14} /> {doc.user?.name || doc.authors}</span>
                    {doc.publication?.journalName && <span className="doc-journal">{doc.publication.journalName}</span>}
                  </div>
                  <div className="doc-footer">
                    <div className="doc-tags">
                      {doc.tags.slice(0, 4).map((t) => <span key={t} className="tag-chip">{t}</span>)}
                    </div>
                    {doc.aiScore != null && (
                      <div className="ai-score-badge"><Sparkles size={14} /><span>{doc.aiScore.toFixed(2)}</span></div>
                    )}
                  </div>
                </article>
              ))}

              {/* Pagination */}
              <div className="pagination">
                <button className="page-btn" disabled={meta.page <= 1} onClick={() => fetchDocs(meta.page - 1)}><ChevronLeft size={18} /></button>
                {Array.from({ length: Math.min(meta.totalPages, 7) }, (_, i) => {
                  const start = Math.max(1, meta.page - 3);
                  const p = start + i;
                  if (p > meta.totalPages) return null;
                  return <button key={p} className={`page-btn ${meta.page === p ? 'active' : ''}`} onClick={() => fetchDocs(p)}>{p}</button>;
                })}
                <button className="page-btn" disabled={meta.page >= meta.totalPages} onClick={() => fetchDocs(meta.page + 1)}><ChevronRight size={18} /></button>
              </div>
            </>
          )}
        </div>

        {/* Sidebar - Tags */}
        <aside className="sidebar-tags">
          <div className="surface-card tags-card">
            <h4><Tag size={16} /> Tu khoa pho bien</h4>
            <div className="popular-tags">
              {stats?.topTags?.slice(0, 15).map((t) => (
                <button key={t.name} className="tag-btn" onClick={() => { setSearch(t.name); fetchDocs(1); }}>
                  {t.name} <span className="tag-count">{t.count}</span>
                </button>
              ))}
              {(!stats?.topTags || stats.topTags.length === 0) && (
                <p style={{ color: 'var(--on-surface-muted)', fontSize: '0.875rem' }}>Chua co tags</p>
              )}
            </div>
          </div>

          {/* Quick stats */}
          <div className="surface-card" style={{ padding: '1.25rem' }}>
            <h4 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.75rem' }}>Thong ke thu vien</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                <span style={{ color: 'var(--on-surface-muted)' }}>Tong tai lieu</span>
                <strong>{stats?.total || 0}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                <span style={{ color: 'var(--on-surface-muted)' }}>The loai</span>
                <strong>{new Set(docs.map(d => d.type)).size}</strong>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* AI Chat Widget */}
      <div className={`chat-widget ${chatOpen ? 'open' : ''}`}>
        {chatOpen ? (
          <div className="chat-panel surface-card">
            <div className="chat-header">
              <Sparkles size={18} />
              <span>Tro ly AI Thu vien</span>
              <button className="chat-close" onClick={() => setChatOpen(false)}><X size={18} /></button>
            </div>
            <div className="chat-body" ref={chatBodyRef}>
              {chatHistory.map((msg, i) => (
                <div key={i} className={`chat-bubble ${msg.role}`}>{msg.text}</div>
              ))}
              {chatLoading && (
                <div className="chat-bubble bot">
                  <Loader2 size={14} className="spin" style={{ display: 'inline-block', marginRight: 6 }} />
                  Dang suy nghi...
                </div>
              )}
            </div>
            <div className="chat-input-row">
              <input
                placeholder="Hoi tro ly AI..."
                value={chatMsg}
                onChange={(e) => setChatMsg(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleChat()}
              />
              <button className="chat-send" onClick={handleChat} disabled={chatLoading}><Send size={18} /></button>
            </div>
          </div>
        ) : (
          <button className="chat-fab" onClick={() => setChatOpen(true)}>
            <MessageCircle size={24} />
          </button>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal-content surface-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Them tai lieu moi</h2>
              <button onClick={() => setShowCreate(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <div className="form-grid-modal">
              <div className="form-field-m"><label>Tieu de *</label><input value={createForm.title} onChange={e => setCreateForm({ ...createForm, title: e.target.value })} /></div>
              <div className="form-field-m"><label>Tac gia *</label><input value={createForm.authors} onChange={e => setCreateForm({ ...createForm, authors: e.target.value })} /></div>
              <div className="form-field-m"><label>Loai</label>
                <select value={createForm.type} onChange={e => setCreateForm({ ...createForm, type: e.target.value })}>
                  {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="form-field-m"><label>Cap do</label>
                <select value={createForm.level} onChange={e => setCreateForm({ ...createForm, level: e.target.value })}>
                  {Object.entries(LEVEL_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="form-field-m full"><label>Tom tat</label><textarea value={createForm.abstract} onChange={e => setCreateForm({ ...createForm, abstract: e.target.value })} rows={3} /></div>
              <div className="form-field-m"><label>Tu khoa (cach nhau boi dau phay)</label><input value={createForm.keywords} onChange={e => setCreateForm({ ...createForm, keywords: e.target.value })} placeholder="AI, NLP, OCR" /></div>
              <div className="form-field-m"><label>Tags (cach nhau boi dau phay)</label><input value={createForm.tags} onChange={e => setCreateForm({ ...createForm, tags: e.target.value })} placeholder="deep-learning, healthcare" /></div>
            </div>
            <div className="modal-actions">
              <button className="btn-sec" onClick={() => setShowCreate(false)}>Huy</button>
              <button className="btn-pri" onClick={handleCreate} disabled={submitting || !createForm.title || !createForm.authors}>
                {submitting ? <Loader2 size={16} className="spin" /> : <Plus size={16} />} Them tai lieu
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{libraryStyles}</style>
    </div>
  );
}

const libraryStyles = `
  .library-page { display: flex; flex-direction: column; gap: 2rem; padding-bottom: 3rem; }
  .breadcrumb { font-size: 0.8125rem; color: var(--on-surface-muted); margin-bottom: 0.5rem; }
  .page-header { display: flex; justify-content: space-between; align-items: flex-start; }
  .page-header h1 { font-size: 1.75rem; font-weight: 800; margin-bottom: 0.5rem; }
  .subtitle { color: var(--on-surface-muted); font-size: 0.9375rem; max-width: 600px; line-height: 1.6; }

  .btn-filter-toggle { background: white; border: none; padding: 0.75rem 1.25rem; border-radius: 12px; font-weight: 700; display: flex; align-items: center; gap: 0.5rem; cursor: pointer; color: var(--primary-indigo); font-size: 0.875rem; white-space: nowrap; }
  .btn-create-lib { background: var(--primary-indigo); color: white; border: none; padding: 0.75rem 1.25rem; border-radius: 12px; font-weight: 700; display: flex; align-items: center; gap: 0.5rem; cursor: pointer; font-size: 0.875rem; white-space: nowrap; }
  .btn-back { background: none; border: none; display: flex; align-items: center; gap: 6px; cursor: pointer; color: var(--on-surface-muted); font-weight: 700; font-size: 0.875rem; padding: 0; margin-bottom: -8px; }

  .search-bar-row { display: flex; gap: 1rem; }
  .search-input-wrap { flex: 1; background: white; border-radius: 14px; padding: 0 1.25rem; display: flex; align-items: center; gap: 0.75rem; }
  .search-input-wrap input { flex: 1; border: none; outline: none; padding: 1rem 0; font-size: 0.9375rem; background: transparent; }
  .btn-search { background: var(--signature-gradient, var(--primary-indigo)); color: white; border: none; padding: 1rem 2rem; border-radius: 14px; font-weight: 700; cursor: pointer; white-space: nowrap; }

  .filter-row { display: flex; gap: 1rem; flex-wrap: wrap; align-items: center; }
  .filter-group { display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap; }
  .filter-label { font-size: 0.75rem; font-weight: 800; color: var(--on-surface-muted); letter-spacing: 0.05em; }
  .filter-group select { background: white; border: none; padding: 0.625rem 1rem; border-radius: 10px; font-size: 0.8125rem; font-weight: 600; cursor: pointer; }
  .btn-apply-filter { background: var(--primary-indigo); color: white; border: none; padding: 0.625rem 1.25rem; border-radius: 10px; font-weight: 700; font-size: 0.8125rem; cursor: pointer; }
  .btn-clear-filter { background: none; border: 1.5px solid var(--surface-variant); padding: 0.5rem 1rem; border-radius: 10px; font-weight: 600; font-size: 0.75rem; cursor: pointer; color: var(--on-surface-muted); }

  .library-layout { display: grid; grid-template-columns: 1fr 280px; gap: 2rem; align-items: start; }
  .docs-column { display: flex; flex-direction: column; gap: 1rem; }
  .loading-state, .empty-state { text-align: center; padding: 4rem 2rem; color: var(--on-surface-muted); display: flex; flex-direction: column; align-items: center; gap: 1rem; }

  .doc-card { padding: 1.75rem; display: flex; flex-direction: column; gap: 0.75rem; transition: transform 0.2s; cursor: pointer; }
  .doc-card:hover { transform: translateY(-2px); }
  .doc-card-header { display: flex; align-items: center; gap: 0.75rem; }
  .level-badge { color: white; padding: 0.25rem 0.75rem; border-radius: 100px; font-size: 0.6875rem; font-weight: 800; }
  .type-chip { background: #f1f5f9; color: var(--on-surface-muted); padding: 0.25rem 0.75rem; border-radius: 100px; font-size: 0.6875rem; font-weight: 700; }
  .meta-views { margin-left: auto; display: flex; align-items: center; gap: 0.25rem; font-size: 0.75rem; color: var(--on-surface-muted); }
  .doc-title { font-size: 1.0625rem; font-weight: 700; line-height: 1.4; }
  .doc-abstract { font-size: 0.8125rem; color: var(--on-surface-muted); line-height: 1.6; }
  .doc-meta { display: flex; gap: 1.5rem; font-size: 0.8125rem; color: var(--on-surface-muted); }
  .doc-author { display: flex; align-items: center; gap: 0.375rem; font-weight: 600; }
  .doc-journal { font-style: italic; }
  .doc-footer { display: flex; justify-content: space-between; align-items: center; }
  .doc-tags { display: flex; gap: 0.5rem; flex-wrap: wrap; }
  .tag-chip { background: #eef2ff; color: var(--primary-indigo); padding: 0.375rem 0.875rem; border-radius: 100px; font-size: 0.7rem; font-weight: 700; }
  .tag-chip.alt { background: #f0fdf4; color: #059669; }
  .ai-score-badge { display: flex; align-items: center; gap: 0.375rem; background: #fef3c7; color: #b45309; padding: 0.375rem 0.875rem; border-radius: 12px; font-weight: 800; font-size: 0.875rem; }

  .pagination { display: flex; justify-content: center; gap: 0.5rem; margin-top: 0.5rem; }
  .page-btn { width: 36px; height: 36px; border: none; border-radius: 8px; background: white; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; color: var(--on-surface-muted); font-size: 0.8125rem; }
  .page-btn.active { background: var(--primary-indigo); color: white; }
  .page-btn:disabled { opacity: 0.4; cursor: not-allowed; }

  .tags-card { padding: 1.25rem; }
  .tags-card h4 { font-size: 0.875rem; font-weight: 700; margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.5rem; }
  .popular-tags { display: flex; flex-wrap: wrap; gap: 0.375rem; }
  .tag-btn { background: #f1f5f9; border: none; padding: 0.375rem 0.75rem; border-radius: 100px; font-size: 0.7rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 0.25rem; }
  .tag-btn:hover { background: #eef2ff; color: var(--primary-indigo); }
  .tag-count { font-size: 0.6rem; background: #e2e8f0; padding: 0.125rem 0.375rem; border-radius: 100px; }

  /* Detail */
  .detail-layout { display: grid; grid-template-columns: 1fr 300px; gap: 2rem; align-items: start; }
  .detail-main { padding: 2.5rem; }
  .detail-header { display: flex; gap: 8px; margin-bottom: 1rem; }
  .detail-title { font-size: 1.5rem; font-weight: 800; line-height: 1.3; margin-bottom: 1rem; color: var(--primary-indigo); }
  .detail-authors { display: flex; align-items: center; gap: 6px; font-size: 0.9375rem; font-weight: 600; margin-bottom: 0.5rem; }
  .detail-journal { display: flex; align-items: center; gap: 6px; font-size: 0.8125rem; color: var(--on-surface-muted); font-style: italic; margin-bottom: 1.5rem; }
  .detail-section { margin-bottom: 1.5rem; }
  .detail-section h3 { font-size: 0.875rem; font-weight: 700; margin-bottom: 0.625rem; text-transform: uppercase; letter-spacing: 0.03em; color: var(--on-surface-muted); }
  .detail-section p { font-size: 0.9375rem; line-height: 1.7; }
  .tags-wrap { display: flex; gap: 6px; flex-wrap: wrap; }
  .detail-sidebar { display: flex; flex-direction: column; gap: 1rem; }
  .detail-stats { display: flex; flex-direction: column; gap: 0.625rem; }
  .dstat-row { display: flex; align-items: center; gap: 6px; font-size: 0.8125rem; }
  .dstat-row span { flex: 1; color: var(--on-surface-muted); }
  .dstat-row strong { font-weight: 700; }
  .btn-cite { background: #eef2ff; color: var(--primary-indigo); border: none; padding: 0.625rem 1rem; border-radius: 8px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 0.8125rem; width: 100%; justify-content: center; }

  /* Chat */
  .chat-widget { position: fixed; bottom: 2rem; right: 2rem; z-index: 200; }
  .chat-fab { width: 56px; height: 56px; border-radius: 50%; background: var(--primary-indigo); color: white; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 24px rgba(79,70,229,0.4); }
  .chat-panel { width: 380px; height: 480px; border-radius: 20px; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.15); }
  .chat-header { background: var(--primary-indigo); color: white; padding: 1rem 1.25rem; display: flex; align-items: center; gap: 0.625rem; font-weight: 700; }
  .chat-close { background: none; border: none; color: white; cursor: pointer; margin-left: auto; }
  .chat-body { flex: 1; padding: 1.25rem; overflow-y: auto; display: flex; flex-direction: column; gap: 0.75rem; }
  .chat-bubble { padding: 0.75rem 1rem; border-radius: 14px; font-size: 0.8125rem; line-height: 1.5; max-width: 85%; white-space: pre-wrap; }
  .chat-bubble.bot { background: #f1f5f9; color: var(--on-surface); align-self: flex-start; }
  .chat-bubble.user { background: var(--primary-indigo); color: white; align-self: flex-end; }
  .chat-input-row { display: flex; gap: 0.5rem; padding: 0.75rem; background: #f8f9ff; }
  .chat-input-row input { flex: 1; border: none; outline: none; padding: 0.625rem 0.875rem; border-radius: 10px; font-size: 0.8125rem; background: white; }
  .chat-send { background: var(--primary-indigo); color: white; border: none; padding: 0.625rem; border-radius: 10px; cursor: pointer; }
  .chat-send:disabled { opacity: 0.5; }

  /* Modal */
  .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
  .modal-content { width: 560px; max-height: 80vh; overflow-y: auto; padding: 2rem; border-radius: 20px; }
  .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
  .modal-header h2 { font-size: 1.25rem; font-weight: 800; }
  .form-grid-modal { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
  .form-field-m { display: flex; flex-direction: column; gap: 0.375rem; }
  .form-field-m.full { grid-column: 1 / -1; }
  .form-field-m label { font-size: 0.75rem; font-weight: 700; color: var(--on-surface-muted); }
  .form-field-m input, .form-field-m textarea, .form-field-m select { padding: 0.625rem; border: 1.5px solid var(--surface-variant); border-radius: 8px; font-size: 0.875rem; font-family: inherit; outline: none; }
  .form-field-m input:focus, .form-field-m textarea:focus { border-color: var(--primary-indigo); }
  .modal-actions { display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.5rem; }
  .btn-sec { background: white; border: 1.5px solid var(--surface-variant); padding: 0.625rem 1.25rem; border-radius: 10px; font-weight: 700; cursor: pointer; }
  .btn-pri { background: var(--primary-indigo); color: white; border: none; padding: 0.625rem 1.5rem; border-radius: 10px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; }
  .btn-pri:disabled { opacity: 0.5; cursor: not-allowed; }

  .spin { animation: spin 1s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  @media (max-width: 1024px) {
    .library-layout { grid-template-columns: 1fr; }
    .sidebar-tags { display: none; }
    .detail-layout { grid-template-columns: 1fr; }
  }
`;
