import { useState, useEffect } from 'react';
import {
  Send, Sparkles, ShieldCheck, PenTool, Plus, Users, Calendar, MapPin,
  Loader2, CheckCircle, Clock, Star, ArrowLeft, X,
} from 'lucide-react';
import { ProgressBar } from '../components/common/ProgressBar';
import { Modal } from '../components/common/Modal';
import { committeeService } from '../services/committeeService';
import { workService } from '../services/workService';
import { userService } from '../services/userService';
import { aiService } from '../services/aiService';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/common/Toast';
import { Role } from '../types';

interface Committee {
  id: number; name: string; description?: string; meetingDate?: string; location?: string; finalScore?: number; conclusion?: string;
  work: { id: number; title: string; status?: string; authors?: string; abstract?: string; level?: string };
  members: { id: number; role: string; user: { id: number; name: string; email: string; specialization?: string } }[];
  reviews: { id: number; innovationScore: number; feasibilityScore: number; impactScore: number; totalScore: number; comment?: string; recommendation?: string; reviewer: { id: number; name: string; email: string }; createdAt: string }[];
  _count?: { reviews: number };
}

export const CommitteeEvaluation = () => {
  const { user, hasRole } = useAuth();
  const { error: showError } = useToast();
  const [committees, setCommittees] = useState<Committee[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Committee | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [experts, setExperts] = useState<any[]>([]);

  const [worksList, setWorksList] = useState<{ id: number; title: string }[]>([]);
  const [usersList, setUsersList] = useState<{ id: number; name: string; email: string; role: string }[]>([]);

  const [scores, setScores] = useState({ innovation: 0, feasibility: 0, impact: 0 });
  const [comment, setComment] = useState('');
  const [recommendation, setRecommendation] = useState('');
  const totalScore = scores.innovation + scores.feasibility + scores.impact;

  const [createForm, setCreateForm] = useState({ name: '', description: '', workId: '', meetingDate: '', location: '', members: [{ userId: '', role: 'reviewer' }] });

  useEffect(() => { loadCommittees(); }, []);

  const loadCommittees = async () => { setLoading(true); try { setCommittees(await committeeService.getAll()); } catch { /* */ } setLoading(false); };

  const loadDetail = async (id: number) => {
    try {
      const data = await committeeService.getOne(id);
      setSelected(data); setScores({ innovation: 0, feasibility: 0, impact: 0 }); setComment(''); setRecommendation(''); setSubmitSuccess(false);
      if (data.work?.id) { try { const e = await aiService.suggestExperts(data.work.id); setExperts(e.suggestions || e || []); } catch { setExperts([]); } }
    } catch { /* */ }
  };

  const openCreate = async () => {
    setShowCreate(true);
    try {
      const [w, u] = await Promise.all([workService.getAll({ page: '1', limit: '100' }), userService.getAll(1, 100)]);
      setWorksList((w.data || w).map((x: any) => ({ id: x.id, title: x.title })));
      setUsersList((u.data || u).map((x: any) => ({ id: x.id, name: x.name || x.email, email: x.email, role: x.role })));
    } catch { /* */ }
  };

  const handleCreate = async () => {
    setSubmitting(true);
    try {
      await committeeService.create({ name: createForm.name, description: createForm.description, workId: +createForm.workId, meetingDate: createForm.meetingDate || undefined, location: createForm.location || undefined, members: createForm.members.filter(m => m.userId).map(m => ({ userId: +m.userId, role: m.role })) });
      setShowCreate(false); setCreateForm({ name: '', description: '', workId: '', meetingDate: '', location: '', members: [{ userId: '', role: 'reviewer' }] }); loadCommittees();
    } catch (e: any) { showError(e.response?.data?.message || 'Tạo hội đồng thất bại'); }
    setSubmitting(false);
  };

  const handleSubmitReview = async () => {
    if (!selected || !user) return;
    setSubmitting(true);
    try {
      await committeeService.submitReview({ workId: selected.work.id, committeeId: selected.id, innovationScore: scores.innovation, feasibilityScore: scores.feasibility, impactScore: scores.impact, comment, recommendation });
      setSubmitSuccess(true); loadDetail(selected.id);
    } catch (e: any) { showError(e.response?.data?.message || 'Gửi đánh giá thất bại'); }
    setSubmitting(false);
  };

  const userReviewed = selected?.reviews?.some(r => r.reviewer.id === user?.id);
  const isMember = selected?.members?.some(m => m.user.id === user?.id);
  const completed = committees.filter(c => c.finalScore != null).length;
  const avgScore = completed > 0 ? (committees.filter(c => c.finalScore != null).reduce((s, c) => s + (c.finalScore || 0), 0) / completed).toFixed(1) : '—';

  // ─── DETAIL VIEW ───
  if (selected) {
    return (
      <div className="ce">
        <button className="ce-back" onClick={() => setSelected(null)}><ArrowLeft size={16} /> Quay lại danh sách</button>

        {submitSuccess && <div className="ce-success"><CheckCircle size={16} /> Đánh giá đã được gửi thành công!</div>}

        <div className="ce-detail-grid">
          <div className="ce-main">
            {/* Project summary */}
            <div className="surface-card ce-project">
              <div className="ce-proj-visual"><div className="ce-proj-overlay"><small>LĨNH VỰC</small><strong>{selected.work.level || 'Nghiên cứu'}</strong></div></div>
              <div className="ce-proj-info">
                <h2>{selected.work.title}</h2>
                {selected.work.abstract && <p className="ce-proj-abs">{selected.work.abstract}</p>}
                <div className="ce-proj-meta">
                  <div><small>TÁC GIẢ</small><strong>{selected.work.authors || '—'}</strong></div>
                  <div><small>NGÀY HỌP</small><strong>{selected.meetingDate ? new Date(selected.meetingDate).toLocaleDateString('vi-VN') : 'Chưa xác định'}</strong></div>
                  <div><small>ĐỊA ĐIỂM</small><strong>{selected.location || 'Chưa xác định'}</strong></div>
                  <div><small>TRẠNG THÁI</small><strong>{selected.work.status || '—'}</strong></div>
                </div>
              </div>
            </div>

            {/* Score sheet or reviews */}
            {isMember && !userReviewed ? (
              <div className="surface-card ce-score-card">
                <div className="ce-score-head">
                  <div className="ce-score-title"><PenTool size={18} /> Phiếu đánh giá điện tử</div>
                  <div className="ce-total-badge"><small>TỔNG:</small> <strong>{totalScore}</strong> <span>/100</span></div>
                </div>
                <div className="ce-criteria">
                  <Slider label="1. Tính đổi mới & Sáng tạo" desc="Đánh giá sự khác biệt so với các nghiên cứu hiện có." max={40} value={scores.innovation} onChange={v => setScores({ ...scores, innovation: v })} />
                  <Slider label="2. Tính khả thi & Phương pháp luận" desc="Đánh giá độ tin cậy của mô hình và đội ngũ thực hiện." max={30} value={scores.feasibility} onChange={v => setScores({ ...scores, feasibility: v })} />
                  <Slider label="3. Tác động kinh tế - xã hội" desc="Đánh giá khả năng chuyển giao và áp dụng thực tiễn." max={30} value={scores.impact} onChange={v => setScores({ ...scores, impact: v })} />
                </div>
                <h4 className="ce-comment-label">Nhận xét chi tiết</h4>
                <textarea className="ce-textarea" value={comment} onChange={e => setComment(e.target.value)} placeholder="Nhập ý kiến chuyên môn..." />
                <div className="ce-rec-row">
                  {[{ v: 'accept', l: 'Chấp nhận', c: '#10b981' }, { v: 'revise', l: 'Yêu cầu chỉnh sửa', c: '#f59e0b' }, { v: 'reject', l: 'Từ chối', c: '#ef4444' }].map(o => (
                    <button key={o.v} className={`ce-rec-btn ${recommendation === o.v ? 'active' : ''}`} style={{ borderColor: recommendation === o.v ? o.c : undefined, color: recommendation === o.v ? o.c : undefined, background: recommendation === o.v ? `${o.c}12` : undefined }} onClick={() => setRecommendation(o.v)}>{o.l}</button>
                  ))}
                </div>
                <button className="ce-submit-btn" onClick={handleSubmitReview} disabled={submitting || totalScore === 0}>
                  {submitting ? <Loader2 size={16} className="ce-spin" /> : <Send size={16} />} Gửi đánh giá
                </button>
              </div>
            ) : (
              <div className="surface-card ce-reviews-card">
                <h3><PenTool size={16} /> Kết quả đánh giá ({selected.reviews.length} phiếu)</h3>
                {selected.finalScore != null && (
                  <div className={`ce-final ${selected.conclusion === 'Đạt' ? 'pass' : selected.conclusion === 'Không đạt' ? 'fail' : 'warn'}`}>
                    <span className="ce-final-score">{selected.finalScore.toFixed(1)}</span>
                    <div><strong>Kết luận: {selected.conclusion}</strong><p>Điểm trung bình từ {selected.reviews.length} phiếu</p></div>
                  </div>
                )}
                {selected.reviews.length === 0 ? <p className="ce-muted">Chưa có đánh giá nào</p> : (
                  <div className="ce-review-list">{selected.reviews.map(r => (
                    <div key={r.id} className="ce-review-item">
                      <div className="ce-review-head"><span>{r.reviewer.name || r.reviewer.email}</span><strong>{r.totalScore}/100</strong></div>
                      <div className="ce-review-scores"><span>Đổi mới: <b>{r.innovationScore}/40</b></span><span>Khả thi: <b>{r.feasibilityScore}/30</b></span><span>Tác động: <b>{r.impactScore}/30</b></span></div>
                      {r.comment && <p className="ce-review-comment">{r.comment}</p>}
                      {r.recommendation && <span className={`ce-rec-pill ${r.recommendation}`}>{r.recommendation === 'accept' ? 'Chấp nhận' : r.recommendation === 'reject' ? 'Từ chối' : 'Yêu cầu chỉnh sửa'}</span>}
                    </div>
                  ))}</div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="ce-side">
            {/* AI Experts */}
            <div className="ce-ai-card">
              <div className="ce-ai-head"><Sparkles size={16} /> AI GỢI Ý CHUYÊN GIA</div>
              {experts.length > 0 ? (
                <div className="ce-expert-list">{experts.slice(0, 5).map((e: any, i: number) => (
                  <div key={i} className="ce-expert"><div className="ce-expert-avatar">{(e.name || 'U')[0]}</div><div className="ce-expert-info"><h5>{e.name}</h5><p>{e.specialization || e.email}</p></div>{e.matchScore && <span className="ce-match">{e.matchScore}%</span>}</div>
                ))}</div>
              ) : <p className="ce-ai-hint">Chưa có dữ liệu gợi ý</p>}
            </div>

            {/* Progress */}
            <div className="surface-card ce-progress-card">
              <h4>Tiến độ Hội đồng</h4>
              <div className="ce-prog-stats"><span>Đã chấm</span><strong>{selected.reviews.length} / {selected.members.length}</strong></div>
              <ProgressBar progress={selected.members.length > 0 ? (selected.reviews.length / selected.members.length) * 100 : 0} color="var(--primary-indigo)" height="6px" />
              <div className="ce-member-list">
                {selected.members.map(m => {
                  const reviewed = selected.reviews.some(r => r.reviewer.id === m.user.id);
                  return (
                    <div key={m.id} className="ce-member-row">
                      <div className={`ce-member-dot ${reviewed ? 'done' : ''}`}>{reviewed ? <CheckCircle size={12} /> : (m.user.name || 'U')[0]}</div>
                      <span>{m.user.name || m.user.email}</span>
                      <small>({m.role === 'chair' ? 'Chủ tịch' : m.role === 'secretary' ? 'Thư ký' : m.role === 'reviewer' ? 'Phản biện' : 'Thành viên'})</small>
                    </div>
                  );
                })}
              </div>
            </div>

            <button className="ce-back-btn" onClick={() => setSelected(null)}><ArrowLeft size={14} /> Quay lại danh sách</button>
            {isMember && !userReviewed && <button className="ce-submit-side" onClick={handleSubmitReview} disabled={submitting || totalScore === 0}><ShieldCheck size={16} /> Xác nhận & Gửi</button>}
          </aside>
        </div>
        <style>{ceStyles}</style>
      </div>
    );
  }

  // ─── LIST VIEW ───
  return (
    <div className="ce">
      <section className="ce-hero">
        <div className="ce-hero-left">
          <h1>Hội đồng Đánh giá</h1>
          <p>Quản lý và đánh giá các công trình khoa học qua hội đồng phản biện chuyên nghiệp</p>
          {hasRole(Role.ADMIN) && <button className="ce-hero-btn" onClick={openCreate}><Plus size={16} /> Tạo Hội đồng mới</button>}
        </div>
        <div className="ce-hero-ring">
          <svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,.2)" strokeWidth="2.5" /><circle cx="18" cy="18" r="15.9" fill="none" stroke="#10b981" strokeWidth="2.5" strokeDasharray={`${committees.length > 0 ? (completed / committees.length) * 100 : 0} ${100 - (committees.length > 0 ? (completed / committees.length) * 100 : 0)}`} strokeLinecap="round" transform="rotate(-90 18 18)" /></svg>
          <div className="ce-ring-center"><span>{committees.length > 0 ? ((completed / committees.length) * 100).toFixed(0) : 0}%</span><small>Hoàn thành</small></div>
        </div>
      </section>

      <div className="ce-stats">
        <div className="surface-card ce-stat"><Users size={22} color="#4f46e5" /><div><span className="ce-stat-val">{committees.length}</span><span className="ce-stat-label">Tổng hội đồng</span></div></div>
        <div className="surface-card ce-stat"><CheckCircle size={22} color="#10b981" /><div><span className="ce-stat-val">{completed}</span><span className="ce-stat-label">Đã hoàn thành</span></div></div>
        <div className="surface-card ce-stat"><Clock size={22} color="#f59e0b" /><div><span className="ce-stat-val">{committees.length - completed}</span><span className="ce-stat-label">Đang chờ</span></div></div>
        <div className="surface-card ce-stat"><Star size={22} color="#7c3aed" /><div><span className="ce-stat-val">{avgScore}</span><span className="ce-stat-label">Điểm TB</span></div></div>
      </div>

      {loading ? <div className="ce-loading"><Loader2 size={32} className="ce-spin" color="var(--primary-indigo)" /></div> : committees.length === 0 ? (
        <div className="surface-card ce-empty"><Users size={48} style={{ opacity: .3 }} /><p>Chưa có hội đồng nào được tạo.</p></div>
      ) : (
        <div className="ce-grid">
          {committees.map(c => (
            <div key={c.id} className="surface-card ce-card" onClick={() => loadDetail(c.id)}>
              <div className="ce-card-top">
                <span className={`ce-conclusion ${c.conclusion === 'Đạt' ? 'pass' : c.conclusion === 'Không đạt' ? 'fail' : 'pending'}`}>{c.conclusion || 'Đang đánh giá'}</span>
                {c.finalScore != null && <span className="ce-final-sm">{c.finalScore.toFixed(1)}/100</span>}
              </div>
              <h3>{c.name}</h3>
              <p className="ce-card-work">{c.work.title}</p>
              <div className="ce-card-meta">
                <span><Users size={13} /> {c.members.length} thành viên</span>
                {c.meetingDate && <span><Calendar size={13} /> {new Date(c.meetingDate).toLocaleDateString('vi-VN')}</span>}
                {c.location && <span><MapPin size={13} /> {c.location}</span>}
              </div>
              <div className="ce-card-progress">
                <span>{c._count?.reviews || c.reviews?.length || 0}/{c.members.length} đã chấm</span>
                <ProgressBar progress={c.members.length > 0 ? ((c._count?.reviews || c.reviews?.length || 0) / c.members.length) * 100 : 0} color="var(--primary-indigo)" height="4px" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Tạo Hội đồng mới" subtitle="Thiết lập hội đồng phản biện cho đề tài nghiên cứu" width={700}
        footer={<>
          <button className="g-btn secondary" onClick={() => setShowCreate(false)}>Hủy</button>
          <button className="g-btn primary" onClick={handleCreate} disabled={submitting || !createForm.name || !createForm.workId}>
            {submitting ? <Loader2 size={14} className="ce-spin" /> : <Plus size={14} />} Tạo hội đồng
          </button>
        </>}>
        <div className="g-form-grid">
          <div className="g-field"><label>Tên hội đồng *</label><input value={createForm.name} onChange={e => setCreateForm({ ...createForm, name: e.target.value })} placeholder="VD: HĐ Thẩm định đề tài DT-2024" /></div>
          <div className="g-field"><label>Đề tài nghiên cứu *</label><select value={createForm.workId} onChange={e => setCreateForm({ ...createForm, workId: e.target.value })}><option value="">— Chọn đề tài —</option>{worksList.map(w => <option key={w.id} value={w.id}>{w.title}</option>)}</select></div>
          <div className="g-field"><label>Ngày họp</label><input type="datetime-local" value={createForm.meetingDate} onChange={e => setCreateForm({ ...createForm, meetingDate: e.target.value })} /></div>
          <div className="g-field"><label>Địa điểm</label><input value={createForm.location} onChange={e => setCreateForm({ ...createForm, location: e.target.value })} placeholder="VD: Phòng họp A, Tầng 3" /></div>
          <div className="g-field full"><label>Mô tả</label><textarea value={createForm.description} onChange={e => setCreateForm({ ...createForm, description: e.target.value })} placeholder="Mô tả mục đích hội đồng..." rows={2} /></div>
          <div className="g-field full">
            <label>Thành viên hội đồng</label>
            {createForm.members.map((m, i) => (
              <div key={i} className="ce-member-form-row">
                <select value={m.userId} onChange={e => { const ms = [...createForm.members]; ms[i] = { ...ms[i], userId: e.target.value }; setCreateForm({ ...createForm, members: ms }); }}>
                  <option value="">— Chọn thành viên —</option>
                  {usersList.filter(u => ['ADMIN', 'REVIEWER', 'LECTURER'].includes(u.role)).map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                </select>
                <select value={m.role} onChange={e => { const ms = [...createForm.members]; ms[i] = { ...ms[i], role: e.target.value }; setCreateForm({ ...createForm, members: ms }); }}>
                  <option value="chair">Chủ tịch</option><option value="secretary">Thư ký</option><option value="reviewer">Phản biện</option><option value="member">Thành viên</option>
                </select>
                {createForm.members.length > 1 && <button className="ce-rm-member" onClick={() => setCreateForm({ ...createForm, members: createForm.members.filter((_, j) => j !== i) })}><X size={14} /></button>}
              </div>
            ))}
            <button className="ce-add-member" onClick={() => setCreateForm({ ...createForm, members: [...createForm.members, { userId: '', role: 'reviewer' }] })}><Plus size={13} /> Thêm thành viên</button>
          </div>
        </div>
      </Modal>

      <style>{ceStyles}</style>
    </div>
  );
};

function Slider({ label, desc, max, value, onChange }: { label: string; desc: string; max: number; value: number; onChange: (v: number) => void }) {
  return (
    <div className="ce-criterion">
      <div className="ce-crit-head"><div><h4>{label}</h4><p>{desc}</p></div><div className="ce-crit-score"><span>{value}</span>/{max}</div></div>
      <input type="range" min="0" max={max} value={value} onChange={e => onChange(+e.target.value)} className="ce-slider" />
    </div>
  );
}

const ceStyles = `
  .ce{display:flex;flex-direction:column;gap:1.25rem;padding-bottom:3rem}
  .ce-back{background:none;border:none;display:flex;align-items:center;gap:6px;cursor:pointer;color:var(--on-surface-muted);font-weight:700;font-size:.85rem;padding:0}
  .ce-loading{display:flex;justify-content:center;padding:4rem}
  .ce-empty{display:flex;flex-direction:column;align-items:center;gap:1rem;padding:4rem!important;text-align:center;color:var(--on-surface-muted)}
  .ce-muted{color:var(--on-surface-muted);font-size:.85rem}
  .ce-success{display:flex;align-items:center;gap:8px;background:#d1fae5;color:#065f46;padding:12px 16px;border-radius:12px;font-weight:600;font-size:.875rem}

  .ce-hero{background:linear-gradient(135deg,#1e1b4b 0%,#312e81 40%,#4338ca 100%);border-radius:20px;padding:2.5rem;color:#fff;display:flex;justify-content:space-between;align-items:center}
  .ce-hero-left h1{font-size:1.75rem;font-weight:800;color:#fff;margin-bottom:.375rem}
  .ce-hero-left p{font-size:.9rem;opacity:.85;margin-bottom:1.25rem}
  .ce-hero-btn{background:#fff;color:#1e1b4b;border:none;padding:10px 20px;border-radius:10px;font-weight:700;font-size:.85rem;cursor:pointer;display:flex;align-items:center;gap:6px}
  .ce-hero-ring{position:relative;width:120px;height:120px;flex-shrink:0}
  .ce-hero-ring svg{width:100%;height:100%}
  .ce-ring-center{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center}
  .ce-ring-center span{display:block;font-size:1.5rem;font-weight:800}
  .ce-ring-center small{font-size:.6rem;opacity:.7}

  .ce-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:1rem}
  .ce-stat{display:flex;align-items:center;gap:1rem}
  .ce-stat-val{font-size:1.5rem;font-weight:800;display:block;line-height:1}
  .ce-stat-label{font-size:.8rem;color:var(--on-surface-muted)}

  .ce-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:1rem}
  .ce-card{padding:1.25rem!important;cursor:pointer;transition:all .15s;display:flex;flex-direction:column;gap:.5rem}
  .ce-card:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,.07)}
  .ce-card-top{display:flex;justify-content:space-between;align-items:center}
  .ce-conclusion{padding:3px 10px;border-radius:100px;font-size:.65rem;font-weight:800}
  .ce-conclusion.pass{background:#d1fae5;color:#059669}.ce-conclusion.fail{background:#fee2e2;color:#dc2626}.ce-conclusion.pending{background:#fef3c7;color:#d97706}
  .ce-final-sm{font-weight:800;font-size:1rem;color:var(--primary-indigo)}
  .ce-card h3{font-size:.9375rem;font-weight:700}
  .ce-card-work{font-size:.8rem;color:var(--on-surface-muted);line-height:1.4}
  .ce-card-meta{display:flex;gap:10px;font-size:.7rem;color:var(--on-surface-muted);flex-wrap:wrap}
  .ce-card-meta span{display:flex;align-items:center;gap:3px}
  .ce-card-progress{margin-top:auto}
  .ce-card-progress span{font-size:.65rem;color:var(--on-surface-muted);font-weight:600;display:block;margin-bottom:3px}

  .ce-member-form-row{display:flex;gap:6px;margin-bottom:6px;align-items:center}
  .ce-member-form-row select{flex:1;padding:.5rem;border:1.5px solid var(--surface-variant);border-radius:6px;font-size:.8rem;outline:none}
  .ce-rm-member{background:none;border:none;color:var(--error);cursor:pointer;padding:2px}
  .ce-add-member{background:none;border:1.5px dashed var(--surface-variant);border-radius:8px;padding:7px;cursor:pointer;font-size:.8rem;font-weight:600;color:var(--primary-indigo);display:flex;align-items:center;gap:4px;margin-top:4px;width:100%;justify-content:center}

  /* Detail */
  .ce-detail-grid{display:grid;grid-template-columns:1fr 300px;gap:1.5rem;align-items:start}
  .ce-main{display:flex;flex-direction:column;gap:1.25rem}
  .ce-side{display:flex;flex-direction:column;gap:1rem}

  .ce-project{display:flex;gap:1.5rem;padding:1.5rem!important}
  .ce-proj-visual{width:160px;height:180px;background:linear-gradient(135deg,#1e1b4b,#312e81);border-radius:14px;position:relative;overflow:hidden;flex-shrink:0}
  .ce-proj-overlay{position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,.5);backdrop-filter:blur(8px);padding:.75rem;color:#fff}
  .ce-proj-overlay small{font-size:.55rem;opacity:.7;display:block}
  .ce-proj-overlay strong{font-size:.8rem}
  .ce-proj-info{flex:1}
  .ce-proj-info h2{font-size:1.25rem;font-weight:800;line-height:1.3;color:var(--primary-indigo);margin-bottom:.5rem}
  .ce-proj-abs{font-size:.8rem;color:var(--on-surface-muted);line-height:1.5;margin-bottom:.75rem}
  .ce-proj-meta{display:grid;grid-template-columns:1fr 1fr;gap:.75rem;padding-top:.75rem;border-top:1px solid var(--surface-variant)}
  .ce-proj-meta small{font-size:.6rem;font-weight:700;color:var(--on-surface-muted);text-transform:uppercase;display:block;margin-bottom:2px}
  .ce-proj-meta strong{font-size:.8rem}

  .ce-score-card{padding:1.5rem!important}
  .ce-score-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem}
  .ce-score-title{display:flex;align-items:center;gap:8px;font-weight:700}
  .ce-total-badge{background:var(--signature-gradient);color:#fff;padding:6px 14px;border-radius:10px;font-size:.85rem}
  .ce-total-badge small{font-size:.55rem;font-weight:700;opacity:.8;margin-right:2px}
  .ce-total-badge strong{font-size:1.125rem;font-weight:800}
  .ce-total-badge span{font-size:.7rem;opacity:.7}
  .ce-criteria{display:flex;flex-direction:column;gap:1.5rem;margin-bottom:1.5rem}
  .ce-criterion{}
  .ce-crit-head{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:.75rem}
  .ce-crit-head h4{font-size:.9rem;font-weight:700;margin-bottom:2px}
  .ce-crit-head p{font-size:.75rem;color:var(--on-surface-muted)}
  .ce-crit-score{background:var(--surface-low);padding:4px 12px;border-radius:8px;font-size:.8rem}
  .ce-crit-score span{font-size:1.25rem;font-weight:800;color:var(--primary-indigo)}
  .ce-slider{-webkit-appearance:none;width:100%;height:8px;border-radius:100px;background:var(--surface-low);outline:none;cursor:pointer}
  .ce-slider::-webkit-slider-thumb{-webkit-appearance:none;width:20px;height:20px;border-radius:50%;background:var(--primary-indigo);border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.15)}
  .ce-comment-label{font-weight:700;margin-bottom:.5rem}
  .ce-textarea{width:100%;height:100px;background:var(--surface-low);border:2px solid transparent;border-radius:12px;padding:1rem;font-size:.875rem;font-family:inherit;resize:none;outline:none}
  .ce-textarea:focus{border-color:var(--primary-indigo)}
  .ce-rec-row{display:flex;gap:8px;margin-top:1rem}
  .ce-rec-btn{flex:1;padding:10px;border-radius:10px;border:2px solid var(--surface-variant);background:var(--surface-lowest);font-weight:700;font-size:.8rem;cursor:pointer;font-family:inherit;color:var(--on-surface-muted);transition:all .15s}
  .ce-submit-btn{width:100%;margin-top:1rem;background:var(--signature-gradient);color:#fff;border:none;padding:12px;border-radius:12px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;font-size:.875rem}
  .ce-submit-btn:disabled{opacity:.5;cursor:not-allowed}

  .ce-reviews-card{padding:1.5rem!important}
  .ce-reviews-card h3{display:flex;align-items:center;gap:8px;font-size:.9375rem;font-weight:700;margin-bottom:1rem}
  .ce-final{display:flex;align-items:center;gap:1rem;padding:1rem;border-radius:12px;margin-bottom:1rem}
  .ce-final.pass{background:#d1fae5;color:#065f46}.ce-final.fail{background:#fee2e2;color:#991b1b}.ce-final.warn{background:#fef3c7;color:#92400e}
  .ce-final-score{font-size:1.75rem;font-weight:800}
  .ce-final strong{display:block;font-size:.9rem}
  .ce-final p{font-size:.75rem;opacity:.7}
  .ce-review-list{display:flex;flex-direction:column;gap:.75rem}
  .ce-review-item{padding:1rem;background:var(--surface-low);border-radius:10px}
  .ce-review-head{display:flex;justify-content:space-between;margin-bottom:.5rem}
  .ce-review-head span{font-weight:600;font-size:.85rem}
  .ce-review-head strong{font-weight:800;color:var(--primary-indigo);font-size:1rem}
  .ce-review-scores{display:flex;gap:10px;font-size:.75rem;margin-bottom:.5rem}
  .ce-review-comment{font-size:.8rem;color:var(--on-surface-muted);line-height:1.5}
  .ce-rec-pill{display:inline-block;margin-top:.375rem;font-size:.7rem;font-weight:700;padding:2px 8px;border-radius:4px}
  .ce-rec-pill.accept{background:#d1fae5;color:#059669}.ce-rec-pill.reject{background:#fee2e2;color:#dc2626}.ce-rec-pill.revise{background:#fef3c7;color:#d97706}

  .ce-ai-card{background:linear-gradient(135deg,#1e1b4b,#312e81);color:#fff;border-radius:16px;padding:1.25rem}
  .ce-ai-head{display:flex;align-items:center;gap:6px;font-weight:800;font-size:.75rem;margin-bottom:.75rem}
  .ce-ai-hint{font-size:.8rem;opacity:.7}
  .ce-expert-list{display:flex;flex-direction:column;gap:.5rem}
  .ce-expert{display:flex;align-items:center;gap:.625rem;background:rgba(255,255,255,.08);border-radius:10px;padding:.5rem;position:relative}
  .ce-expert-avatar{width:30px;height:30px;border-radius:8px;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:.75rem;flex-shrink:0}
  .ce-expert-info h5{font-size:.75rem;font-weight:700;margin-bottom:1px}
  .ce-expert-info p{font-size:.6rem;opacity:.6}
  .ce-match{position:absolute;right:.5rem;top:.5rem;font-size:.6rem;font-weight:800;color:#10b981}

  .ce-progress-card{padding:1.25rem!important}
  .ce-progress-card h4{font-size:.875rem;font-weight:700;margin-bottom:.75rem}
  .ce-prog-stats{display:flex;justify-content:space-between;font-size:.8rem;margin-bottom:.375rem}
  .ce-member-list{margin-top:.75rem;display:flex;flex-direction:column;gap:.375rem}
  .ce-member-row{display:flex;align-items:center;gap:6px;font-size:.8rem}
  .ce-member-row small{color:var(--on-surface-muted);font-size:.65rem}
  .ce-member-dot{width:24px;height:24px;border-radius:50%;background:var(--surface-low);display:flex;align-items:center;justify-content:center;font-size:.6rem;font-weight:700;color:var(--on-surface-muted);flex-shrink:0}
  .ce-member-dot.done{background:#d1fae5;color:#059669}

  .ce-back-btn{width:100%;padding:10px;border-radius:10px;border:1px solid var(--surface-variant);background:var(--surface-lowest);font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;font-size:.8rem}
  .ce-submit-side{width:100%;padding:10px;border-radius:10px;background:var(--primary-indigo);color:#fff;border:none;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;font-size:.8rem}
  .ce-submit-side:disabled{opacity:.5;cursor:not-allowed}

  .ce-spin{animation:ce-spin 1s linear infinite}
  @keyframes ce-spin{to{transform:rotate(360deg)}}

  @media(max-width:1024px){.ce-detail-grid{grid-template-columns:1fr}.ce-stats{grid-template-columns:repeat(2,1fr)}.ce-hero{flex-direction:column;text-align:center}.ce-hero-ring{margin-top:1rem}.ce-project{flex-direction:column}.ce-proj-visual{width:100%;height:120px}}
`;
