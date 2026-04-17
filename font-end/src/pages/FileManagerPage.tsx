import { useState, useEffect } from 'react';
import {
  Search, Filter, FileText, File, Image as ImageIcon, Archive, Download, Trash2,
  Database, HardDrive, TrendingUp, FileCheck, Eye, X, Calendar, User,
  Hash, Sparkles, ChevronLeft, ChevronRight, Loader2, FolderOpen, Grid, List as ListIcon,
} from 'lucide-react';
import { Modal } from '../components/common/Modal';
import { fileService } from '../services/fileService';
import type { FileItem, FileStats } from '../services/fileService';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/common/Toast';
import { Role } from '../types';

const CATEGORY_LABEL: Record<string, string> = {
  MANUSCRIPT: 'Bản thảo',
  PROPOSAL: 'Đề cương',
  REPORT: 'Báo cáo',
  PUBLICATION: 'Công bố',
  CONTRACT: 'Hợp đồng',
  INVOICE: 'Hóa đơn',
  OTHER: 'Khác',
};

const CATEGORY_COLOR: Record<string, string> = {
  MANUSCRIPT: '#2563eb',
  PROPOSAL: '#8b5cf6',
  REPORT: '#059669',
  PUBLICATION: '#dc2626',
  CONTRACT: '#f59e0b',
  INVOICE: '#06b6d4',
  OTHER: '#64748b',
};

function getFileIcon(mimeType: string, size = 20) {
  if (mimeType.includes('pdf')) return <FileText size={size} style={{ color: '#dc2626' }} />;
  if (mimeType.includes('word') || mimeType.includes('docx')) return <FileText size={size} style={{ color: '#2563eb' }} />;
  if (mimeType.includes('image')) return <ImageIcon size={size} style={{ color: '#10b981' }} />;
  if (mimeType.includes('zip') || mimeType.includes('rar')) return <Archive size={size} style={{ color: '#f59e0b' }} />;
  return <File size={size} style={{ color: '#64748b' }} />;
}

