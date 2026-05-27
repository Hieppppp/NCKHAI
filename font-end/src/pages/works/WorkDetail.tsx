import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, FileText, Award, Clock, CheckCircle2,
  Circle, Loader2, Sparkles, ChevronRight, Upload, Download,
  Trash2, Eye, File as FileIcon, Image, FileSpreadsheet,
} from 'lucide-react';
import { workService } from '../../services/workService';
import { aiService } from '../../services/aiService';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/common/Toast';
import { Role } from '../../types';
import type { WorksModule } from '../../config/worksModules';

const StatusColors: Record<string, string> = {
  DRAFT: '#94a3b8', SUBMITTED: '#3b82f6', OUTLINE_REVIEW: '#3b82f6',
  PROPOSAL_REVIEW: '#6366f1', IN_PROGRESS: '#f59e0b', REVIEW: '#ec4899',
  REVISION: '#f97316', ACCEPTED: '#10b981', REJECTED: '#ef4444', ARCHIVED: '#64748b',
};

const CATEGORIES: Record<string, string> = {
  MANUSCRIPT: 'Bài báo / Công trình',
  PROPOSAL: 'Đề cương / Thuyết minh',
  REPORT: 'Báo cáo',
  REVIEW_FORM: 'Phiếu đánh giá',
  CERTIFICATE: 'Chứng nhận',
  ATTACHMENT: 'Tài liệu đính kèm',
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function getFileIcon(mimeType: string) {
  if (mimeType?.startsWith('image/')) return Image;
  if (mimeType?.includes('spreadsheet') || mimeType?.includes('excel')) return FileSpreadsheet;
  return FileIcon;
}

export default function WorkDetail({ mod }: { mod: WorksModule }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  const { success: showSuccess, error: showError, confirm: showConfirm } = useToast();

  const [work, setWork] = useState<any>(null);
  const [experts, setExperts] = useState<any[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('MANUSCRIPT');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!id) return;
    loadAll();
  }, [id]);

  const loadAll = async () => {
    try {
      const [w, e, f] = await Promise.all([
        workService.getOne(+id!),
        aiService.suggestExperts(+id!).catch(() => []),
        workService.getFiles(+id!).catch(() => []),
      ]);
      setWork(w); setExperts(e); setFiles(f);
    } finally { setLoading(false); }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await workService.uploadFile(+id!, file, selectedCategory);
      showSuccess(`Đã upload "${file.name}"`);
      const updated = await workService.getFiles(+id!);
      setFiles(updated);
    } catch (err: any) {
      showError(err.response?.data?.message || 'Upload thất bại');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDownload = async (fileId: number, originalName: string) => {
    try {
      const { url } = await workService.downloadFile(fileId);
      const a = document.createElement('a');
      a.href = url;
      a.download = originalName;
      a.target = '_blank';
      a.click();
    } catch { showError('Không thể tải file'); }
  };

  const handleView = async (fileId: number) => {
    try {
      const { url } = await workService.downloadFile(fileId);
      window.open(url, '_blank');
    } catch { showError('Không thể mở file'); }
  };

  const handleDeleteFile = (file: any) => {
    showConfirm('Xóa file', `Xóa "${file.originalName}"?`, async () => {
      try {
        await workService.deleteFile(file.id);
        showSuccess('Đã xóa file');
        const updated = await workService.getFiles(+id!);
        setFiles(updated);
      } catch { showError('Xóa thất bại'); }
    }, { confirmLabel: 'Xóa', danger: true });
  };

  if (loading) return <div className="wd-loading"><Loader2 size={36} className="wd-spin" color="var(--primary-indigo)" /></div>;
  if (!work) return <div className="wd-empty">Không tìm thấy công trình</div>;

  const stColor = StatusColors[work.status] || '#94a3b8';
  const canUpload = work.userId === user?.id || hasRole(Role.ADMIN, Role.LECTURER);

  return (
    <div className="wd">
      <button className="wd-back" onClick={() => navigate(mod.basePath)}><ArrowLeft size={16} /> Quay lại danh sách</button>

      {/* Header Card */}
      <div className="surface-card wd-header">
        <div className="wd-header-top">
          <div className="wd-header-info">
            <div className="wd-badges">
              <span className="wd-badge level">{work.level}</span>
              <span className="wd-badge type">{work.type}</span>
            </div>
            <h1>{work.title}</h1>
            <p className="wd-authors">{work.authors}</p>
            {work.user && <p className="wd-owner">Đăng ký bởi: {work.user.name} — {work.user.department || ''}</p>}
          </div>
          <span className="wd-status-pill" style={{ background: `${stColor}15`, color: stColor }}>{work.status}</span>
        </div>

        {work.abstract && (
          <div className="wd-abstract">
            <h3>Tóm tắt</h3>
            <p>{work.abstract}</p>
          </div>
        )}

        <div className="wd-meta-grid">
          {work.budget && <div className="wd-meta-item"><FileText size={14} /><div><small>Kinh phí</small><strong>{(work.budget / 1000000).toFixed(0)} triệu VNĐ</strong></div></div>}
          {work.aiScore && <div className="wd-meta-item"><Award size={14} /><div><small>Điểm AI</small><strong>{work.aiScore}/100 ({work.aiRank})</strong></div></div>}
          {work.journalName && <div className="wd-meta-item"><FileText size={14} /><div><small>Tạp chí</small><strong>{work.journalName}</strong></div></div>}
          <div className="wd-meta-item"><Clock size={14} /><div><small>Ngày tạo</small><strong>{new Date(work.createdAt).toLocaleDateString('vi-VN')}</strong></div></div>
        </div>

        {work.keywords?.length > 0 && (
          <div className="wd-keywords">
            {work.keywords.map((kw: string) => <span key={kw} className="wd-kw">{kw}</span>)}
          </div>
        )}
      </div>

      <div className="wd-body">
        {/* Left Column */}
        <div className="wd-left">
          {/* Files section - UPLOAD/DOWNLOAD */}
          <div className="surface-card">
            <div className="wd-section-head">
              <h2><FileText size={18} /> Tài liệu đính kèm ({files.length})</h2>
              {canUpload && (
                <div className="wd-upload-wrap">
                  <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className="wd-cat-select">
                    {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  <button className="wd-btn primary" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                    {uploading ? <Loader2 size={14} className="wd-spin" /> : <Upload size={14} />}
                    {uploading ? 'Đang upload...' : 'Upload file'}
                  </button>
                  <input ref={fileInputRef} type="file" onChange={handleUpload} style={{ display: 'none' }}
                    accept=".pdf,.docx,.doc,.xlsx,.xls,.png,.jpg,.jpeg,.tiff" />
                </div>
              )}
            </div>

            {files.length === 0 ? (
              <div className="wd-file-empty">
                <FileIcon size={40} style={{ opacity: .2 }} />
                <p>Chưa có tài liệu nào</p>
                {canUpload && <p className="wd-hint">Click "Upload file" để thêm bài báo, đề cương, báo cáo...</p>}
              </div>
            ) : (
              <div className="wd-file-list">
                {files.map(f => {
                  const Icon = getFileIcon(f.mimeType);
                  const canDelete = f.uploaderId === user?.id || hasRole(Role.ADMIN);
                  return (
                    <div key={f.id} className="wd-file-row">
                      <div className="wd-file-icon"><Icon size={18} /></div>
                      <div className="wd-file-info">
                        <span className="wd-file-name">{f.originalName}</span>
                        <div className="wd-file-meta">
                          <span className="wd-cat-badge">{CATEGORIES[f.category] || f.category}</span>
                          <span>•</span>
                          <span>{formatFileSize(f.size)}</span>
                          <span>•</span>
                          <span>{f.uploader?.name}</span>
                          <span>•</span>
                          <span>{new Date(f.createdAt).toLocaleDateString('vi-VN')}</span>
                          {f.ocrConfidence && <><span>•</span><span className="wd-ocr">OCR: {f.ocrConfidence.toFixed(0)}%</span></>}
                        </div>
                      </div>
                      <div className="wd-file-actions">
                        <button className="wd-icon-btn" title="Xem" onClick={() => handleView(f.id)}><Eye size={15} /></button>
                        <button className="wd-icon-btn" title="Tải về" onClick={() => handleDownload(f.id, f.originalName)}><Download size={15} /></button>
                        {canDelete && <button className="wd-icon-btn danger" title="Xóa" onClick={() => handleDeleteFile(f)}><Trash2 size={15} /></button>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Workflow */}
          <div className="surface-card">
            <h2 className="wd-section-title">Quy trình xét duyệt</h2>
            <div className="wd-workflow">
              {work.workflowSteps?.map((step: any, idx: number) => {
                const isCompleted = step.completedAt !== null;
                const isCurrent = !isCompleted && idx === work.workflowSteps.findIndex((s: any) => !s.completedAt);
                return (
                  <div key={step.id} className="wd-step">
                    <div className="wd-step-marker">
                      {isCompleted ? <CheckCircle2 size={22} color="var(--success)" fill="var(--success)" style={{ color: '#fff' }} />
                        : isCurrent ? <div className="wd-step-current"><div /></div>
                        : <Circle size={22} color="var(--surface-variant)" />}
                      {idx < work.workflowSteps.length - 1 && <div className={`wd-step-line ${isCompleted ? 'done' : ''}`} />}
                    </div>
                    <div className="wd-step-info">
                      <div className={`wd-step-name ${isCurrent ? 'current' : isCompleted ? 'done' : ''}`}>
                        Bước {step.order}: {step.name}
                      </div>
                      {step.completedAt && <div className="wd-step-date">Hoàn thành: {new Date(step.completedAt).toLocaleDateString('vi-VN')}</div>}
                    </div>
                  </div>
                );
              })}
            </div>

            {hasRole(Role.ADMIN, Role.REVIEWER) && (
              <div className="wd-status-change">
                <label>Chuyển trạng thái</label>
                <select value={work.status} onChange={async (e) => {
                  try {
                    await workService.update(work.id, { status: e.target.value });
                    const updated = await workService.getOne(work.id);
                    setWork(updated);
                    showSuccess('Đã cập nhật trạng thái');
                  } catch { showError('Cập nhật thất bại'); }
                }}>
                  {['DRAFT', 'SUBMITTED', 'OUTLINE_REVIEW', 'PROPOSAL_REVIEW', 'IN_PROGRESS', 'REVIEW', 'REVISION', 'ACCEPTED', 'REJECTED', 'ARCHIVED'].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <aside className="wd-right">
          {experts.length > 0 && (
            <div className="surface-card">
              <h3 className="wd-section-title"><Sparkles size={14} /> AI - Đề xuất phản biện</h3>
              {experts.map((e: any) => (
                <div key={e.id} className="wd-expert-row">
                  <div className="wd-expert-avatar">{e.name[0]}</div>
                  <div className="wd-expert-info">
                    <div className="wd-expert-name">{e.name}</div>
                    <div className="wd-expert-meta">Phù hợp: {e.matchedKeywords?.join(', ') || '—'}</div>
                  </div>
                  {e.matchScore && <span className="wd-expert-score">{e.matchScore} kw</span>}
                </div>
              ))}
            </div>
          )}

          {work.reviews?.length > 0 && (
            <div className="surface-card">
              <h3 className="wd-section-title">Nhận xét ({work.reviews.length})</h3>
              {work.reviews.map((r: any) => (
                <div key={r.id} className="wd-review-row">
                  <div className="wd-review-head">
                    <span>{r.reviewer?.name}</span>
                    <strong style={{ color: (r.totalScore || 0) >= 70 ? 'var(--success)' : 'var(--warning)' }}>{r.totalScore}/100</strong>
                  </div>
                  {r.comment && <p>{r.comment}</p>}
                </div>
              ))}
            </div>
          )}

          <button className="btn-signature wd-ai-btn" onClick={() => navigate(`/ai?workId=${work.id}`)}>
            <Sparkles size={16} /> Phân tích AI <ChevronRight size={14} />
          </button>
        </aside>
      </div>

      <style>{`
        .wd{display:flex;flex-direction:column;gap:1.25rem;padding-bottom:3rem}
        .wd-loading,.wd-empty{display:flex;justify-content:center;padding:4rem;color:var(--on-surface-muted)}
        .wd-back{background:none;border:none;display:flex;align-items:center;gap:6px;cursor:pointer;color:var(--on-surface-muted);font-weight:700;font-size:.85rem;padding:0;font-family:inherit}

        /* Header Card */
        .wd-header{padding:2rem!important}
        .wd-header-top{display:flex;justify-content:space-between;align-items:flex-start;gap:1rem}
        .wd-header-info{flex:1}
        .wd-badges{display:flex;gap:6px;margin-bottom:.5rem}
        .wd-badge{font-size:.65rem;font-weight:700;padding:3px 10px;border-radius:4px;text-transform:uppercase;letter-spacing:.03em}
        .wd-badge.level{background:var(--surface-low);color:var(--on-surface-muted)}
        .wd-badge.type{background:#e0f2fe;color:#0369a1}
        .wd-header h1{font-size:1.5rem;font-weight:800;line-height:1.3;margin-bottom:.5rem}
        .wd-authors{font-size:.9rem;color:var(--on-surface);margin-bottom:.25rem}
        .wd-owner{font-size:.75rem;color:var(--on-surface-muted)}
        .wd-status-pill{padding:6px 14px;border-radius:8px;font-size:.75rem;font-weight:800;white-space:nowrap}

        .wd-abstract{margin-top:1rem;padding:1rem;background:var(--surface-low);border-radius:10px}
        .wd-abstract h3{font-size:.7rem;font-weight:800;color:var(--on-surface-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:.4rem}
        .wd-abstract p{font-size:.875rem;line-height:1.6}

        .wd-meta-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:.75rem;margin-top:1rem}
        .wd-meta-item{padding:.75rem;background:var(--surface-low);border-radius:8px;display:flex;gap:8px;align-items:center}
        .wd-meta-item svg{color:var(--on-surface-muted);flex-shrink:0}
        .wd-meta-item small{font-size:.65rem;font-weight:700;color:var(--on-surface-muted);text-transform:uppercase;letter-spacing:.04em;display:block;margin-bottom:2px}
        .wd-meta-item strong{font-size:.85rem;font-weight:700}

        .wd-keywords{display:flex;flex-wrap:wrap;gap:5px;margin-top:1rem}
        .wd-kw{padding:3px 10px;border-radius:6px;background:var(--surface-high);font-size:.72rem;font-weight:600;color:var(--primary-indigo)}

        /* Body Grid */
        .wd-body{display:grid;grid-template-columns:1fr 320px;gap:1rem;align-items:start}
        .wd-left{display:flex;flex-direction:column;gap:1rem}
        .wd-right{display:flex;flex-direction:column;gap:1rem}

        /* Section heads */
        .wd-section-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;gap:1rem;flex-wrap:wrap}
        .wd-section-head h2{font-size:1rem;font-weight:700;display:flex;align-items:center;gap:8px}
        .wd-section-title{font-size:.875rem;font-weight:700;margin-bottom:.75rem;display:flex;align-items:center;gap:6px}

        /* Upload */
        .wd-upload-wrap{display:flex;gap:6px;align-items:center}
        .wd-cat-select{padding:7px 10px;border:1.5px solid var(--surface-variant);border-radius:8px;font-size:.75rem;background:var(--surface-lowest);cursor:pointer;outline:none;font-family:inherit}
        .wd-cat-select:focus{border-color:var(--primary-indigo)}

        /* Buttons */
        .wd-btn{display:inline-flex;align-items:center;gap:5px;border:none;border-radius:8px;font-weight:700;font-size:.8rem;cursor:pointer;transition:all .15s;padding:7px 14px;font-family:inherit}
        .wd-btn.primary{background:var(--signature-gradient);color:#fff}
        .wd-btn.primary:hover{transform:translateY(-1px);box-shadow:var(--tinted-shadow)}
        .wd-btn.primary:disabled{opacity:.6;cursor:not-allowed}

        /* File List */
        .wd-file-empty{text-align:center;padding:2rem;color:var(--on-surface-muted)}
        .wd-file-empty p{margin-top:.5rem;font-size:.85rem}
        .wd-hint{font-size:.75rem!important;color:var(--on-surface-variant)}
        .wd-file-list{display:flex;flex-direction:column;gap:.5rem}
        .wd-file-row{display:flex;align-items:center;gap:12px;padding:.75rem 1rem;background:var(--surface-low);border-radius:10px;transition:all .15s}
        .wd-file-row:hover{background:var(--surface-high)}
        .wd-file-icon{width:36px;height:36px;border-radius:8px;background:var(--surface-lowest);display:flex;align-items:center;justify-content:center;color:var(--primary-accent);flex-shrink:0}
        .wd-file-info{flex:1;min-width:0}
        .wd-file-name{font-weight:600;font-size:.85rem;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .wd-file-meta{display:flex;align-items:center;gap:6px;font-size:.7rem;color:var(--on-surface-muted);margin-top:2px;flex-wrap:wrap}
        .wd-cat-badge{padding:1px 7px;border-radius:4px;background:var(--surface-lowest);color:var(--primary-indigo);font-weight:700;font-size:.65rem}
        .wd-ocr{color:var(--success);font-weight:700}
        .wd-file-actions{display:flex;gap:4px}
        .wd-icon-btn{width:30px;height:30px;border:none;border-radius:6px;background:var(--surface-lowest);cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--on-surface-muted);transition:all .15s}
        .wd-icon-btn:hover{background:var(--surface-variant);color:var(--primary-indigo)}
        .wd-icon-btn.danger:hover{background:#fee2e2;color:#dc2626}

        /* Workflow */
        .wd-workflow{display:flex;flex-direction:column}
        .wd-step{display:flex;gap:14px;align-items:flex-start}
        .wd-step-marker{display:flex;flex-direction:column;align-items:center}
        .wd-step-current{width:22px;height:22px;border-radius:50%;border:3px solid var(--primary-indigo);display:flex;align-items:center;justify-content:center}
        .wd-step-current>div{width:8px;height:8px;border-radius:50%;background:var(--primary-indigo)}
        .wd-step-line{width:2px;height:32px;background:var(--surface-variant);margin:4px 0}
        .wd-step-line.done{background:var(--success)}
        .wd-step-info{padding-bottom:12px;flex:1}
        .wd-step-name{font-weight:600;font-size:.9rem;color:var(--on-surface-muted)}
        .wd-step-name.current{color:var(--primary-indigo);font-weight:700}
        .wd-step-name.done{color:var(--on-surface)}
        .wd-step-date{font-size:.7rem;color:var(--on-surface-muted)}

        .wd-status-change{margin-top:1rem;padding-top:1rem;border-top:1px solid var(--surface-variant)}
        .wd-status-change label{font-size:.75rem;font-weight:700;color:var(--on-surface-muted);display:block;margin-bottom:.4rem;text-transform:uppercase;letter-spacing:.04em}
        .wd-status-change select{padding:8px 12px;border:1.5px solid var(--surface-variant);border-radius:8px;font-size:.85rem;background:var(--surface-lowest);cursor:pointer;outline:none;font-family:inherit}

        /* Experts & Reviews */
        .wd-expert-row{display:flex;align-items:center;gap:10px;padding:.5rem 0;border-bottom:1px solid var(--surface-variant)}
        .wd-expert-row:last-child{border:none}
        .wd-expert-avatar{width:32px;height:32px;border-radius:50%;background:var(--signature-gradient);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:.8rem}
        .wd-expert-info{flex:1;min-width:0}
        .wd-expert-name{font-weight:600;font-size:.85rem}
        .wd-expert-meta{font-size:.7rem;color:var(--on-surface-muted)}
        .wd-expert-score{font-size:.75rem;font-weight:700;color:var(--primary-indigo)}

        .wd-review-row{padding:.625rem 0;border-bottom:1px solid var(--surface-variant)}
        .wd-review-row:last-child{border:none}
        .wd-review-head{display:flex;justify-content:space-between;margin-bottom:4px;font-size:.85rem}
        .wd-review-head span{font-weight:600}
        .wd-review-row p{font-size:.8rem;color:var(--on-surface-muted);line-height:1.5}

        .wd-ai-btn{width:100%;font-size:.85rem;padding:10px 16px}

        .wd-spin{animation:wd-spin 1s linear infinite}
        @keyframes wd-spin{to{transform:rotate(360deg)}}

        @media(max-width:1024px){.wd-body{grid-template-columns:1fr}.wd-meta-grid{grid-template-columns:repeat(2,1fr)}}
      `}</style>
    </div>
  );
}
