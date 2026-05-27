import { useState, useEffect, useCallback } from 'react';
import {
  Search, Plus, BookMarked, Loader2, ArrowLeft, Edit2, Trash2, Filter, X,
  Calendar, Building2, Hash, BookOpen, Layers, FileText,
} from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import { useToast } from '../../components/common/Toast';
import { useAuth } from '../../contexts/AuthContext';
import { Role } from '../../types';
import { textbookService } from '../../services/textbookService';

const TYPE_LABELS: Record<string, string> = {
  TEXTBOOK: 'Giáo trình',
  LECTURE: 'Bài giảng',
  REFERENCE: 'Tài liệu tham khảo',
  MONOGRAPH: 'Sách chuyên khảo',
};
const LEVEL_LABELS: Record<string, string> = { UNIVERSITY: 'Cấp Trường', MINISTRY: 'Cấp Bộ', STATE: 'Cấp Nhà nước' };
const STATUS: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Bản nháp', color: '#94a3b8' },
  SUBMITTED: { label: 'Đã nộp', color: '#3b82f6' },
  REVIEWING: { label: 'Đang thẩm định', color: '#f59e0b' },
  APPROVED: { label: 'Đã nghiệm thu', color: '#10b981' },
  PUBLISHED: { label: 'Đã xuất bản', color: '#0d9488' },
  REJECTED: { label: 'Từ chối', color: '#ef4444' },
};
const STATUS_FLOW = ['DRAFT', 'SUBMITTED', 'REVIEWING', 'APPROVED', 'PUBLISHED', 'REJECTED'];

const EMPTY = {
  title: '', authors: '', abstract: '', materialType: 'TEXTBOOK', publisher: '', isbn: '',
  publishYear: '', edition: '', pages: '', subject: '', field: '', approvalLevel: 'UNIVERSITY', keywords: '',
};

const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString('vi-VN') : '—');

