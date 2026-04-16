import { useState, useEffect, useRef } from 'react';
import {
  FileText, Plus, Eye, Edit3, Trash2, Loader2, Printer, Upload,
  Download, Copy, Check, ChevronRight, ArrowLeft, Code, Sparkles,
  BookOpen, Users, Building2, Settings, BarChart3, Variable, GripVertical,
} from 'lucide-react';
import { Modal } from '../components/common/Modal';
import { TemplateEditor } from '../components/common/TemplateEditor';
import { useToast } from '../components/common/Toast';
import { templateService } from '../services/templateService';
import { workService } from '../services/workService';
import { committeeService } from '../services/committeeService';
import { useAuth } from '../contexts/AuthContext';
import { Role } from '../types';

interface Template {
  id: number; name: string; code: string; category: string;
  description?: string; content?: string; headerHtml?: string; footerHtml?: string;
  variables: string[]; version: number; isActive: boolean;
  createdAt: string; createdBy?: { id: number; name: string };
}
interface TemplateVar {
  id: number; key: string; label: string; description?: string;
  source: string; group: string; dataType: string;
}

const CATS: Record<string, { label: string; color: string }> = {
  DECISION: { label: 'Quyết định', color: '#4f46e5' },
  REPORT: { label: 'Báo cáo', color: '#059669' },
  CONTRACT: { label: 'Hợp đồng', color: '#d97706' },
  CERTIFICATE: { label: 'Giấy khen', color: '#dc2626' },
  MINUTES: { label: 'Biên bản', color: '#7c3aed' },
  EVALUATION: { label: 'Phiếu đánh giá', color: '#0891b2' },
  OTHER: { label: 'Khác', color: '#64748b' },
};
const GROUP_LABELS: Record<string, string> = { work: 'Đề tài', user: 'Người dùng', committee: 'Hội đồng', system: 'Hệ thống' };
const GROUP_ICONS: Record<string, typeof FileText> = { work: BookOpen, user: Users, committee: Users, system: Building2 };

