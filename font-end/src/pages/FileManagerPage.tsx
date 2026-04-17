import { useState, useEffect } from 'react';
import {
  Search, Filter, FileText, File, Image as ImageIcon, Archive, Download, Trash2,
  Database, HardDrive, TrendingUp, FileCheck, Eye, X, Calendar, User,
  Hash, Sparkles, ChevronLeft, ChevronRight, Loader2,
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

function getFileIcon(mimeType: string) {
  if (mimeType.includes('pdf')) return <FileText size={20} style={{ color: '#dc2626' }} />;
  if (mimeType.includes('word') || mimeType.includes('docx')) return <FileText size={20} style={{ color: '#2563eb' }} />;
  if (mimeType.includes('image')) return <ImageIcon size={20} style={{ color: '#10b981' }} />;
  if (mimeType.includes('zip') || mimeType.includes('rar')) return <Archive size={20} style={{ color: '#f59e0b' }} />;
  return <File size={20} style={{ color: '#64748b' }} />;
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
  const [showFilter, setShowFilter] = useState(false);

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
      showError('Không tải được danh sách file');
    }
    setLoading(false);
  };

  const fetchStats = async () => {
    try {
      setStats(await fileService.getStats());
    } catch { /* ignore */ }
  };

  useEffect(() => { fetchFiles(); fetchStats(); }, []);

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
        success('Đã xóa file');
        fetchFiles(meta.page);
        fetchStats();
        if (detail?.id === f.id) setDetail(null);
      } catch {
        showError('Xóa thất bại');
      }
    }, { danger: true, confirmLabel: 'Xóa' });
  };

  return (
    <div className="fm-page">
      <div className="fm-header">
        <div>
          <h1 className="fm-title">Quản lý tài liệu</h1>
          <p className="fm-subtitle">Tất cả tệp tin được lưu trữ trên hệ thống MinIO</p>
        </div>
      </div>

      {stats && (
        <div className="fm-stats">
          <div className="surface-card fm-stat-card">
            <div className="fm-stat-icon" style={{ background: '#dbeafe', color: '#2563eb' }}><Database size={22} /></div>
            <div>
              <div className="fm-stat-val">{stats.total.toLocaleString('vi-VN')}</div>
              <div className="fm-stat-label">Tổng số tệp</div>
            </div>
          </div>
          <div className="surface-card fm-stat-card">
            <div className="fm-stat-icon" style={{ background: '#dcfce7', color: '#059669' }}><HardDrive size={22} /></div>
            <div>
              <div className="fm-stat-val">{stats.totalSizeHuman}</div>
              <div className="fm-stat-label">Dung lượng sử dụng</div>
            </div>
          </div>
          <div className="surface-card fm-stat-card">
            <div className="fm-stat-icon" style={{ background: '#fef3c7', color: '#d97706' }}><TrendingUp size={22} /></div>
            <div>
              <div className="fm-stat-val">{stats.recentWeek}</div>
              <div className="fm-stat-label">Upload 7 ngày qua</div>
            </div>
          </div>
          <div className="surface-card fm-stat-card">
            <div className="fm-stat-icon" style={{ background: '#ede9fe', color: '#8b5cf6' }}><FileCheck size={22} /></div>
            <div>
              <div className="fm-stat-val">{stats.byMime.length}</div>
              <div className="fm-stat-label">Định dạng tệp</div>
            </div>
          </div>
        </div>
      )}

      <div className="surface-card fm-toolbar">
        <div className="fm-search">
          <Search size={18} />
          <input
            type="text"
            placeholder="Tìm theo tên tệp, tiêu đề OCR..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchFiles(1)}
          />
        </div>
        <button className="btn-outline" onClick={() => setShowFilter(!showFilter)}>
          <Filter size={16} /> Lọc
        </button>
        <button className="btn-primary" onClick={() => fetchFiles(1)}>Tìm</button>
      </div>

      {showFilter && (
        <div className="surface-card fm-filters">
          <div className="fm-filter-row">
            <div className="fm-filter-item">
              <label>Phân loại</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">Tất cả</option>
                {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div className="fm-filter-item">
              <label>Định dạng</label>
              <select value={mimeFilter} onChange={(e) => setMimeFilter(e.target.value)}>
                <option value="">Tất cả</option>
                <option value="pdf">PDF</option>
                <option value="word">Word</option>
                <option value="image">Hình ảnh</option>
                <option value="text">Văn bản</option>
              </select>
            </div>
            <div className="fm-filter-item">
              <label>OCR</label>
              <select value={ocrFilter} onChange={(e) => setOcrFilter(e.target.value as any)}>
                <option value="">Tất cả</option>
                <option value="true">Đã OCR</option>
                <option value="false">Chưa OCR</option>
              </select>
            </div>
            <button className="btn-primary" onClick={() => fetchFiles(1)}>Áp dụng</button>
          </div>
        </div>
      )}

      <div className="surface-card fm-list">
        {loading ? (
          <div className="fm-loading"><Loader2 className="spin" size={24} /> Đang tải...</div>
        ) : files.length === 0 ? (
          <div className="fm-empty">
            <Database size={40} />
            <p>Không có tệp tin nào</p>
          </div>
        ) : (
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
                      {getFileIcon(f.mimeType)}
                      <div>
                        <div className="fm-file-name">{f.originalName}</div>
                        {f.extractedTitle && <div className="fm-file-meta">{f.extractedTitle.substring(0, 60)}</div>}
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="fm-cat-badge" style={{ background: `${CATEGORY_COLOR[f.category]}22`, color: CATEGORY_COLOR[f.category] }}>
                      {CATEGORY_LABEL[f.category] || f.category}
                    </span>
                  </td>
                  <td className="fm-size">{f.sizeHuman}</td>
                  <td>
                    {f.hasOcr ? (
                      <span className="fm-ocr-badge">
                        <Sparkles size={12} /> {f.ocrConfidence ? `${Math.round(f.ocrConfidence * 100)}%` : 'Đã'}
                      </span>
                    ) : <span style={{ color: '#94a3b8' }}>—</span>}
                  </td>
                  <td>{f.uploader?.name || '—'}</td>
                  <td>
                    {f.work ? (
                      <a href={`/projects/${f.work.id}`} onClick={(e) => e.stopPropagation()} className="fm-work-link">
                        {f.work.title.substring(0, 30)}
                      </a>
                    ) : <span style={{ color: '#94a3b8' }}>—</span>}
                  </td>
                  <td className="fm-date">{new Date(f.createdAt).toLocaleDateString('vi-VN')}</td>
                  <td>
                    <div className="fm-actions" onClick={(e) => e.stopPropagation()}>
                      <button className="fm-ic-btn" title="Xem" onClick={() => openDetail(f)}><Eye size={14} /></button>
                      <button className="fm-ic-btn" title="Tải" onClick={() => handleDownload(f)}><Download size={14} /></button>
                      {isAdmin && <button className="fm-ic-btn danger" title="Xóa" onClick={() => handleDelete(f)}><Trash2 size={14} /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {meta.totalPages > 1 && (
          <div className="fm-pager">
            <button disabled={meta.page <= 1} onClick={() => fetchFiles(meta.page - 1)}>
              <ChevronLeft size={16} /> Trước
            </button>
            <span>Trang {meta.page}/{meta.totalPages} • {meta.total} tệp</span>
            <button disabled={meta.page >= meta.totalPages} onClick={() => fetchFiles(meta.page + 1)}>
              Sau <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {detail && (
        <Modal open={true} onClose={() => setDetail(null)} title="Chi tiết tệp tin" size="lg">
          <div className="fm-detail">
            <div className="fm-detail-head">
              <div className="fm-detail-icon">{getFileIcon(detail.mimeType)}</div>
              <div style={{ flex: 1 }}>
                <h3>{detail.originalName}</h3>
                <div className="fm-detail-sub">
                  <span className="fm-cat-badge" style={{ background: `${CATEGORY_COLOR[detail.category]}22`, color: CATEGORY_COLOR[detail.category] }}>
                    {CATEGORY_LABEL[detail.category]}
                  </span>
                  <span>{detail.sizeHuman}</span>
                  <span>{detail.mimeType}</span>
                </div>
              </div>
            </div>

            <div className="fm-detail-meta">
              <div><User size={14} /> {detail.uploader?.name} • {detail.uploader?.department}</div>
              <div><Calendar size={14} /> {new Date(detail.createdAt).toLocaleString('vi-VN')}</div>
              {detail.work && <div><Hash size={14} /> Đề tài: {detail.work.title}</div>}
            </div>

            {detail.hasOcr && (
              <div className="fm-detail-ocr">
                <div className="fm-detail-label"><Sparkles size={14} /> Thông tin OCR</div>
                {detail.extractedTitle && <div><b>Tiêu đề:</b> {detail.extractedTitle}</div>}
                {detail.extractedAuthors && <div><b>Tác giả:</b> {detail.extractedAuthors}</div>}
                {detail.extractedKeywords?.length > 0 && (
                  <div className="fm-kw-list">
                    {detail.extractedKeywords.slice(0, 10).map((k, i) => (
                      <span key={i} className="fm-kw">{k}</span>
                    ))}
                  </div>
                )}
                {detail.ocrConfidence !== undefined && (
                  <div>Độ tin cậy OCR: <b>{Math.round(detail.ocrConfidence * 100)}%</b></div>
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
              {isAdmin && (
                <button className="btn-danger" onClick={() => handleDelete(detail)}><Trash2 size={16} /> Xóa</button>
              )}
              <button className="btn-outline" onClick={() => setDetail(null)}><X size={16} /> Đóng</button>
            </div>
          </div>
        </Modal>
      )}

      <style>{`
        .fm-page { max-width: 1400px; margin: 0 auto; padding: 1.5rem; }
        .fm-header { margin-bottom: 1.5rem; }
        .fm-title { font-size: 1.75rem; font-weight: 700; color: #1e3a8a; margin: 0; }
        .fm-subtitle { color: #64748b; margin-top: 0.25rem; }

        .fm-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 1.25rem; }
        .fm-stat-card { display: flex; align-items: center; gap: 1rem; padding: 1.25rem; }
        .fm-stat-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
        .fm-stat-val { font-size: 1.5rem; font-weight: 700; color: #1e293b; line-height: 1.2; }
        .fm-stat-label { font-size: 0.8rem; color: #64748b; }

        .fm-toolbar { display: flex; gap: 0.75rem; padding: 0.75rem 1rem; margin-bottom: 1rem; align-items: center; }
        .fm-search { flex: 1; display: flex; align-items: center; gap: 0.5rem; background: #f1f5f9; border-radius: 8px; padding: 0.5rem 0.75rem; }
        .fm-search input { flex: 1; background: transparent; border: none; outline: none; font-size: 0.9rem; }
        .fm-search svg { color: #64748b; }

        .fm-filters { padding: 1rem; margin-bottom: 1rem; }
        .fm-filter-row { display: grid; grid-template-columns: 1fr 1fr 1fr auto; gap: 0.75rem; align-items: end; }
        .fm-filter-item label { display: block; font-size: 0.8rem; font-weight: 600; color: #475569; margin-bottom: 0.25rem; }
        .fm-filter-item select { width: 100%; padding: 0.5rem 0.75rem; border: 1px solid #e2e8f0; border-radius: 8px; background: #fff; font-size: 0.9rem; }

        .fm-list { padding: 0; overflow: hidden; }
        .fm-table { width: 100%; border-collapse: collapse; }
        .fm-table thead { background: #f8fafc; }
        .fm-table th { text-align: left; padding: 0.75rem 1rem; font-size: 0.8rem; font-weight: 600; color: #475569; border-bottom: 1px solid #e2e8f0; text-transform: uppercase; letter-spacing: 0.3px; }
        .fm-table td { padding: 0.75rem 1rem; border-bottom: 1px solid #f1f5f9; font-size: 0.9rem; vertical-align: middle; }
        .fm-row { cursor: pointer; transition: background 0.12s; }
        .fm-row:hover { background: #eff6ff; }

        .fm-file-cell { display: flex; align-items: center; gap: 0.75rem; }
        .fm-file-name { font-weight: 500; color: #1e293b; }
        .fm-file-meta { font-size: 0.75rem; color: #64748b; margin-top: 0.15rem; }
        .fm-cat-badge { padding: 0.2rem 0.55rem; border-radius: 999px; font-size: 0.72rem; font-weight: 600; display: inline-block; }
        .fm-size { color: #475569; font-variant-numeric: tabular-nums; }
        .fm-ocr-badge { display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.2rem 0.5rem; background: #ede9fe; color: #7c3aed; border-radius: 999px; font-size: 0.72rem; font-weight: 600; }
        .fm-work-link { color: #2563eb; text-decoration: none; font-size: 0.82rem; }
        .fm-work-link:hover { text-decoration: underline; }
        .fm-date { color: #64748b; font-size: 0.82rem; }

        .fm-actions { display: flex; gap: 0.25rem; }
        .fm-ic-btn { background: #f1f5f9; border: none; width: 30px; height: 30px; border-radius: 7px; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; color: #475569; transition: all 0.12s; }
        .fm-ic-btn:hover { background: #dbeafe; color: #2563eb; }
        .fm-ic-btn.danger:hover { background: #fee2e2; color: #dc2626; }

        .fm-loading, .fm-empty { padding: 3rem; text-align: center; color: #94a3b8; display: flex; flex-direction: column; align-items: center; gap: 0.5rem; }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        .fm-pager { display: flex; justify-content: space-between; align-items: center; padding: 1rem; border-top: 1px solid #f1f5f9; }
        .fm-pager button { display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.5rem 0.9rem; background: #f1f5f9; border: none; border-radius: 8px; cursor: pointer; font-size: 0.85rem; color: #475569; }
        .fm-pager button:disabled { opacity: 0.4; cursor: not-allowed; }
        .fm-pager span { font-size: 0.85rem; color: #64748b; }

        .fm-detail-head { display: flex; gap: 1rem; align-items: flex-start; padding-bottom: 1rem; border-bottom: 1px solid #e2e8f0; margin-bottom: 1rem; }
        .fm-detail-icon { width: 52px; height: 52px; background: #f1f5f9; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
        .fm-detail-head h3 { margin: 0; font-size: 1.05rem; color: #1e293b; word-break: break-all; }
        .fm-detail-sub { display: flex; gap: 0.75rem; margin-top: 0.4rem; flex-wrap: wrap; font-size: 0.8rem; color: #64748b; align-items: center; }
        .fm-detail-meta { display: flex; flex-direction: column; gap: 0.4rem; font-size: 0.85rem; color: #475569; padding: 0.5rem 0; }
        .fm-detail-meta div { display: flex; align-items: center; gap: 0.5rem; }
        .fm-detail-meta svg { color: #94a3b8; }
        .fm-detail-ocr { background: #faf5ff; border: 1px solid #e9d5ff; border-radius: 10px; padding: 1rem; margin: 1rem 0; font-size: 0.85rem; }
        .fm-detail-ocr > div { margin: 0.3rem 0; }
        .fm-detail-label { font-weight: 600; color: #7c3aed; display: flex; align-items: center; gap: 0.3rem; margin-bottom: 0.5rem !important; }
        .fm-kw-list { display: flex; flex-wrap: wrap; gap: 0.35rem; margin-top: 0.4rem; }
        .fm-kw { padding: 0.2rem 0.55rem; background: #fff; color: #7c3aed; border: 1px solid #e9d5ff; border-radius: 999px; font-size: 0.72rem; }
        .fm-pdf-preview { width: 100%; height: 400px; border: 1px solid #e2e8f0; border-radius: 8px; margin: 1rem 0; }
        .fm-img-preview { max-width: 100%; max-height: 400px; border-radius: 8px; margin: 1rem 0; display: block; }
        .fm-detail-actions { display: flex; gap: 0.5rem; justify-content: flex-end; padding-top: 1rem; border-top: 1px solid #e2e8f0; margin-top: 1rem; }
      `}</style>
    </div>
  );
}
