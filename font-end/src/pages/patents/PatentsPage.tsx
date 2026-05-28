import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search, Plus, Lightbulb, Loader2, ArrowLeft, Edit2, Trash2, Filter, X,
  Calendar, Building2, Hash, Award, FileText, Upload, Download, Eye,
} from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import { useToast } from '../../components/common/Toast';
import { useAuth } from '../../contexts/AuthContext';
import { Role } from '../../types';
import { patentService } from '../../services/patentService';

const TYPE_LABELS: Record<string, string> = {
  INVENTION: 'Sáng chế',
  UTILITY_SOLUTION: 'Giải pháp hữu ích',
  INDUSTRIAL_DESIGN: 'Kiểu dáng công nghiệp',
};
const STATUS: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Bản nháp', color: '#94a3b8' },
  FILED: { label: 'Đã nộp đơn', color: '#3b82f6' },
  EXAMINING: { label: 'Đang thẩm định', color: '#f59e0b' },
  GRANTED: { label: 'Đã cấp bằng', color: '#10b981' },
  REJECTED: { label: 'Từ chối', color: '#ef4444' },
};
const STATUS_FLOW = ['DRAFT', 'FILED', 'EXAMINING', 'GRANTED', 'REJECTED'];

const EMPTY = {
  title: '', inventors: '', owner: '', abstract: '', patentType: 'INVENTION',
  applicationNo: '', patentNo: '', issuingAuthority: 'Cục Sở hữu trí tuệ',
  ipcClass: '', field: '', keywords: '', filingDate: '', grantDate: '',
};

const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString('vi-VN') : '—');
const toDateInput = (d?: string) => (d ? d.slice(0, 10) : '');

