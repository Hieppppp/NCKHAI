import { useState, useEffect, useRef } from 'react';
import {
  FileText, Plus, Eye, Edit3, Trash2, Loader2, Printer,
  Download, Copy, Check, ChevronRight, ArrowLeft, Code, Sparkles,
  BookOpen, Users, Building2, Settings, BarChart3, Variable,
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

const CATEGORY_LABELS: Record<string, { label: string; icon: typeof FileText; color: string }> = {
  DECISION: { label: 'Quyết định', icon: FileText, color: '#4f46e5' },
  REPORT: { label: 'Báo cáo', icon: BarChart3, color: '#059669' },
  CONTRACT: { label: 'Hợp đồng', icon: BookOpen, color: '#d97706' },
  CERTIFICATE: { label: 'Giấy khen', icon: Sparkles, color: '#dc2626' },
  MINUTES: { label: 'Biên bản', icon: Users, color: '#7c3aed' },
  EVALUATION: { label: 'Phiếu đánh giá', icon: Edit3, color: '#0891b2' },
  OTHER: { label: 'Khác', icon: FileText, color: '#64748b' },
};

const GROUP_ICONS: Record<string, typeof FileText> = {
  work: BookOpen, user: Users, committee: Users, system: Building2,
};

export default function DocumentTemplatePage() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole(Role.ADMIN);
  const { success: showSuccess, error: showError, confirm: showConfirm } = useToast();

  const [tab, setTab] = useState<'templates' | 'variables' | 'documents'>('templates');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [variables, setVariables] = useState<TemplateVar[]>([]);
  const [loading, setLoading] = useState(true);
  const [catFilter, setCatFilter] = useState('');

  // Editor state
  const [editing, setEditing] = useState<Template | null>(null);
  const [editContent, setEditContent] = useState('');
  const editorWrapRef = useRef<HTMLDivElement>(null);

  // Preview state
  const [previewing, setPreviewing] = useState<Template | null>(null);
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewCtx, setPreviewCtx] = useState({ workId: '', committeeId: '' });
  const [previewLoading, setPreviewLoading] = useState(false);

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', code: '', category: 'DECISION', description: '', content: '', headerHtml: '', footerHtml: '' });
  const [submitting, setSubmitting] = useState(false);

  // Dropdown data
  const [worksList, setWorksList] = useState<{ id: number; title: string }[]>([]);
  const [committeesList, setCommitteesList] = useState<{ id: number; name: string }[]>([]);

  // Documents history
  const [documents, setDocuments] = useState<any[]>([]);
  const [viewingDoc, setViewingDoc] = useState<any>(null);

  const [copied, setCopied] = useState(false);

  useEffect(() => { loadData(); }, [tab, catFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (tab === 'templates') {
        setTemplates(await templateService.getAll(catFilter || undefined));
      } else if (tab === 'variables') {
        setVariables(await templateService.getVariables());
      } else if (tab === 'documents') {
        setDocuments(await templateService.getDocuments());
      }
    } catch { /* */ }
    setLoading(false);
  };

  const loadDropdowns = async () => {
    try {
      const [w, c] = await Promise.all([
        workService.getAll({ page: '1', limit: '100' }),
        committeeService.getAll(),
      ]);
      setWorksList((w.data || w).map((x: any) => ({ id: x.id, title: x.title })));
      setCommitteesList((c || []).map((x: any) => ({ id: x.id, name: x.name })));
    } catch { /* */ }
  };

  const insertVariable = (key: string) => {
    // Insert into TipTap editor as styled placeholder
    const editorEl = editorWrapRef.current?.querySelector('.te-content .tiptap') as HTMLElement;
    if (!editorEl) return;
    const selection = window.getSelection();
    const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
    const span = document.createElement('span');
    span.style.cssText = 'background:#eef2ff;color:#4f46e5;padding:2px 8px;border-radius:4px;font-weight:700;font-size:13px;font-family:monospace';
    span.textContent = `{{${key}}}`;
    if (range && editorEl.contains(range.commonAncestorContainer)) {
      range.deleteContents();
      range.insertNode(span);
      range.setStartAfter(span);
    } else {
      editorEl.appendChild(span);
    }
    editorEl.appendChild(document.createTextNode('\u00A0'));
    editorEl.dispatchEvent(new Event('input', { bubbles: true }));
  };

  const handleCreate = async () => {
    setSubmitting(true);
    try {
      await templateService.create(createForm);
      setShowCreate(false);
      setCreateForm({ name: '', code: '', category: 'DECISION', description: '', content: '', headerHtml: '', footerHtml: '' });
      showSuccess('Tạo mẫu tài liệu thành công');
      loadData();
    } catch (e: any) { showError(e.response?.data?.message || 'Tạo thất bại'); }
    setSubmitting(false);
  };

  const handleSaveEdit = async () => {
    if (!editing) return;
    setSubmitting(true);
    try {
      await templateService.update(editing.id, { content: editContent });
      showSuccess('Đã lưu mẫu tài liệu');
      setEditing(null);
      loadData();
    } catch { showError('Lưu thất bại'); }
    setSubmitting(false);
  };

  const handleDelete = (tpl: Template) => {
    showConfirm('Xóa mẫu tài liệu', `Bạn có chắc muốn xóa "${tpl.name}"?`, async () => {
      try { await templateService.remove(tpl.id); showSuccess('Đã xóa'); loadData(); } catch { showError('Xóa thất bại'); }
    }, { confirmLabel: 'Xóa', danger: true });
  };

  const handlePreview = async () => {
    if (!previewing) return;
    setPreviewLoading(true);
    try {
      const ctx = { workId: previewCtx.workId ? +previewCtx.workId : undefined, committeeId: previewCtx.committeeId ? +previewCtx.committeeId : undefined };
      const res = await templateService.preview(previewing.id, ctx);
      setPreviewHtml(res.html);
    } catch { showError('Preview thất bại'); }
    setPreviewLoading(false);
  };

  const handleRender = async () => {
    if (!previewing) return;
    setSubmitting(true);
    try {
      const ctx = { workId: previewCtx.workId ? +previewCtx.workId : undefined, committeeId: previewCtx.committeeId ? +previewCtx.committeeId : undefined };
      await templateService.render(previewing.id, ctx);
      showSuccess('Đã render và lưu tài liệu');
    } catch { showError('Render thất bại'); }
    setSubmitting(false);
  };

  const handlePrint = () => {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>In tài liệu</title><style>body{font-family:'Times New Roman',serif;padding:40px;max-width:800px;margin:0 auto}@media print{body{padding:20px}}</style></head><body>${previewHtml}</body></html>`);
    w.document.close();
    w.print();
  };

  // ─── EDITOR VIEW ───
  if (editing) {
    return (
      <div className="dt">
        <button className="dt-back" onClick={() => setEditing(null)}><ArrowLeft size={16} /> Quay lại</button>
        <h2 className="dt-edit-title">Chỉnh sửa: {editing.name}</h2>

        <div className="dt-editor-layout">
          <div className="dt-editor-main" ref={editorWrapRef}>
            <div className="dt-editor-toolbar">
              <span className="dt-editor-info"><Code size={14} /> Soạn thảo trực quan — click biến bên phải để chèn</span>
              <button className="dt-save-btn" onClick={handleSaveEdit} disabled={submitting}>
                {submitting ? <Loader2 size={14} className="dt-spin" /> : <Check size={14} />} Lưu
              </button>
            </div>
            <div
              onDragOver={e => { e.preventDefault(); e.currentTarget.style.outline = '2px dashed #4f46e5'; }}
              onDragLeave={e => { e.currentTarget.style.outline = 'none'; }}
              onDrop={e => {
                e.preventDefault();
                e.currentTarget.style.outline = 'none';
                const key = e.dataTransfer.getData('text/plain');
                if (key && key.startsWith('{{')) {
                  insertVariable(key.replace(/[{}]/g, ''));
                }
              }}
            >
              <TemplateEditor content={editContent} onChange={setEditContent} />
            </div>
          </div>

          <aside className="dt-var-sidebar">
            <h4><Variable size={14} /> Chèn biến dữ liệu</h4>
            <p className="dt-var-hint">Kéo thả hoặc click để chèn vào editor</p>
            {Object.entries(groupVars(variables)).map(([group, vars]) => {
              const GIcon = GROUP_ICONS[group] || Settings;
              return (
                <div key={group} className="dt-var-group">
                  <span className="dt-var-group-label"><GIcon size={12} /> {group}</span>
                  {vars.map(v => (
                    <button key={v.key} className="dt-var-btn"
                      draggable
                      onClick={() => insertVariable(v.key)}
                      onDragStart={e => { e.dataTransfer.setData('text/plain', `{{${v.key}}}`); e.dataTransfer.effectAllowed = 'copy'; }}
                      title={`${v.label} — kéo thả vào editor`}>
                      <span className="dt-var-drag">⠿</span>
                      <span className="dt-var-key">{`{{${v.key}}}`}</span>
                      <span className="dt-var-label">{v.label}</span>
                    </button>
                  ))}
                </div>
              );
            })}
          </aside>
        </div>
        <style>{dtStyles}</style>
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
            <div className="dt-preview-toolbar">
              <h3><Eye size={16} /> Xem trước: {previewing.name}</h3>
              <div className="dt-preview-actions">
                {previewHtml && <>
                  <button className="dt-act-btn" onClick={handlePrint}><Printer size={14} /> In</button>
                  <button className="dt-act-btn" onClick={() => { navigator.clipboard.writeText(previewHtml); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
                    {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Đã copy' : 'Copy HTML'}
                  </button>
                  <button className="dt-act-btn primary" onClick={handleRender} disabled={submitting}>
                    {submitting ? <Loader2 size={14} className="dt-spin" /> : <Download size={14} />} Render & Lưu
                  </button>
                </>}
              </div>
            </div>

            {previewHtml ? (
              <div className="dt-preview-frame" dangerouslySetInnerHTML={{ __html: previewHtml }} />
            ) : (
              <div className="dt-preview-empty"><Eye size={48} style={{ opacity: .2 }} /><p>Chọn nguồn dữ liệu bên phải rồi nhấn "Xem trước"</p></div>
            )}
          </div>

          <aside className="dt-preview-sidebar">
            <div className="surface-card dt-ctx-card">
              <h4>Nguồn dữ liệu</h4>
              <div className="dt-ctx-field">
                <label>Đề tài</label>
                <select value={previewCtx.workId} onChange={e => setPreviewCtx({ ...previewCtx, workId: e.target.value })}>
                  <option value="">— Chọn đề tài —</option>
                  {worksList.map(w => <option key={w.id} value={w.id}>{w.title}</option>)}
                </select>
              </div>
              <div className="dt-ctx-field">
                <label>Hội đồng</label>
                <select value={previewCtx.committeeId} onChange={e => setPreviewCtx({ ...previewCtx, committeeId: e.target.value })}>
                  <option value="">— Chọn hội đồng —</option>
                  {committeesList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <button className="dt-preview-btn" onClick={handlePreview} disabled={previewLoading}>
                {previewLoading ? <Loader2 size={14} className="dt-spin" /> : <Eye size={14} />} Xem trước
              </button>
            </div>

            <div className="surface-card dt-ctx-card">
              <h4>Biến sử dụng ({previewing.variables.length})</h4>
              <div className="dt-used-vars">
                {previewing.variables.map(k => <span key={k} className="dt-used-var">{`{{${k}}}`}</span>)}
              </div>
            </div>
          </aside>
        </div>
        <style>{dtStyles}</style>
      </div>
    );
  }

  // ─── DOCUMENT VIEW ───
  if (viewingDoc) {
    return (
      <div className="dt">
        <button className="dt-back" onClick={() => setViewingDoc(null)}><ArrowLeft size={16} /> Quay lại</button>
        <div className="dt-preview-toolbar">
          <h3><FileText size={16} /> {viewingDoc.name}</h3>
          <div className="dt-preview-actions">
            <button className="dt-act-btn" onClick={() => {
              const w = window.open('', '_blank');
              if (w) { w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:'Times New Roman',serif;padding:40px;max-width:800px;margin:0 auto}</style></head><body>${viewingDoc.htmlContent}</body></html>`); w.document.close(); w.print(); }
            }}><Printer size={14} /> In</button>
          </div>
        </div>
        <div className="dt-preview-frame" dangerouslySetInnerHTML={{ __html: viewingDoc.htmlContent }} />
        <style>{dtStyles}</style>
      </div>
    );
  }

  // ─── LIST VIEW ───
  return (
    <div className="dt">
      <section className="dt-hero">
        <div>
          <h1>Mẫu Tài liệu</h1>
          <p>Tạo và quản lý mẫu văn bản hành chính - tự động điền dữ liệu từ hệ thống</p>
        </div>
        {isAdmin && <button className="dt-hero-btn" onClick={() => setShowCreate(true)}><Plus size={16} /> Tạo mẫu mới</button>}
      </section>

      <div className="dt-tabs">
        <button className={`dt-tab ${tab === 'templates' ? 'active' : ''}`} onClick={() => setTab('templates')}><FileText size={15} /> Mẫu tài liệu</button>
        <button className={`dt-tab ${tab === 'variables' ? 'active' : ''}`} onClick={() => setTab('variables')}><Variable size={15} /> Biến dữ liệu</button>
        <button className={`dt-tab ${tab === 'documents' ? 'active' : ''}`} onClick={() => setTab('documents')}><BookOpen size={15} /> Tài liệu đã tạo</button>
      </div>

      {loading ? <div className="dt-loading"><Loader2 size={32} className="dt-spin" color="var(--primary-indigo)" /></div> :

      tab === 'templates' ? (
        <div>
          <div className="dt-filter-row">
            <select className="dt-filter" value={catFilter} onChange={e => setCatFilter(e.target.value)}>
              <option value="">Tất cả loại</option>
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <span className="dt-count">{templates.length} mẫu</span>
          </div>

          {templates.length === 0 ? <div className="dt-empty surface-card"><FileText size={48} style={{ opacity: .2 }} /><p>Chưa có mẫu tài liệu nào</p></div> : (
            <div className="dt-grid">
              {templates.map(tpl => {
                const cat = CATEGORY_LABELS[tpl.category] || CATEGORY_LABELS.OTHER;
                return (
                  <div key={tpl.id} className="surface-card dt-card">
                    <div className="dt-card-top">
                      <span className="dt-cat" style={{ background: `${cat.color}12`, color: cat.color }}><cat.icon size={12} /> {cat.label}</span>
                      <span className="dt-version">v{tpl.version}</span>
                    </div>
                    <h3 className="dt-card-name">{tpl.name}</h3>
                    <p className="dt-card-code">{tpl.code}</p>
                    {tpl.description && <p className="dt-card-desc">{tpl.description}</p>}
                    <div className="dt-card-vars">
                      {tpl.variables.slice(0, 4).map(v => <span key={v} className="dt-var-chip">{`{{${v}}}`}</span>)}
                      {tpl.variables.length > 4 && <span className="dt-var-chip more">+{tpl.variables.length - 4}</span>}
                    </div>
                    <div className="dt-card-actions">
                      <button className="dt-card-btn preview" onClick={() => { setPreviewing(tpl); loadDropdowns(); templateService.getOne(tpl.id).then(t => setPreviewing(t)); }}><Eye size={14} /> Xem trước & Xuất</button>
                      {isAdmin && <button className="dt-card-btn edit" onClick={async () => { const t = await templateService.getOne(tpl.id); setEditing(t); setEditContent(t.content); const vars = await templateService.getVariables(); setVariables(vars); }}><Edit3 size={14} /> Chỉnh sửa mẫu</button>}
                      {isAdmin && <button className="dt-card-btn danger" onClick={() => handleDelete(tpl)}><Trash2 size={14} /></button>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      ) : tab === 'variables' ? (
        <div className="surface-card dt-var-table-card">
          <table className="dt-table">
            <thead><tr><th>Key</th><th>Tên hiển thị</th><th>Nguồn dữ liệu</th><th>Nhóm</th><th>Kiểu</th></tr></thead>
            <tbody>
              {variables.map(v => (
                <tr key={v.id}>
                  <td className="dt-td-key"><code>{`{{${v.key}}}`}</code></td>
                  <td className="dt-td-label">{v.label}</td>
                  <td className="dt-td-source"><code>{v.source}</code></td>
                  <td><span className="dt-group-chip">{v.group}</span></td>
                  <td className="dt-td-type">{v.dataType}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {variables.length === 0 && <p className="dt-empty-text">Chưa có biến dữ liệu</p>}
        </div>

      ) : tab === 'documents' ? (
        <div>
          {documents.length === 0 ? <div className="dt-empty surface-card"><BookOpen size={48} style={{ opacity: .2 }} /><p>Chưa có tài liệu nào được tạo</p></div> : (
            <div className="dt-doc-list">
              {documents.map((doc: any) => (
                <div key={doc.id} className="surface-card dt-doc-item" onClick={async () => { const d = await templateService.getDocument(doc.id); setViewingDoc(d); }}>
                  <div className="dt-doc-icon"><FileText size={20} /></div>
                  <div className="dt-doc-info">
                    <span className="dt-doc-name">{doc.name}</span>
                    <span className="dt-doc-meta">{doc.template?.name} — {new Date(doc.createdAt).toLocaleDateString('vi-VN')} — {doc.createdBy?.name}</span>
                  </div>
                  <ChevronRight size={16} className="dt-doc-arrow" />
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {/* Create Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Tạo mẫu tài liệu mới" subtitle="Soạn mẫu văn bản với {{key}} placeholders" width={750}
        footer={<>
          <button className="g-btn secondary" onClick={() => setShowCreate(false)}>Hủy</button>
          <button className="g-btn primary" onClick={handleCreate} disabled={submitting || !createForm.name || !createForm.code}>
            {submitting ? <Loader2 size={14} className="dt-spin" /> : <Plus size={14} />} Tạo mẫu
          </button>
        </>}>
        <div className="g-form-grid">
          <div className="g-field"><label>Tên mẫu *</label><input value={createForm.name} onChange={e => setCreateForm({ ...createForm, name: e.target.value })} placeholder="VD: Quyết định nghiệm thu" /></div>
          <div className="g-field"><label>Mã mẫu *</label><input value={createForm.code} onChange={e => setCreateForm({ ...createForm, code: e.target.value.toUpperCase() })} placeholder="VD: QD-NGHIEM-THU" /></div>
          <div className="g-field"><label>Loại tài liệu</label>
            <select value={createForm.category} onChange={e => setCreateForm({ ...createForm, category: e.target.value })}>
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div className="g-field"><label>Mô tả</label><input value={createForm.description} onChange={e => setCreateForm({ ...createForm, description: e.target.value })} /></div>
          <div className="g-field full"><label>Nội dung (soạn trực quan, dùng {`{{key}}`} cho biến)</label>
            <TemplateEditor content={createForm.content} onChange={c => setCreateForm({ ...createForm, content: c })} />
          </div>
        </div>
      </Modal>

      <style>{dtStyles}</style>
    </div>
  );
}

function groupVars(vars: TemplateVar[]): Record<string, TemplateVar[]> {
  const groups: Record<string, TemplateVar[]> = {};
  vars.forEach(v => { if (!groups[v.group]) groups[v.group] = []; groups[v.group].push(v); });
  return groups;
}

const dtStyles = `
  .dt{display:flex;flex-direction:column;gap:1.25rem;padding-bottom:3rem}
  .dt-back{background:none;border:none;display:flex;align-items:center;gap:6px;cursor:pointer;color:var(--on-surface-muted);font-weight:700;font-size:.85rem;padding:0}
  .dt-loading{display:flex;justify-content:center;padding:4rem}
  .dt-empty{display:flex;flex-direction:column;align-items:center;gap:1rem;padding:4rem!important;text-align:center;color:var(--on-surface-muted)}
  .dt-empty-text{padding:2rem;text-align:center;color:var(--on-surface-muted);font-size:.85rem}

  .dt-hero{background:linear-gradient(135deg,#1e1b4b 0%,#312e81 40%,#4338ca 100%);border-radius:20px;padding:2.5rem;color:#fff;display:flex;justify-content:space-between;align-items:center}
  .dt-hero h1{font-size:1.75rem;font-weight:800;color:#fff;margin-bottom:.25rem}
  .dt-hero p{font-size:.9rem;opacity:.85}
  .dt-hero-btn{background:#fff;color:#1e1b4b;border:none;padding:10px 20px;border-radius:10px;font-weight:700;font-size:.85rem;cursor:pointer;display:flex;align-items:center;gap:6px}

  .dt-tabs{display:flex;gap:4px;background:var(--surface-low);padding:4px;border-radius:12px;width:fit-content}
  .dt-tab{display:flex;align-items:center;gap:6px;padding:.625rem 1.25rem;border-radius:8px;border:none;background:transparent;font-weight:700;font-size:.8125rem;cursor:pointer;color:var(--on-surface-muted);white-space:nowrap}
  .dt-tab.active{background:#fff;color:var(--primary-indigo);box-shadow:0 2px 8px rgba(0,0,0,.06)}

  .dt-filter-row{display:flex;align-items:center;gap:.75rem;margin-bottom:.5rem}
  .dt-filter{padding:8px 12px;border:1.5px solid var(--surface-variant);border-radius:8px;font-size:.8rem;font-weight:600;background:var(--surface-lowest);cursor:pointer}
  .dt-count{font-size:.75rem;color:var(--on-surface-muted);margin-left:auto}

  /* Template Grid */
  .dt-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:1rem}
  .dt-card{padding:1.25rem!important;display:flex;flex-direction:column;gap:.5rem;transition:all .15s}
  .dt-card:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,.07)}
  .dt-card-top{display:flex;justify-content:space-between;align-items:center}
  .dt-cat{display:flex;align-items:center;gap:4px;padding:3px 10px;border-radius:100px;font-size:.65rem;font-weight:800}
  .dt-version{font-size:.65rem;color:var(--on-surface-muted);font-weight:600}
  .dt-card-name{font-size:.9375rem;font-weight:700}
  .dt-card-code{font-size:.7rem;color:var(--on-surface-muted);font-family:monospace}
  .dt-card-desc{font-size:.8rem;color:var(--on-surface-muted);line-height:1.4}
  .dt-card-vars{display:flex;gap:4px;flex-wrap:wrap;margin-top:auto}
  .dt-var-chip{background:#eef2ff;color:var(--primary-indigo);padding:2px 6px;border-radius:4px;font-size:.6rem;font-weight:700;font-family:monospace}
  .dt-var-chip.more{background:var(--surface-low);color:var(--on-surface-muted)}
  .dt-card-actions{display:flex;gap:4px;margin-top:.5rem}
  .dt-card-btn{padding:6px 12px;border:none;border-radius:6px;background:var(--surface-low);cursor:pointer;font-size:.75rem;font-weight:700;display:flex;align-items:center;gap:4px;color:var(--on-surface-muted);transition:all .15s}
  .dt-card-btn.preview{flex:1;justify-content:center;background:#eef2ff;color:var(--primary-indigo)}
  .dt-card-btn.edit{background:#f0fdf4;color:#059669}
  .dt-card-btn:hover{background:#eef2ff;color:var(--primary-indigo)}
  .dt-card-btn.danger:hover{background:#fee2e2;color:#dc2626}

  /* Editor */
  .dt-edit-title{font-size:1.25rem;font-weight:800}
  .dt-editor-layout{display:grid;grid-template-columns:1fr 260px;gap:1rem;align-items:start}
  .dt-editor-toolbar{display:flex;justify-content:space-between;align-items:center;margin-bottom:.5rem}
  .dt-editor-info{font-size:.75rem;color:var(--on-surface-muted);display:flex;align-items:center;gap:4px;font-weight:600}
  .dt-save-btn{background:var(--signature-gradient);color:#fff;border:none;padding:8px 20px;border-radius:8px;font-weight:700;font-size:.8rem;cursor:pointer;display:flex;align-items:center;gap:4px}
  .dt-save-btn:disabled{opacity:.5}
  .dt-editor-textarea{width:100%;min-height:500px;padding:14px;border:1.5px solid var(--surface-variant);border-radius:10px;font-family:'JetBrains Mono','Fira Code',monospace;font-size:.8rem;line-height:1.7;outline:none;resize:vertical;background:var(--surface-lowest)}
  .dt-editor-textarea:focus{border-color:var(--primary-indigo)}

  .dt-var-sidebar{background:var(--surface-lowest);border:1.5px solid var(--surface-variant);border-radius:12px;padding:1rem;max-height:600px;overflow-y:auto}
  .dt-var-sidebar h4{font-size:.85rem;font-weight:700;margin-bottom:.25rem;display:flex;align-items:center;gap:6px}
  .dt-var-hint{font-size:.7rem;color:var(--on-surface-muted);margin-bottom:.75rem}
  .dt-var-group{margin-bottom:.75rem}
  .dt-var-group-label{font-size:.65rem;font-weight:800;color:var(--on-surface-muted);text-transform:uppercase;display:flex;align-items:center;gap:4px;margin-bottom:.375rem}
  .dt-var-btn{display:flex;align-items:center;gap:6px;width:100%;padding:5px 8px;border:none;border-radius:6px;background:transparent;cursor:pointer;text-align:left;transition:background .1s;font-size:.75rem}
  .dt-var-btn{cursor:grab}
  .dt-var-btn:active{cursor:grabbing}
  .dt-var-btn:hover{background:#eef2ff}
  .dt-var-drag{color:var(--on-surface-variant);font-size:10px;line-height:1;user-select:none}
  .dt-var-key{font-family:monospace;color:var(--primary-indigo);font-weight:700;font-size:.7rem;white-space:nowrap}
  .dt-var-label{color:var(--on-surface-muted);font-size:.7rem}

  /* Preview */
  .dt-preview-layout{display:grid;grid-template-columns:1fr 280px;gap:1rem;align-items:start}
  .dt-preview-toolbar{display:flex;justify-content:space-between;align-items:center;margin-bottom:.75rem}
  .dt-preview-toolbar h3{display:flex;align-items:center;gap:8px;font-size:1rem;font-weight:700}
  .dt-preview-actions{display:flex;gap:6px}
  .dt-act-btn{padding:7px 14px;border:none;border-radius:8px;background:var(--surface-low);cursor:pointer;font-size:.75rem;font-weight:700;display:flex;align-items:center;gap:4px;color:var(--on-surface-muted);transition:all .15s}
  .dt-act-btn:hover{background:#eef2ff;color:var(--primary-indigo)}
  .dt-act-btn.primary{background:var(--signature-gradient);color:#fff}
  .dt-act-btn.primary:disabled{opacity:.5}
  .dt-preview-frame{background:#fff;border:1px solid var(--surface-variant);border-radius:12px;padding:40px;min-height:400px;font-family:'Times New Roman',serif;font-size:14px;line-height:1.8}
  .dt-preview-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:400px;color:var(--on-surface-muted);text-align:center;gap:12px}
  .dt-preview-sidebar{display:flex;flex-direction:column;gap:1rem}
  .dt-ctx-card{padding:1.25rem!important}
  .dt-ctx-card h4{font-size:.85rem;font-weight:700;margin-bottom:.75rem}
  .dt-ctx-field{display:flex;flex-direction:column;gap:.25rem;margin-bottom:.625rem}
  .dt-ctx-field label{font-size:.7rem;font-weight:700;color:var(--on-surface-muted)}
  .dt-ctx-field select{padding:8px 10px;border:1.5px solid var(--surface-variant);border-radius:8px;font-size:.8rem;outline:none;cursor:pointer}
  .dt-preview-btn{width:100%;padding:10px;border:none;border-radius:10px;background:var(--signature-gradient);color:#fff;font-weight:700;font-size:.85rem;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px}
  .dt-preview-btn:disabled{opacity:.5}
  .dt-used-vars{display:flex;flex-wrap:wrap;gap:4px}
  .dt-used-var{font-family:monospace;font-size:.65rem;padding:2px 6px;border-radius:4px;background:#eef2ff;color:var(--primary-indigo);font-weight:700}

  /* Variables table */
  .dt-var-table-card{padding:0!important;overflow:hidden}
  .dt-table{width:100%;border-collapse:collapse}
  .dt-table th{text-align:left;padding:.625rem 1rem;font-size:.65rem;font-weight:800;color:var(--on-surface-muted);text-transform:uppercase;letter-spacing:.05em;background:var(--surface-low)}
  .dt-table td{padding:.75rem 1rem;font-size:.8rem;border-bottom:1px solid var(--surface-variant)}
  .dt-table tbody tr:hover{background:var(--surface-low)}
  .dt-td-key code{font-size:.75rem;background:#eef2ff;color:var(--primary-indigo);padding:2px 6px;border-radius:4px;font-weight:700}
  .dt-td-label{font-weight:600}
  .dt-td-source code{font-size:.7rem;color:var(--on-surface-muted)}
  .dt-td-type{font-size:.7rem;color:var(--on-surface-muted)}
  .dt-group-chip{padding:2px 8px;border-radius:4px;font-size:.65rem;font-weight:700;background:var(--surface-low);color:var(--on-surface-muted)}

  /* Documents list */
  .dt-doc-list{display:flex;flex-direction:column;gap:.5rem}
  .dt-doc-item{display:flex;align-items:center;gap:12px;padding:1rem 1.25rem!important;cursor:pointer;transition:all .15s}
  .dt-doc-item:hover{transform:translateY(-1px);box-shadow:0 4px 12px rgba(0,0,0,.06)}
  .dt-doc-icon{width:40px;height:40px;border-radius:10px;background:#eef2ff;display:flex;align-items:center;justify-content:center;color:var(--primary-indigo);flex-shrink:0}
  .dt-doc-info{flex:1}
  .dt-doc-name{font-weight:700;font-size:.85rem;display:block}
  .dt-doc-meta{font-size:.7rem;color:var(--on-surface-muted)}
  .dt-doc-arrow{color:var(--on-surface-muted)}

  .dt-spin{animation:dt-spin 1s linear infinite}
  @keyframes dt-spin{to{transform:rotate(360deg)}}

  @media(max-width:1024px){.dt-editor-layout,.dt-preview-layout{grid-template-columns:1fr}.dt-grid{grid-template-columns:1fr}}
`;
