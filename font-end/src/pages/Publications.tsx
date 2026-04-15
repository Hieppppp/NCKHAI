import { useState, useEffect, useRef } from 'react';
import {
  Upload,
  CheckCircle2,
  Calendar,
  Plus,
  X,
  RotateCcw,
  Check,
  Sparkles,
  Loader2,
  FileText,
  Search,
  Eye,
  Trash2,
  Edit3,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  ExternalLink,
  Filter,
  ArrowLeft,
  Copy,
  Clock,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { aiService } from '../services/aiService';
import { publicationService } from '../services/publicationService';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/common/Toast';
import { Role } from '../types';

interface Publication {
  id: number;
  title: string;
  authors: string;
  abstract?: string;
  journalName?: string;
  conferenceName?: string;
  publishedDate?: string;
  doi?: string;
  issn?: string;
  keywords: string[];
  confidence?: number;
  status: string;
  fileId?: number;
  workId?: number;
  user?: { id: number; name: string; email: string };
  file?: { id: number; originalName: string; path: string };
  work?: { id: number; title: string };
  createdAt: string;
  updatedAt: string;
}

type ViewMode = 'list' | 'upload' | 'detail' | 'edit';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: typeof Clock }> = {
  DRAFT: { label: 'Bản nháp', color: '#d97706', bg: '#fef3c7', icon: Clock },
  CONFIRMED: { label: 'Đã xác nhận', color: '#2563eb', bg: '#dbeafe', icon: CheckCircle },
  PUBLISHED: { label: 'Đã xuất bản', color: '#059669', bg: '#d1fae5', icon: CheckCircle2 },
};