export default function FileManagerPage() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole(Role.ADMIN);
  const { success, error: showError, confirm } = useToast();

  const [files, setFiles] = useState<FileItem[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, totalPages: 1 });
  const [stats, setStats] = useState<FileStats | null>(null);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [mimeFilter, setMimeFilter] = useState('');
  const [ocrFilter, setOcrFilter] = useState<'' | 'true' | 'false'>('');
  const [view, setView] = useState<'list' | 'grid'>('list');

  const [detail, setDetail] = useState<FileItem | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const fetchFiles = async (page = 1) => {
    setLoading(true);
    try {
      const res = await fileService.findAll({
        page, limit: 15,
        search: search || undefined,
        category: category || undefined,
        mimeType: mimeFilter || undefined,
        hasOcr: ocrFilter === 'true' ? true : ocrFilter === 'false' ? false : undefined,
      });
      setFiles(res.data);
      setMeta(res.meta);
    } catch {
      showError('Không tải được danh sách tệp tin');
    }
    setLoading(false);
  };

  const fetchStats = async () => {
    try { setStats(await fileService.getStats()); } catch { /* ignore */ }
  };

  useEffect(() => { fetchFiles(); fetchStats(); }, []);
  useEffect(() => { fetchFiles(1); }, [category, mimeFilter, ocrFilter]);

  const openDetail = async (f: FileItem) => {
    setDetail(f);
    setPreviewUrl(null);
    try {
      const res = await fileService.getDownloadUrl(f.id);
      setPreviewUrl(res.url);
    } catch { /* ignore */ }
  };

  const handleDownload = async (f: FileItem) => {
    try {
      const res = await fileService.getDownloadUrl(f.id);
      window.open(res.url, '_blank');
    } catch {
      showError('Không lấy được link tải');
    }
  };

  const handleDelete = (f: FileItem) => {
    confirm('Xóa tệp tin', `Bạn chắc chắn muốn xóa "${f.originalName}"? Hành động này không thể hoàn tác.`, async () => {
      try {
        await fileService.remove(f.id);
        success('Đã xóa tệp tin');
        fetchFiles(meta.page);
        fetchStats();
        if (detail?.id === f.id) setDetail(null);
      } catch {
        showError('Xóa thất bại');
      }
    }, { danger: true, confirmLabel: 'Xóa tệp' });
  };

  const totalOcr = stats ? files.filter(f => f.hasOcr).length : 0;

  return (
    <div className="fm">
      {/* Hero */}
      <section className="fm-hero">
        <div className="fm-hero-left">
          <div className="fm-hero-badge"><FolderOpen size={14} /> MinIO Object Storage</div>
          <h1>Quản lý tài liệu</h1>
          <p>Kho lưu trữ trung tâm cho toàn bộ tài liệu số của hệ thống NCKH. Quản lý file upload, metadata OCR, tác giả, đề tài liên kết.</p>
          <div className="fm-hero-search">
            <Search size={18} />
            <input
              type="text"
              placeholder="Tìm theo tên tệp, tiêu đề OCR, tác giả..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchFiles(1)}
            />
            <button onClick={() => fetchFiles(1)}>Tìm kiếm</button>
          </div>
        </div>
        {stats && (
          <div className="fm-hero-right">
            <div className="fm-hero-stat">
              <span className="fm-hero-n">{stats.total}</span>
              <span className="fm-hero-l">Tệp tin</span>
            </div>
            <div className="fm-hero-stat">
              <span className="fm-hero-n">{stats.totalSizeHuman}</span>
              <span className="fm-hero-l">Dung lượng</span>
            </div>
            <div className="fm-hero-stat">
              <span className="fm-hero-n">+{stats.recentWeek}</span>
              <span className="fm-hero-l">7 ngày qua</span>
            </div>
          </div>
        )}
      </section>

      {/* Stat Cards */}
      {stats && (
        <section className="fm-stats">
          <StatCard icon={<Database size={20} />} color="#2563eb" bg="#dbeafe" val={stats.total} label="Tổng số tệp" sub="Trên toàn hệ thống" />
          <StatCard icon={<HardDrive size={20} />} color="#059669" bg="#d1fae5" val={stats.totalSizeHuman} label="Dung lượng" sub="Đang sử dụng" />
          <StatCard icon={<TrendingUp size={20} />} color="#d97706" bg="#fef3c7" val={`+${stats.recentWeek}`} label="Upload tuần này" sub="7 ngày gần nhất" />
          <StatCard icon={<FileCheck size={20} />} color="#8b5cf6" bg="#ede9fe" val={stats.byMime.length} label="Định dạng" sub={`${totalOcr} file có OCR`} />
        </section>
      )}

      {/* Main layout: filter sidebar + content */}
      <section className="fm-main">
        <aside className="fm-sidebar surface-card">
          <div className="fm-side-section">
            <h4 className="fm-side-title"><Filter size={14} /> Bộ lọc</h4>
            <div className="fm-side-field">
              <label>Phân loại</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">Tất cả phân loại</option>
                {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div className="fm-side-field">
              <label>Định dạng tệp</label>
              <select value={mimeFilter} onChange={(e) => setMimeFilter(e.target.value)}>
                <option value="">Tất cả định dạng</option>
                <option value="pdf">PDF</option>
                <option value="word">Word / DOCX</option>
                <option value="image">Hình ảnh</option>
                <option value="text">Văn bản thuần</option>
              </select>
            </div>
            <div className="fm-side-field">
              <label>Trạng thái OCR</label>
              <select value={ocrFilter} onChange={(e) => setOcrFilter(e.target.value as any)}>
                <option value="">Tất cả</option>
                <option value="true">Đã trích xuất OCR</option>
                <option value="false">Chưa xử lý OCR</option>
              </select>
            </div>
          </div>

          {stats && stats.byMime.length > 0 && (
            <div className="fm-side-section">
              <h4 className="fm-side-title"><File size={14} /> Phân bố định dạng</h4>
              <div className="fm-mime-list">
                {stats.byMime.slice(0, 6).map((m) => (
                  <div key={m.mimeType} className="fm-mime-item">
                    <span className="fm-mime-label">{m.label}</span>
                    <span className="fm-mime-count">{m.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {stats && stats.byCategory.length > 0 && (
            <div className="fm-side-section">
              <h4 className="fm-side-title"><Hash size={14} /> Phân loại</h4>
              <div className="fm-mime-list">
                {stats.byCategory.map((c) => (
                  <div key={c.category} className="fm-mime-item">
                    <span className="fm-mime-label" style={{ color: CATEGORY_COLOR[c.category] }}>● {CATEGORY_LABEL[c.category] || c.category}</span>
                    <span className="fm-mime-count">{c.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>

        <div className="fm-content">
          <div className="fm-toolbar surface-card">
            <div className="fm-toolbar-left">
              <span className="fm-toolbar-count">{meta.total.toLocaleString('vi-VN')} tệp</span>
              {(category || mimeFilter || ocrFilter || search) && (
                <button className="fm-clear-btn" onClick={() => { setCategory(''); setMimeFilter(''); setOcrFilter(''); setSearch(''); fetchFiles(1); }}>
                  <X size={14} /> Xóa bộ lọc
                </button>
              )}
            </div>
            <div className="fm-toolbar-right">
              <div className="fm-view-switch">
                <button className={view === 'list' ? 'active' : ''} onClick={() => setView('list')} title="Xem dạng bảng"><ListIcon size={14} /></button>
                <button className={view === 'grid' ? 'active' : ''} onClick={() => setView('grid')} title="Xem dạng lưới"><Grid size={14} /></button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="surface-card fm-state"><Loader2 className="spin" size={28} /><p>Đang tải danh sách tệp tin...</p></div>
          ) : files.length === 0 ? (
            <div className="surface-card fm-state">
              <Database size={44} style={{ opacity: 0.25 }} />
              <p>Không có tệp tin nào phù hợp</p>
              <span className="fm-state-sub">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</span>
            </div>
          ) : view === 'list' ? (
            <div className="surface-card fm-table-wrap">
              <table className="fm-table">
                <thead>
                  <tr>
                    <th>Tên tệp</th>
                    <th>Phân loại</th>
                    <th>Kích thước</th>
                    <th>OCR</th>
                    <th>Người tải</th>
                    <th>Đề tài</th>
                    <th>Ngày</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {files.map((f) => (
                    <tr key={f.id} onClick={() => openDetail(f)} className="fm-row">
                      <td>
                        <div className="fm-file-cell">
                          <div className="fm-file-ic">{getFileIcon(f.mimeType)}</div>
                          <div>
                            <div className="fm-file-name">{f.originalName}</div>
                            {f.extractedTitle && <div className="fm-file-meta">{f.extractedTitle.substring(0, 70)}{f.extractedTitle.length > 70 ? '...' : ''}</div>}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="fm-cat-badge" style={{ background: `${CATEGORY_COLOR[f.category]}18`, color: CATEGORY_COLOR[f.category] }}>
                          {CATEGORY_LABEL[f.category] || f.category}
                        </span>
                      </td>
                      <td className="fm-size">{f.sizeHuman}</td>
                      <td>
                        {f.hasOcr ? (
                          <span className="fm-ocr-badge"><Sparkles size={11} /> {f.ocrConfidence ? `${Math.round(f.ocrConfidence * 100)}%` : 'Đã xử lý'}</span>
                        ) : <span className="fm-dim">—</span>}
                      </td>
                      <td className="fm-cell-name">{f.uploader?.name || '—'}</td>
                      <td>
                        {f.work ? (
                          <a href={`/projects/${f.work.id}`} onClick={(e) => e.stopPropagation()} className="fm-work-link">
                            {f.work.title.substring(0, 30)}{f.work.title.length > 30 ? '...' : ''}
                          </a>
                        ) : <span className="fm-dim">—</span>}
                      </td>
                      <td className="fm-date">{new Date(f.createdAt).toLocaleDateString('vi-VN')}</td>
                      <td>
                        <div className="fm-actions" onClick={(e) => e.stopPropagation()}>
                          <button className="fm-ic-btn" title="Xem chi tiết" onClick={() => openDetail(f)}><Eye size={14} /></button>
                          <button className="fm-ic-btn" title="Tải xuống" onClick={() => handleDownload(f)}><Download size={14} /></button>
                          {isAdmin && <button className="fm-ic-btn danger" title="Xóa" onClick={() => handleDelete(f)}><Trash2 size={14} /></button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="fm-grid">
              {files.map((f) => (
                <div key={f.id} className="surface-card fm-grid-card" onClick={() => openDetail(f)}>
                  <div className="fm-grid-head">
                    <div className="fm-grid-ic">{getFileIcon(f.mimeType, 26)}</div>
                    <span className="fm-cat-badge" style={{ background: `${CATEGORY_COLOR[f.category]}18`, color: CATEGORY_COLOR[f.category] }}>
                      {CATEGORY_LABEL[f.category]}
                    </span>
                  </div>
                  <div className="fm-grid-name" title={f.originalName}>{f.originalName}</div>
                  {f.extractedTitle && <div className="fm-grid-title">{f.extractedTitle.substring(0, 60)}</div>}
                  <div className="fm-grid-foot">
                    <span>{f.sizeHuman}</span>
                    {f.hasOcr && <span className="fm-ocr-mini"><Sparkles size={10} /> {Math.round((f.ocrConfidence || 0) * 100)}%</span>}
                    <span className="fm-dim">{new Date(f.createdAt).toLocaleDateString('vi-VN')}</span>
                  </div>
                  <div className="fm-grid-actions" onClick={(e) => e.stopPropagation()}>
                    <button className="fm-ic-btn" onClick={() => openDetail(f)}><Eye size={14} /></button>
                    <button className="fm-ic-btn" onClick={() => handleDownload(f)}><Download size={14} /></button>
                    {isAdmin && <button className="fm-ic-btn danger" onClick={() => handleDelete(f)}><Trash2 size={14} /></button>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {meta.totalPages > 1 && (
            <div className="surface-card fm-pager">
              <button disabled={meta.page <= 1} onClick={() => fetchFiles(meta.page - 1)}>
                <ChevronLeft size={16} /> Trang trước
              </button>
              <span>Trang <b>{meta.page}</b> / {meta.totalPages}</span>
              <button disabled={meta.page >= meta.totalPages} onClick={() => fetchFiles(meta.page + 1)}>
                Trang sau <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      </section>

      {detail && (
        <Modal open={true} onClose={() => setDetail(null)} title="Chi tiết tệp tin" size="lg">
          <div className="fm-detail">
            <div className="fm-detail-head">
              <div className="fm-detail-icon">{getFileIcon(detail.mimeType, 26)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3>{detail.originalName}</h3>
                <div className="fm-detail-sub">
                  <span className="fm-cat-badge" style={{ background: `${CATEGORY_COLOR[detail.category]}18`, color: CATEGORY_COLOR[detail.category] }}>
                    {CATEGORY_LABEL[detail.category]}
                  </span>
                  <span>{detail.sizeHuman}</span>
                  <span className="fm-dim">{detail.mimeType}</span>
                </div>
              </div>
            </div>

            <div className="fm-detail-grid">
              <div><User size={14} /><span>Người tải:</span> {detail.uploader?.name} {detail.uploader?.department ? `• ${detail.uploader.department}` : ''}</div>
              <div><Calendar size={14} /><span>Upload lúc:</span> {new Date(detail.createdAt).toLocaleString('vi-VN')}</div>
              {detail.work && <div><Hash size={14} /><span>Đề tài:</span> {detail.work.title}</div>}
            </div>

            {detail.hasOcr && (
              <div className="fm-detail-ocr">
                <div className="fm-detail-label"><Sparkles size={14} /> Thông tin trích xuất OCR</div>
                {detail.extractedTitle && <div><b>Tiêu đề:</b> {detail.extractedTitle}</div>}
                {detail.extractedAuthors && <div><b>Tác giả:</b> {detail.extractedAuthors}</div>}
                {detail.extractedKeywords?.length > 0 && (
                  <div className="fm-kw-list">
                    {detail.extractedKeywords.slice(0, 12).map((k, i) => (
                      <span key={i} className="fm-kw">{k}</span>
                    ))}
                  </div>
                )}
                {detail.ocrConfidence !== undefined && (
                  <div>Độ tin cậy: <b style={{ color: '#059669' }}>{Math.round(detail.ocrConfidence * 100)}%</b></div>
                )}
              </div>
            )}

            {previewUrl && detail.mimeType.includes('pdf') && (
              <iframe src={previewUrl} className="fm-pdf-preview" title="preview" />
            )}
            {previewUrl && detail.mimeType.includes('image') && (
              <img src={previewUrl} alt="preview" className="fm-img-preview" />
            )}

            <div className="fm-detail-actions">
              <button className="btn-primary" onClick={() => handleDownload(detail)}><Download size={16} /> Tải xuống</button>
              {isAdmin && <button className="btn-danger" onClick={() => handleDelete(detail)}><Trash2 size={16} /> Xóa</button>}
              <button className="btn-outline" onClick={() => setDetail(null)}><X size={16} /> Đóng</button>
            </div>
          </div>
        </Modal>
      )}

      <style>{fmStyles}</style>
    </div>
  );
}

function StatCard({ icon, color, bg, val, label, sub }: any) {
  return (
    <div className="surface-card fm-stat-card">
      <div className="fm-stat-icon" style={{ background: bg, color }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div className="fm-stat-val">{val}</div>
        <div className="fm-stat-label">{label}</div>
        <div className="fm-stat-sub">{sub}</div>
      </div>
    </div>
  );
}

const fmStyles = `
  .fm { display: flex; flex-direction: column; gap: 1.5rem; padding-bottom: 3rem; }

  /* Hero */
  .fm-hero {
    background: var(--hero-gradient);
    border-radius: 20px; padding: 2.5rem;
    display: flex; justify-content: space-between; align-items: center;
    color: #fff; gap: 2rem; flex-wrap: wrap;
  }
  .fm-hero-left { flex: 1; min-width: 320px; }
  .fm-hero-badge {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 4px 12px; border-radius: 100px; background: rgba(255,255,255,.15);
    font-size: .7rem; font-weight: 700; letter-spacing: .5px; margin-bottom: .75rem;
  }
  .fm-hero-left h1 { font-size: 1.75rem; font-weight: 800; color: #fff; margin-bottom: .5rem; }
  .fm-hero-left p { font-size: .9rem; opacity: .85; line-height: 1.55; max-width: 560px; margin-bottom: 1.5rem; }
  .fm-hero-search {
    display: flex; gap: .5rem; background: rgba(255,255,255,.15);
    border-radius: 14px; padding: 4px; backdrop-filter: blur(8px); max-width: 560px;
  }
  .fm-hero-search input {
    flex: 1; border: none; outline: none; padding: .75rem 1rem;
    font-size: .9rem; background: transparent; color: #fff;
  }
  .fm-hero-search input::placeholder { color: rgba(255,255,255,.6); }
  .fm-hero-search button {
    background: #fff; color: var(--primary-indigo); border: none;
    padding: .75rem 1.5rem; border-radius: 10px; font-weight: 700; cursor: pointer; font-size: .85rem;
  }
  .fm-hero-search svg { color: rgba(255,255,255,.7); margin: auto .5rem; }
  .fm-hero-right { display: flex; gap: 1.25rem; }
  .fm-hero-stat { display: flex; flex-direction: column; text-align: center; padding: 0 .5rem; }
  .fm-hero-n { font-size: 1.5rem; font-weight: 800; line-height: 1; }
  .fm-hero-l { font-size: .72rem; opacity: .75; margin-top: 4px; font-weight: 600; }

  /* Stats */
  .fm-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; }
  .fm-stat-card { display: flex; align-items: center; gap: 1rem; padding: 1.25rem !important; transition: transform .15s; }
  .fm-stat-card:hover { transform: translateY(-2px); }
  .fm-stat-icon { width: 46px; height: 46px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .fm-stat-val { font-size: 1.5rem; font-weight: 800; color: var(--on-surface); line-height: 1.1; }
  .fm-stat-label { font-size: .82rem; font-weight: 600; color: var(--on-surface-muted); margin-top: 2px; }
  .fm-stat-sub { font-size: .7rem; color: var(--on-surface-variant); margin-top: 2px; }

  /* Main layout */
  .fm-main { display: grid; grid-template-columns: 260px 1fr; gap: 1.5rem; align-items: start; }
  .fm-sidebar { padding: 1.25rem !important; display: flex; flex-direction: column; gap: 1.5rem; position: sticky; top: 1rem; }
  .fm-side-section h4.fm-side-title {
    display: flex; align-items: center; gap: 6px;
    font-size: .72rem; font-weight: 800; color: var(--on-surface-muted);
    text-transform: uppercase; letter-spacing: .5px; margin-bottom: .75rem;
  }
  .fm-side-field { margin-bottom: .75rem; }
  .fm-side-field label { display: block; font-size: .78rem; font-weight: 600; color: var(--on-surface); margin-bottom: .35rem; }
  .fm-side-field select {
    width: 100%; padding: .5rem .65rem; border: 1px solid var(--surface-variant);
    border-radius: 8px; background: #fff; font-size: .82rem; color: var(--on-surface);
    cursor: pointer; transition: border .15s;
  }
  .fm-side-field select:focus { outline: none; border-color: var(--primary-indigo); }
  .fm-mime-list { display: flex; flex-direction: column; gap: .4rem; }
  .fm-mime-item {
    display: flex; justify-content: space-between; align-items: center;
    padding: .4rem .6rem; border-radius: 8px; background: var(--surface-low);
    font-size: .8rem;
  }
  .fm-mime-label { color: var(--on-surface); font-weight: 500; }
  .fm-mime-count { font-weight: 700; color: var(--primary-indigo); font-variant-numeric: tabular-nums; }

  /* Content */
  .fm-content { display: flex; flex-direction: column; gap: 1rem; min-width: 0; }
  .fm-toolbar {
    display: flex; justify-content: space-between; align-items: center;
    padding: .75rem 1rem !important;
  }
  .fm-toolbar-left { display: flex; align-items: center; gap: 1rem; }
  .fm-toolbar-count { font-size: .85rem; color: var(--on-surface-muted); font-weight: 600; }
  .fm-clear-btn {
    display: inline-flex; align-items: center; gap: .25rem;
    padding: .25rem .65rem; background: var(--surface-low); border: none;
    border-radius: 6px; font-size: .75rem; color: var(--on-surface-muted); cursor: pointer;
  }
  .fm-clear-btn:hover { background: #fee2e2; color: #dc2626; }
  .fm-view-switch { display: flex; background: var(--surface-low); border-radius: 8px; padding: 2px; }
  .fm-view-switch button {
    padding: .35rem .55rem; background: transparent; border: none;
    border-radius: 6px; cursor: pointer; color: var(--on-surface-muted);
  }
  .fm-view-switch button.active { background: #fff; color: var(--primary-indigo); box-shadow: 0 1px 3px rgba(0,0,0,.08); }

  .fm-state { padding: 3rem !important; text-align: center; display: flex; flex-direction: column; align-items: center; gap: .5rem; color: var(--on-surface-variant); }
  .fm-state p { font-weight: 600; color: var(--on-surface-muted); font-size: .9rem; }
  .fm-state-sub { font-size: .8rem; color: var(--on-surface-variant); }

  /* Table */
  .fm-table-wrap { padding: 0 !important; overflow: hidden; }
  .fm-table { width: 100%; border-collapse: collapse; }
  .fm-table thead { background: var(--surface-low); }
  .fm-table th {
    text-align: left; padding: .75rem 1rem;
    font-size: .68rem; font-weight: 800; color: var(--on-surface-muted);
    text-transform: uppercase; letter-spacing: .5px;
  }
  .fm-table td {
    padding: .85rem 1rem; border-top: 1px solid var(--surface-variant);
    font-size: .85rem; vertical-align: middle;
  }
  .fm-row { cursor: pointer; transition: background .12s; }
  .fm-row:hover { background: var(--surface-low); }
  .fm-file-cell { display: flex; align-items: center; gap: .75rem; min-width: 0; }
  .fm-file-ic { width: 36px; height: 36px; background: var(--surface-low); border-radius: 9px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .fm-file-name { font-weight: 600; color: var(--on-surface); max-width: 320px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .fm-file-meta { font-size: .72rem; color: var(--on-surface-muted); margin-top: 2px; max-width: 320px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .fm-cat-badge { padding: .2rem .6rem; border-radius: 6px; font-size: .7rem; font-weight: 700; display: inline-block; white-space: nowrap; }
  .fm-size { color: var(--on-surface-muted); font-variant-numeric: tabular-nums; font-weight: 500; }
  .fm-ocr-badge {
    display: inline-flex; align-items: center; gap: .25rem;
    padding: .2rem .5rem; background: #ede9fe; color: #7c3aed;
    border-radius: 100px; font-size: .7rem; font-weight: 700;
  }
  .fm-work-link { color: var(--primary-indigo); text-decoration: none; font-size: .8rem; font-weight: 500; }
  .fm-work-link:hover { text-decoration: underline; }
  .fm-date { color: var(--on-surface-muted); font-size: .78rem; font-variant-numeric: tabular-nums; }
  .fm-cell-name { color: var(--on-surface); font-size: .82rem; }
  .fm-dim { color: var(--on-surface-variant); font-size: .8rem; }

  .fm-actions { display: flex; gap: .25rem; }
  .fm-ic-btn {
    background: var(--surface-low); border: none;
    width: 30px; height: 30px; border-radius: 7px;
    display: inline-flex; align-items: center; justify-content: center;
    cursor: pointer; color: var(--on-surface-muted); transition: all .12s;
  }
  .fm-ic-btn:hover { background: var(--primary-blue-light); color: var(--primary-indigo); }
  .fm-ic-btn.danger:hover { background: #fee2e2; color: #dc2626; }

  /* Grid view */
  .fm-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 1rem; }
  .fm-grid-card { padding: 1.25rem !important; cursor: pointer; transition: all .15s; display: flex; flex-direction: column; gap: .5rem; }
  .fm-grid-card:hover { transform: translateY(-3px); box-shadow: 0 8px 20px rgba(0,0,0,.08); }
  .fm-grid-head { display: flex; justify-content: space-between; align-items: center; }
  .fm-grid-ic { width: 52px; height: 52px; background: var(--surface-low); border-radius: 12px; display: flex; align-items: center; justify-content: center; }
  .fm-grid-name { font-weight: 700; color: var(--on-surface); font-size: .88rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-top: .25rem; }
  .fm-grid-title { font-size: .75rem; color: var(--on-surface-muted); line-height: 1.4; max-height: 2.6em; overflow: hidden; }
  .fm-grid-foot { display: flex; align-items: center; gap: .5rem; flex-wrap: wrap; font-size: .72rem; color: var(--on-surface-muted); margin-top: .25rem; }
  .fm-ocr-mini { display: inline-flex; align-items: center; gap: .2rem; color: #7c3aed; font-weight: 600; }
  .fm-grid-actions { display: flex; gap: .25rem; justify-content: flex-end; margin-top: .5rem; padding-top: .5rem; border-top: 1px solid var(--surface-variant); }

  /* Pager */
  .fm-pager { display: flex; justify-content: space-between; align-items: center; padding: .85rem 1.25rem !important; }
  .fm-pager button {
    display: inline-flex; align-items: center; gap: .35rem;
    padding: .5rem 1rem; background: var(--surface-low); border: none;
    border-radius: 8px; cursor: pointer; font-size: .85rem; color: var(--on-surface);
    font-weight: 600; transition: all .12s;
  }
  .fm-pager button:not(:disabled):hover { background: var(--primary-blue-light); color: var(--primary-indigo); }
  .fm-pager button:disabled { opacity: 0.4; cursor: not-allowed; }
  .fm-pager span { font-size: .85rem; color: var(--on-surface-muted); }
  .fm-pager span b { color: var(--on-surface); }

  /* Detail modal */
  .fm-detail-head { display: flex; gap: 1rem; align-items: flex-start; padding-bottom: 1rem; border-bottom: 1px solid var(--surface-variant); margin-bottom: 1rem; }
  .fm-detail-icon { width: 56px; height: 56px; background: var(--surface-low); border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .fm-detail-head h3 { margin: 0; font-size: 1rem; color: var(--on-surface); word-break: break-all; font-weight: 700; }
  .fm-detail-sub { display: flex; gap: .75rem; margin-top: .5rem; flex-wrap: wrap; font-size: .8rem; color: var(--on-surface-muted); align-items: center; }
  .fm-detail-grid { display: grid; grid-template-columns: 1fr; gap: .5rem; margin-bottom: 1rem; }
  .fm-detail-grid > div { display: flex; align-items: center; gap: .5rem; font-size: .85rem; color: var(--on-surface); padding: .5rem .75rem; background: var(--surface-low); border-radius: 8px; }
  .fm-detail-grid svg { color: var(--on-surface-variant); flex-shrink: 0; }
  .fm-detail-grid span { color: var(--on-surface-muted); font-weight: 600; margin-right: .25rem; }
  .fm-detail-ocr { background: linear-gradient(135deg, #faf5ff, #f3e8ff); border: 1px solid #e9d5ff; border-radius: 12px; padding: 1rem 1.25rem; margin: 1rem 0; font-size: .85rem; color: var(--on-surface); }
  .fm-detail-ocr > div { margin: .4rem 0; }
  .fm-detail-label { font-weight: 700; color: #7c3aed; display: flex; align-items: center; gap: .35rem; margin-bottom: .75rem !important; font-size: .82rem; }
  .fm-kw-list { display: flex; flex-wrap: wrap; gap: .35rem; margin-top: .5rem; }
  .fm-kw { padding: .2rem .55rem; background: #fff; color: #7c3aed; border: 1px solid #e9d5ff; border-radius: 100px; font-size: .72rem; font-weight: 500; }
  .fm-pdf-preview { width: 100%; height: 420px; border: 1px solid var(--surface-variant); border-radius: 10px; margin: 1rem 0; }
  .fm-img-preview { max-width: 100%; max-height: 420px; border-radius: 10px; margin: 1rem 0; display: block; border: 1px solid var(--surface-variant); }
  .fm-detail-actions { display: flex; gap: .5rem; justify-content: flex-end; padding-top: 1rem; border-top: 1px solid var(--surface-variant); margin-top: 1rem; }

  .spin { animation: spin 1s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  @media (max-width: 1024px) {
    .fm-main { grid-template-columns: 1fr; }
    .fm-sidebar { position: static; }
    .fm-stats { grid-template-columns: repeat(2, 1fr); }
  }
`;