export default function DocumentTemplatePage() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole(Role.ADMIN);
  const { success: showSuccess, error: showError, confirm: showConfirm } = useToast();

  const [tab, setTab] = useState<'templates' | 'variables' | 'documents'>('templates');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [variables, setVariables] = useState<TemplateVar[]>([]);
  const [loading, setLoading] = useState(true);
  const [catFilter, setCatFilter] = useState('');

  // Editor
  const [editing, setEditing] = useState<Template | null>(null);
  const [editContent, setEditContent] = useState('');
  const editorWrapRef = useRef<HTMLDivElement>(null);

  // Preview
  const [previewing, setPreviewing] = useState<Template | null>(null);
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewCtx, setPreviewCtx] = useState({ workId: '', committeeId: '' });
  const [previewLoading, setPreviewLoading] = useState(false);

  // Create
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', code: '', category: 'OTHER', description: '', content: '' });
  const [submitting, setSubmitting] = useState(false);

  // Dropdowns
  const [worksList, setWorksList] = useState<{ id: number; title: string }[]>([]);
  const [committeesList, setCommitteesList] = useState<{ id: number; name: string }[]>([]);

  // Documents
  const [documents, setDocuments] = useState<any[]>([]);
  const [viewingDoc, setViewingDoc] = useState<any>(null);

  const [copied, setCopied] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputEditorRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadData(); }, [tab, catFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (tab === 'templates') setTemplates(await templateService.getAll(catFilter || undefined));
      else if (tab === 'variables') setVariables(await templateService.getVariables());
      else if (tab === 'documents') setDocuments(await templateService.getDocuments());
    } catch { /* */ }
    setLoading(false);
  };

  const loadDropdowns = async () => {
    try {
      const [w, c] = await Promise.all([workService.getAll({ page: '1', limit: '100' }), committeeService.getAll()]);
      setWorksList((w.data || w).map((x: any) => ({ id: x.id, title: x.title })));
      setCommitteesList((c || []).map((x: any) => ({ id: x.id, name: x.name })));
    } catch { /* */ }
  };

  const insertVariable = (key: string) => {
    const el = editorWrapRef.current?.querySelector('.te-content .tiptap') as HTMLElement;
    if (!el) return;
    const sel = window.getSelection();
    const range = sel?.rangeCount ? sel.getRangeAt(0) : null;
    const span = document.createElement('span');
    span.style.cssText = 'background:#eef2ff;color:#4f46e5;padding:2px 8px;border-radius:4px;font-weight:700;font-size:13px;font-family:monospace';
    span.textContent = `{{${key}}}`;
    if (range && el.contains(range.commonAncestorContainer)) { range.deleteContents(); range.insertNode(span); range.setStartAfter(span); }
    else el.appendChild(span);
    el.appendChild(document.createTextNode('\u00A0'));
    el.dispatchEvent(new Event('input', { bubbles: true }));
  };

  // Upload Word → tạo template + mở editor
  const handleUploadWord = async (e: React.ChangeEvent<HTMLInputElement>, target: 'hero' | 'editor' | 'create') => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const result = await templateService.uploadDocx(file);
      if (target === 'editor' && editing) {
        setEditContent(result.html); showSuccess(`Đã import "${file.name}"`);
      } else if (target === 'create') {
        setCreateForm(prev => ({ ...prev, content: result.html, name: prev.name || file.name.replace(/\.docx?$/i, '') }));
        showSuccess(`Đã import "${file.name}"`);
      } else {
        // Hero upload → tạo template mới + mở editor
        const name = file.name.replace(/\.docx?$/i, '');
        const code = name.toUpperCase().replace(/[^A-Z0-9]/g, '-').replace(/-+/g, '-') || `TPL-${Date.now()}`;
        const tpl = await templateService.create({ name, code, category: 'OTHER', description: `Import từ ${file.name}`, content: result.html });
        showSuccess(`Tạo mẫu "${name}" thành công — giờ hãy chèn biến dữ liệu`);
        const full = await templateService.getOne(tpl.id);
        setEditing(full); setEditContent(full.content);
        const vars = await templateService.getVariables(); setVariables(vars);
        loadData();
      }
    } catch (err: any) { showError(err.response?.data?.message || 'Import thất bại. Thử copy-paste nội dung từ Word.'); }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (fileInputEditorRef.current) fileInputEditorRef.current.value = '';
  };

  const handleCreate = async () => {
    setSubmitting(true);
    try {
      await templateService.create(createForm);
      setShowCreate(false); setCreateForm({ name: '', code: '', category: 'OTHER', description: '', content: '' });
      showSuccess('Tạo mẫu thành công'); loadData();
    } catch (e: any) { showError(e.response?.data?.message || 'Tạo thất bại'); }
    setSubmitting(false);
  };

  const handleSaveEdit = async () => {
    if (!editing) return;
    setSubmitting(true);
    try { await templateService.update(editing.id, { content: editContent }); showSuccess('Đã lưu'); setEditing(null); loadData(); }
    catch { showError('Lưu thất bại'); }
    setSubmitting(false);
  };

  const handleDelete = (tpl: Template) => {
    showConfirm('Xóa mẫu', `Xóa "${tpl.name}"?`, async () => {
      try { await templateService.remove(tpl.id); showSuccess('Đã xóa'); loadData(); } catch { showError('Xóa thất bại'); }
    }, { confirmLabel: 'Xóa', danger: true });
  };

  const handlePreview = async () => {
    if (!previewing) return;
    setPreviewLoading(true);
    try {
      const res = await templateService.preview(previewing.id, { workId: previewCtx.workId ? +previewCtx.workId : undefined, committeeId: previewCtx.committeeId ? +previewCtx.committeeId : undefined });
      setPreviewHtml(res.html);
    } catch { showError('Preview thất bại'); }
    setPreviewLoading(false);
  };

  const handleRender = async () => {
    if (!previewing) return;
    setSubmitting(true);
    try {
      await templateService.render(previewing.id, { workId: previewCtx.workId ? +previewCtx.workId : undefined, committeeId: previewCtx.committeeId ? +previewCtx.committeeId : undefined });
      showSuccess('Đã lưu tài liệu');
    } catch { showError('Render thất bại'); }
    setSubmitting(false);
  };

  const printHtml = (html: string) => {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>In tài liệu</title><style>body{font-family:'Times New Roman',serif;padding:40px;max-width:800px;margin:0 auto}@media print{body{padding:20px}}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:8px}</style></head><body>${html}</body></html>`);
    w.document.close(); w.print();
  };

  // ─── EDITOR VIEW ───
  if (editing) {
    return (
      <div className="dt">
        <button className="dt-back" onClick={() => setEditing(null)}><ArrowLeft size={16} /> Quay lại</button>
        <div className="dt-editor-header">
          <div>
            <h2>{editing.name}</h2>
            <p>Soạn thảo trực quan — kéo thả biến từ sidebar bên phải vào vị trí mong muốn</p>
          </div>
          <div className="dt-editor-btns">
            <button className="dt-btn outline" onClick={() => fileInputEditorRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 size={14} className="dt-spin" /> : <Upload size={14} />} Import Word
            </button>
            <button className="dt-btn primary" onClick={handleSaveEdit} disabled={submitting}>
              {submitting ? <Loader2 size={14} className="dt-spin" /> : <Check size={14} />} Lưu mẫu
            </button>
          </div>
          <input ref={fileInputEditorRef} type="file" accept=".docx,.doc" onChange={e => handleUploadWord(e, 'editor')} style={{ display: 'none' }} />
        </div>

        <div className="dt-editor-layout">
          <div className="dt-editor-main" ref={editorWrapRef}
            onDragOver={e => { e.preventDefault(); e.currentTarget.style.boxShadow = '0 0 0 3px #4f46e540'; }}
            onDragLeave={e => { e.currentTarget.style.boxShadow = 'none'; }}
            onDrop={e => { e.preventDefault(); e.currentTarget.style.boxShadow = 'none'; const k = e.dataTransfer.getData('text/plain'); if (k?.startsWith('{{')) insertVariable(k.replace(/[{}]/g, '')); }}>
            <TemplateEditor content={editContent} onChange={setEditContent} />
          </div>

          <aside className="dt-var-panel surface-card">
            <h4><Variable size={15} /> Biến dữ liệu</h4>
            <p className="dt-var-hint">Kéo thả hoặc click để chèn</p>
            {Object.entries(groupVars(variables)).map(([group, vars]) => {
              const GIcon = GROUP_ICONS[group] || Settings;
              return (
                <div key={group} className="dt-var-group">
                  <span className="dt-var-group-title"><GIcon size={12} /> {GROUP_LABELS[group] || group}</span>
                  {vars.map(v => (
                    <button key={v.key} className="dt-var-item" draggable
                      onClick={() => insertVariable(v.key)}
                      onDragStart={e => { e.dataTransfer.setData('text/plain', `{{${v.key}}}`); e.dataTransfer.effectAllowed = 'copy'; }}
                      title={`${v.label} (${v.source})`}>
                      <GripVertical size={10} className="dt-grip" />
                      <code>{`{{${v.key}}}`}</code>
                      <span>{v.label}</span>
                    </button>
                  ))}
                </div>
              );
            })}
          </aside>
        </div>
        <style>{styles}</style>
      </div>
    );
  }

  // ─── PREVIEW VIEW ───
  if (previewing) {
    return (
      <div className="dt">
        <button className="dt-back" onClick={() => { setPreviewing(null); setPreviewHtml(''); }}><ArrowLeft size={16} /> Quay lại</button>
        <div className="dt-preview-layout">
          <div className="dt-preview-main">
            <div className="dt-preview-bar">
              <h3><Eye size={16} /> {previewing.name}</h3>
              {previewHtml && <div className="dt-preview-btns">
                <button className="dt-btn outline sm" onClick={() => printHtml(previewHtml)}><Printer size={13} /> In</button>
                <button className="dt-btn outline sm" onClick={() => { navigator.clipboard.writeText(previewHtml); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
                  {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? 'Đã copy' : 'Copy HTML'}
                </button>
                <button className="dt-btn primary sm" onClick={handleRender} disabled={submitting}>
                  {submitting ? <Loader2 size={13} className="dt-spin" /> : <Download size={13} />} Lưu tài liệu
                </button>
              </div>}
            </div>
            {previewHtml ? (
              <div className="dt-preview-paper" dangerouslySetInnerHTML={{ __html: previewHtml }} />
            ) : (
              <div className="dt-preview-empty"><Eye size={48} style={{ opacity: .15 }} /><p>Chọn nguồn dữ liệu → nhấn Xem trước</p></div>
            )}
          </div>
          <aside className="dt-preview-side">
            <div className="surface-card dt-side-card">
              <h4>Nguồn dữ liệu</h4>
              <div className="dt-field"><label>Đề tài</label><select value={previewCtx.workId} onChange={e => setPreviewCtx({ ...previewCtx, workId: e.target.value })}><option value="">— Chọn —</option>{worksList.map(w => <option key={w.id} value={w.id}>{w.title}</option>)}</select></div>
              <div className="dt-field"><label>Hội đồng</label><select value={previewCtx.committeeId} onChange={e => setPreviewCtx({ ...previewCtx, committeeId: e.target.value })}><option value="">— Chọn —</option>{committeesList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
              <button className="dt-btn primary full" onClick={handlePreview} disabled={previewLoading}>
                {previewLoading ? <Loader2 size={14} className="dt-spin" /> : <Eye size={14} />} Xem trước
              </button>
            </div>
            <div className="surface-card dt-side-card">
              <h4>Biến ({previewing.variables.length})</h4>
              <div className="dt-var-tags">{previewing.variables.map(k => <code key={k} className="dt-var-tag">{`{{${k}}}`}</code>)}</div>
            </div>
          </aside>
        </div>
        <style>{styles}</style>
      </div>
    );
  }

  // ─── DOCUMENT VIEW ───
  if (viewingDoc) {
    return (
      <div className="dt">
        <button className="dt-back" onClick={() => setViewingDoc(null)}><ArrowLeft size={16} /> Quay lại</button>
        <div className="dt-preview-bar"><h3><FileText size={16} /> {viewingDoc.name}</h3>
          <button className="dt-btn outline sm" onClick={() => printHtml(viewingDoc.htmlContent)}><Printer size={13} /> In</button>
        </div>
        <div className="dt-preview-paper" dangerouslySetInnerHTML={{ __html: viewingDoc.htmlContent }} />
        <style>{styles}</style>
      </div>
    );
  }

  // ─── LIST VIEW ───
  return (
    <div className="dt">
      {/* Hero */}
      <section className="dt-hero">
        <div className="dt-hero-text">
          <h1>Mẫu Tài liệu</h1>
          <p>Upload file Word → chèn biến dữ liệu → xuất tài liệu tự động điền thông tin</p>
        </div>
        {isAdmin && (
          <div className="dt-hero-actions">
            <button className="dt-hero-btn main" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 size={16} className="dt-spin" /> : <Upload size={16} />}
              {uploading ? 'Đang xử lý...' : 'Upload file Word (.docx)'}
            </button>
            <button className="dt-hero-btn alt" onClick={() => setShowCreate(true)}><Plus size={16} /> Soạn mẫu trống</button>
          </div>
        )}
        <input ref={fileInputRef} type="file" accept=".docx,.doc" onChange={e => handleUploadWord(e, 'hero')} style={{ display: 'none' }} />
      </section>

      {/* Tabs */}
      <div className="dt-tabs">
        {[
          { key: 'templates', icon: FileText, label: 'Mẫu tài liệu', count: templates.length },
          { key: 'variables', icon: Variable, label: 'Biến dữ liệu', count: variables.length },
          { key: 'documents', icon: BookOpen, label: 'Đã xuất', count: documents.length },
        ].map(t => (
          <button key={t.key} className={`dt-tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key as any)}>
            <t.icon size={14} /> {t.label} {t.count > 0 && <span className="dt-tab-count">{t.count}</span>}
          </button>
        ))}
      </div>

      {loading ? <div className="dt-center"><Loader2 size={32} className="dt-spin" color="var(--primary-indigo)" /></div> :

      tab === 'templates' ? (
        <div>
          <div className="dt-toolbar">
            <select value={catFilter} onChange={e => setCatFilter(e.target.value)}>
              <option value="">Tất cả loại</option>
              {Object.entries(CATS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <span className="dt-count">{templates.length} mẫu</span>
          </div>

          {templates.length === 0 ? (
            <div className="surface-card dt-empty">
              <Upload size={48} style={{ opacity: .15 }} />
              <h3>Chưa có mẫu tài liệu</h3>
              <p>Upload file Word có sẵn hoặc soạn mẫu mới</p>
              {isAdmin && <button className="dt-btn primary" onClick={() => fileInputRef.current?.click()}><Upload size={14} /> Upload Word</button>}
            </div>
          ) : (
            <div className="dt-grid">
              {templates.map(tpl => {
                const cat = CATS[tpl.category] || CATS.OTHER;
                return (
                  <div key={tpl.id} className="surface-card dt-card">
                    <div className="dt-card-head">
                      <span className="dt-cat-badge" style={{ background: `${cat.color}12`, color: cat.color }}>{cat.label}</span>
                      <span className="dt-ver">v{tpl.version}</span>
                    </div>
                    <h3>{tpl.name}</h3>
                    <code className="dt-code">{tpl.code}</code>
                    {tpl.description && <p className="dt-desc">{tpl.description}</p>}
                    <div className="dt-card-vars">
                      {tpl.variables.slice(0, 3).map(v => <code key={v} className="dt-var-tag sm">{`{{${v}}}`}</code>)}
                      {tpl.variables.length > 3 && <span className="dt-var-tag sm more">+{tpl.variables.length - 3}</span>}
                    </div>
                    <div className="dt-card-btns">
                      <button className="dt-btn primary sm flex1" onClick={() => { setPreviewing(tpl); loadDropdowns(); templateService.getOne(tpl.id).then(setPreviewing); }}><Eye size={13} /> Xuất tài liệu</button>
                      {isAdmin && <button className="dt-btn outline sm" onClick={async () => { const t = await templateService.getOne(tpl.id); setEditing(t); setEditContent(t.content); setVariables(await templateService.getVariables()); }}><Edit3 size={13} /></button>}
                      {isAdmin && <button className="dt-btn danger sm" onClick={() => handleDelete(tpl)}><Trash2 size={13} /></button>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      ) : tab === 'variables' ? (
        <div className="surface-card dt-table-wrap">
          <table className="dt-table">
            <thead><tr><th>Key</th><th>Tên</th><th>Nguồn dữ liệu</th><th>Nhóm</th><th>Kiểu</th></tr></thead>
            <tbody>
              {variables.map(v => (
                <tr key={v.id}>
                  <td><code className="dt-var-tag">{`{{${v.key}}}`}</code></td>
                  <td className="dt-td-bold">{v.label}</td>
                  <td><code className="dt-source">{v.source}</code></td>
                  <td><span className="dt-group-badge">{GROUP_LABELS[v.group] || v.group}</span></td>
                  <td className="dt-td-muted">{v.dataType}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {variables.length === 0 && <p className="dt-center" style={{ padding: '2rem' }}>Chưa có biến</p>}
        </div>

      ) : tab === 'documents' ? (
        documents.length === 0 ? (
          <div className="surface-card dt-empty"><BookOpen size={48} style={{ opacity: .15 }} /><p>Chưa có tài liệu đã xuất</p></div>
        ) : (
          <div className="dt-doc-list">
            {documents.map((d: any) => (
              <div key={d.id} className="surface-card dt-doc-row" onClick={async () => setViewingDoc(await templateService.getDocument(d.id))}>
                <div className="dt-doc-icon"><FileText size={18} /></div>
                <div className="dt-doc-info"><span className="dt-doc-name">{d.name}</span><span className="dt-doc-meta">{d.template?.name} — {new Date(d.createdAt).toLocaleDateString('vi-VN')}</span></div>
                <ChevronRight size={14} color="var(--on-surface-muted)" />
              </div>
            ))}
          </div>
        )
      ) : null}

      {/* Create Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Soạn mẫu tài liệu mới" subtitle="Soạn trực tiếp hoặc import từ Word" width={780}
        footer={<>
          <button className="g-btn secondary" onClick={() => setShowCreate(false)}>Hủy</button>
          <button className="g-btn primary" onClick={handleCreate} disabled={submitting || !createForm.name || !createForm.code}>
            {submitting ? <Loader2 size={14} className="dt-spin" /> : <Plus size={14} />} Tạo mẫu
          </button>
        </>}>
        <div className="g-form-grid">
          <div className="g-field"><label>Tên mẫu *</label><input value={createForm.name} onChange={e => setCreateForm({ ...createForm, name: e.target.value })} placeholder="VD: Quyết định nghiệm thu" /></div>
          <div className="g-field"><label>Mã *</label><input value={createForm.code} onChange={e => setCreateForm({ ...createForm, code: e.target.value.toUpperCase() })} placeholder="QD-NGHIEM-THU" /></div>
          <div className="g-field"><label>Loại</label>
            <select value={createForm.category} onChange={e => setCreateForm({ ...createForm, category: e.target.value })}>
              {Object.entries(CATS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div className="g-field"><label>Mô tả</label><input value={createForm.description} onChange={e => setCreateForm({ ...createForm, description: e.target.value })} /></div>
          <div className="g-field full">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <label>Nội dung</label>
              <button className="dt-btn outline sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                {uploading ? <Loader2 size={12} className="dt-spin" /> : <Upload size={12} />} Import .docx
              </button>
            </div>
            <TemplateEditor content={createForm.content} onChange={c => setCreateForm({ ...createForm, content: c })} />
          </div>
        </div>
      </Modal>

      <style>{styles}</style>
    </div>
  );
}

function groupVars(vars: TemplateVar[]): Record<string, TemplateVar[]> {
  const g: Record<string, TemplateVar[]> = {};
  vars.forEach(v => { if (!g[v.group]) g[v.group] = []; g[v.group].push(v); });
  return g;
}

const styles = `
  .dt{display:flex;flex-direction:column;gap:1.25rem;padding-bottom:3rem}
  .dt-back{background:none;border:none;display:flex;align-items:center;gap:6px;cursor:pointer;color:var(--on-surface-muted);font-weight:700;font-size:.85rem;padding:0}
  .dt-center{display:flex;justify-content:center;padding:4rem}
  .dt-empty{display:flex;flex-direction:column;align-items:center;gap:.75rem;padding:4rem!important;text-align:center;color:var(--on-surface-muted)}
  .dt-empty h3{font-size:1rem;font-weight:700;color:var(--on-surface)}
  .dt-empty p{font-size:.85rem}

  /* Hero */
  .dt-hero{background:linear-gradient(135deg,#1e1b4b 0%,#312e81 40%,#4338ca 100%);border-radius:20px;padding:2.5rem;color:#fff;display:flex;justify-content:space-between;align-items:center;gap:2rem}
  .dt-hero-text h1{font-size:1.75rem;font-weight:800;color:#fff;margin-bottom:.25rem}
  .dt-hero-text p{font-size:.9rem;opacity:.85;max-width:420px}
  .dt-hero-actions{display:flex;gap:8px;flex-shrink:0}
  .dt-hero-btn{border:none;padding:11px 22px;border-radius:10px;font-weight:700;font-size:.85rem;cursor:pointer;display:flex;align-items:center;gap:6px;transition:transform .15s}
  .dt-hero-btn:hover{transform:translateY(-1px)}
  .dt-hero-btn:disabled{opacity:.5}
  .dt-hero-btn.main{background:#fff;color:#1e1b4b}
  .dt-hero-btn.alt{background:rgba(255,255,255,.12);color:#fff;border:1.5px solid rgba(255,255,255,.25)}

  /* Tabs */
  .dt-tabs{display:flex;gap:4px;background:var(--surface-low);padding:4px;border-radius:12px;width:fit-content}
  .dt-tab{display:flex;align-items:center;gap:5px;padding:.6rem 1.1rem;border-radius:8px;border:none;background:transparent;font-weight:700;font-size:.8rem;cursor:pointer;color:var(--on-surface-muted);white-space:nowrap;transition:all .15s}
  .dt-tab.active{background:#fff;color:var(--primary-indigo);box-shadow:0 2px 8px rgba(0,0,0,.06)}
  .dt-tab-count{background:var(--surface-variant);padding:1px 6px;border-radius:100px;font-size:.65rem}
  .dt-tab.active .dt-tab-count{background:#eef2ff;color:var(--primary-indigo)}

  .dt-toolbar{display:flex;align-items:center;gap:.75rem;margin-bottom:.5rem}
  .dt-toolbar select{padding:7px 12px;border:1.5px solid var(--surface-variant);border-radius:8px;font-size:.8rem;font-weight:600;background:var(--surface-lowest);cursor:pointer}
  .dt-count{font-size:.75rem;color:var(--on-surface-muted);margin-left:auto}

  /* Buttons */
  .dt-btn{display:inline-flex;align-items:center;gap:5px;border:none;border-radius:8px;font-weight:700;font-size:.8rem;cursor:pointer;transition:all .15s;padding:8px 16px}
  .dt-btn.primary{background:var(--signature-gradient);color:#fff}
  .dt-btn.primary:disabled{opacity:.5;cursor:not-allowed}
  .dt-btn.outline{background:var(--surface-low);color:var(--on-surface-muted);border:1.5px solid var(--surface-variant)}
  .dt-btn.outline:hover{background:#eef2ff;color:var(--primary-indigo);border-color:var(--primary-indigo)}
  .dt-btn.danger{background:#fee2e2;color:#dc2626}
  .dt-btn.sm{padding:6px 12px;font-size:.75rem}
  .dt-btn.full{width:100%;justify-content:center}
  .dt-btn.flex1{flex:1;justify-content:center}

  /* Grid */
  .dt-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:1rem}
  .dt-card{padding:1.25rem!important;display:flex;flex-direction:column;gap:.375rem;transition:all .15s}
  .dt-card:hover{transform:translateY(-2px);box-shadow:0 8px 20px rgba(0,0,0,.06)}
  .dt-card-head{display:flex;justify-content:space-between;align-items:center}
  .dt-cat-badge{padding:2px 10px;border-radius:100px;font-size:.65rem;font-weight:800}
  .dt-ver{font-size:.6rem;color:var(--on-surface-muted)}
  .dt-card h3{font-size:.9rem;font-weight:700;margin-top:2px}
  .dt-code{font-size:.65rem;color:var(--on-surface-muted)}
  .dt-desc{font-size:.75rem;color:var(--on-surface-muted);line-height:1.4}
  .dt-card-vars{display:flex;gap:3px;flex-wrap:wrap;margin-top:auto;padding-top:6px}
  .dt-var-tag{background:#eef2ff;color:var(--primary-indigo);padding:2px 6px;border-radius:4px;font-size:.65rem;font-weight:700}
  .dt-var-tag.sm{font-size:.6rem;padding:1px 5px}
  .dt-var-tag.more{background:var(--surface-low);color:var(--on-surface-muted)}
  .dt-card-btns{display:flex;gap:4px;margin-top:8px}

  /* Editor */
  .dt-editor-header{display:flex;justify-content:space-between;align-items:flex-start;gap:1rem}
  .dt-editor-header h2{font-size:1.25rem;font-weight:800}
  .dt-editor-header p{font-size:.8rem;color:var(--on-surface-muted)}
  .dt-editor-btns{display:flex;gap:6px;flex-shrink:0}
  .dt-editor-layout{display:grid;grid-template-columns:1fr 240px;gap:1rem;align-items:start}
  .dt-editor-main{border-radius:12px;overflow:hidden;transition:box-shadow .2s}

  .dt-var-panel{padding:1rem!important;max-height:600px;overflow-y:auto}
  .dt-var-panel h4{font-size:.85rem;font-weight:700;display:flex;align-items:center;gap:6px;margin-bottom:.25rem}
  .dt-var-hint{font-size:.7rem;color:var(--on-surface-muted);margin-bottom:.75rem}
  .dt-var-group{margin-bottom:.625rem}
  .dt-var-group-title{font-size:.6rem;font-weight:800;color:var(--on-surface-muted);text-transform:uppercase;display:flex;align-items:center;gap:4px;margin-bottom:.25rem;letter-spacing:.03em}
  .dt-var-item{display:flex;align-items:center;gap:5px;width:100%;padding:4px 6px;border:none;border-radius:6px;background:transparent;cursor:grab;font-size:.7rem;text-align:left;transition:background .1s}
  .dt-var-item:active{cursor:grabbing}
  .dt-var-item:hover{background:#eef2ff}
  .dt-var-item code{color:var(--primary-indigo);font-weight:700;white-space:nowrap;font-size:.65rem}
  .dt-var-item span{color:var(--on-surface-muted);font-size:.7rem}
  .dt-grip{color:var(--on-surface-variant);flex-shrink:0}

  /* Preview */
  .dt-preview-layout{display:grid;grid-template-columns:1fr 260px;gap:1rem;align-items:start}
  .dt-preview-bar{display:flex;justify-content:space-between;align-items:center;margin-bottom:.75rem}
  .dt-preview-bar h3{display:flex;align-items:center;gap:8px;font-size:1rem;font-weight:700}
  .dt-preview-btns{display:flex;gap:6px}
  .dt-preview-paper{background:#fff;border:1px solid var(--surface-variant);border-radius:12px;padding:40px;min-height:500px;font-family:'Times New Roman',serif;font-size:14px;line-height:1.8;box-shadow:0 2px 12px rgba(0,0,0,.04)}
  .dt-preview-paper table{border-collapse:collapse;width:100%}
  .dt-preview-paper th,.dt-preview-paper td{border:1px solid #ccc;padding:8px}
  .dt-preview-paper th{background:#f1f5f9}
  .dt-preview-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:400px;color:var(--on-surface-muted);gap:12px;background:var(--surface-low);border-radius:12px}
  .dt-preview-side{display:flex;flex-direction:column;gap:.75rem}
  .dt-side-card{padding:1.25rem!important}
  .dt-side-card h4{font-size:.85rem;font-weight:700;margin-bottom:.625rem}
  .dt-field{display:flex;flex-direction:column;gap:.25rem;margin-bottom:.5rem}
  .dt-field label{font-size:.7rem;font-weight:700;color:var(--on-surface-muted)}
  .dt-field select{padding:8px 10px;border:1.5px solid var(--surface-variant);border-radius:8px;font-size:.8rem;outline:none;cursor:pointer}
  .dt-var-tags{display:flex;flex-wrap:wrap;gap:3px}

  /* Table */
  .dt-table-wrap{padding:0!important;overflow:hidden}
  .dt-table{width:100%;border-collapse:collapse}
  .dt-table th{text-align:left;padding:.6rem 1rem;font-size:.65rem;font-weight:800;color:var(--on-surface-muted);text-transform:uppercase;letter-spacing:.05em;background:var(--surface-low)}
  .dt-table td{padding:.65rem 1rem;font-size:.8rem;border-bottom:1px solid var(--surface-variant)}
  .dt-table tbody tr:hover{background:var(--surface-low)}
  .dt-td-bold{font-weight:600}
  .dt-td-muted{color:var(--on-surface-muted);font-size:.7rem}
  .dt-source{font-size:.7rem;color:var(--on-surface-muted)}
  .dt-group-badge{padding:2px 8px;border-radius:4px;font-size:.6rem;font-weight:700;background:var(--surface-low);color:var(--on-surface-muted)}

  /* Documents */
  .dt-doc-list{display:flex;flex-direction:column;gap:.5rem}
  .dt-doc-row{display:flex;align-items:center;gap:12px;padding:1rem 1.25rem!important;cursor:pointer;transition:all .15s}
  .dt-doc-row:hover{transform:translateY(-1px);box-shadow:0 4px 12px rgba(0,0,0,.05)}
  .dt-doc-icon{width:38px;height:38px;border-radius:10px;background:#eef2ff;display:flex;align-items:center;justify-content:center;color:var(--primary-indigo);flex-shrink:0}
  .dt-doc-info{flex:1}
  .dt-doc-name{font-weight:700;font-size:.85rem;display:block}
  .dt-doc-meta{font-size:.7rem;color:var(--on-surface-muted)}

  .dt-spin{animation:dt-spin 1s linear infinite}
  @keyframes dt-spin{to{transform:rotate(360deg)}}

  @media(max-width:1024px){.dt-editor-layout,.dt-preview-layout{grid-template-columns:1fr}.dt-hero{flex-direction:column;text-align:center}.dt-hero-actions{justify-content:center}.dt-grid{grid-template-columns:1fr}}
`;