export const Publications = () => {
  const { user, hasRole } = useAuth();
  const isAdmin = hasRole(Role.ADMIN);
  const { error: showError, success: showSuccess, confirm: showConfirm } = useToast();

  // View state
  const [view, setView] = useState<ViewMode>('list');

  // List state
  const [pubs, setPubs] = useState<Publication[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // Detail / Edit state
  const [selected, setSelected] = useState<Publication | null>(null);
  const [editForm, setEditForm] = useState<Record<string, any>>({});

  // Upload state
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedId, setSavedId] = useState<number | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, any> | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [newKeyword, setNewKeyword] = useState('');
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadPubs(); }, []);

  const loadPubs = async (page = 1) => {
    setLoading(true);
    try {
      const res = await publicationService.findAll({
        page, limit: 12, search: search || undefined, status: statusFilter || undefined,
      });
      setPubs(res.data);
      setMeta(res.meta);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const handleSearch = () => loadPubs(1);

  // --- Upload logic ---
  const processFile = async (file: File) => {
    setIsProcessing(true);
    setSavedId(null);
    setPreviewUrl(URL.createObjectURL(file));
    setEditMode(false);

    try {
      const result = await aiService.uploadAndProcess(file);
      const ext = result.extraction || {};
      const fd: Record<string, any> = {
        title: ext.title || '',
        authors: ext.authors || '',
        abstract: ext.abstract || '',
        publishedDate: '',
        journalName: '',
        conferenceName: '',
        doi: '',
        issn: '',
        keywords: ext.keywords || [],
        confidence: ext.confidence || 0,
        fileId: result.file?.id,
        ocrText: ext.text || '',
        engine: ext.engine || '',
      };
      setFormData(fd);
    } catch {
      showError('Lỗi xử lý file. Vui lòng thử lại.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) { setView('upload'); processFile(file); }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setView('upload'); processFile(file); }
  };

  const handleConfirmSave = async () => {
    if (!formData) return;
    setIsSaving(true);
    try {
      const pub = await publicationService.create({
        title: formData.title,
        authors: formData.authors,
        abstract: formData.abstract,
        journalName: formData.journalName || undefined,
        conferenceName: formData.conferenceName || undefined,
        publishedDate: formData.publishedDate || undefined,
        doi: formData.doi || undefined,
        issn: formData.issn || undefined,
        keywords: formData.keywords,
        confidence: formData.confidence,
        fileId: formData.fileId,
      });
      await publicationService.confirm(pub.id);
      setSavedId(pub.id);
      loadPubs();
    } catch { showError('Lỗi lưu công bố. Vui lòng thử lại.'); }
    setIsSaving(false);
  };

  const handleDelete = async (id: number) => {
    showConfirm('Xóa công bố', 'Bạn có chắc chắn muốn xóa công bố này? Thao tác không thể hoàn tác.', async () => {
    try {
      await publicationService.remove(id);
      if (selected?.id === id) { setSelected(null); setView('list'); }
      showSuccess('Đã xóa công bố');
      loadPubs();
    } catch { showError('Xóa thất bại'); }
    }, { confirmLabel: 'Xóa', danger: true });
  };

  const handleUpdate = async () => {
    if (!selected) return;
    setIsSaving(true);
    try {
      await publicationService.update(selected.id, editForm);
      setView('list');
      setSelected(null);
      loadPubs();
    } catch { showError('Cập nhật thất bại'); }
    setIsSaving(false);
  };

  const openDetail = async (id: number) => {
    try {
      const pub = await publicationService.findOne(id);
      setSelected(pub);
      setView('detail');
    } catch { /* ignore */ }
  };

  const openEdit = (pub: Publication) => {
    setSelected(pub);
    setEditForm({
      title: pub.title, authors: pub.authors, abstract: pub.abstract || '',
      journalName: pub.journalName || '', conferenceName: pub.conferenceName || '',
      publishedDate: pub.publishedDate ? pub.publishedDate.split('T')[0] : '',
      doi: pub.doi || '', issn: pub.issn || '',
      keywords: pub.keywords || [], status: pub.status,
    });
    setView('edit');
  };

  const handleCopyBib = (pub: Publication) => {
    const bib = `@article{pub${pub.id},\n  title={${pub.title}},\n  author={${pub.authors}},\n  year={${pub.publishedDate ? new Date(pub.publishedDate).getFullYear() : new Date(pub.createdAt).getFullYear()}},\n  ${pub.journalName ? `journal={${pub.journalName}},` : ''}\n  ${pub.doi ? `doi={${pub.doi}},` : ''}\n}`;
    navigator.clipboard.writeText(bib);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const resetUpload = () => {
    setFormData(null); setSavedId(null); setPreviewUrl(null);
    setEditMode(false); setView('list');
  };

  const confidencePercent = formData ? formData.confidence > 1 ? formData.confidence.toFixed(1) : (formData.confidence * 100).toFixed(1) : '0';

  // ─── DETAIL VIEW ───
  if (view === 'detail' && selected) {
    const st = STATUS_CONFIG[selected.status] || STATUS_CONFIG.DRAFT;
    return (
      <div className="pub-page">
        <button className="btn-back" onClick={() => { setView('list'); setSelected(null); }}>
          <ArrowLeft size={16} /> Quay lại danh sách
        </button>

        <div className="detail-grid">
          <article className="surface-card detail-main">
            <div className="detail-top">
              <span className="status-pill" style={{ background: st.bg, color: st.color }}>
                <st.icon size={12} /> {st.label}
              </span>
              {selected.confidence != null && (
                <span className="conf-badge">
                  <Sparkles size={12} /> AI: {selected.confidence > 1 ? selected.confidence.toFixed(1) : (selected.confidence * 100).toFixed(0)}%
                </span>
              )}
            </div>

            <h1 className="detail-title">{selected.title}</h1>
            <p className="detail-authors"><FileText size={14} /> {selected.authors}</p>

            {(selected.journalName || selected.conferenceName) && (
              <p className="detail-journal">
                <BookOpen size={14} /> {selected.journalName || selected.conferenceName}
              </p>
            )}

            {selected.abstract && (
              <div className="detail-section">
                <h3>Tóm tắt</h3>
                <p>{selected.abstract}</p>
              </div>
            )}

            {selected.keywords.length > 0 && (
              <div className="detail-section">
                <h3>Từ khóa</h3>
                <div className="kw-wrap">
                  {selected.keywords.map(k => <span key={k} className="kw-chip">{k}</span>)}
                </div>
              </div>
            )}
          </article>

          <aside className="detail-side">
            <div className="surface-card side-card">
              <h4>Thông tin chi tiết</h4>
              <div className="side-rows">
                <div className="side-row"><span>Tác giả</span><strong>{selected.user?.name || '—'}</strong></div>
                <div className="side-row"><span>Ngày tạo</span><strong>{new Date(selected.createdAt).toLocaleDateString('vi-VN')}</strong></div>
                {selected.publishedDate && <div className="side-row"><span>Ngày xuất bản</span><strong>{new Date(selected.publishedDate).toLocaleDateString('vi-VN')}</strong></div>}
                {selected.doi && (
                  <div className="side-row">
                    <span>DOI</span>
                    <a href={`https://doi.org/${selected.doi}`} target="_blank" rel="noreferrer" style={{ color: 'var(--primary-indigo)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 3 }}>
                      {selected.doi} <ExternalLink size={10} />
                    </a>
                  </div>
                )}
                {selected.issn && <div className="side-row"><span>ISSN</span><strong>{selected.issn}</strong></div>}
                {selected.file && <div className="side-row"><span>File gốc</span><strong style={{ fontSize: '0.75rem' }}>{selected.file.originalName}</strong></div>}
              </div>
            </div>

            <div className="surface-card side-card">
              <h4>Thao tác</h4>
              <div className="side-actions">
                <button className="btn-side" onClick={() => handleCopyBib(selected)}>
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? 'Đã copy!' : 'Copy BibTeX'}
                </button>
                <button className="btn-side edit" onClick={() => openEdit(selected)}>
                  <Edit3 size={14} /> Chỉnh sửa
                </button>
                {isAdmin && (
                  <button className="btn-side danger" onClick={() => handleDelete(selected.id)}>
                    <Trash2 size={14} /> Xóa
                  </button>
                )}
              </div>
            </div>
          </aside>
        </div>
        <style>{pubStyles}</style>
      </div>
    );
  }

  // ─── EDIT VIEW ───
  if (view === 'edit' && selected) {
    return (
      <div className="pub-page">
        <button className="btn-back" onClick={() => setView('list')}>
          <ArrowLeft size={16} /> Quay lại
        </button>

        <div className="surface-card" style={{ padding: '2.5rem', maxWidth: 800 }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '2rem' }}>Chỉnh sửa công bố</h2>

          <div className="edit-grid">
            <div className="ef full"><label>Tên bài báo *</label><input value={editForm.title || ''} onChange={e => setEditForm({ ...editForm, title: e.target.value })} /></div>
            <div className="ef"><label>Tác giả *</label><input value={editForm.authors || ''} onChange={e => setEditForm({ ...editForm, authors: e.target.value })} /></div>
            <div className="ef"><label>Ngày xuất bản</label><input type="date" value={editForm.publishedDate || ''} onChange={e => setEditForm({ ...editForm, publishedDate: e.target.value })} /></div>
            <div className="ef"><label>Tạp chí</label><input value={editForm.journalName || ''} onChange={e => setEditForm({ ...editForm, journalName: e.target.value })} /></div>
            <div className="ef"><label>Hội nghị</label><input value={editForm.conferenceName || ''} onChange={e => setEditForm({ ...editForm, conferenceName: e.target.value })} /></div>
            <div className="ef"><label>DOI</label><input value={editForm.doi || ''} onChange={e => setEditForm({ ...editForm, doi: e.target.value })} placeholder="10.xxxx/xxxxx" /></div>
            <div className="ef"><label>ISSN</label><input value={editForm.issn || ''} onChange={e => setEditForm({ ...editForm, issn: e.target.value })} /></div>
            <div className="ef full"><label>Tóm tắt</label><textarea value={editForm.abstract || ''} onChange={e => setEditForm({ ...editForm, abstract: e.target.value })} rows={4} /></div>
            <div className="ef full">
              <label>Trạng thái</label>
              <select value={editForm.status || 'DRAFT'} onChange={e => setEditForm({ ...editForm, status: e.target.value })}>
                <option value="DRAFT">Bản nháp</option>
                <option value="CONFIRMED">Đã xác nhận</option>
                <option value="PUBLISHED">Đã xuất bản</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: '2rem', justifyContent: 'flex-end' }}>
            <button className="btn-cancel" onClick={() => setView('list')}>Hủy</button>
            <button className="btn-save" onClick={handleUpdate} disabled={isSaving}>
              {isSaving ? <Loader2 size={16} className="spin" /> : <Check size={16} />} Lưu thay đổi
            </button>
          </div>
        </div>
        <style>{pubStyles}</style>
      </div>
    );
  }

  // ─── UPLOAD VIEW ───
  if (view === 'upload') {
    return (
      <div className="pub-page">
        <button className="btn-back" onClick={resetUpload}>
          <ArrowLeft size={16} /> Quay lại danh sách
        </button>

        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 4 }}>Upload & Trích xuất AI</h2>
        <p style={{ color: 'var(--on-surface-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          Tải lên bài báo khoa học - AI sẽ tự động trích xuất thông tin định danh
        </p>

        {!formData && !isProcessing && (
          <section
            className={`upload-zone ${isDragging ? 'dragging' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input ref={fileInputRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.tiff,.bmp,.txt" onChange={handleFileSelect} style={{ display: 'none' }} />
            <div className="upload-icon-circle"><Upload size={32} color="var(--primary-indigo)" /></div>
            <h3>Kéo thả tài liệu vào đây</h3>
            <p>Hỗ trợ PDF, PNG, JPG, TIFF (Max 50MB)</p>
            <button className="btn-upload-trigger">Chọn tệp từ máy tính</button>
          </section>
        )}

        {(isProcessing || formData) && (
          <div className="processing-layout">
            {/* Left: Preview */}
            <div className="preview-column">
              <h4 className="section-label">XEM TRƯỚC TÀI LIỆU</h4>
              <div className="document-frame">
                {previewUrl ? (
                  <iframe src={previewUrl} style={{ width: '100%', height: '100%', border: 'none', borderRadius: 8 }} />
                ) : (
                  <div className="doc-placeholder"><FileText size={48} color="#94a3b8" /></div>
                )}
              </div>
            </div>

            {/* Right: Results */}
            <div className="results-column">
              {isProcessing ? (
                <div className="surface-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: '1.5rem', padding: '2rem' }}>
                  <Loader2 size={48} className="spin" color="var(--primary-indigo)" />
                  <h3 style={{ fontWeight: 700 }}>AI đang xử lý tài liệu...</h3>
                  <p style={{ color: 'var(--on-surface-muted)', fontSize: '0.875rem' }}>OCR + NLP trích xuất metadata</p>
                </div>
              ) : savedId ? (
                <div className="surface-card" style={{ textAlign: 'center', padding: '3rem' }}>
                  <CheckCircle2 size={64} color="#10b981" style={{ margin: '0 auto 1.5rem' }} />
                  <h3 style={{ fontWeight: 700, fontSize: '1.25rem', marginBottom: '0.5rem' }}>Lưu trữ thành công!</h3>
                  <p style={{ color: 'var(--on-surface-muted)', marginBottom: '1.5rem' }}>Bài báo đã được lưu và thêm vào Thư viện số.</p>
                  <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                    <button className="btn-cancel" onClick={resetUpload}>Quay lại danh sách</button>
                    <button className="btn-save" onClick={() => { setFormData(null); setSavedId(null); setPreviewUrl(null); setEditMode(false); }}>
                      <Plus size={16} /> Upload tiếp
                    </button>
                  </div>
                </div>
              ) : formData && (
                <section className="surface-card" style={{ padding: '2rem' }}>
                  <div className="results-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="ai-icon-wrap"><Sparkles size={18} /></div>
                      <div>
                        <h4 style={{ fontWeight: 700 }}>Kết quả AI trích xuất</h4>
                        <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-muted)' }}>Engine: {formData.engine || 'unknown'}</p>
                      </div>
                    </div>
                    <div className="conf-display">
                      <span className="conf-value">{confidencePercent}%</span>
                      <span className="conf-label">ĐỘ TIN CẬY</span>
                    </div>
                  </div>

                  <div className="ext-form">
                    <div className="ef full">
                      <label>TÊN BÀI BÁO</label>
                      <input value={formData.title} readOnly={!editMode} onChange={e => setFormData({ ...formData, title: e.target.value })} />
                    </div>
                    <div className="ef">
                      <label>TÁC GIẢ</label>
                      <input value={formData.authors} readOnly={!editMode} onChange={e => setFormData({ ...formData, authors: e.target.value })} />
                    </div>
                    <div className="ef">
                      <label>NGÀY XUẤT BẢN</label>
                      <input type={editMode ? 'date' : 'text'} value={formData.publishedDate} readOnly={!editMode} onChange={e => setFormData({ ...formData, publishedDate: e.target.value })} placeholder="DD/MM/YYYY" />
                    </div>
                    <div className="ef">
                      <label>TẠP CHÍ</label>
                      <input value={formData.journalName} readOnly={!editMode} onChange={e => setFormData({ ...formData, journalName: e.target.value })} />
                    </div>
                    <div className="ef">
                      <label>HỘI NGHỊ</label>
                      <input value={formData.conferenceName} readOnly={!editMode} onChange={e => setFormData({ ...formData, conferenceName: e.target.value })} />
                    </div>
                    <div className="ef">
                      <label>DOI</label>
                      <input value={formData.doi} readOnly={!editMode} onChange={e => setFormData({ ...formData, doi: e.target.value })} placeholder="10.xxxx/xxxxx" />
                    </div>
                    <div className="ef">
                      <label>ISSN</label>
                      <input value={formData.issn} readOnly={!editMode} onChange={e => setFormData({ ...formData, issn: e.target.value })} />
                    </div>
                    <div className="ef full">
                      <label>TÓM TẮT</label>
                      <textarea value={formData.abstract} readOnly={!editMode} onChange={e => setFormData({ ...formData, abstract: e.target.value })} rows={4} />
                    </div>
                    <div className="ef full">
                      <label>TỪ KHÓA</label>
                      <div className="kw-container">
                        {formData.keywords.map((k: string) => (
                          <span key={k} className="kw-chip">
                            {k}
                            {editMode && <X size={12} style={{ cursor: 'pointer', opacity: 0.6 }} onClick={() => setFormData({ ...formData, keywords: formData.keywords.filter((x: string) => x !== k) })} />}
                          </span>
                        ))}
                        {editMode && (
                          <div className="kw-add">
                            <input value={newKeyword} onChange={e => setNewKeyword(e.target.value)} placeholder="Thêm..." onKeyDown={e => {
                              if (e.key === 'Enter') { e.preventDefault(); if (newKeyword && !formData.keywords.includes(newKeyword)) { setFormData({ ...formData, keywords: [...formData.keywords, newKeyword] }); setNewKeyword(''); } }
                            }} />
                            <Plus size={14} style={{ cursor: 'pointer' }} onClick={() => { if (newKeyword && !formData.keywords.includes(newKeyword)) { setFormData({ ...formData, keywords: [...formData.keywords, newKeyword] }); setNewKeyword(''); } }} />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="form-btns">
                    <button className="btn-cancel" onClick={() => setEditMode(!editMode)}>
                      <RotateCcw size={16} /> {editMode ? 'Khóa chỉnh sửa' : 'Chỉnh sửa thủ công'}
                    </button>
                    <button className="btn-save" onClick={handleConfirmSave} disabled={isSaving || !formData.title}>
                      {isSaving ? <Loader2 size={16} className="spin" /> : <Check size={16} />}
                      Xác nhận & Lưu trữ
                    </button>
                  </div>
                </section>
              )}

              {/* OCR text preview */}
              {formData?.ocrText && !savedId && (
                <div className="surface-card" style={{ padding: '1.5rem', marginTop: '1rem' }}>
                  <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--on-surface-muted)', marginBottom: 8 }}>VĂN BẢN TRÍCH XUẤT ({formData.ocrText.split(/\s+/).length} từ)</h4>
                  <div style={{ maxHeight: 200, overflow: 'auto', fontSize: '0.8rem', lineHeight: 1.6, color: 'var(--on-surface-muted)', whiteSpace: 'pre-wrap', background: 'var(--surface-low)', padding: 12, borderRadius: 8 }}>
                    {formData.ocrText.substring(0, 2000)}
                    {formData.ocrText.length > 2000 && <span>... ({formData.ocrText.length - 2000} ký tự còn lại)</span>}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <style>{pubStyles}</style>
      </div>
    );
  }

  // ─── LIST VIEW (default) ───
  return (
    <div className="pub-page">
      <header className="page-header">
        <div>
          <h1>Công bố Khoa học</h1>
          <p className="subtitle">Quản lý các bài báo, công trình nghiên cứu đã công bố. Upload PDF để AI tự động trích xuất metadata.</p>
        </div>
        <button className="btn-upload-new" onClick={() => setView('upload')}>
          <Upload size={18} /> Upload bài báo mới
        </button>
      </header>

      {/* Search & Filter */}
      <div className="search-row">
        <div className="search-box">
          <Search size={18} color="var(--on-surface-muted)" />
          <input placeholder="Tìm theo tên bài, tác giả, từ khóa..." value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} />
        </div>
        <select className="filter-select" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); }}>
          <option value="">Tất cả trạng thái</option>
          <option value="DRAFT">Bản nháp</option>
          <option value="CONFIRMED">Đã xác nhận</option>
          <option value="PUBLISHED">Đã xuất bản</option>
        </select>
        <button className="btn-filter" onClick={() => loadPubs(1)}><Filter size={16} /> Lọc</button>
      </div>

      {/* Stats */}
      <div className="stats-mini">
        <span>Tổng: <strong>{meta.total}</strong></span>
        <span>Trang {meta.page}/{meta.totalPages}</span>
      </div>

      {/* Publication Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem' }}><Loader2 size={32} className="spin" color="var(--primary-indigo)" /></div>
      ) : pubs.length === 0 ? (
        <div className="empty-state">
          <BookOpen size={48} color="var(--on-surface-muted)" style={{ opacity: 0.4 }} />
          <p>Chưa có công bố nào. Nhấn "Upload bài báo mới" để bắt đầu.</p>
        </div>
      ) : (
        <>
          <div className="pub-grid">
            {pubs.map(pub => {
              const st = STATUS_CONFIG[pub.status] || STATUS_CONFIG.DRAFT;
              return (
                <article key={pub.id} className="surface-card pub-card" onClick={() => openDetail(pub.id)}>
                  <div className="pub-card-top">
                    <span className="status-pill" style={{ background: st.bg, color: st.color }}>
                      <st.icon size={10} /> {st.label}
                    </span>
                    {pub.confidence != null && (
                      <span className="conf-mini">
                        <Sparkles size={10} /> {pub.confidence > 1 ? pub.confidence.toFixed(0) : (pub.confidence * 100).toFixed(0)}%
                      </span>
                    )}
                  </div>

                  <h3 className="pub-card-title">{pub.title}</h3>
                  <p className="pub-card-authors">{pub.authors}</p>
                  {pub.journalName && <p className="pub-card-journal"><BookOpen size={12} /> {pub.journalName}</p>}

                  {pub.keywords.length > 0 && (
                    <div className="pub-card-kw">
                      {pub.keywords.slice(0, 3).map(k => <span key={k} className="kw-mini">{k}</span>)}
                      {pub.keywords.length > 3 && <span className="kw-mini more">+{pub.keywords.length - 3}</span>}
                    </div>
                  )}

                  <div className="pub-card-footer">
                    <span className="pub-date"><Calendar size={12} /> {new Date(pub.createdAt).toLocaleDateString('vi-VN')}</span>
                    <div className="pub-actions" onClick={e => e.stopPropagation()}>
                      <button className="act-btn" title="Xem" onClick={() => openDetail(pub.id)}><Eye size={14} /></button>
                      <button className="act-btn" title="Sửa" onClick={() => openEdit(pub)}><Edit3 size={14} /></button>
                      {isAdmin && <button className="act-btn danger" title="Xóa" onClick={() => handleDelete(pub.id)}><Trash2 size={14} /></button>}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Pagination */}
          <div className="pagination">
            <button className="pg-btn" disabled={meta.page <= 1} onClick={() => loadPubs(meta.page - 1)}><ChevronLeft size={16} /></button>
            {Array.from({ length: Math.min(meta.totalPages, 7) }, (_, i) => {
              const start = Math.max(1, meta.page - 3);
              const p = start + i;
              if (p > meta.totalPages) return null;
              return <button key={p} className={`pg-btn ${meta.page === p ? 'active' : ''}`} onClick={() => loadPubs(p)}>{p}</button>;
            })}
            <button className="pg-btn" disabled={meta.page >= meta.totalPages} onClick={() => loadPubs(meta.page + 1)}><ChevronRight size={16} /></button>
          </div>
        </>
      )}

      {/* Drop zone overlay hint */}
      <div
        className="drop-hint"
        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        style={{ display: isDragging ? 'flex' : 'none' }}
      >
        <Upload size={48} />
        <p>Thả file để upload</p>
      </div>
      <input ref={fileInputRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.tiff,.bmp,.txt" onChange={handleFileSelect} style={{ display: 'none' }} />

      <style>{pubStyles}</style>
    </div>
  );
};

const pubStyles = `
  .pub-page { display: flex; flex-direction: column; gap: 1.5rem; padding-bottom: 3rem; position: relative; }
  .page-header { display: flex; justify-content: space-between; align-items: flex-start; }
  .page-header h1 { font-size: 1.75rem; font-weight: 800; margin-bottom: 0.25rem; }
  .subtitle { color: var(--on-surface-muted); font-size: 0.9rem; max-width: 560px; line-height: 1.5; }

  .btn-upload-new { background: var(--primary-indigo); color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 12px; font-weight: 700; display: flex; align-items: center; gap: 0.5rem; cursor: pointer; white-space: nowrap; font-size: 0.875rem; }
  .btn-back { background: none; border: none; display: flex; align-items: center; gap: 6px; cursor: pointer; color: var(--on-surface-muted); font-weight: 700; font-size: 0.875rem; padding: 0; }

  /* Search */
  .search-row { display: flex; gap: 0.75rem; align-items: center; }
  .search-box { flex: 1; background: white; border-radius: 12px; padding: 0 1rem; display: flex; align-items: center; gap: 0.625rem; }
  .search-box input { flex: 1; border: none; outline: none; padding: 0.75rem 0; font-size: 0.875rem; background: transparent; }
  .filter-select { background: white; border: none; padding: 0.75rem 1rem; border-radius: 12px; font-size: 0.8125rem; font-weight: 600; cursor: pointer; }
  .btn-filter { background: var(--primary-indigo); color: white; border: none; padding: 0.75rem 1.25rem; border-radius: 12px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 0.375rem; font-size: 0.8125rem; }
  .stats-mini { display: flex; gap: 1.5rem; font-size: 0.8125rem; color: var(--on-surface-muted); }

  /* Grid */
  .pub-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.25rem; }
  .pub-card { padding: 1.5rem; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; display: flex; flex-direction: column; gap: 0.625rem; }
  .pub-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.08); }
  .pub-card-top { display: flex; justify-content: space-between; align-items: center; }
  .status-pill { display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: 100px; font-size: 0.65rem; font-weight: 800; }
  .conf-mini { font-size: 0.65rem; font-weight: 700; color: var(--primary-violet); display: flex; align-items: center; gap: 3px; }
  .conf-badge { font-size: 0.75rem; font-weight: 700; color: var(--primary-violet); display: flex; align-items: center; gap: 4px; background: #f5f3ff; padding: 4px 10px; border-radius: 6px; }
  .pub-card-title { font-size: 0.9375rem; font-weight: 700; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .pub-card-authors { font-size: 0.8rem; color: var(--on-surface-muted); font-weight: 500; }
  .pub-card-journal { font-size: 0.75rem; color: var(--on-surface-muted); font-style: italic; display: flex; align-items: center; gap: 4px; }
  .pub-card-kw { display: flex; gap: 4px; flex-wrap: wrap; }
  .kw-mini { background: #eef2ff; color: var(--primary-indigo); padding: 2px 8px; border-radius: 100px; font-size: 0.625rem; font-weight: 700; }
  .kw-mini.more { background: #f1f5f9; color: var(--on-surface-muted); }
  .pub-card-footer { display: flex; justify-content: space-between; align-items: center; margin-top: auto; padding-top: 0.5rem; }
  .pub-date { font-size: 0.7rem; color: var(--on-surface-muted); display: flex; align-items: center; gap: 4px; }
  .pub-actions { display: flex; gap: 4px; }
  .act-btn { width: 28px; height: 28px; border: none; border-radius: 6px; background: var(--surface-low); cursor: pointer; display: flex; align-items: center; justify-content: center; color: var(--on-surface-muted); transition: all 0.15s; }
  .act-btn:hover { background: #eef2ff; color: var(--primary-indigo); }
  .act-btn.danger:hover { background: #fee2e2; color: #dc2626; }
  .empty-state { text-align: center; padding: 4rem; display: flex; flex-direction: column; align-items: center; gap: 1rem; color: var(--on-surface-muted); }

  /* Pagination */
  .pagination { display: flex; justify-content: center; gap: 0.375rem; margin-top: 0.5rem; }
  .pg-btn { width: 34px; height: 34px; border: none; border-radius: 8px; background: white; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; color: var(--on-surface-muted); font-size: 0.8rem; }
  .pg-btn.active { background: var(--primary-indigo); color: white; }
  .pg-btn:disabled { opacity: 0.4; cursor: not-allowed; }

  /* Drop hint */
  .drop-hint { position: fixed; inset: 0; background: rgba(79,70,229,0.1); backdrop-filter: blur(4px); z-index: 500; flex-direction: column; align-items: center; justify-content: center; gap: 1rem; color: var(--primary-indigo); font-weight: 700; font-size: 1.25rem; border: 3px dashed var(--primary-indigo); margin: 1rem; border-radius: 20px; }

  /* Upload zone */
  .upload-zone { background: white; border: 2px dashed #e2e8f0; border-radius: 20px; padding: 4rem 2rem; text-align: center; cursor: pointer; transition: all 0.2s; }
  .upload-zone:hover, .upload-zone.dragging { border-color: var(--primary-indigo); background: #f8faff; }
  .upload-icon-circle { width: 64px; height: 64px; background: #eef2ff; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem; }
  .upload-zone h3 { font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem; }
  .upload-zone p { color: var(--on-surface-muted); font-size: 0.875rem; margin-bottom: 1.5rem; }
  .btn-upload-trigger { background: #eef2ff; color: var(--primary-indigo); border: none; padding: 0.75rem 1.75rem; border-radius: 12px; font-weight: 700; cursor: pointer; }

  /* Processing layout */
  .processing-layout { display: grid; grid-template-columns: 420px 1fr; gap: 1.5rem; align-items: start; }
  .section-label { font-size: 0.75rem; font-weight: 800; color: var(--on-surface-muted); letter-spacing: 0.05em; margin-bottom: 0.75rem; }
  .document-frame { background: #334155; border-radius: 16px; height: 600px; padding: 0.375rem; overflow: hidden; }
  .doc-placeholder { background: white; width: 100%; height: 100%; border-radius: 8px; display: flex; align-items: center; justify-content: center; }

  /* Results */
  .results-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; padding-bottom: 1.5rem; border-bottom: 1px solid var(--surface-low); }
  .ai-icon-wrap { background: #eef2ff; color: var(--primary-indigo); padding: 0.625rem; border-radius: 10px; }
  .conf-display { text-align: right; }
  .conf-value { font-size: 2rem; font-weight: 800; color: var(--primary-violet); display: block; line-height: 1; }
  .conf-label { font-size: 0.6rem; font-weight: 800; color: var(--on-surface-muted); letter-spacing: 0.05em; }

  /* Form */
  .ext-form, .edit-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
  .ef { display: flex; flex-direction: column; gap: 0.375rem; }
  .ef.full { grid-column: 1 / -1; }
  .ef label { font-size: 0.7rem; font-weight: 800; color: var(--on-surface-muted); letter-spacing: 0.04em; }
  .ef input, .ef textarea, .ef select { background: #f8faff; border: 1.5px solid transparent; border-radius: 10px; padding: 0.75rem 1rem; font-size: 0.875rem; color: var(--on-surface); outline: none; font-family: inherit; transition: border-color 0.2s; }
  .ef input:focus, .ef textarea:focus { border-color: var(--primary-indigo); background: white; }
  .ef textarea { resize: none; line-height: 1.6; }
  .ef select { cursor: pointer; }

  .kw-container { background: #f8faff; border-radius: 10px; padding: 0.625rem; display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; }
  .kw-chip { background: #eef2ff; color: var(--primary-indigo); padding: 0.375rem 0.75rem; border-radius: 100px; font-size: 0.75rem; font-weight: 700; display: flex; align-items: center; gap: 0.375rem; }
  .kw-wrap { display: flex; flex-wrap: wrap; gap: 6px; }
  .kw-add { display: flex; align-items: center; gap: 4px; }
  .kw-add input { background: transparent !important; border: none !important; padding: 0 !important; width: 80px; font-size: 0.8rem; }

  .form-btns { display: flex; gap: 0.75rem; margin-top: 1.5rem; }
  .btn-cancel { flex: 1; background: #f1f5f9; color: var(--on-surface-muted); border: none; padding: 0.875rem; border-radius: 12px; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 0.5rem; cursor: pointer; font-size: 0.8125rem; }
  .btn-save { flex: 1; background: var(--primary-indigo); color: white; border: none; padding: 0.875rem; border-radius: 12px; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 0.5rem; cursor: pointer; box-shadow: 0 8px 16px -4px rgba(79,70,229,0.3); font-size: 0.8125rem; }
  .btn-save:disabled { opacity: 0.6; cursor: not-allowed; }

  /* Detail */
  .detail-grid { display: grid; grid-template-columns: 1fr 320px; gap: 2rem; align-items: start; }
  .detail-main { padding: 2.5rem; }
  .detail-top { display: flex; gap: 8px; margin-bottom: 1rem; align-items: center; }
  .detail-title { font-size: 1.5rem; font-weight: 800; line-height: 1.3; color: var(--primary-indigo); margin-bottom: 0.75rem; }
  .detail-authors { display: flex; align-items: center; gap: 6px; font-size: 0.9375rem; font-weight: 600; margin-bottom: 0.375rem; }
  .detail-journal { display: flex; align-items: center; gap: 6px; font-size: 0.8125rem; color: var(--on-surface-muted); font-style: italic; margin-bottom: 1.5rem; }
  .detail-section { margin-bottom: 1.5rem; }
  .detail-section h3 { font-size: 0.8rem; font-weight: 700; color: var(--on-surface-muted); text-transform: uppercase; letter-spacing: 0.03em; margin-bottom: 0.5rem; }
  .detail-section p { font-size: 0.9rem; line-height: 1.7; }

  .detail-side { display: flex; flex-direction: column; gap: 1rem; }
  .side-card { padding: 1.5rem; }
  .side-card h4 { font-size: 0.875rem; font-weight: 700; margin-bottom: 1rem; }
  .side-rows { display: flex; flex-direction: column; gap: 0.625rem; }
  .side-row { display: flex; justify-content: space-between; align-items: center; font-size: 0.8125rem; }
  .side-row span { color: var(--on-surface-muted); }
  .side-row strong { font-weight: 600; font-size: 0.8rem; }
  .side-actions { display: flex; flex-direction: column; gap: 0.5rem; }
  .btn-side { width: 100%; background: #f1f5f9; border: none; padding: 0.625rem; border-radius: 8px; font-weight: 700; font-size: 0.8rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.5rem; color: var(--on-surface); }
  .btn-side.edit { color: var(--primary-indigo); }
  .btn-side.danger { color: #dc2626; }
  .btn-side:hover { background: #eef2ff; }

  .spin { animation: spin 1s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  @media (max-width: 1024px) {
    .processing-layout { grid-template-columns: 1fr; }
    .detail-grid { grid-template-columns: 1fr; }
    .pub-grid { grid-template-columns: 1fr; }
  }
`;
