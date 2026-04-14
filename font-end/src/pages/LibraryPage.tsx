import { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { libraryService } from '../services/libraryService';

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
  user?: { id: number; name: string };
  publication?: { journalName?: string; conferenceName?: string; doi?: string; publishedDate?: string };
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
  UNIVERSITY: 'Cấp trường',
  MINISTRY: 'Cấp bộ',
  STATE: 'Cấp nhà nước',
};

const LEVEL_COLORS: Record<string, string> = {
  UNIVERSITY: '#3b82f6',
  MINISTRY: '#8b5cf6',
  STATE: '#ef4444',
};

export default function LibraryPage() {
  const [docs, setDocs] = useState<LibDoc[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMsg, setChatMsg] = useState('');
  const [stats, setStats] = useState<{ total: number; topTags: { name: string; count: number }[] } | null>(null);

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
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
    libraryService.getStats().then(setStats).catch(() => {});
  }, []);

  const handleSearch = () => fetchDocs(1);

  return (
    <div className="library-page">
      <header className="page-header">
        <div>
          <p className="breadcrumb">Quản lý Nghiên cứu</p>
          <h1>Kho lưu trữ số Thông minh</h1>
          <p className="subtitle">
            Truy cập hơn {stats?.total || 0} tài liệu, bài báo và công trình nghiên cứu. Sử dụng AI để tìm kiếm chính xác,
            gợi ý nội dung và trích dẫn tự động.
          </p>
        </div>
        <button className="btn-filter-toggle" onClick={() => setShowFilters(!showFilters)}>
          <Filter size={18} />
          Tìm nâng cao
        </button>
      </header>

      {/* Search Bar */}
      <div className="search-bar-row">
        <div className="search-input-wrap">
          <Search size={20} color="var(--on-surface-muted)" />
          <input
            type="text"
            placeholder="Hỏi tôi bất cứ điều gì: tên bài, tác giả, từ khóa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>
        <button className="btn-search" onClick={handleSearch}>Tìm kiếm</button>
      </div>

      {/* Filter Chips */}
      {showFilters && (
        <div className="filter-row">
          <div className="filter-group">
            <span className="filter-label">BỘ LỌC NÂNG CAO</span>
            <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); }}>
              <option value="">LOẠI TÀI LIỆU</option>
              {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select value={levelFilter} onChange={(e) => { setLevelFilter(e.target.value); }}>
              <option value="">TRÌNH ĐỘ / CẤP ĐỘ</option>
              {Object.entries(LEVEL_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <button className="btn-apply-filter" onClick={() => fetchDocs(1)}>Áp dụng</button>
          </div>
        </div>
      )}

      <div className="library-layout">
        {/* Main Content */}
        <div className="docs-column">
          {loading ? (
            <div className="loading-state">Đang tải...</div>
          ) : docs.length === 0 ? (
            <div className="empty-state">
              <BookOpen size={48} color="var(--on-surface-muted)" />
              <p>Chưa có tài liệu nào trong thư viện.</p>
            </div>
          ) : (
            <>
              {docs.map((doc) => (
                <article key={doc.id} className="doc-card surface-card">
                  <div className="doc-card-header">
                    {doc.level && (
                      <span className="level-badge" style={{ background: LEVEL_COLORS[doc.level] || '#3b82f6' }}>
                        {LEVEL_LABELS[doc.level] || doc.level}
                      </span>
                    )}
                    <span className="type-chip">{TYPE_LABELS[doc.type] || doc.type}</span>
                    <span className="meta-views"><Eye size={14} /> {doc.viewCount}</span>
                  </div>

                  <h3 className="doc-title">{doc.title}</h3>

                  {doc.abstract && (
                    <p className="doc-abstract">{doc.abstract.slice(0, 200)}...</p>
                  )}

                  <div className="doc-meta">
                    <span className="doc-author">
                      <FileText size={14} />
                      {doc.user?.name || doc.authors}
                    </span>
                    {doc.publication?.journalName && (
                      <span className="doc-journal">{doc.publication.journalName}</span>
                    )}
                  </div>

                  <div className="doc-footer">
                    <div className="doc-tags">
                      {doc.tags.slice(0, 4).map((t) => (
                        <span key={t} className="tag-chip">{t}</span>
                      ))}
                    </div>
                    {doc.aiScore && (
                      <div className="ai-score-badge">
                        <Sparkles size={14} />
                        <span>{doc.aiScore.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </article>
              ))}

              {/* Pagination */}
              <div className="pagination">
                <button
                  className="page-btn"
                  disabled={meta.page <= 1}
                  onClick={() => fetchDocs(meta.page - 1)}
                >
                  <ChevronLeft size={18} />
                </button>
                {Array.from({ length: meta.totalPages }, (_, i) => i + 1).slice(0, 5).map((p) => (
                  <button
                    key={p}
                    className={`page-btn ${meta.page === p ? 'active' : ''}`}
                    onClick={() => fetchDocs(p)}
                  >
                    {p}
                  </button>
                ))}
                <button
                  className="page-btn"
                  disabled={meta.page >= meta.totalPages}
                  onClick={() => fetchDocs(meta.page + 1)}
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </>
          )}
        </div>

        {/* Sidebar - Tags */}
        <aside className="sidebar-tags">
          <div className="surface-card tags-card">
            <h4><Tag size={16} /> Từ khóa phổ biến</h4>
            <div className="popular-tags">
              {stats?.topTags?.slice(0, 12).map((t) => (
                <button
                  key={t.name}
                  className="tag-btn"
                  onClick={() => { setSearch(t.name); fetchDocs(1); }}
                >
                  {t.name} <span className="tag-count">{t.count}</span>
                </button>
              ))}
              {(!stats?.topTags || stats.topTags.length === 0) && (
                <p style={{ color: 'var(--on-surface-muted)', fontSize: '0.875rem' }}>Chưa có tags</p>
              )}
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
              <span>Trợ lý AI Thư viện</span>
              <button className="chat-close" onClick={() => setChatOpen(false)}><X size={18} /></button>
            </div>
            <div className="chat-body">
              <div className="chat-bubble bot">
                Xin chào! Tôi có thể giúp bạn tìm kiếm tài liệu, gợi ý bài báo liên quan, hoặc trích dẫn tự động.
              </div>
            </div>
            <div className="chat-input-row">
              <input
                placeholder="Hỏi trợ lý AI..."
                value={chatMsg}
                onChange={(e) => setChatMsg(e.target.value)}
              />
              <button className="chat-send"><Send size={18} /></button>
            </div>
          </div>
        ) : (
          <button className="chat-fab" onClick={() => setChatOpen(true)}>
            <MessageCircle size={24} />
          </button>
        )}
      </div>

      <style>{`
        .library-page { display: flex; flex-direction: column; gap: 2rem; padding-bottom: 3rem; }

        .breadcrumb { font-size: 0.8125rem; color: var(--on-surface-muted); margin-bottom: 0.5rem; }
        .page-header { display: flex; justify-content: space-between; align-items: flex-start; }
        .page-header h1 { font-size: 1.75rem; font-weight: 800; margin-bottom: 0.5rem; }
        .subtitle { color: var(--on-surface-muted); font-size: 0.9375rem; max-width: 600px; line-height: 1.6; }

        .btn-filter-toggle {
          background: white; border: none; padding: 0.75rem 1.25rem; border-radius: 12px;
          font-weight: 700; display: flex; align-items: center; gap: 0.5rem; cursor: pointer;
          color: var(--primary-indigo); font-size: 0.875rem; white-space: nowrap;
        }

        .search-bar-row { display: flex; gap: 1rem; }
        .search-input-wrap {
          flex: 1; background: white; border-radius: 14px; padding: 0 1.25rem;
          display: flex; align-items: center; gap: 0.75rem;
        }
        .search-input-wrap input {
          flex: 1; border: none; outline: none; padding: 1rem 0; font-size: 0.9375rem;
          background: transparent;
        }
        .btn-search {
          background: var(--signature-gradient, var(--primary-indigo)); color: white; border: none;
          padding: 1rem 2rem; border-radius: 14px; font-weight: 700; cursor: pointer; white-space: nowrap;
        }

        .filter-row { display: flex; gap: 1rem; flex-wrap: wrap; align-items: center; }
        .filter-group { display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap; }
        .filter-label { font-size: 0.75rem; font-weight: 800; color: var(--on-surface-muted); letter-spacing: 0.05em; }
        .filter-group select {
          background: white; border: none; padding: 0.625rem 1rem; border-radius: 10px;
          font-size: 0.8125rem; font-weight: 600; cursor: pointer; color: var(--on-surface);
        }
        .btn-apply-filter {
          background: var(--primary-indigo); color: white; border: none; padding: 0.625rem 1.25rem;
          border-radius: 10px; font-weight: 700; font-size: 0.8125rem; cursor: pointer;
        }

        .library-layout { display: grid; grid-template-columns: 1fr 280px; gap: 2rem; align-items: start; }

        .docs-column { display: flex; flex-direction: column; gap: 1.5rem; }

        .loading-state, .empty-state {
          text-align: center; padding: 4rem 2rem; color: var(--on-surface-muted);
          display: flex; flex-direction: column; align-items: center; gap: 1rem;
        }

        .doc-card { padding: 2rem; display: flex; flex-direction: column; gap: 1rem; transition: transform 0.2s; cursor: pointer; }
        .doc-card:hover { transform: translateY(-2px); }

        .doc-card-header { display: flex; align-items: center; gap: 0.75rem; }
        .level-badge {
          color: white; padding: 0.25rem 0.75rem; border-radius: 100px;
          font-size: 0.6875rem; font-weight: 800; letter-spacing: 0.03em;
        }
        .type-chip {
          background: #f1f5f9; color: var(--on-surface-muted); padding: 0.25rem 0.75rem;
          border-radius: 100px; font-size: 0.6875rem; font-weight: 700;
        }
        .meta-views { margin-left: auto; display: flex; align-items: center; gap: 0.375rem; font-size: 0.8125rem; color: var(--on-surface-muted); }

        .doc-title { font-size: 1.125rem; font-weight: 700; line-height: 1.4; }
        .doc-abstract { font-size: 0.875rem; color: var(--on-surface-muted); line-height: 1.6; }

        .doc-meta { display: flex; gap: 1.5rem; font-size: 0.8125rem; color: var(--on-surface-muted); }
        .doc-author { display: flex; align-items: center; gap: 0.375rem; font-weight: 600; }
        .doc-journal { font-style: italic; }

        .doc-footer { display: flex; justify-content: space-between; align-items: center; }
        .doc-tags { display: flex; gap: 0.5rem; flex-wrap: wrap; }
        .tag-chip {
          background: #eef2ff; color: var(--primary-indigo); padding: 0.375rem 0.875rem;
          border-radius: 100px; font-size: 0.75rem; font-weight: 700;
        }
        .ai-score-badge {
          display: flex; align-items: center; gap: 0.375rem; background: #fef3c7;
          color: #b45309; padding: 0.5rem 1rem; border-radius: 12px; font-weight: 800; font-size: 1rem;
        }

        .pagination { display: flex; justify-content: center; gap: 0.5rem; margin-top: 1rem; }
        .page-btn {
          width: 40px; height: 40px; border: none; border-radius: 10px; background: white;
          font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center;
          color: var(--on-surface-muted); transition: all 0.2s;
        }
        .page-btn.active { background: var(--primary-indigo); color: white; }
        .page-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        /* Sidebar Tags */
        .tags-card { padding: 1.5rem; }
        .tags-card h4 { font-size: 0.9375rem; font-weight: 700; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem; }
        .popular-tags { display: flex; flex-wrap: wrap; gap: 0.5rem; }
        .tag-btn {
          background: #f1f5f9; border: none; padding: 0.5rem 0.875rem; border-radius: 100px;
          font-size: 0.75rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 0.375rem;
          transition: all 0.2s;
        }
        .tag-btn:hover { background: #eef2ff; color: var(--primary-indigo); }
        .tag-count { font-size: 0.625rem; background: #e2e8f0; padding: 0.125rem 0.375rem; border-radius: 100px; }

        /* Chat Widget */
        .chat-widget { position: fixed; bottom: 2rem; right: 2rem; z-index: 200; }
        .chat-fab {
          width: 56px; height: 56px; border-radius: 50%; background: var(--primary-indigo);
          color: white; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center;
          box-shadow: 0 8px 24px rgba(79,70,229,0.4);
        }
        .chat-panel {
          width: 360px; height: 440px; border-radius: 20px; display: flex; flex-direction: column;
          overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.15);
        }
        .chat-header {
          background: var(--primary-indigo); color: white; padding: 1rem 1.25rem;
          display: flex; align-items: center; gap: 0.625rem; font-weight: 700;
        }
        .chat-close { background: none; border: none; color: white; cursor: pointer; margin-left: auto; }
        .chat-body { flex: 1; padding: 1.25rem; overflow-y: auto; }
        .chat-bubble {
          padding: 0.875rem 1.125rem; border-radius: 16px; font-size: 0.875rem; line-height: 1.5; max-width: 85%;
        }
        .chat-bubble.bot { background: #f1f5f9; color: var(--on-surface); }
        .chat-input-row { display: flex; gap: 0.5rem; padding: 1rem; background: #f8f9ff; }
        .chat-input-row input {
          flex: 1; border: none; outline: none; padding: 0.75rem 1rem; border-radius: 12px;
          font-size: 0.875rem; background: white;
        }
        .chat-send {
          background: var(--primary-indigo); color: white; border: none; padding: 0.75rem;
          border-radius: 12px; cursor: pointer;
        }

        @media (max-width: 1024px) {
          .library-layout { grid-template-columns: 1fr; }
          .sidebar-tags { display: none; }
        }
      `}</style>
    </div>
  );
}
