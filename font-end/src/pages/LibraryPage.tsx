import { useState, useEffect, useRef } from 'react';
import {
  Search, Filter, FileText, BookOpen, Eye, Download, ChevronLeft, ChevronRight,
  Sparkles, MessageCircle, Send, X, Tag, Plus, ArrowLeft, Calendar, User,
  Loader2, ExternalLink, Copy, Check, Library, Layers,
} from 'lucide-react';
import { Modal } from '../components/common/Modal';
import { libraryService } from '../services/libraryService';
import { aiService } from '../services/aiService';
import { useAuth } from '../contexts/AuthContext';
import { Role } from '../types';

interface LibDoc {
  id: number; title: string; authors: string; abstract?: string;
  keywords: string[]; tags: string[]; category?: string; type: string; level?: string;
  aiScore?: number; viewCount: number; downloadCount: number;
  createdAt: string; updatedAt?: string;
  user?: { id: number; name: string };
  publication?: { journalName?: string; conferenceName?: string; doi?: string; publishedDate?: string; issn?: string; file?: { path?: string; originalName?: string } };
  work?: { id: number; title: string };
}

const TYPE_LABELS: Record<string, string> = { JOURNAL_ARTICLE: 'Bài báo', CONFERENCE_PAPER: 'Hội nghị', RESEARCH_PROJECT: 'Đề tài NC', PATENT: 'Bằng sáng chế', TEXTBOOK: 'Giáo trình', THESIS: 'Luận văn' };
const LEVEL_LABELS: Record<string, string> = { UNIVERSITY: 'Cấp Trường', MINISTRY: 'Cấp Bộ', STATE: 'Cấp Nhà nước' };
const LEVEL_COLORS: Record<string, string> = { UNIVERSITY: '#3b82f6', MINISTRY: '#8b5cf6', STATE: '#dc2626' };

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
  const [stats, setStats] = useState<any>(null);

  const [detail, setDetail] = useState<LibDoc | null>(null);
  const [copied, setCopied] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [chatOpen, setChatOpen] = useState(false);
  const [chatMsg, setChatMsg] = useState('');
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'bot'; text: string }[]>([
    { role: 'bot', text: 'Xin chào! Tôi có thể giúp bạn tìm kiếm tài liệu, gợi ý bài báo liên quan, hoặc trích dẫn tự động.' },
  ]);
  const [chatLoading, setChatLoading] = useState(false);
  const chatBodyRef = useRef<HTMLDivElement>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ title: '', authors: '', abstract: '', keywords: '', tags: '', type: 'JOURNAL_ARTICLE', level: 'UNIVERSITY' });
  const [submitting, setSubmitting] = useState(false);

  const fetchDocs = async (page = 1) => {
    setLoading(true);
    try {
      const res = await libraryService.findAll({ page, limit: 10, search: search || undefined, type: typeFilter || undefined, level: levelFilter || undefined });
      setDocs(res.data); setMeta(res.meta);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { fetchDocs(); libraryService.getStats().then(setStats).catch(() => {}); }, []);

  const openDetail = async (id: number) => {
    try {
      const doc = await libraryService.findOne(id);
      setDetail(doc);
      setPreviewUrl(null);
      // Try to load PDF preview
      const filePath = doc.publication?.file?.path;
      if (filePath) {
        const objName = filePath.replace('minio://', '');
        try { setPreviewUrl(await aiService.getFileUrl(objName)); } catch { /* no file */ }
      }
    } catch { /* ignore */ }
  };

  const handleDownload = async (doc: LibDoc) => {
    const filePath = doc.publication?.file?.path;
    if (!filePath) { alert('Tài liệu này chưa có file đính kèm'); return; }
    try {
      const url = await aiService.getFileUrl(filePath.replace('minio://', ''));
      window.open(url, '_blank');
    } catch { alert('Không thể tải file'); }
  };

  const handleCopyBib = (doc: LibDoc) => {
    const year = doc.publication?.publishedDate ? new Date(doc.publication.publishedDate).getFullYear() : new Date(doc.createdAt).getFullYear();
    const bib = `@article{lib${doc.id},\n  title = {${doc.title}},\n  author = {${doc.authors}},\n  year = {${year}},${doc.publication?.journalName ? `\n  journal = {${doc.publication.journalName}},` : ''}${doc.publication?.doi ? `\n  doi = {${doc.publication.doi}},` : ''}\n}`;
    navigator.clipboard.writeText(bib);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const handleChat = async () => {
    if (!chatMsg.trim() || chatLoading) return;
    const msg = chatMsg.trim(); setChatMsg('');
    setChatHistory(prev => [...prev, { role: 'user', text: msg }]);
    setChatLoading(true);
    try {
      const res = await libraryService.chat(msg);
      setChatHistory(prev => [...prev, { role: 'bot', text: res.reply || 'Không có phản hồi.' }]);
    } catch { setChatHistory(prev => [...prev, { role: 'bot', text: 'Dịch vụ AI chưa sẵn sàng.' }]); }
    setChatLoading(false);
    setTimeout(() => chatBodyRef.current?.scrollTo({ top: 99999, behavior: 'smooth' }), 100);
  };

  const handleCreate = async () => {
    setSubmitting(true);
    try {
      await libraryService.create({
        title: createForm.title, authors: createForm.authors, abstract: createForm.abstract || undefined,
        keywords: createForm.keywords ? createForm.keywords.split(',').map(k => k.trim()) : [],
        tags: createForm.tags ? createForm.tags.split(',').map(t => t.trim()) : [],
        type: createForm.type, level: createForm.level || undefined,
      });
      setShowCreate(false);
      setCreateForm({ title: '', authors: '', abstract: '', keywords: '', tags: '', type: 'JOURNAL_ARTICLE', level: 'UNIVERSITY' });
      fetchDocs();
    } catch (err: any) { alert(err.response?.data?.message || 'Tạo tài liệu thất bại'); }
    setSubmitting(false);
  };

  const totalViews = docs.reduce((s, d) => s + d.viewCount, 0);
  const totalDownloads = docs.reduce((s, d) => s + d.downloadCount, 0);
  const hasFilters = typeFilter || levelFilter;

  // ─── DETAIL VIEW ───
  if (detail) {
    return (
      <div className="lib">
        <button className="lib-back" onClick={() => setDetail(null)}><ArrowLeft size={16} /> Quay lại thư viện</button>

        <div className="lib-detail-grid">
          <article className="surface-card lib-detail-main">
            <div className="lib-detail-badges">
              {detail.level && <span className="lib-level" style={{ background: LEVEL_COLORS[detail.level] || '#3b82f6' }}>{LEVEL_LABELS[detail.level]}</span>}
              <span className="lib-type-chip">{TYPE_LABELS[detail.type] || detail.type}</span>
            </div>
            <h1 className="lib-detail-title">{detail.title}</h1>
            <p className="lib-detail-authors"><User size={14} /> {detail.user?.name || detail.authors}</p>
            {detail.publication?.journalName && (
              <p className="lib-detail-journal"><BookOpen size={14} /> {detail.publication.journalName}
                {detail.publication.publishedDate && ` — ${new Date(detail.publication.publishedDate).toLocaleDateString('vi-VN')}`}
              </p>
            )}
            {detail.abstract && <div className="lib-section"><h3>Tóm tắt</h3><p>{detail.abstract}</p></div>}
            {detail.keywords.length > 0 && <div className="lib-section"><h3>Từ khóa</h3><div className="lib-chips">{detail.keywords.map(k => <span key={k} className="lib-chip">{k}</span>)}</div></div>}
            {detail.tags.length > 0 && <div className="lib-section"><h3>Tags</h3><div className="lib-chips">{detail.tags.map(t => <span key={t} className="lib-chip alt">{t}</span>)}</div></div>}

            {/* PDF Preview */}
            {previewUrl && (
              <div className="lib-section">
                <h3>Xem trước tài liệu</h3>
                <div className="lib-pdf-frame">
                  <iframe src={previewUrl} title="PDF Preview" />
                </div>
              </div>
            )}
          </article>

          <aside className="lib-detail-side">
            <div className="surface-card lib-side-card">
              <h4>Thông tin</h4>
              <div className="lib-side-rows">
                <div className="lib-srow"><Eye size={14} /><span>Lượt xem</span><strong>{detail.viewCount}</strong></div>
                <div className="lib-srow"><Download size={14} /><span>Lượt tải</span><strong>{detail.downloadCount}</strong></div>
                <div className="lib-srow"><Calendar size={14} /><span>Ngày tạo</span><strong>{new Date(detail.createdAt).toLocaleDateString('vi-VN')}</strong></div>
                {detail.aiScore != null && <div className="lib-srow"><Sparkles size={14} /><span>AI Score</span><strong>{detail.aiScore.toFixed(1)}</strong></div>}
              </div>
            </div>

            {detail.publication?.doi && (
              <div className="surface-card lib-side-card">
                <h4>DOI</h4>
                <a href={`https://doi.org/${detail.publication.doi}`} target="_blank" rel="noreferrer" className="lib-doi-link">
                  {detail.publication.doi} <ExternalLink size={11} />
                </a>
              </div>
            )}

            {detail.publication?.issn && (
              <div className="surface-card lib-side-card">
                <h4>ISSN</h4>
                <p className="lib-side-val">{detail.publication.issn}</p>
              </div>
            )}

            <div className="surface-card lib-side-card">
              <h4>Trích dẫn & Tải về</h4>
              <button className="lib-action-btn" onClick={() => handleCopyBib(detail)}>
                {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Đã copy BibTeX!' : 'Copy BibTeX'}
              </button>
              <button className="lib-action-btn download" onClick={() => handleDownload(detail)}>
                <Download size={14} /> Tải tài liệu gốc
              </button>
            </div>
          </aside>
        </div>

        <style>{libStyles}</style>
      </div>
    );
  }

  // ─── LIST VIEW ───
  return (
    <div className="lib">
      {/* Hero */}
      <section className="lib-hero">
        <div className="lib-hero-content">
          <div className="lib-hero-text">
            <h1>Thư viện số Thông minh</h1>
            <p>Truy cập hơn {stats?.total || 0} tài liệu nghiên cứu. Tìm kiếm, trích dẫn, tải về và phân tích bằng AI.</p>
          </div>
          <div className="lib-hero-stats">
            <div className="lib-hstat"><Library size={16} /><span>{stats?.total || 0}</span><small>Tài liệu</small></div>
            <div className="lib-hstat"><Eye size={16} /><span>{totalViews}</span><small>Lượt xem</small></div>
            <div className="lib-hstat"><Download size={16} /><span>{totalDownloads}</span><small>Lượt tải</small></div>
            <div className="lib-hstat"><Layers size={16} /><span>{Object.keys(TYPE_LABELS).length}</span><small>Loại</small></div>
          </div>
        </div>
        <div className="lib-hero-search">
          <Search size={20} />
          <input placeholder="Tìm theo tên bài, tác giả, từ khóa..." value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchDocs(1)} />
          <button onClick={() => fetchDocs(1)}>Tìm kiếm</button>
        </div>
      </section>

      {/* Toolbar */}
      <div className="lib-toolbar">
        <button className={`lib-filter-btn ${showFilters ? 'active' : ''}`} onClick={() => setShowFilters(!showFilters)}>
          <Filter size={15} /> Bộ lọc {hasFilters && <span className="lib-badge" />}
        </button>
        {isLecturerOrAdmin && <button className="lib-add-btn" onClick={() => setShowCreate(true)}><Plus size={15} /> Thêm tài liệu</button>}
        <span className="lib-result-info">{meta.total} tài liệu</span>
      </div>

      {showFilters && (
        <div className="lib-filters">
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="">Loại tài liệu</option>
            {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={levelFilter} onChange={e => setLevelFilter(e.target.value)}>
            <option value="">Cấp độ</option>
            {Object.entries(LEVEL_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <button className="lib-apply" onClick={() => fetchDocs(1)}>Áp dụng</button>
          {hasFilters && <button className="lib-clear" onClick={() => { setTypeFilter(''); setLevelFilter(''); fetchDocs(1); }}><X size={12} /> Xóa</button>}
        </div>
      )}

      <div className="lib-layout">
        {/* Documents */}
        <div className="lib-docs">
          {loading ? (
            <div className="lib-loading"><Loader2 size={32} className="lib-spin" color="var(--primary-indigo)" /></div>
          ) : docs.length === 0 ? (
            <div className="lib-empty surface-card"><BookOpen size={48} style={{ opacity: .3 }} /><p>Chưa có tài liệu nào trong thư viện.</p></div>
          ) : (
            <>
              {docs.map(doc => (
                <article key={doc.id} className="surface-card lib-card" onClick={() => openDetail(doc.id)}>
                  <div className="lib-card-top">
                    {doc.level && <span className="lib-level" style={{ background: LEVEL_COLORS[doc.level] || '#3b82f6' }}>{LEVEL_LABELS[doc.level]}</span>}
                    <span className="lib-type-chip">{TYPE_LABELS[doc.type] || doc.type}</span>
                    <div className="lib-card-stats">
                      <span><Eye size={12} /> {doc.viewCount}</span>
                      <span><Download size={12} /> {doc.downloadCount}</span>
                    </div>
                  </div>
                  <h3 className="lib-card-title">{doc.title}</h3>
                  {doc.abstract && <p className="lib-card-abs">{doc.abstract.slice(0, 150)}...</p>}
                  <div className="lib-card-meta">
                    <span className="lib-card-author"><FileText size={13} /> {doc.user?.name || doc.authors}</span>
                    {doc.publication?.journalName && <span className="lib-card-journal">{doc.publication.journalName}</span>}
                  </div>
                  <div className="lib-card-bottom">
                    <div className="lib-card-tags">
                      {doc.tags.slice(0, 3).map(t => <span key={t} className="lib-tag">{t}</span>)}
                      {doc.tags.length > 3 && <span className="lib-tag more">+{doc.tags.length - 3}</span>}
                    </div>
                    {doc.aiScore != null && <div className="lib-ai-badge"><Sparkles size={12} /> {doc.aiScore.toFixed(1)}</div>}
                    <button className="lib-dl-btn" onClick={e => { e.stopPropagation(); handleDownload(doc); }} title="Tải về"><Download size={14} /></button>
                  </div>
                </article>
              ))}

              {meta.totalPages > 1 && (
                <div className="lib-pag">
                  <button className="lib-pg" disabled={meta.page <= 1} onClick={() => fetchDocs(meta.page - 1)}><ChevronLeft size={16} /></button>
                  {Array.from({ length: Math.min(meta.totalPages, 7) }, (_, i) => {
                    const s = Math.max(1, meta.page - 3); const p = s + i;
                    if (p > meta.totalPages) return null;
                    return <button key={p} className={`lib-pg ${meta.page === p ? 'active' : ''}`} onClick={() => fetchDocs(p)}>{p}</button>;
                  })}
                  <button className="lib-pg" disabled={meta.page >= meta.totalPages} onClick={() => fetchDocs(meta.page + 1)}><ChevronRight size={16} /></button>
                  <span className="lib-pg-info">{meta.total} kết quả</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Sidebar */}
        <aside className="lib-sidebar">
          <div className="surface-card lib-side-card">
            <h4><Tag size={15} /> Từ khóa phổ biến</h4>
            <div className="lib-pop-tags">
              {stats?.topTags?.slice(0, 15).map((t: any) => (
                <button key={t.name} className="lib-pop-tag" onClick={() => { setSearch(t.name); fetchDocs(1); }}>
                  {t.name} <span>{t.count}</span>
                </button>
              ))}
              {(!stats?.topTags || stats.topTags.length === 0) && <p className="lib-muted">Chưa có tags</p>}
            </div>
          </div>
          <div className="surface-card lib-side-card">
            <h4>Thống kê thư viện</h4>
            <div className="lib-side-rows">
              <div className="lib-srow"><Library size={13} /><span>Tổng tài liệu</span><strong>{stats?.total || 0}</strong></div>
              <div className="lib-srow"><Layers size={13} /><span>Số loại</span><strong>{stats?.byType?.length || 0}</strong></div>
            </div>
          </div>
        </aside>
      </div>

      {/* AI Chat Widget */}
      {chatOpen ? (
        <div className="lib-chat-panel surface-card">
          <div className="lib-chat-head">
            <Sparkles size={16} /> Trợ lý AI Thư viện
            <button onClick={() => setChatOpen(false)}><X size={16} /></button>
          </div>
          <div className="lib-chat-body" ref={chatBodyRef}>
            {chatHistory.map((m, i) => <div key={i} className={`lib-chat-msg ${m.role}`}><div className="lib-chat-bubble">{m.text}</div></div>)}
            {chatLoading && <div className="lib-chat-msg bot"><div className="lib-chat-bubble"><Loader2 size={14} className="lib-spin" style={{ display: 'inline-block', marginRight: 6 }} />Đang suy nghĩ...</div></div>}
          </div>
          <div className="lib-chat-input">
            <input value={chatMsg} onChange={e => setChatMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleChat()} placeholder="Hỏi trợ lý AI..." />
            <button onClick={handleChat} disabled={chatLoading}><Send size={16} /></button>
          </div>
        </div>
      ) : (
        <button className="lib-chat-fab" onClick={() => setChatOpen(true)}><MessageCircle size={22} /></button>
      )}

      {/* Create Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Thêm tài liệu mới" subtitle="Bổ sung tài liệu vào thư viện số" width={660}
        footer={<>
          <button className="g-btn secondary" onClick={() => setShowCreate(false)}>Hủy</button>
          <button className="g-btn primary" onClick={handleCreate} disabled={submitting || !createForm.title || !createForm.authors}>
            {submitting ? <Loader2 size={14} className="lib-spin" /> : <Plus size={14} />} Thêm tài liệu
          </button>
        </>}>
        <div className="g-form-grid">
          <div className="g-field full"><label>Tiêu đề *</label><input value={createForm.title} onChange={e => setCreateForm({ ...createForm, title: e.target.value })} placeholder="Tên tài liệu / bài báo" /></div>
          <div className="g-field"><label>Tác giả *</label><input value={createForm.authors} onChange={e => setCreateForm({ ...createForm, authors: e.target.value })} /></div>
          <div className="g-field"><label>Loại</label>
            <select value={createForm.type} onChange={e => setCreateForm({ ...createForm, type: e.target.value })}>
              {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="g-field"><label>Cấp độ</label>
            <select value={createForm.level} onChange={e => setCreateForm({ ...createForm, level: e.target.value })}>
              {Object.entries(LEVEL_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="g-field"><label>Từ khóa (phẩy)</label><input value={createForm.keywords} onChange={e => setCreateForm({ ...createForm, keywords: e.target.value })} placeholder="AI, NLP, OCR" /></div>
          <div className="g-field full"><label>Tóm tắt</label><textarea value={createForm.abstract} onChange={e => setCreateForm({ ...createForm, abstract: e.target.value })} rows={3} /></div>
          <div className="g-field full"><label>Tags (phẩy)</label><input value={createForm.tags} onChange={e => setCreateForm({ ...createForm, tags: e.target.value })} placeholder="deep-learning, healthcare" /></div>
        </div>
      </Modal>

      <style>{libStyles}</style>
    </div>
  );
}

const libStyles = `
  .lib{display:flex;flex-direction:column;gap:1.25rem;padding-bottom:3rem}
  .lib-back{background:none;border:none;display:flex;align-items:center;gap:6px;cursor:pointer;color:var(--on-surface-muted);font-weight:700;font-size:.85rem;padding:0}

  .lib-hero{background:linear-gradient(135deg,#1e1b4b 0%,#312e81 40%,#4338ca 100%);border-radius:20px;padding:2.5rem;color:#fff}
  .lib-hero-content{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:1.5rem}
  .lib-hero-text h1{font-size:1.75rem;font-weight:800;color:#fff;margin-bottom:.375rem}
  .lib-hero-text p{font-size:.9rem;opacity:.85;max-width:480px;line-height:1.5}
  .lib-hero-stats{display:flex;gap:1.25rem}
  .lib-hstat{display:flex;flex-direction:column;align-items:center;gap:2px;background:rgba(255,255,255,.1);border-radius:12px;padding:.75rem 1rem;min-width:70px}
  .lib-hstat span{font-size:1.25rem;font-weight:800}
  .lib-hstat small{font-size:.6rem;opacity:.7;font-weight:600}
  .lib-hero-search{display:flex;gap:.5rem;background:rgba(255,255,255,.15);border-radius:14px;padding:4px;backdrop-filter:blur(8px)}
  .lib-hero-search input{flex:1;border:none;outline:none;padding:.75rem 1rem;font-size:.9rem;background:transparent;color:#fff}
  .lib-hero-search input::placeholder{color:rgba(255,255,255,.6)}
  .lib-hero-search button{background:#fff;color:#1e1b4b;border:none;padding:.75rem 1.5rem;border-radius:10px;font-weight:700;cursor:pointer;font-size:.85rem}
  .lib-hero-search svg{color:rgba(255,255,255,.6);margin:auto .5rem}

  .lib-toolbar{display:flex;align-items:center;gap:.625rem}
  .lib-filter-btn{display:flex;align-items:center;gap:5px;padding:8px 14px;border-radius:8px;border:1.5px solid var(--surface-variant);background:var(--surface-lowest);cursor:pointer;font-weight:700;font-size:.8rem;color:var(--on-surface-muted);position:relative}
  .lib-filter-btn.active{border-color:var(--primary-indigo);color:var(--primary-indigo)}
  .lib-badge{position:absolute;top:-2px;right:-2px;width:7px;height:7px;border-radius:50%;background:#ef4444}
  .lib-add-btn{background:var(--signature-gradient);color:#fff;border:none;padding:8px 16px;border-radius:8px;font-weight:700;font-size:.8rem;cursor:pointer;display:flex;align-items:center;gap:5px}
  .lib-result-info{margin-left:auto;font-size:.75rem;color:var(--on-surface-muted)}

  .lib-filters{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
  .lib-filters select{padding:7px 12px;border:1.5px solid var(--surface-variant);border-radius:8px;font-size:.8rem;font-weight:600;background:var(--surface-lowest);cursor:pointer}
  .lib-apply{background:var(--primary-indigo);color:#fff;border:none;padding:7px 14px;border-radius:8px;font-weight:700;font-size:.8rem;cursor:pointer}
  .lib-clear{display:flex;align-items:center;gap:3px;padding:5px 10px;border:none;background:#fee2e2;color:#dc2626;border-radius:6px;font-weight:700;font-size:.7rem;cursor:pointer}

  .lib-layout{display:grid;grid-template-columns:1fr 260px;gap:1.5rem;align-items:start}
  .lib-docs{display:flex;flex-direction:column;gap:.875rem}
  .lib-loading{display:flex;justify-content:center;padding:4rem}
  .lib-empty{display:flex;flex-direction:column;align-items:center;gap:1rem;padding:4rem!important;text-align:center;color:var(--on-surface-muted)}

  .lib-card{padding:1.5rem!important;display:flex;flex-direction:column;gap:.625rem;cursor:pointer;transition:all .15s}
  .lib-card:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,.07)}
  .lib-card-top{display:flex;align-items:center;gap:.5rem}
  .lib-level{color:#fff;padding:2px 8px;border-radius:100px;font-size:.6rem;font-weight:800}
  .lib-type-chip{background:var(--surface-low);color:var(--on-surface-muted);padding:2px 8px;border-radius:100px;font-size:.6rem;font-weight:700}
  .lib-card-stats{margin-left:auto;display:flex;gap:10px;font-size:.7rem;color:var(--on-surface-muted)}
  .lib-card-stats span{display:flex;align-items:center;gap:3px}
  .lib-card-title{font-size:1rem;font-weight:700;line-height:1.4}
  .lib-card-abs{font-size:.8rem;color:var(--on-surface-muted);line-height:1.5}
  .lib-card-meta{display:flex;gap:1rem;font-size:.8rem;color:var(--on-surface-muted)}
  .lib-card-author{display:flex;align-items:center;gap:4px;font-weight:600}
  .lib-card-journal{font-style:italic}
  .lib-card-bottom{display:flex;align-items:center;gap:.5rem;margin-top:auto}
  .lib-card-tags{display:flex;gap:4px;flex:1;flex-wrap:wrap}
  .lib-tag{background:#eef2ff;color:var(--primary-indigo);padding:2px 8px;border-radius:100px;font-size:.65rem;font-weight:700}
  .lib-tag.more{background:var(--surface-low);color:var(--on-surface-muted)}
  .lib-ai-badge{display:flex;align-items:center;gap:3px;background:#fef3c7;color:#b45309;padding:3px 8px;border-radius:6px;font-weight:800;font-size:.75rem}
  .lib-dl-btn{width:30px;height:30px;border:none;border-radius:8px;background:var(--surface-low);color:var(--on-surface-muted);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s}
  .lib-dl-btn:hover{background:#eef2ff;color:var(--primary-indigo)}

  .lib-pag{display:flex;justify-content:center;gap:4px;align-items:center;margin-top:.5rem}
  .lib-pg{width:34px;height:34px;border:none;border-radius:8px;background:#fff;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--on-surface-muted);font-size:.8rem}
  .lib-pg.active{background:var(--primary-indigo);color:#fff}
  .lib-pg:disabled{opacity:.3;cursor:not-allowed}
  .lib-pg-info{font-size:.75rem;color:var(--on-surface-muted);margin-left:12px}

  .lib-sidebar{display:flex;flex-direction:column;gap:1rem}
  .lib-side-card{padding:1.25rem!important}
  .lib-side-card h4{font-size:.85rem;font-weight:700;margin-bottom:.75rem;display:flex;align-items:center;gap:6px}
  .lib-pop-tags{display:flex;flex-wrap:wrap;gap:4px}
  .lib-pop-tag{background:var(--surface-low);border:none;padding:4px 8px;border-radius:100px;font-size:.65rem;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:3px;transition:all .15s}
  .lib-pop-tag:hover{background:#eef2ff;color:var(--primary-indigo)}
  .lib-pop-tag span{font-size:.6rem;background:var(--surface-variant);padding:1px 4px;border-radius:100px}
  .lib-side-rows{display:flex;flex-direction:column;gap:.5rem}
  .lib-srow{display:flex;align-items:center;gap:6px;font-size:.8rem}
  .lib-srow span{flex:1;color:var(--on-surface-muted)}
  .lib-srow strong{font-weight:700}
  .lib-side-val{font-size:.85rem;font-weight:600}
  .lib-muted{font-size:.8rem;color:var(--on-surface-muted)}

  /* Detail */
  .lib-detail-grid{display:grid;grid-template-columns:1fr 300px;gap:1.5rem;align-items:start}
  .lib-detail-main{padding:2rem!important}
  .lib-detail-badges{display:flex;gap:6px;margin-bottom:.75rem}
  .lib-detail-title{font-size:1.375rem;font-weight:800;line-height:1.3;color:var(--primary-indigo);margin-bottom:.5rem}
  .lib-detail-authors{display:flex;align-items:center;gap:6px;font-size:.9rem;font-weight:600;margin-bottom:.25rem}
  .lib-detail-journal{display:flex;align-items:center;gap:6px;font-size:.8rem;color:var(--on-surface-muted);font-style:italic;margin-bottom:1.25rem}
  .lib-section{margin-bottom:1.25rem}
  .lib-section h3{font-size:.75rem;font-weight:700;color:var(--on-surface-muted);text-transform:uppercase;letter-spacing:.03em;margin-bottom:.5rem}
  .lib-section p{font-size:.875rem;line-height:1.7}
  .lib-chips{display:flex;gap:5px;flex-wrap:wrap}
  .lib-chip{background:#eef2ff;color:var(--primary-indigo);padding:3px 10px;border-radius:100px;font-size:.7rem;font-weight:700}
  .lib-chip.alt{background:#f0fdf4;color:#059669}
  .lib-pdf-frame{border:1px solid var(--surface-variant);border-radius:12px;overflow:hidden;height:500px}
  .lib-pdf-frame iframe{width:100%;height:100%;border:none}

  .lib-detail-side{display:flex;flex-direction:column;gap:.875rem}
  .lib-doi-link{font-size:.8rem;color:var(--primary-indigo);display:flex;align-items:center;gap:4px;word-break:break-all}
  .lib-action-btn{width:100%;padding:10px;border-radius:8px;font-weight:700;font-size:.8rem;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;margin-bottom:.5rem;background:var(--surface-low);border:none;color:var(--on-surface);transition:all .15s}
  .lib-action-btn:hover{background:#eef2ff;color:var(--primary-indigo)}
  .lib-action-btn.download{background:var(--signature-gradient);color:#fff}

  /* Chat */
  .lib-chat-fab{position:fixed;bottom:2rem;right:2rem;z-index:200;width:52px;height:52px;border-radius:50%;background:var(--primary-indigo);color:#fff;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 24px rgba(79,70,229,.4)}
  .lib-chat-panel{position:fixed;bottom:2rem;right:2rem;z-index:200;width:360px;height:460px;border-radius:16px;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.15)}
  .lib-chat-head{background:var(--primary-indigo);color:#fff;padding:.875rem 1rem;display:flex;align-items:center;gap:.5rem;font-weight:700;font-size:.85rem}
  .lib-chat-head button{background:none;border:none;color:#fff;cursor:pointer;margin-left:auto}
  .lib-chat-body{flex:1;padding:1rem;overflow-y:auto;display:flex;flex-direction:column;gap:.625rem}
  .lib-chat-msg{display:flex}
  .lib-chat-msg.user{justify-content:flex-end}
  .lib-chat-bubble{padding:.625rem .875rem;border-radius:12px;font-size:.8rem;line-height:1.5;max-width:80%;white-space:pre-wrap}
  .lib-chat-msg.bot .lib-chat-bubble{background:var(--surface-low)}
  .lib-chat-msg.user .lib-chat-bubble{background:var(--primary-indigo);color:#fff}
  .lib-chat-input{display:flex;gap:.375rem;padding:.75rem;border-top:1px solid var(--surface-variant)}
  .lib-chat-input input{flex:1;border:1.5px solid var(--surface-variant);outline:none;padding:.5rem .75rem;border-radius:8px;font-size:.8rem;background:var(--surface-lowest)}
  .lib-chat-input input:focus{border-color:var(--primary-indigo)}
  .lib-chat-input button{background:var(--primary-indigo);color:#fff;border:none;padding:.5rem .75rem;border-radius:8px;cursor:pointer}
  .lib-chat-input button:disabled{opacity:.4}

  .lib-spin{animation:lib-spin 1s linear infinite}
  @keyframes lib-spin{to{transform:rotate(360deg)}}

  @media(max-width:1024px){.lib-layout{grid-template-columns:1fr}.lib-sidebar{display:none}.lib-detail-grid{grid-template-columns:1fr}.lib-hero-content{flex-direction:column;gap:1rem}.lib-hero-stats{flex-wrap:wrap}}
`;
