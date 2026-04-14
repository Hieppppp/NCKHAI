import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, FileText, Users, Award, Clock, CheckCircle2,
  Circle, Loader2, Sparkles, ChevronRight,
} from 'lucide-react';
import { workService } from '../../services/workService';
import { aiService } from '../../services/aiService';
import { useAuth } from '../../contexts/AuthContext';
import { Role } from '../../types';

const StatusColors: Record<string, string> = {
  DRAFT: '#94a3b8', SUBMITTED: '#3b82f6', OUTLINE_REVIEW: '#8b5cf6',
  PROPOSAL_REVIEW: '#6366f1', IN_PROGRESS: '#f59e0b', REVIEW: '#ec4899',
  REVISION: '#f97316', ACCEPTED: '#10b981', REJECTED: '#ef4444', ARCHIVED: '#64748b',
};

export default function WorkDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const [work, setWork] = useState<any>(null);
  const [experts, setExperts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      workService.getOne(+id),
      aiService.suggestExperts(+id).catch(() => []),
    ]).then(([w, e]) => {
      setWork(w);
      setExperts(e);
    }).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Loader2 size={36} className="spin" color="var(--primary-indigo)" /><style>{`.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>;
  if (!work) return <div style={{ padding: 48, textAlign: 'center' }}>Không tìm thấy công trình</div>;

  const stColor = StatusColors[work.status] || '#94a3b8';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Back + Title */}
      <button onClick={() => navigate('/projects')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--on-surface-muted)', fontFamily: 'inherit', fontSize: '0.85rem', padding: 0 }}>
        <ArrowLeft size={16} /> Quay lại danh sách
      </button>

      <div className="surface-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: 'var(--surface-low)', color: 'var(--on-surface-muted)' }}>{work.level}</span>
              <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--on-surface-muted)' }}>{work.type}</span>
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, lineHeight: 1.3, marginBottom: 8 }}>{work.title}</h1>
            <p style={{ fontSize: '0.95rem', color: 'var(--on-surface-muted)', marginBottom: 4 }}>{work.authors}</p>
            {work.user && <p style={{ fontSize: '0.8rem', color: 'var(--on-surface-muted)' }}>Đăng ký bởi: {work.user.name} - {work.user.department}</p>}
          </div>
          <span style={{ padding: '6px 14px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 700, background: `${stColor}15`, color: stColor }}>{work.status}</span>
        </div>

        {work.abstract && (
          <div style={{ marginTop: 16, padding: 16, background: 'var(--surface-low)', borderRadius: 10 }}>
            <h3 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--on-surface-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tóm tắt</h3>
            <p style={{ fontSize: '0.9rem', lineHeight: 1.6 }}>{work.abstract}</p>
          </div>
        )}

        {/* Metadata grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: 16 }}>
          {work.budget && <InfoCard icon={<FileText size={16} />} label="Kinh phí" value={`${(work.budget / 1000000).toFixed(0)} triệu`} />}
          {work.aiScore && <InfoCard icon={<Award size={16} />} label="Điểm AI" value={`${work.aiScore}/100 (${work.aiRank})`} />}
          {work.journalName && <InfoCard icon={<FileText size={16} />} label="Tạp chí" value={work.journalName} />}
          <InfoCard icon={<Clock size={16} />} label="Ngày tạo" value={new Date(work.createdAt).toLocaleDateString('vi-VN')} />
        </div>

        {work.keywords?.length > 0 && (
          <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {work.keywords.map((kw: string) => (
              <span key={kw} style={{ padding: '3px 10px', borderRadius: 6, background: 'var(--surface-high)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary-indigo)' }}>{kw}</span>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16, alignItems: 'start' }}>
        {/* Workflow Steps */}
        <div className="surface-card">
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16 }}>Quy trình xét duyệt</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {work.workflowSteps?.map((step: any, idx: number) => {
              const isCompleted = step.completedAt !== null;
              const isCurrent = !isCompleted && idx === work.workflowSteps.findIndex((s: any) => !s.completedAt);
              return (
                <div key={step.id} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', paddingBottom: idx < work.workflowSteps.length - 1 ? 0 : 0 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    {isCompleted ? (
                      <CheckCircle2 size={22} color="var(--success)" fill="var(--success)" style={{ color: '#fff' }} />
                    ) : isCurrent ? (
                      <div style={{ width: 22, height: 22, borderRadius: '50%', border: '3px solid var(--primary-violet)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary-violet)' }} />
                      </div>
                    ) : (
                      <Circle size={22} color="var(--surface-variant)" />
                    )}
                    {idx < work.workflowSteps.length - 1 && (
                      <div style={{ width: 2, height: 32, background: isCompleted ? 'var(--success)' : 'var(--surface-variant)', margin: '4px 0' }} />
                    )}
                  </div>
                  <div style={{ paddingBottom: 12 }}>
                    <div style={{ fontWeight: isCurrent ? 700 : 600, fontSize: '0.9rem', color: isCurrent ? 'var(--primary-indigo)' : isCompleted ? 'var(--on-surface)' : 'var(--on-surface-muted)' }}>
                      Bước {step.order}: {step.name}
                    </div>
                    {step.completedAt && <div style={{ fontSize: '0.75rem', color: 'var(--on-surface-muted)' }}>Hoàn thành: {new Date(step.completedAt).toLocaleDateString('vi-VN')}</div>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Status change for admin */}
          {hasRole(Role.ADMIN, Role.REVIEWER) && (
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--surface-variant)' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--on-surface-muted)', display: 'block', marginBottom: 6 }}>Chuyển trạng thái</label>
              <select
                value={work.status}
                onChange={async (e) => {
                  await workService.update(work.id, { status: e.target.value });
                  const updated = await workService.getOne(work.id);
                  setWork(updated);
                }}
                style={{ padding: '8px 12px', border: '1.5px solid var(--surface-variant)', borderRadius: 8, fontSize: '0.85rem', fontFamily: 'inherit', background: 'var(--surface)', cursor: 'pointer' }}
              >
                {['DRAFT', 'SUBMITTED', 'OUTLINE_REVIEW', 'PROPOSAL_REVIEW', 'IN_PROGRESS', 'REVIEW', 'REVISION', 'ACCEPTED', 'REJECTED', 'ARCHIVED'].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* AI Expert Suggestions */}
          {experts.length > 0 && (
            <div className="surface-card" style={{ background: '#fdf2ff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                <Sparkles size={16} color="var(--primary-violet)" />
                <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary-indigo)' }}>AI - Đề xuất phản biện</h3>
              </div>
              {experts.map((e: any) => (
                <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--signature-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '0.75rem' }}>
                    {e.name[0]}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{e.name}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--on-surface-muted)' }}>Phù hợp: {e.matchedKeywords.join(', ')}</div>
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary-violet)' }}>{e.matchScore} kw</span>
                </div>
              ))}
            </div>
          )}

          {/* Reviews */}
          {work.reviews?.length > 0 && (
            <div className="surface-card">
              <h3 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: 12 }}>Nhận xét ({work.reviews.length})</h3>
              {work.reviews.map((r: any) => (
                <div key={r.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--surface-variant)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{r.reviewer?.name}</span>
                    <span style={{ fontWeight: 700, fontSize: '0.85rem', color: (r.totalScore || 0) >= 70 ? 'var(--success)' : 'var(--warning)' }}>{r.totalScore}/100</span>
                  </div>
                  {r.comment && <p style={{ fontSize: '0.8rem', color: 'var(--on-surface-muted)', lineHeight: 1.5 }}>{r.comment}</p>}
                </div>
              ))}
            </div>
          )}

          {/* Files */}
          {work.files?.length > 0 && (
            <div className="surface-card">
              <h3 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: 12 }}>Tài liệu ({work.files.length})</h3>
              {work.files.map((f: any) => (
                <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0' }}>
                  <FileText size={16} color="var(--on-surface-muted)" />
                  <span style={{ fontSize: '0.85rem', flex: 1 }}>{f.originalName}</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--on-surface-muted)' }}>{(f.size / 1024).toFixed(0)}KB</span>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <button className="btn-signature" style={{ width: '100%', fontSize: '0.85rem', padding: '10px 16px' }}
            onClick={() => navigate(`/ai?workId=${work.id}`)}>
            <Sparkles size={16} /> Phân tích AI <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <style>{`.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function InfoCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div style={{ padding: '10px 12px', background: 'var(--surface-low)', borderRadius: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, color: 'var(--on-surface-muted)' }}>
        {icon}
        <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      </div>
      <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{value}</div>
    </div>
  );
}