export default function TextbooksPage() {
  const { user, hasRole } = useAuth();
  const { success: ok, error: err, confirm } = useToast();
  const canCreate = hasRole(Role.ADMIN, Role.LECTURER, Role.STUDENT);
  const canModerate = hasRole(Role.ADMIN, Role.REVIEWER);

  const [list, setList] = useState<any[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const [detail, setDetail] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), limit: '12' };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.materialType = typeFilter;
      const res = await textbookService.getAll(params);
      setList(res.data); setMeta(res.meta);
    } catch { /* ignore */ }
    setLoading(false);
  }, [search, statusFilter, typeFilter]);

  useEffect(() => { load(1); }, [load]);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const openCreate = () => { setEditingId(null); setForm({ ...EMPTY }); setShowModal(true); };
  const openEdit = (t: any) => {
    setEditingId(t.id);
    setForm({
      title: t.title || '', authors: t.authors || '', abstract: t.abstract || '',
      materialType: t.materialType || 'TEXTBOOK', publisher: t.publisher || '', isbn: t.isbn || '',
      publishYear: t.publishYear ? String(t.publishYear) : '', edition: t.edition || '',
      pages: t.pages ? String(t.pages) : '', subject: t.subject || '', field: t.field || '',
      approvalLevel: t.approvalLevel || 'UNIVERSITY', keywords: (t.keywords || []).join(', '),
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.authors) { err('Vui lòng nhập tên giáo trình và tác giả'); return; }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        title: form.title, authors: form.authors, abstract: form.abstract || undefined,
        materialType: form.materialType, publisher: form.publisher || undefined, isbn: form.isbn || undefined,
        publishYear: form.publishYear ? parseInt(form.publishYear) : undefined,
        edition: form.edition || undefined, pages: form.pages ? parseInt(form.pages) : undefined,
        subject: form.subject || undefined, field: form.field || undefined, approvalLevel: form.approvalLevel,
        keywords: form.keywords ? form.keywords.split(',').map(k => k.trim()).filter(Boolean) : [],
      };
      if (editingId) {
        const updated = await textbookService.update(editingId, payload);
        ok('Đã cập nhật giáo trình');
        if (detail?.id === editingId) setDetail(updated);
      } else {
        await textbookService.create(payload);
        ok('Đã đăng ký giáo trình');
      }
      setShowModal(false);
      load(meta.page);
    } catch (e: any) { err(e.response?.data?.message || 'Lưu thất bại'); }
    setSaving(false);
  };

  const handleDelete = (t: any) => {
    confirm('Xóa giáo trình', `Xóa "${t.title}"?`, async () => {
      try { await textbookService.remove(t.id); ok('Đã xóa'); setDetail(null); load(meta.page); }
      catch { err('Xóa thất bại'); }
    }, { confirmLabel: 'Xóa', danger: true });
  };

  const changeStatus = async (t: any, status: string) => {
    try { const updated = await textbookService.update(t.id, { status }); ok('Đã cập nhật trạng thái'); setDetail(updated); load(meta.page); }
    catch { err('Cập nhật thất bại'); }
  };

  const openDetail = async (id: number) => {
    try { setDetail(await textbookService.getOne(id)); } catch { err('Không mở được chi tiết'); }
  };

  const hasFilters = statusFilter || typeFilter;
  const canEdit = (t: any) => t.userId === user?.id || hasRole(Role.ADMIN);

  // ─── DETAIL ───
  if (detail) {
    const st = STATUS[detail.status] || { label: detail.status, color: '#94a3b8' };
    return (
      <div className="tb">
        <button className="tb-back" onClick={() => setDetail(null)}><ArrowLeft size={16} /> Quay lại danh sách</button>
        <div className="surface-card tb-detail">
          <div className="tb-detail-head">
            <div>
              <div className="tb-badges">
                <span className="tb-type"><BookMarked size={12} /> {TYPE_LABELS[detail.materialType]}</span>
                <span className="tb-level">{LEVEL_LABELS[detail.approvalLevel] || detail.approvalLevel}</span>
                <span className="tb-status" style={{ background: `${st.color}18`, color: st.color }}>{st.label}</span>
              </div>
              <h1>{detail.title}</h1>
              <p className="tb-authors">{detail.authors}</p>
            </div>
            <div className="tb-actions">
              {canEdit(detail) && <button className="tb-ibtn" title="Sửa" onClick={() => openEdit(detail)}><Edit2 size={15} /></button>}
              {canEdit(detail) && <button className="tb-ibtn danger" title="Xóa" onClick={() => handleDelete(detail)}><Trash2 size={15} /></button>}
            </div>
          </div>

          {detail.abstract && <div className="tb-abs"><h3>Mô tả nội dung</h3><p>{detail.abstract}</p></div>}

          <div className="tb-grid">
            <Info icon={Building2} label="Nhà xuất bản" value={detail.publisher} />
            <Info icon={Hash} label="ISBN" value={detail.isbn} />
            <Info icon={Calendar} label="Năm xuất bản" value={detail.publishYear ? String(detail.publishYear) : ''} />
            <Info icon={Layers} label="Lần xuất bản" value={detail.edition} />
            <Info icon={FileText} label="Số trang" value={detail.pages ? String(detail.pages) : ''} />
            <Info icon={BookOpen} label="Môn học / Học phần" value={detail.subject} />
            <Info icon={FileText} label="Ngành / Chuyên ngành" value={detail.field} />
            <Info icon={Calendar} label="Ngày đăng ký" value={fmtDate(detail.createdAt)} />
          </div>

          {detail.keywords?.length > 0 && (
            <div className="tb-kws">{detail.keywords.map((k: string) => <span key={k} className="tb-kw">{k}</span>)}</div>
          )}

          {canModerate && (
            <div className="tb-status-change">
              <label>Chuyển trạng thái thẩm định</label>
              <select value={detail.status} onChange={e => changeStatus(detail, e.target.value)}>
                {STATUS_FLOW.map(s => <option key={s} value={s}>{STATUS[s].label}</option>)}
              </select>
            </div>
          )}
        </div>
        <TextbookModal {...{ showModal, setShowModal, editingId, form, set, saving, handleSave }} />
        <style>{styles}</style>
      </div>
    );
  }

  // ─── LIST ───
  return (
    <div className="tb">
      <header className="tb-header">
        <div>
          <h1>Quản lý Giáo trình</h1>
          <p className="tb-sub">Đăng ký, theo dõi giáo trình · bài giảng · tài liệu tham khảo · sách chuyên khảo</p>
        </div>
        {canCreate && <button className="btn-create" onClick={openCreate}><Plus size={18} /> Đăng ký giáo trình</button>}
      </header>

      <div className="tb-toolbar surface-card">
        <div className="tb-search">
          <Search size={18} color="var(--on-surface-muted)" />
          <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && load(1)} placeholder="Tìm theo tên, tác giả, môn học..." />
        </div>
        <button className={`tb-filter-btn ${showFilters ? 'active' : ''}`} onClick={() => setShowFilters(!showFilters)}>
          <Filter size={16} /> Bộ lọc {hasFilters && <span className="tb-fdot" />}
        </button>
      </div>

      {showFilters && (
        <div className="tb-filters">
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="">Loại tài liệu</option>
            {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">Trạng thái</option>
            {STATUS_FLOW.map(s => <option key={s} value={s}>{STATUS[s].label}</option>)}
          </select>
          <button className="tb-apply" onClick={() => load(1)}>Áp dụng</button>
          {hasFilters && <button className="tb-clear" onClick={() => { setStatusFilter(''); setTypeFilter(''); setTimeout(() => load(1), 0); }}><X size={14} /> Xóa</button>}
          <span className="tb-count">{meta.total} kết quả</span>
        </div>
      )}

      {loading ? (
        <div className="tb-loading"><Loader2 size={32} className="spin" color="var(--primary-indigo)" /></div>
      ) : list.length === 0 ? (
        <div className="tb-empty surface-card"><BookMarked size={48} style={{ opacity: .25 }} /><p>Chưa có giáo trình nào</p></div>
      ) : (
        <div className="tb-list">
          {list.map(t => {
            const st = STATUS[t.status] || { label: t.status, color: '#94a3b8' };
            return (
              <div key={t.id} className="surface-card tb-item" onClick={() => openDetail(t.id)}>
                <div className="tb-item-main">
                  <div className="tb-badges">
                    <span className="tb-type"><BookMarked size={11} /> {TYPE_LABELS[t.materialType]}</span>
                    <span className="tb-level">{LEVEL_LABELS[t.approvalLevel] || t.approvalLevel}</span>
                  </div>
                  <h3>{t.title}</h3>
                  <p className="tb-authors">{t.authors}</p>
                  <div className="tb-item-meta">
                    {t.publisher && <span><Building2 size={12} /> {t.publisher}</span>}
                    {t.isbn && <span><Hash size={12} /> {t.isbn}</span>}
                    {t.publishYear && <span><Calendar size={12} /> {t.publishYear}</span>}
                  </div>
                </div>
                <div className="tb-item-right">
                  <span className="tb-status" style={{ background: `${st.color}18`, color: st.color }}>{st.label}</span>
                  <span className="tb-date"><Calendar size={12} /> {fmtDate(t.createdAt)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {meta.totalPages > 1 && (
        <div className="tb-pag">
          {Array.from({ length: meta.totalPages }, (_, i) => i + 1).map(p => (
            <button key={p} className={`tb-pg ${meta.page === p ? 'active' : ''}`} onClick={() => load(p)}>{p}</button>
          ))}
        </div>
      )}

      <TextbookModal {...{ showModal, setShowModal, editingId, form, set, saving, handleSave }} />
      <style>{styles}</style>
    </div>
  );
}

function Info({ icon: Icon, label, value }: { icon: any; label: string; value?: string }) {
  if (!value || value === '—') return null;
  return <div className="tb-info"><Icon size={14} /><div><small>{label}</small><strong>{value}</strong></div></div>;
}

function TextbookModal({ showModal, setShowModal, editingId, form, set, saving, handleSave }: any) {
  return (
    <Modal open={showModal} onClose={() => setShowModal(false)}
      title={editingId ? 'Cập nhật giáo trình' : 'Đăng ký giáo trình'}
      subtitle="Thông tin giáo trình / bài giảng / tài liệu giảng dạy" width={720}
      footer={<>
        <button className="g-btn secondary" onClick={() => setShowModal(false)}>Hủy</button>
        <button className="g-btn primary" onClick={handleSave} disabled={saving || !form.title || !form.authors}>
          {saving ? <Loader2 size={14} className="spin" /> : <Plus size={14} />} {editingId ? 'Lưu thay đổi' : 'Đăng ký'}
        </button>
      </>}>
      <div className="g-form-grid">
        <div className="g-field full"><label>Tên giáo trình *</label><input value={form.title} onChange={e => set('title', e.target.value)} placeholder="VD: Giáo trình Trí tuệ nhân tạo căn bản" /></div>
        <div className="g-field"><label>Chủ biên / Tác giả *</label><input value={form.authors} onChange={e => set('authors', e.target.value)} placeholder="VD: PGS.TS Lê Văn C" /></div>
        <div className="g-field"><label>Loại tài liệu</label>
          <select value={form.materialType} onChange={e => set('materialType', e.target.value)}>
            {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="g-field"><label>Nhà xuất bản</label><input value={form.publisher} onChange={e => set('publisher', e.target.value)} placeholder="VD: NXB Giáo dục Việt Nam" /></div>
        <div className="g-field"><label>ISBN</label><input value={form.isbn} onChange={e => set('isbn', e.target.value)} placeholder="VD: 978-604-0-12345-6" /></div>
        <div className="g-field"><label>Năm xuất bản</label><input value={form.publishYear} onChange={e => set('publishYear', e.target.value.replace(/\D/g, ''))} placeholder="2025" /></div>
        <div className="g-field"><label>Lần xuất bản</label><input value={form.edition} onChange={e => set('edition', e.target.value)} placeholder="VD: Lần 2" /></div>
        <div className="g-field"><label>Số trang</label><input value={form.pages} onChange={e => set('pages', e.target.value.replace(/\D/g, ''))} placeholder="320" /></div>
        <div className="g-field"><label>Cấp phê duyệt</label>
          <select value={form.approvalLevel} onChange={e => set('approvalLevel', e.target.value)}>
            {Object.entries(LEVEL_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="g-field"><label>Môn học / Học phần</label><input value={form.subject} onChange={e => set('subject', e.target.value)} placeholder="VD: Trí tuệ nhân tạo" /></div>
        <div className="g-field"><label>Ngành / Chuyên ngành</label><input value={form.field} onChange={e => set('field', e.target.value)} placeholder="VD: Công nghệ thông tin" /></div>
        <div className="g-field full"><label>Mô tả nội dung</label><textarea value={form.abstract} onChange={e => set('abstract', e.target.value)} rows={3} placeholder="Tóm tắt nội dung giáo trình..." /></div>
        <div className="g-field full"><label>Từ khóa (phẩy)</label><input value={form.keywords} onChange={e => set('keywords', e.target.value)} placeholder="AI, machine learning, giáo trình" /></div>
      </div>
    </Modal>
  );
}

const styles = `
  .tb{display:flex;flex-direction:column;gap:1.25rem;padding-bottom:3rem}
  .tb-back{background:none;border:none;display:flex;align-items:center;gap:6px;cursor:pointer;color:var(--on-surface-muted);font-weight:700;font-size:.85rem;padding:0;font-family:inherit}
  .tb-header{display:flex;justify-content:space-between;align-items:flex-start}
  .tb-header h1{font-size:1.75rem;font-weight:800}
  .tb-sub{color:var(--on-surface-muted);font-size:.875rem;margin-top:2px}
  .btn-create{background:var(--signature-gradient);color:#fff;border:none;padding:10px 20px;border-radius:12px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:6px;font-size:.875rem}
  .tb-toolbar{display:flex;align-items:center;gap:10px;padding:10px 14px!important}
  .tb-search{flex:1;display:flex;align-items:center;gap:8px}
  .tb-search input{flex:1;border:none;outline:none;font-size:.875rem;background:transparent;padding:8px 0}
  .tb-filter-btn{display:flex;align-items:center;gap:6px;padding:8px 14px;border-radius:8px;border:1.5px solid var(--surface-variant);background:var(--surface-lowest);cursor:pointer;font-weight:700;font-size:.8rem;color:var(--on-surface-muted);position:relative}
  .tb-filter-btn.active{border-color:var(--primary-indigo);color:var(--primary-indigo)}
  .tb-fdot{position:absolute;top:-2px;right:-2px;width:8px;height:8px;border-radius:50%;background:#ef4444}
  .tb-filters{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
  .tb-filters select{padding:8px 12px;border:1.5px solid var(--surface-variant);border-radius:8px;font-size:.8rem;font-weight:600;background:var(--surface-lowest);cursor:pointer}
  .tb-apply{background:var(--primary-indigo);color:#fff;border:none;padding:8px 14px;border-radius:8px;font-weight:700;font-size:.8rem;cursor:pointer}
  .tb-clear{display:flex;align-items:center;gap:4px;padding:6px 12px;border:none;background:#fee2e2;color:#dc2626;border-radius:8px;font-weight:700;font-size:.75rem;cursor:pointer}
  .tb-count{font-size:.75rem;color:var(--on-surface-muted);margin-left:auto}
  .tb-loading{display:flex;justify-content:center;padding:4rem}
  .tb-empty{display:flex;flex-direction:column;align-items:center;gap:1rem;padding:4rem!important;text-align:center;color:var(--on-surface-muted)}
  .tb-list{display:flex;flex-direction:column;gap:.75rem}
  .tb-item{display:flex;justify-content:space-between;align-items:flex-start;gap:1.5rem;padding:1.25rem 1.5rem!important;cursor:pointer;transition:all .15s}
  .tb-item:hover{transform:translateY(-1px);box-shadow:0 8px 20px rgba(0,0,0,.06)}
  .tb-item-main{flex:1;min-width:0}
  .tb-badges{display:flex;gap:6px;margin-bottom:6px;align-items:center;flex-wrap:wrap}
  .tb-type{display:inline-flex;align-items:center;gap:4px;background:#ecfeff;color:#0d9488;padding:2px 9px;border-radius:6px;font-size:.68rem;font-weight:700}
  .tb-level{background:var(--surface-low);color:var(--on-surface-muted);padding:2px 9px;border-radius:6px;font-size:.66rem;font-weight:700}
  .tb-item-main h3{font-weight:700;font-size:1rem;line-height:1.4;margin-bottom:4px}
  .tb-authors{font-size:.8rem;color:var(--on-surface-muted);margin-bottom:8px}
  .tb-item-meta{display:flex;gap:14px;flex-wrap:wrap;font-size:.72rem;color:var(--on-surface-muted)}
  .tb-item-meta span{display:flex;align-items:center;gap:4px}
  .tb-item-right{display:flex;flex-direction:column;align-items:flex-end;gap:8px;flex-shrink:0}
  .tb-status{padding:4px 12px;border-radius:8px;font-size:.7rem;font-weight:800;white-space:nowrap}
  .tb-date{font-size:.7rem;color:var(--on-surface-variant);display:flex;align-items:center;gap:4px}
  .tb-pag{display:flex;gap:4px;justify-content:center}
  .tb-pg{width:34px;height:34px;border:none;border-radius:8px;background:#fff;font-weight:700;cursor:pointer;color:var(--on-surface-muted);font-size:.8rem}
  .tb-pg.active{background:var(--primary-indigo);color:#fff}
  .tb-detail{padding:2rem!important;display:flex;flex-direction:column;gap:1.25rem}
  .tb-detail-head{display:flex;justify-content:space-between;align-items:flex-start;gap:1rem}
  .tb-detail-head h1{font-size:1.5rem;font-weight:800;line-height:1.3;margin:.4rem 0}
  .tb-actions{display:flex;gap:6px;flex-shrink:0}
  .tb-ibtn{width:34px;height:34px;border:none;border-radius:8px;background:var(--surface-low);cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--on-surface-muted)}
  .tb-ibtn:hover{background:#eef2ff;color:var(--primary-indigo)}
  .tb-ibtn.danger:hover{background:#fee2e2;color:#dc2626}
  .tb-abs{background:var(--surface-low);border-radius:10px;padding:1rem}
  .tb-abs h3{font-size:.7rem;font-weight:800;color:var(--on-surface-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:.4rem}
  .tb-abs p{font-size:.875rem;line-height:1.6}
  .tb-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:.75rem}
  .tb-info{display:flex;gap:8px;align-items:center;background:var(--surface-low);border-radius:8px;padding:.65rem .8rem}
  .tb-info svg{color:var(--on-surface-muted);flex-shrink:0}
  .tb-info small{font-size:.62rem;font-weight:700;color:var(--on-surface-muted);text-transform:uppercase;letter-spacing:.04em;display:block}
  .tb-info strong{font-size:.82rem;font-weight:700}
  .tb-kws{display:flex;flex-wrap:wrap;gap:5px}
  .tb-kw{padding:3px 10px;border-radius:6px;background:#ecfeff;color:#0d9488;font-size:.72rem;font-weight:700}
  .tb-status-change{padding-top:1rem;border-top:1px solid var(--surface-variant)}
  .tb-status-change label{font-size:.72rem;font-weight:700;color:var(--on-surface-muted);display:block;margin-bottom:.4rem;text-transform:uppercase;letter-spacing:.04em}
  .tb-status-change select{padding:8px 12px;border:1.5px solid var(--surface-variant);border-radius:8px;font-size:.85rem;background:var(--surface-lowest);cursor:pointer}
  .spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
  @media(max-width:768px){.tb-item{flex-direction:column;gap:10px}}
`;
