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
  Library,
  BarChart3,
  Layers,
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
  JOURNAL_ARTICLE: 'Bài báo',
  CONFERENCE_PAPER: 'Hội nghị',
  RESEARCH_PROJECT: 'Đề tài NC',
  PATENT: 'Bằng sáng chế',
  TEXTBOOK: 'Giáo trình',
  THESIS: 'Luận văn',
};

const LEVEL_LABELS: Record<string, string> = {
  UNIVERSITY: 'Cấp Trường',
  MINISTRY: 'Cấp Bộ',
  STATE: 'Cấp Nhà nước',
};

const LEVEL_COLORS: Record<string, string> = {
  UNIVERSITY: '#3b82f6',
  MINISTRY: '#8b5cf6',
  STATE: '#dc2626',
};

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
    { role: 'bot', text: 'Xin chào! Tôi có thể giúp bạn tìm kiếm tài liệu, gợi ý bài báo liên quan, hoặc trích dẫn tự động.' },
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
      const res = await libraryService.findAll({
        page,
        limit: 10,
        search: search || undefined,
        type: typeFilter || undefined,
        level: levelFilter || undefined,
      });
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
      setChatHistory(prev => [...prev, { role: 'bot', text: res.reply || 'Xin lỗi, tôi chưa thể trả lời câu hỏi này.' }]);
    } catch {
      setChatHistory(prev => [...prev, { role: 'bot', text: 'Xin lỗi, dịch vụ AI đang không khả dụng. Vui lòng thử lại sau.' }]);
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
      alert(err.response?.data?.message || 'Tạo tài liệu thất bại');
    }
    setSubmitting(false);
  };

  const uniqueTypes = new Set(docs.map(d => d.type)).size;

  /* ──────────── DETAIL VIEW ──────────── */
  if (detail) {
    return (
      <div className="lib-page">
        <button className="lib-btn-back" onClick={() => setDetail(null)}>
          <ArrowLeft size={16} /> Quay lại thư viện
        </button>

        <div className="lib-detail-layout">
          <article className="lib-surface lib-detail-main">
            <div className="lib-detail-badges">
              {detail.level && (
                <span className="lib-level-badge" style={{ background: LEVEL_COLORS[detail.level] || '#3b82f6' }}>
                  {LEVEL_LABELS[detail.level] || detail.level}
                </span>
              )}
              <span className="lib-type-chip">{TYPE_LABELS[detail.type] || detail.type}</span>
            </div>

            <h1 className="lib-detail-title">{detail.title}</h1>

            <div className="lib-detail-authors">
              <User size={16} /> {detail.user?.name || detail.authors}
            </div>

            {detail.publication?.journalName && (
              <div className="lib-detail-journal">
                <BookOpen size={14} /> {detail.publication.journalName}
                {detail.publication.publishedDate && ` — ${new Date(detail.publication.publishedDate).toLocaleDateString('vi-VN')}`}
              </div>
            )}

            {detail.abstract && (
              <div className="lib-detail-section">
                <h3>Tóm tắt</h3>
                <p>{detail.abstract}</p>
              </div>
            )}

            {detail.keywords.length > 0 && (
              <div className="lib-detail-section">
                <h3>Từ khoá</h3>
                <div className="lib-tags-wrap">
                  {detail.keywords.map(k => <span key={k} className="lib-tag-chip">{k}</span>)}
                </div>
              </div>
            )}

            {detail.tags.length > 0 && (
              <div className="lib-detail-section">
                <h3>Nhãn</h3>
                <div className="lib-tags-wrap">
                  {detail.tags.map(t => <span key={t} className="lib-tag-chip alt">{t}</span>)}
                </div>
              </div>
            )}
          </article>

          <aside className="lib-detail-sidebar">
            <div className="lib-surface lib-sidebar-card">
              <h4 className="lib-sidebar-heading">Thông tin</h4>
              <div className="lib-detail-stats">
                <div className="lib-dstat-row"><Eye size={14} /> <span>Lượt xem</span> <strong>{detail.viewCount}</strong></div>
                <div className="lib-dstat-row"><Download size={14} /> <span>Lượt tải</span> <strong>{detail.downloadCount}</strong></div>
                <div className="lib-dstat-row"><Calendar size={14} /> <span>Ngày tạo</span> <strong>{new Date(detail.createdAt).toLocaleDateString('vi-VN')}</strong></div>
                {detail.aiScore != null && (
                  <div className="lib-dstat-row"><Sparkles size={14} /> <span>Điểm AI</span> <strong>{detail.aiScore.toFixed(2)}</strong></div>
                )}
              </div>
            </div>

            {detail.publication?.doi && (
              <div className="lib-surface lib-sidebar-card">
                <h4 className="lib-sidebar-heading">DOI</h4>
                <a href={`https://doi.org/${detail.publication.doi}`} target="_blank" rel="noreferrer" className="lib-doi-link">
                  {detail.publication.doi} <ExternalLink size={12} />
                </a>
              </div>
            )}

            <div className="lib-surface lib-sidebar-card">
              <h4 className="lib-sidebar-heading">Trích dẫn</h4>
              <button className="lib-btn-cite" onClick={handleCopyBibTeX}>
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Đã sao chép BibTeX!' : 'Sao chép BibTeX'}
              </button>
            </div>
          </aside>
        </div>

        {/* Chat Widget on detail too */}
        <div className={`lib-chat-widget ${chatOpen ? 'open' : ''}`}>
          {chatOpen ? (
            <div className="lib-surface lib-chat-panel">
              <div className="lib-chat-header">
                <Sparkles size={18} />
                <span>Trợ lý AI Thư viện</span>
                <button className="lib-chat-close" onClick={() => setChatOpen(false)}><X size={18} /></button>
              </div>
              <div className="lib-chat-body" ref={chatBodyRef}>
                {chatHistory.map((msg, i) => (
                  <div key={i} className={`lib-chat-bubble ${msg.role}`}>{msg.text}</div>
                ))}
                {chatLoading && (
                  <div className="lib-chat-bubble bot">
                    <Loader2 size={14} className="lib-spin" style={{ display: 'inline-block', marginRight: 6 }} />
                    Đang suy nghĩ...
                  </div>
                )}
              </div>
              <div className="lib-chat-input-row">
                <input
                  placeholder="Hỏi trợ lý AI..."
                  value={chatMsg}
                  onChange={(e) => setChatMsg(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleChat()}
                />
                <button className="lib-chat-send" onClick={handleChat} disabled={chatLoading}><Send size={18} /></button>
              </div>
            </div>
          ) : (
            <button className="lib-chat-fab" onClick={() => setChatOpen(true)}>
              <MessageCircle size={24} />
            </button>
          )}
        </div>

        <style>{libStyles}</style>
      </div>
    );
  }

  /* ──────────── LIST VIEW ──────────── */
  return (
    <div className="lib-page">
      {/* Hero Banner */}
      <section className="lib-hero">
        <div className="lib-hero-content">
          <p className="lib-hero-label">Quản lý Nghiên cứu</p>
          <h1 className="lib-hero-title">
            <Library size={28} /> Kho Lưu trữ số Thông minh
          </h1>
          <p className="lib-hero-desc">
            Truy cập hơn <strong>{stats?.total || 0}</strong> tài liệu, bài báo và công trình nghiên cứu.
            Sử dụng AI để tìm kiếm chính xác, gợi ý nội dung và trích dẫn tự động.
          </p>

          {/* Hero Stats */}
          <div className="lib-hero-stats">
            <div className="lib-hero-stat">
              <FileText size={18} />
              <div>
                <span className="lib-hero-stat-num">{stats?.total || 0}</span>
                <span className="lib-hero-stat-label">Tài liệu</span>
              </div>
            </div>
            <div className="lib-hero-stat">
              <Layers size={18} />
              <div>
                <span className="lib-hero-stat-num">{uniqueTypes}</span>
                <span className="lib-hero-stat-label">Thể loại</span>
              </div>
            </div>
            <div className="lib-hero-stat">
              <Tag size={18} />
              <div>
                <span className="lib-hero-stat-num">{stats?.topTags?.length || 0}</span>
                <span className="lib-hero-stat-label">Từ khoá</span>
              </div>
            </div>
          </div>

          {/* Search Bar embedded in hero */}
          <div className="lib-hero-search">
            <div className="lib-search-input-wrap">
              <Search size={20} />
              <input
                type="text"
                placeholder="Hỏi tôi bất cứ điều gì: tên bài, tác giả, từ khoá..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <button className="lib-btn-search" onClick={handleSearch}>Tìm kiếm</button>
          </div>
        </div>

        <div className="lib-hero-actions">
          <button className="lib-btn-hero secondary" onClick={() => setShowFilters(!showFilters)}>
            <Filter size={16} /> Tìm nâng cao
          </button>
          {isLecturerOrAdmin && (
            <button className="lib-btn-hero primary" onClick={() => setShowCreate(true)}>
              <Plus size={16} /> Thêm tài liệu
            </button>
          )}
        </div>
      </section>

      {/* Filter Bar */}
      {showFilters && (
        <div className="lib-filter-bar lib-surface">
          <span className="lib-filter-label">BỘ LỌC NÂNG CAO</span>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">Loại tài liệu</option>
            {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)}>
            <option value="">Trình độ / Cấp độ</option>
            {Object.entries(LEVEL_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <button className="lib-btn-apply" onClick={() => fetchDocs(1)}>Áp dụng</button>
          {(typeFilter || levelFilter) && (
            <button className="lib-btn-clear" onClick={() => { setTypeFilter(''); setLevelFilter(''); fetchDocs(1); }}>Xoá bộ lọc</button>
          )}
        </div>
      )}

      {/* Main Layout */}
      <div className="lib-layout">
        <div className="lib-docs-col">
          {loading ? (
            <div className="lib-loading-state"><Loader2 size={32} className="lib-spin" /><p>Đang tải dữ liệu...</p></div>
          ) : docs.length === 0 ? (
            <div className="lib-empty-state">
              <BookOpen size={48} />
              <p>Chưa có tài liệu nào trong thư viện.</p>
            </div>
          ) : (
            <>
              <p className="lib-result-count">
                Hiển thị {docs.length} / {meta.total} tài liệu (trang {meta.page}/{meta.totalPages})
              </p>

              {docs.map((doc) => (
                <article key={doc.id} className="lib-surface lib-doc-card" onClick={() => openDetail(doc.id)}>
                  <div className="lib-doc-card-top">
                    <div className="lib-doc-badges">
                      {doc.level && (
                        <span className="lib-level-badge" style={{ background: LEVEL_COLORS[doc.level] || '#3b82f6' }}>
                          {LEVEL_LABELS[doc.level] || doc.level}
                        </span>
                      )}
                      <span className="lib-type-chip">{TYPE_LABELS[doc.type] || doc.type}</span>
                    </div>
                    <div className="lib-doc-counters">
                      <span><Eye size={13} /> {doc.viewCount}</span>
                      <span><Download size={13} /> {doc.downloadCount}</span>
                    </div>
                  </div>

                  <h3 className="lib-doc-title">{doc.title}</h3>

                  {doc.abstract && <p className="lib-doc-abstract">{doc.abstract.slice(0, 200)}...</p>}

                  <div className="lib-doc-meta">
                    <span className="lib-doc-author"><FileText size={14} /> {doc.user?.name || doc.authors}</span>
                    {doc.publication?.journalName && <span className="lib-doc-journal">{doc.publication.journalName}</span>}
                  </div>

                  <div className="lib-doc-footer">
                    <div className="lib-doc-tags">
                      {doc.keywords?.slice(0, 3).map((k) => <span key={k} className="lib-tag-chip">{k}</span>)}
                      {doc.tags.slice(0, 2).map((t) => <span key={t} className="lib-tag-chip alt">{t}</span>)}
                    </div>
                    {doc.aiScore != null && (
                      <div className="lib-ai-score"><Sparkles size={14} /><span>{doc.aiScore.toFixed(2)}</span></div>
                    )}
                  </div>
                </article>
              ))}

              {/* Pagination */}
              <div className="lib-pagination">
                <button className="lib-page-btn" disabled={meta.page <= 1} onClick={() => fetchDocs(meta.page - 1)}><ChevronLeft size={18} /></button>
                {Array.from({ length: Math.min(meta.totalPages, 7) }, (_, i) => {
                  const start = Math.max(1, meta.page - 3);
                  const p = start + i;
                  if (p > meta.totalPages) return null;
                  return (
                    <button key={p} className={`lib-page-btn ${meta.page === p ? 'active' : ''}`} onClick={() => fetchDocs(p)}>
                      {p}
                    </button>
                  );
                })}
                <button className="lib-page-btn" disabled={meta.page >= meta.totalPages} onClick={() => fetchDocs(meta.page + 1)}><ChevronRight size={18} /></button>
              </div>
            </>
          )}
        </div>

        {/* Sidebar */}
        <aside className="lib-sidebar">
          <div className="lib-surface lib-sidebar-card">
            <h4 className="lib-sidebar-heading"><Tag size={16} /> Từ khoá phổ biến</h4>
            <div className="lib-popular-tags">
              {stats?.topTags?.slice(0, 15).map((t) => (
                <button key={t.name} className="lib-tag-btn" onClick={() => { setSearch(t.name); fetchDocs(1); }}>
                  {t.name} <span className="lib-tag-count">{t.count}</span>
                </button>
              ))}
              {(!stats?.topTags || stats.topTags.length === 0) && (
                <p className="lib-empty-text">Chưa có từ khoá</p>
              )}
            </div>
          </div>

          <div className="lib-surface lib-sidebar-card">
            <h4 className="lib-sidebar-heading"><BarChart3 size={16} /> Thống kê thư viện</h4>
            <div className="lib-sidebar-stats">
              <div className="lib-sidebar-stat-row">
                <span>Tổng tài liệu</span>
                <strong>{stats?.total || 0}</strong>
              </div>
              <div className="lib-sidebar-stat-row">
                <span>Thể loại</span>
                <strong>{uniqueTypes}</strong>
              </div>
              <div className="lib-sidebar-stat-row">
                <span>Trang hiện tại</span>
                <strong>{meta.page}/{meta.totalPages}</strong>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* AI Chat Widget */}
      <div className={`lib-chat-widget ${chatOpen ? 'open' : ''}`}>
        {chatOpen ? (
          <div className="lib-surface lib-chat-panel">
            <div className="lib-chat-header">
              <Sparkles size={18} />
              <span>Trợ lý AI Thư viện</span>
              <button className="lib-chat-close" onClick={() => setChatOpen(false)}><X size={18} /></button>
            </div>
            <div className="lib-chat-body" ref={chatBodyRef}>
              {chatHistory.map((msg, i) => (
                <div key={i} className={`lib-chat-bubble ${msg.role}`}>{msg.text}</div>
              ))}
              {chatLoading && (
                <div className="lib-chat-bubble bot">
                  <Loader2 size={14} className="lib-spin" style={{ display: 'inline-block', marginRight: 6 }} />
                  Đang suy nghĩ...
                </div>
              )}
            </div>
            <div className="lib-chat-input-row">
              <input
                placeholder="Hỏi trợ lý AI..."
                value={chatMsg}
                onChange={(e) => setChatMsg(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleChat()}
              />
              <button className="lib-chat-send" onClick={handleChat} disabled={chatLoading}><Send size={18} /></button>
            </div>
          </div>
        ) : (
          <button className="lib-chat-fab" onClick={() => setChatOpen(true)}>
            <MessageCircle size={24} />
          </button>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="lib-modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="lib-surface lib-modal-content" onClick={e => e.stopPropagation()}>
            <div className="lib-modal-header">
              <h2>Thêm tài liệu mới</h2>
              <button className="lib-modal-close-btn" onClick={() => setShowCreate(false)}><X size={20} /></button>
            </div>
            <div className="lib-form-grid">
              <div className="lib-form-field">
                <label>Tiêu đề *</label>
                <input value={createForm.title} onChange={e => setCreateForm({ ...createForm, title: e.target.value })} placeholder="Nhập tiêu đề tài liệu" />
              </div>
              <div className="lib-form-field">
                <label>Tác giả *</label>
                <input value={createForm.authors} onChange={e => setCreateForm({ ...createForm, authors: e.target.value })} placeholder="Nguyễn Văn A, Trần Thị B" />
              </div>
              <div className="lib-form-field">
                <label>Loại tài liệu</label>
                <select value={createForm.type} onChange={e => setCreateForm({ ...createForm, type: e.target.value })}>
                  {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="lib-form-field">
                <label>Cấp độ</label>
                <select value={createForm.level} onChange={e => setCreateForm({ ...createForm, level: e.target.value })}>
                  {Object.entries(LEVEL_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="lib-form-field full">
                <label>Tóm tắt</label>
                <textarea value={createForm.abstract} onChange={e => setCreateForm({ ...createForm, abstract: e.target.value })} rows={3} placeholder="Mô tả ngắn gọn nội dung tài liệu..." />
              </div>
              <div className="lib-form-field">
                <label>Từ khoá (cách nhau bởi dấu phẩy)</label>
                <input value={createForm.keywords} onChange={e => setCreateForm({ ...createForm, keywords: e.target.value })} placeholder="AI, NLP, OCR" />
              </div>
              <div className="lib-form-field">
                <label>Nhãn (cách nhau bởi dấu phẩy)</label>
                <input value={createForm.tags} onChange={e => setCreateForm({ ...createForm, tags: e.target.value })} placeholder="deep-learning, healthcare" />
              </div>
            </div>
            <div className="lib-modal-actions">
              <button className="lib-btn-secondary" onClick={() => setShowCreate(false)}>Huỷ</button>
              <button className="lib-btn-primary" onClick={handleCreate} disabled={submitting || !createForm.title || !createForm.authors}>
                {submitting ? <Loader2 size={16} className="lib-spin" /> : <Plus size={16} />} Thêm tài liệu
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{libStyles}</style>
    </div>
  );
}

/* ──────────── STYLES ──────────── */
const libStyles = `
  /* ── Base ── */
  .lib-page {
    display: flex;
    flex-direction: column;
    gap: 1.75rem;
    padding-bottom: 3rem;
  }

  .lib-surface {
    background: white;
    border-radius: 16px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03);
  }

  /* ── Hero Banner ── */
  .lib-hero {
    background: linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4338ca 100%);
    border-radius: 20px;
    padding: 2.5rem;
    color: white;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 2rem;
  }
  .lib-hero-content { flex: 1; }
  .lib-hero-label {
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    opacity: 0.7;
    margin-bottom: 0.5rem;
  }
  .lib-hero-title {
    font-size: 1.75rem;
    font-weight: 800;
    display: flex;
    align-items: center;
    gap: 0.625rem;
    margin-bottom: 0.75rem;
    color: white;
  }
  .lib-hero-desc {
    font-size: 0.9375rem;
    line-height: 1.65;
    opacity: 0.85;
    max-width: 560px;
    margin-bottom: 1.5rem;
  }
  .lib-hero-desc strong {
    color: #c7d2fe;
    font-weight: 800;
  }

  /* Hero Stats */
  .lib-hero-stats {
    display: flex;
    gap: 1.5rem;
    margin-bottom: 1.5rem;
  }
  .lib-hero-stat {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    background: rgba(255,255,255,0.1);
    padding: 0.625rem 1rem;
    border-radius: 12px;
    border: 1px solid rgba(255,255,255,0.12);
  }
  .lib-hero-stat div {
    display: flex;
    flex-direction: column;
  }
  .lib-hero-stat-num {
    font-size: 1.125rem;
    font-weight: 800;
    line-height: 1.2;
  }
  .lib-hero-stat-label {
    font-size: 0.6875rem;
    opacity: 0.7;
    font-weight: 600;
  }

  /* Hero Search */
  .lib-hero-search {
    display: flex;
    gap: 0.75rem;
    max-width: 580px;
  }
  .lib-hero-search .lib-search-input-wrap {
    flex: 1;
    background: rgba(255,255,255,0.12);
    border: 1.5px solid rgba(255,255,255,0.2);
    border-radius: 14px;
    padding: 0 1.25rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    color: white;
    backdrop-filter: blur(8px);
  }
  .lib-hero-search .lib-search-input-wrap input {
    flex: 1;
    border: none;
    outline: none;
    padding: 0.875rem 0;
    font-size: 0.9375rem;
    background: transparent;
    color: white;
    font-family: inherit;
  }
  .lib-hero-search .lib-search-input-wrap input::placeholder {
    color: rgba(255,255,255,0.5);
  }
  .lib-btn-search {
    background: white;
    color: #1e1b4b;
    border: none;
    padding: 0.875rem 1.75rem;
    border-radius: 14px;
    font-weight: 700;
    font-size: 0.875rem;
    cursor: pointer;
    white-space: nowrap;
    transition: transform 0.15s;
  }
  .lib-btn-search:hover { transform: translateY(-1px); }

  /* Hero Actions */
  .lib-hero-actions {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    flex-shrink: 0;
  }
  .lib-btn-hero {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 0.625rem 1.25rem;
    border-radius: 10px;
    font-weight: 700;
    font-size: 0.8125rem;
    cursor: pointer;
    border: none;
    white-space: nowrap;
    transition: transform 0.15s;
  }
  .lib-btn-hero:hover { transform: translateY(-1px); }
  .lib-btn-hero.primary { background: white; color: #1e1b4b; }
  .lib-btn-hero.secondary { background: rgba(255,255,255,0.12); color: white; border: 1.5px solid rgba(255,255,255,0.2); }

  /* ── Filter Bar ── */
  .lib-filter-bar {
    display: flex;
    gap: 0.75rem;
    align-items: center;
    flex-wrap: wrap;
    padding: 1rem 1.5rem;
  }
  .lib-filter-label {
    font-size: 0.6875rem;
    font-weight: 800;
    color: var(--on-surface-muted, #64748b);
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  .lib-filter-bar select {
    background: #f8fafc;
    border: 1.5px solid #e2e8f0;
    padding: 0.5rem 1rem;
    border-radius: 10px;
    font-size: 0.8125rem;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    outline: none;
    color: #334155;
  }
  .lib-filter-bar select:focus { border-color: var(--primary-indigo, #4f46e5); }
  .lib-btn-apply {
    background: var(--primary-indigo, #4f46e5);
    color: white;
    border: none;
    padding: 0.5rem 1.25rem;
    border-radius: 10px;
    font-weight: 700;
    font-size: 0.8125rem;
    cursor: pointer;
  }
  .lib-btn-clear {
    background: none;
    border: 1.5px solid #e2e8f0;
    padding: 0.5rem 1rem;
    border-radius: 10px;
    font-weight: 600;
    font-size: 0.75rem;
    cursor: pointer;
    color: var(--on-surface-muted, #64748b);
  }
  .lib-btn-clear:hover { border-color: #94a3b8; }

  /* ── Layout ── */
  .lib-layout {
    display: grid;
    grid-template-columns: 1fr 280px;
    gap: 1.75rem;
    align-items: start;
  }
  .lib-docs-col {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .lib-result-count {
    font-size: 0.8125rem;
    color: var(--on-surface-muted, #64748b);
    margin-bottom: 0;
  }

  /* Loading / Empty */
  .lib-loading-state, .lib-empty-state {
    text-align: center;
    padding: 4rem 2rem;
    color: var(--on-surface-muted, #94a3b8);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  /* ── Document Card ── */
  .lib-doc-card {
    padding: 1.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    transition: transform 0.2s, box-shadow 0.2s;
    cursor: pointer;
  }
  .lib-doc-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(0,0,0,0.08);
  }
  .lib-doc-card-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .lib-doc-badges { display: flex; align-items: center; gap: 0.5rem; }
  .lib-doc-counters {
    display: flex;
    gap: 1rem;
  }
  .lib-doc-counters span {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.75rem;
    color: var(--on-surface-muted, #64748b);
    font-weight: 600;
  }

  .lib-level-badge {
    color: white;
    padding: 0.25rem 0.75rem;
    border-radius: 100px;
    font-size: 0.6875rem;
    font-weight: 800;
    letter-spacing: 0.02em;
  }
  .lib-type-chip {
    background: #f1f5f9;
    color: var(--on-surface-muted, #64748b);
    padding: 0.25rem 0.75rem;
    border-radius: 100px;
    font-size: 0.6875rem;
    font-weight: 700;
  }

  .lib-doc-title {
    font-size: 1.0625rem;
    font-weight: 700;
    line-height: 1.4;
    color: #1e293b;
  }
  .lib-doc-abstract {
    font-size: 0.8125rem;
    color: var(--on-surface-muted, #64748b);
    line-height: 1.65;
  }
  .lib-doc-meta {
    display: flex;
    gap: 1.5rem;
    font-size: 0.8125rem;
    color: var(--on-surface-muted, #64748b);
  }
  .lib-doc-author {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    font-weight: 600;
    color: #475569;
  }
  .lib-doc-journal { font-style: italic; }
  .lib-doc-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 0.25rem;
  }
  .lib-doc-tags { display: flex; gap: 0.375rem; flex-wrap: wrap; }
  .lib-tag-chip {
    background: #eef2ff;
    color: var(--primary-indigo, #4f46e5);
    padding: 0.3rem 0.75rem;
    border-radius: 100px;
    font-size: 0.6875rem;
    font-weight: 700;
  }
  .lib-tag-chip.alt {
    background: #f0fdf4;
    color: #059669;
  }
  .lib-ai-score {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    background: linear-gradient(135deg, #fef3c7, #fde68a);
    color: #92400e;
    padding: 0.375rem 0.875rem;
    border-radius: 12px;
    font-weight: 800;
    font-size: 0.8125rem;
  }

  /* ── Pagination ── */
  .lib-pagination {
    display: flex;
    justify-content: center;
    gap: 0.5rem;
    margin-top: 0.75rem;
  }
  .lib-page-btn {
    width: 38px;
    height: 38px;
    border: none;
    border-radius: 10px;
    background: white;
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--on-surface-muted, #64748b);
    font-size: 0.8125rem;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    transition: all 0.15s;
  }
  .lib-page-btn:hover:not(:disabled):not(.active) {
    background: #f1f5f9;
  }
  .lib-page-btn.active {
    background: var(--primary-indigo, #4f46e5);
    color: white;
    box-shadow: 0 2px 8px rgba(79,70,229,0.3);
  }
  .lib-page-btn:disabled { opacity: 0.35; cursor: not-allowed; }

  /* ── Sidebar ── */
  .lib-sidebar {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .lib-sidebar-card { padding: 1.5rem; }
  .lib-sidebar-heading {
    font-size: 0.875rem;
    font-weight: 700;
    margin-bottom: 0.875rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: #1e293b;
  }
  .lib-popular-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.375rem;
  }
  .lib-tag-btn {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    padding: 0.375rem 0.75rem;
    border-radius: 100px;
    font-size: 0.6875rem;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.375rem;
    color: #475569;
    transition: all 0.15s;
  }
  .lib-tag-btn:hover {
    background: #eef2ff;
    color: var(--primary-indigo, #4f46e5);
    border-color: #c7d2fe;
  }
  .lib-tag-count {
    font-size: 0.6rem;
    background: #e2e8f0;
    padding: 0.125rem 0.375rem;
    border-radius: 100px;
    font-weight: 700;
  }
  .lib-sidebar-stats {
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
  }
  .lib-sidebar-stat-row {
    display: flex;
    justify-content: space-between;
    font-size: 0.8125rem;
  }
  .lib-sidebar-stat-row span { color: var(--on-surface-muted, #64748b); }
  .lib-sidebar-stat-row strong { font-weight: 700; color: #1e293b; }
  .lib-empty-text { color: var(--on-surface-muted, #94a3b8); font-size: 0.8125rem; }

  /* ── Detail View ── */
  .lib-btn-back {
    background: none;
    border: none;
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    color: var(--on-surface-muted, #64748b);
    font-weight: 700;
    font-size: 0.875rem;
    padding: 0;
    margin-bottom: -0.5rem;
    transition: color 0.15s;
  }
  .lib-btn-back:hover { color: var(--primary-indigo, #4f46e5); }

  .lib-detail-layout {
    display: grid;
    grid-template-columns: 1fr 300px;
    gap: 1.75rem;
    align-items: start;
  }
  .lib-detail-main { padding: 2.5rem; }
  .lib-detail-badges { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
  .lib-detail-title {
    font-size: 1.5rem;
    font-weight: 800;
    line-height: 1.35;
    margin-bottom: 1rem;
    color: var(--primary-indigo, #4f46e5);
  }
  .lib-detail-authors {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.9375rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
    color: #334155;
  }
  .lib-detail-journal {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.8125rem;
    color: var(--on-surface-muted, #64748b);
    font-style: italic;
    margin-bottom: 1.75rem;
  }
  .lib-detail-section { margin-bottom: 1.75rem; }
  .lib-detail-section h3 {
    font-size: 0.75rem;
    font-weight: 700;
    margin-bottom: 0.625rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--on-surface-muted, #64748b);
  }
  .lib-detail-section p {
    font-size: 0.9375rem;
    line-height: 1.75;
    color: #334155;
  }
  .lib-tags-wrap { display: flex; gap: 6px; flex-wrap: wrap; }

  .lib-detail-sidebar {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .lib-detail-stats {
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
  }
  .lib-dstat-row {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.8125rem;
    padding: 0.375rem 0;
  }
  .lib-dstat-row span {
    flex: 1;
    color: var(--on-surface-muted, #64748b);
  }
  .lib-dstat-row strong { font-weight: 700; color: #1e293b; }
  .lib-doi-link {
    font-size: 0.8125rem;
    color: var(--primary-indigo, #4f46e5);
    display: flex;
    align-items: center;
    gap: 4px;
    word-break: break-all;
    text-decoration: none;
  }
  .lib-doi-link:hover { text-decoration: underline; }
  .lib-btn-cite {
    background: #eef2ff;
    color: var(--primary-indigo, #4f46e5);
    border: none;
    padding: 0.625rem 1rem;
    border-radius: 10px;
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.8125rem;
    width: 100%;
    justify-content: center;
    transition: background 0.15s;
  }
  .lib-btn-cite:hover { background: #e0e7ff; }

  /* ── Chat Widget ── */
  .lib-chat-widget { position: fixed; bottom: 2rem; right: 2rem; z-index: 200; }
  .lib-chat-fab {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: linear-gradient(135deg, #4f46e5, #7c3aed);
    color: white;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 8px 24px rgba(79,70,229,0.4);
    transition: transform 0.2s, box-shadow 0.2s;
  }
  .lib-chat-fab:hover {
    transform: scale(1.08);
    box-shadow: 0 10px 32px rgba(79,70,229,0.5);
  }
  .lib-chat-panel {
    width: 400px;
    height: 500px;
    border-radius: 20px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 20px 60px rgba(0,0,0,0.18);
  }
  .lib-chat-header {
    background: linear-gradient(135deg, #1e1b4b, #4338ca);
    color: white;
    padding: 1rem 1.25rem;
    display: flex;
    align-items: center;
    gap: 0.625rem;
    font-weight: 700;
    font-size: 0.9375rem;
  }
  .lib-chat-close {
    background: none;
    border: none;
    color: white;
    cursor: pointer;
    margin-left: auto;
    opacity: 0.8;
    transition: opacity 0.15s;
  }
  .lib-chat-close:hover { opacity: 1; }
  .lib-chat-body {
    flex: 1;
    padding: 1.25rem;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    background: #fafbff;
  }
  .lib-chat-bubble {
    padding: 0.75rem 1rem;
    border-radius: 14px;
    font-size: 0.8125rem;
    line-height: 1.55;
    max-width: 85%;
    white-space: pre-wrap;
  }
  .lib-chat-bubble.bot {
    background: white;
    color: #334155;
    align-self: flex-start;
    box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    border-bottom-left-radius: 4px;
  }
  .lib-chat-bubble.user {
    background: linear-gradient(135deg, #4f46e5, #6366f1);
    color: white;
    align-self: flex-end;
    border-bottom-right-radius: 4px;
  }
  .lib-chat-input-row {
    display: flex;
    gap: 0.5rem;
    padding: 0.75rem;
    background: white;
    border-top: 1px solid #f1f5f9;
  }
  .lib-chat-input-row input {
    flex: 1;
    border: 1.5px solid #e2e8f0;
    outline: none;
    padding: 0.625rem 0.875rem;
    border-radius: 10px;
    font-size: 0.8125rem;
    background: #f8fafc;
    font-family: inherit;
  }
  .lib-chat-input-row input:focus { border-color: var(--primary-indigo, #4f46e5); }
  .lib-chat-send {
    background: var(--primary-indigo, #4f46e5);
    color: white;
    border: none;
    padding: 0.625rem 0.75rem;
    border-radius: 10px;
    cursor: pointer;
    transition: opacity 0.15s;
  }
  .lib-chat-send:disabled { opacity: 0.4; cursor: not-allowed; }

  /* ── Modal ── */
  .lib-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(15,23,42,0.6);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }
  .lib-modal-content {
    width: 580px;
    max-height: 85vh;
    overflow-y: auto;
    padding: 2rem;
    border-radius: 20px;
    animation: libModalIn 0.25s ease-out;
  }
  @keyframes libModalIn {
    from { opacity: 0; transform: translateY(16px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  .lib-modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.75rem;
  }
  .lib-modal-header h2 {
    font-size: 1.25rem;
    font-weight: 800;
    color: #1e293b;
  }
  .lib-modal-close-btn {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--on-surface-muted, #64748b);
    padding: 4px;
    border-radius: 8px;
    transition: background 0.15s;
  }
  .lib-modal-close-btn:hover { background: #f1f5f9; }
  .lib-form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }
  .lib-form-field {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }
  .lib-form-field.full { grid-column: 1 / -1; }
  .lib-form-field label {
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--on-surface-muted, #64748b);
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }
  .lib-form-field input,
  .lib-form-field textarea,
  .lib-form-field select {
    padding: 0.625rem 0.875rem;
    border: 1.5px solid #e2e8f0;
    border-radius: 10px;
    font-size: 0.875rem;
    font-family: inherit;
    outline: none;
    background: #f8fafc;
    color: #1e293b;
    transition: border-color 0.15s;
  }
  .lib-form-field input:focus,
  .lib-form-field textarea:focus,
  .lib-form-field select:focus {
    border-color: var(--primary-indigo, #4f46e5);
    background: white;
  }
  .lib-modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    margin-top: 1.75rem;
    padding-top: 1.25rem;
    border-top: 1px solid #f1f5f9;
  }
  .lib-btn-secondary {
    background: white;
    border: 1.5px solid #e2e8f0;
    padding: 0.625rem 1.25rem;
    border-radius: 10px;
    font-weight: 700;
    cursor: pointer;
    font-size: 0.875rem;
    color: #475569;
    transition: border-color 0.15s;
  }
  .lib-btn-secondary:hover { border-color: #94a3b8; }
  .lib-btn-primary {
    background: var(--primary-indigo, #4f46e5);
    color: white;
    border: none;
    padding: 0.625rem 1.5rem;
    border-radius: 10px;
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    transition: opacity 0.15s;
  }
  .lib-btn-primary:disabled { opacity: 0.45; cursor: not-allowed; }
  .lib-btn-primary:hover:not(:disabled) { opacity: 0.92; }

  /* ── Utilities ── */
  .lib-spin { animation: libSpin 1s linear infinite; }
  @keyframes libSpin { to { transform: rotate(360deg); } }

  /* ── Responsive ── */
  @media (max-width: 1024px) {
    .lib-layout { grid-template-columns: 1fr; }
    .lib-sidebar { display: none; }
    .lib-detail-layout { grid-template-columns: 1fr; }
    .lib-hero { flex-direction: column; }
    .lib-hero-actions { flex-direction: row; }
    .lib-hero-stats { flex-wrap: wrap; }
    .lib-hero-search { max-width: 100%; }
  }
  @media (max-width: 640px) {
    .lib-hero { padding: 1.75rem; }
    .lib-hero-title { font-size: 1.375rem; }
    .lib-hero-stats { gap: 0.75rem; }
    .lib-hero-stat { padding: 0.5rem 0.75rem; }
    .lib-hero-search { flex-direction: column; }
    .lib-btn-search { width: 100%; text-align: center; }
    .lib-chat-panel { width: calc(100vw - 2rem); height: 420px; }
    .lib-modal-content { width: calc(100vw - 2rem); }
    .lib-form-grid { grid-template-columns: 1fr; }
  }
`;