export default function PatentsPage() {
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
  const [files, setFiles] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
      if (typeFilter) params.patentType = typeFilter;
      const res = await patentService.getAll(params);
      setList(res.data); setMeta(res.meta);
    } catch { /* ignore */ }
    setLoading(false);
  }, [search, statusFilter, typeFilter]);

  useEffect(() => { load(1); }, [load]);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const openCreate = () => { setEditingId(null); setForm({ ...EMPTY }); setShowModal(true); };
  const openEdit = (p: any) => {
    setEditingId(p.id);
    setForm({
      title: p.title || '', inventors: p.inventors || '', owner: p.owner || '',
      abstract: p.abstract || '', patentType: p.patentType || 'INVENTION',
      applicationNo: p.applicationNo || '', patentNo: p.patentNo || '',
      issuingAuthority: p.issuingAuthority || '', ipcClass: p.ipcClass || '',
      field: p.field || '', keywords: (p.keywords || []).join(', '),
      filingDate: toDateInput(p.filingDate), grantDate: toDateInput(p.grantDate),
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.inventors) { err('Vui lòng nhập tên sáng chế và tác giả'); return; }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        title: form.title, inventors: form.inventors, owner: form.owner || undefined,
        abstract: form.abstract || undefined, patentType: form.patentType,
        applicationNo: form.applicationNo || undefined, patentNo: form.patentNo || undefined,
        issuingAuthority: form.issuingAuthority || undefined, ipcClass: form.ipcClass || undefined,
        field: form.field || undefined,
        keywords: form.keywords ? form.keywords.split(',').map(k => k.trim()).filter(Boolean) : [],
        filingDate: form.filingDate || undefined, grantDate: form.grantDate || undefined,
      };
      if (editingId) {
        const updated = await patentService.update(editingId, payload);
        ok('Đã cập nhật bằng sáng chế');
        if (detail?.id === editingId) setDetail(updated);
      } else {
        await patentService.create(payload);
        ok('Đã đăng ký bằng sáng chế');
      }
      setShowModal(false);
      load(meta.page);
    } catch (e: any) { err(e.response?.data?.message || 'Lưu thất bại'); }
    setSaving(false);
  };

  const handleDelete = (p: any) => {
    confirm('Xóa bằng sáng chế', `Xóa "${p.title}"?`, async () => {
      try { await patentService.remove(p.id); ok('Đã xóa'); setDetail(null); load(meta.page); }
      catch { err('Xóa thất bại'); }
    }, { confirmLabel: 'Xóa', danger: true });
  };

  const changeStatus = async (p: any, status: string) => {
    try {
      const updated = await patentService.update(p.id, { status });
      ok('Đã cập nhật trạng thái');
      setDetail(updated); load(meta.page);
    } catch { err('Cập nhật thất bại'); }
  };

  const openDetail = async (id: number) => {
    try {
      const [d, f] = await Promise.all([patentService.getOne(id), patentService.getFiles(id).catch(() => [])]);
      setDetail(d); setFiles(f);
    } catch { err('Không mở được chi tiết'); }
  };

  const handleUploadFile = async (e: { target: HTMLInputElement }) => {
    const file = e.target.files?.[0];
    if (!file || !detail) return;
    setUploading(true);
    try {
      await patentService.uploadFile(detail.id, file);
      ok(`Đã tải lên "${file.name}"`);
      setFiles(await patentService.getFiles(detail.id));
    } catch { err('Tải lên thất bại'); }
    finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };
  const handleViewFile = async (fileId: number) => {
    try { const { url } = await patentService.downloadFile(fileId); window.open(url, '_blank'); } catch { err('Không mở được file'); }
  };
  const handleDeleteFile = (f: any) => {
    confirm('Xóa hồ sơ', `Xóa "${f.originalName}"?`, async () => {
      try { await patentService.deleteFile(f.id); ok('Đã xóa'); setFiles(await patentService.getFiles(detail.id)); }
      catch { err('Xóa thất bại'); }
    }, { confirmLabel: 'Xóa', danger: true });
  };

  const hasFilters = statusFilter || typeFilter;
  const canEdit = (p: any) => p.userId === user?.id || hasRole(Role.ADMIN);

  // ─── DETAIL ───
  if (detail) {
    const st = STATUS[detail.status] || { label: detail.status, color: '#94a3b8' };
    return (
      <div className="pt">
        <button className="pt-back" onClick={() => setDetail(null)}><ArrowLeft size={16} /> Quay lại danh sách</button>
        <div className="surface-card pt-detail">
          <div className="pt-detail-head">
            <div>
              <div className="pt-badges">
                <span className="pt-type"><Lightbulb size={12} /> {TYPE_LABELS[detail.patentType]}</span>
                <span className="pt-status" style={{ background: `${st.color}18`, color: st.color }}>{st.label}</span>
              </div>
              <h1>{detail.title}</h1>
              <p className="pt-inventors">{detail.inventors}</p>
              {detail.owner && <p className="pt-owner">Chủ sở hữu: {detail.owner}</p>}
            </div>
            <div className="pt-actions">
              {canEdit(detail) && <button className="pt-ibtn" title="Sửa" onClick={() => openEdit(detail)}><Edit2 size={15} /></button>}
              {canEdit(detail) && <button className="pt-ibtn danger" title="Xóa" onClick={() => handleDelete(detail)}><Trash2 size={15} /></button>}
            </div>
          </div>

          {detail.abstract && <div className="pt-abs"><h3>Mô tả</h3><p>{detail.abstract}</p></div>}

          <div className="pt-grid">
            <Info icon={Hash} label="Số đơn" value={detail.applicationNo} />
            <Info icon={Award} label="Số bằng" value={detail.patentNo} />
            <Info icon={Building2} label="Đơn vị cấp" value={detail.issuingAuthority} />
            <Info icon={FileText} label="Phân loại IPC" value={detail.ipcClass} />
            <Info icon={FileText} label="Lĩnh vực" value={detail.field} />
            <Info icon={Calendar} label="Ngày nộp đơn" value={fmtDate(detail.filingDate)} />
            <Info icon={Calendar} label="Ngày cấp bằng" value={fmtDate(detail.grantDate)} />
            <Info icon={Calendar} label="Ngày đăng ký" value={fmtDate(detail.createdAt)} />
          </div>

          {detail.keywords?.length > 0 && (
            <div className="pt-kws">{detail.keywords.map((k: string) => <span key={k} className="pt-kw">{k}</span>)}</div>
          )}

          {/* Hồ sơ đính kèm */}
          <div className="pt-files">
            <div className="pt-files-head">
              <h3><FileText size={15} /> Hồ sơ đính kèm ({files.length})</h3>
              {canEdit(detail) && (
                <button className="pt-up-btn" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                  {uploading ? <Loader2 size={13} className="spin" /> : <Upload size={13} />} {uploading ? 'Đang tải...' : 'Tải lên'}
                </button>
              )}
              <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleUploadFile} accept=".pdf,.docx,.doc,.png,.jpg,.jpeg,.tiff" />
            </div>
            {files.length === 0 ? (
              <p className="pt-files-empty">Chưa có hồ sơ.{canEdit(detail) ? ' Tải lên bản mô tả sáng chế, bằng độc quyền (scan)...' : ''}</p>
            ) : (
              <div className="pt-file-list">
                {files.map((f) => (
                  <div key={f.id} className="pt-file-row">
                    <FileText size={16} />
                    <div className="pt-file-info"><span className="pt-file-name">{f.originalName}</span><span className="pt-file-meta">{(f.size / 1024).toFixed(0)} KB · {f.uploader?.name} · {fmtDate(f.createdAt)}</span></div>
                    <button className="pt-file-act" title="Xem" onClick={() => handleViewFile(f.id)}><Eye size={14} /></button>
                    <button className="pt-file-act" title="Tải về" onClick={() => handleViewFile(f.id)}><Download size={14} /></button>
                    {canEdit(detail) && <button className="pt-file-act danger" title="Xóa" onClick={() => handleDeleteFile(f)}><Trash2 size={14} /></button>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {canModerate && (
            <div className="pt-status-change">
              <label>Chuyển trạng thái xử lý</label>
              <select value={detail.status} onChange={e => changeStatus(detail, e.target.value)}>
                {STATUS_FLOW.map(s => <option key={s} value={s}>{STATUS[s].label}</option>)}
              </select>
            </div>
          )}
        </div>
        <PatentModal {...{ showModal, setShowModal, editingId, form, set, saving, handleSave }} />
        <style>{styles}</style>
      </div>
    );
  }

  // ─── LIST ───
  return (
    <div className="pt">
      <header className="pt-header">
        <div>
          <h1>Quản lý Bằng sáng chế</h1>
          <p className="pt-sub">Đăng ký, theo dõi sáng chế · giải pháp hữu ích · kiểu dáng công nghiệp</p>
        </div>
        {canCreate && <button className="btn-create" onClick={openCreate}><Plus size={18} /> Đăng ký sáng chế</button>}
      </header>

      <div className="pt-toolbar surface-card">
        <div className="pt-search">
          <Search size={18} color="var(--on-surface-muted)" />
          <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && load(1)} placeholder="Tìm theo tên, tác giả, số bằng..." />
        </div>
        <button className={`pt-filter-btn ${showFilters ? 'active' : ''}`} onClick={() => setShowFilters(!showFilters)}>
          <Filter size={16} /> Bộ lọc {hasFilters && <span className="pt-fdot" />}
        </button>
      </div>

      {showFilters && (
        <div className="pt-filters">
          <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); }}>
            <option value="">Loại đơn</option>
            {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); }}>
            <option value="">Trạng thái</option>
            {STATUS_FLOW.map(s => <option key={s} value={s}>{STATUS[s].label}</option>)}
          </select>
          <button className="pt-apply" onClick={() => load(1)}>Áp dụng</button>
          {hasFilters && <button className="pt-clear" onClick={() => { setStatusFilter(''); setTypeFilter(''); setTimeout(() => load(1), 0); }}><X size={14} /> Xóa</button>}
          <span className="pt-count">{meta.total} kết quả</span>
        </div>
      )}

      {loading ? (
        <div className="pt-loading"><Loader2 size={32} className="spin" color="var(--primary-indigo)" /></div>
      ) : list.length === 0 ? (
        <div className="pt-empty surface-card"><Lightbulb size={48} style={{ opacity: .25 }} /><p>Chưa có bằng sáng chế nào</p></div>
      ) : (
        <div className="pt-list">
          {list.map(p => {
            const st = STATUS[p.status] || { label: p.status, color: '#94a3b8' };
            return (
              <div key={p.id} className="surface-card pt-item" onClick={() => openDetail(p.id)}>
                <div className="pt-item-main">
                  <div className="pt-badges">
                    <span className="pt-type"><Lightbulb size={11} /> {TYPE_LABELS[p.patentType]}</span>
                  </div>
                  <h3>{p.title}</h3>
                  <p className="pt-inventors">{p.inventors}</p>
                  <div className="pt-item-meta">
                    {p.patentNo && <span><Award size={12} /> Số bằng: {p.patentNo}</span>}
                    {!p.patentNo && p.applicationNo && <span><Hash size={12} /> Số đơn: {p.applicationNo}</span>}
                    {p.issuingAuthority && <span><Building2 size={12} /> {p.issuingAuthority}</span>}
                  </div>
                </div>
                <div className="pt-item-right">
                  <span className="pt-status" style={{ background: `${st.color}18`, color: st.color }}>{st.label}</span>
                  <span className="pt-date"><Calendar size={12} /> {fmtDate(p.createdAt)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {meta.totalPages > 1 && (
        <div className="pt-pag">
          {Array.from({ length: meta.totalPages }, (_, i) => i + 1).map(p => (
            <button key={p} className={`pt-pg ${meta.page === p ? 'active' : ''}`} onClick={() => load(p)}>{p}</button>
          ))}
        </div>
      )}

      <PatentModal {...{ showModal, setShowModal, editingId, form, set, saving, handleSave }} />
      <style>{styles}</style>
    </div>
  );
}

function Info({ icon: Icon, label, value }: { icon: any; label: string; value?: string }) {
  if (!value || value === '—') return null;
  return (
    <div className="pt-info"><Icon size={14} /><div><small>{label}</small><strong>{value}</strong></div></div>
  );
}

function PatentModal({ showModal, setShowModal, editingId, form, set, saving, handleSave }: any) {
  return (
    <Modal open={showModal} onClose={() => setShowModal(false)}
      title={editingId ? 'Cập nhật bằng sáng chế' : 'Đăng ký bằng sáng chế'}
      subtitle="Thông tin sở hữu trí tuệ — sáng chế / giải pháp hữu ích / kiểu dáng công nghiệp" width={720}
      footer={<>
        <button className="g-btn secondary" onClick={() => setShowModal(false)}>Hủy</button>
        <button className="g-btn primary" onClick={handleSave} disabled={saving || !form.title || !form.inventors}>
          {saving ? <Loader2 size={14} className="spin" /> : <Plus size={14} />} {editingId ? 'Lưu thay đổi' : 'Đăng ký'}
        </button>
      </>}>
      <div className="g-form-grid">
        <div className="g-field full"><label>Tên sáng chế / giải pháp *</label><input value={form.title} onChange={e => set('title', e.target.value)} placeholder="VD: Thiết bị lọc nước nano tích hợp IoT" /></div>
        <div className="g-field"><label>Tác giả sáng chế *</label><input value={form.inventors} onChange={e => set('inventors', e.target.value)} placeholder="VD: PGS.TS Nguyễn Văn A" /></div>
        <div className="g-field"><label>Chủ sở hữu</label><input value={form.owner} onChange={e => set('owner', e.target.value)} placeholder="VD: Trường ĐH ..." /></div>
        <div className="g-field"><label>Loại đơn</label>
          <select value={form.patentType} onChange={e => set('patentType', e.target.value)}>
            {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="g-field"><label>Lĩnh vực kỹ thuật</label><input value={form.field} onChange={e => set('field', e.target.value)} placeholder="VD: Môi trường" /></div>
        <div className="g-field"><label>Số đơn</label><input value={form.applicationNo} onChange={e => set('applicationNo', e.target.value)} placeholder="VD: 1-2025-04521" /></div>
        <div className="g-field"><label>Số bằng</label><input value={form.patentNo} onChange={e => set('patentNo', e.target.value)} placeholder="Khi đã được cấp" /></div>
        <div className="g-field"><label>Đơn vị cấp</label><input value={form.issuingAuthority} onChange={e => set('issuingAuthority', e.target.value)} /></div>
        <div className="g-field"><label>Phân loại IPC</label><input value={form.ipcClass} onChange={e => set('ipcClass', e.target.value)} placeholder="VD: C02F 1/00" /></div>
        <div className="g-field"><label>Ngày nộp đơn</label><input type="date" value={form.filingDate} onChange={e => set('filingDate', e.target.value)} /></div>
        <div className="g-field"><label>Ngày cấp bằng</label><input type="date" value={form.grantDate} onChange={e => set('grantDate', e.target.value)} /></div>
        <div className="g-field full"><label>Mô tả</label><textarea value={form.abstract} onChange={e => set('abstract', e.target.value)} rows={3} placeholder="Mô tả tóm tắt giải pháp kỹ thuật..." /></div>
        <div className="g-field full"><label>Từ khóa (phẩy)</label><input value={form.keywords} onChange={e => set('keywords', e.target.value)} placeholder="nano, IoT, lọc nước" /></div>
      </div>
    </Modal>
  );
}

const styles = `
  .pt{display:flex;flex-direction:column;gap:1.25rem;padding-bottom:3rem}
  .pt-back{background:none;border:none;display:flex;align-items:center;gap:6px;cursor:pointer;color:var(--on-surface-muted);font-weight:700;font-size:.85rem;padding:0;font-family:inherit}
  .pt-header{display:flex;justify-content:space-between;align-items:flex-start}
  .pt-header h1{font-size:1.75rem;font-weight:800}
  .pt-sub{color:var(--on-surface-muted);font-size:.875rem;margin-top:2px}
  .btn-create{background:var(--signature-gradient);color:#fff;border:none;padding:10px 20px;border-radius:12px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:6px;font-size:.875rem}
  .pt-toolbar{display:flex;align-items:center;gap:10px;padding:10px 14px!important}
  .pt-search{flex:1;display:flex;align-items:center;gap:8px}
  .pt-search input{flex:1;border:none;outline:none;font-size:.875rem;background:transparent;padding:8px 0}
  .pt-filter-btn{display:flex;align-items:center;gap:6px;padding:8px 14px;border-radius:8px;border:1.5px solid var(--surface-variant);background:var(--surface-lowest);cursor:pointer;font-weight:700;font-size:.8rem;color:var(--on-surface-muted);position:relative}
  .pt-filter-btn.active{border-color:var(--primary-indigo);color:var(--primary-indigo)}
  .pt-fdot{position:absolute;top:-2px;right:-2px;width:8px;height:8px;border-radius:50%;background:#ef4444}
  .pt-filters{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
  .pt-filters select{padding:8px 12px;border:1.5px solid var(--surface-variant);border-radius:8px;font-size:.8rem;font-weight:600;background:var(--surface-lowest);cursor:pointer}
  .pt-apply{background:var(--primary-indigo);color:#fff;border:none;padding:8px 14px;border-radius:8px;font-weight:700;font-size:.8rem;cursor:pointer}
  .pt-clear{display:flex;align-items:center;gap:4px;padding:6px 12px;border:none;background:#fee2e2;color:#dc2626;border-radius:8px;font-weight:700;font-size:.75rem;cursor:pointer}
  .pt-count{font-size:.75rem;color:var(--on-surface-muted);margin-left:auto}
  .pt-loading{display:flex;justify-content:center;padding:4rem}
  .pt-empty{display:flex;flex-direction:column;align-items:center;gap:1rem;padding:4rem!important;text-align:center;color:var(--on-surface-muted)}
  .pt-list{display:flex;flex-direction:column;gap:.75rem}
  .pt-item{display:flex;justify-content:space-between;align-items:flex-start;gap:1.5rem;padding:1.25rem 1.5rem!important;cursor:pointer;transition:all .15s}
  .pt-item:hover{transform:translateY(-1px);box-shadow:0 8px 20px rgba(0,0,0,.06)}
  .pt-item-main{flex:1;min-width:0}
  .pt-badges{display:flex;gap:6px;margin-bottom:6px;align-items:center;flex-wrap:wrap}
  .pt-type{display:inline-flex;align-items:center;gap:4px;background:#f5f3ff;color:#7c3aed;padding:2px 9px;border-radius:6px;font-size:.68rem;font-weight:700}
  .pt-item-main h3{font-weight:700;font-size:1rem;line-height:1.4;margin-bottom:4px}
  .pt-inventors{font-size:.8rem;color:var(--on-surface-muted);margin-bottom:8px}
  .pt-owner{font-size:.78rem;color:var(--on-surface-muted)}
  .pt-item-meta{display:flex;gap:14px;flex-wrap:wrap;font-size:.72rem;color:var(--on-surface-muted)}
  .pt-item-meta span{display:flex;align-items:center;gap:4px}
  .pt-item-right{display:flex;flex-direction:column;align-items:flex-end;gap:8px;flex-shrink:0}
  .pt-status{padding:4px 12px;border-radius:8px;font-size:.7rem;font-weight:800;white-space:nowrap}
  .pt-date{font-size:.7rem;color:var(--on-surface-variant);display:flex;align-items:center;gap:4px}
  .pt-pag{display:flex;gap:4px;justify-content:center}
  .pt-pg{width:34px;height:34px;border:none;border-radius:8px;background:#fff;font-weight:700;cursor:pointer;color:var(--on-surface-muted);font-size:.8rem}
  .pt-pg.active{background:var(--primary-indigo);color:#fff}
  /* detail */
  .pt-detail{padding:2rem!important;display:flex;flex-direction:column;gap:1.25rem}
  .pt-detail-head{display:flex;justify-content:space-between;align-items:flex-start;gap:1rem}
  .pt-detail-head h1{font-size:1.5rem;font-weight:800;line-height:1.3;margin:.4rem 0}
  .pt-actions{display:flex;gap:6px;flex-shrink:0}
  .pt-ibtn{width:34px;height:34px;border:none;border-radius:8px;background:var(--surface-low);cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--on-surface-muted)}
  .pt-ibtn:hover{background:#eef2ff;color:var(--primary-indigo)}
  .pt-ibtn.danger:hover{background:#fee2e2;color:#dc2626}
  .pt-abs{background:var(--surface-low);border-radius:10px;padding:1rem}
  .pt-abs h3{font-size:.7rem;font-weight:800;color:var(--on-surface-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:.4rem}
  .pt-abs p{font-size:.875rem;line-height:1.6}
  .pt-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:.75rem}
  .pt-info{display:flex;gap:8px;align-items:center;background:var(--surface-low);border-radius:8px;padding:.65rem .8rem}
  .pt-info svg{color:var(--on-surface-muted);flex-shrink:0}
  .pt-info small{font-size:.62rem;font-weight:700;color:var(--on-surface-muted);text-transform:uppercase;letter-spacing:.04em;display:block}
  .pt-info strong{font-size:.82rem;font-weight:700}
  .pt-kws{display:flex;flex-wrap:wrap;gap:5px}
  .pt-kw{padding:3px 10px;border-radius:6px;background:#f5f3ff;color:#7c3aed;font-size:.72rem;font-weight:700}
  .pt-files{padding-top:1rem;border-top:1px solid var(--surface-variant)}
  .pt-files-head{display:flex;align-items:center;gap:10px;margin-bottom:.6rem}
  .pt-files-head h3{font-size:.8rem;font-weight:800;color:var(--on-surface-muted);text-transform:uppercase;letter-spacing:.04em;display:flex;align-items:center;gap:6px;flex:1}
  .pt-up-btn{display:inline-flex;align-items:center;gap:5px;border:none;background:var(--signature-gradient);color:#fff;padding:6px 12px;border-radius:8px;font-weight:700;font-size:.75rem;cursor:pointer}
  .pt-up-btn:disabled{opacity:.6;cursor:not-allowed}
  .pt-files-empty{font-size:.8rem;color:var(--on-surface-muted)}
  .pt-file-list{display:flex;flex-direction:column;gap:.5rem}
  .pt-file-row{display:flex;align-items:center;gap:10px;padding:.6rem .8rem;background:var(--surface-low);border-radius:8px;color:var(--on-surface-muted)}
  .pt-file-info{flex:1;min-width:0;display:flex;flex-direction:column}
  .pt-file-name{font-weight:600;font-size:.82rem;color:var(--on-surface);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .pt-file-meta{font-size:.68rem}
  .pt-file-act{width:28px;height:28px;border:none;border-radius:6px;background:var(--surface-lowest);cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--on-surface-muted)}
  .pt-file-act:hover{background:#eef2ff;color:var(--primary-indigo)}
  .pt-file-act.danger:hover{background:#fee2e2;color:#dc2626}
  .pt-status-change{padding-top:1rem;border-top:1px solid var(--surface-variant)}
  .pt-status-change label{font-size:.72rem;font-weight:700;color:var(--on-surface-muted);display:block;margin-bottom:.4rem;text-transform:uppercase;letter-spacing:.04em}
  .pt-status-change select{padding:8px 12px;border:1.5px solid var(--surface-variant);border-radius:8px;font-size:.85rem;background:var(--surface-lowest);cursor:pointer}
  .spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
  @media(max-width:768px){.pt-item{flex-direction:column;gap:10px}}
`;
