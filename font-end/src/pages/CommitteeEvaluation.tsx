import { useState, useEffect } from 'react';
import {
  Download,
  Send,
  Sparkles,
  ShieldCheck,
  PenTool,
  Plus,
  Users,
  Calendar,
  MapPin,
  Loader2,
  CheckCircle,
  Clock,
  Star,
  ArrowLeft,
  X,
  Award,
  BarChart3,
  Shield,
  ArrowUpRight,
} from 'lucide-react';
import { ProgressBar } from '../components/common/ProgressBar';
import { committeeService } from '../services/committeeService';
import { workService } from '../services/workService';
import { userService } from '../services/userService';
import { aiService } from '../services/aiService';
import { useAuth } from '../contexts/AuthContext';
import { Role } from '../types';

interface Committee {
  id: number;
  name: string;
  description?: string;
  meetingDate?: string;
  location?: string;
  finalScore?: number;
  conclusion?: string;
  work: { id: number; title: string; status?: string; authors?: string; abstract?: string; level?: string };
  members: { id: number; role: string; user: { id: number; name: string; email: string; specialization?: string } }[];
  reviews: { id: number; innovationScore: number; feasibilityScore: number; impactScore: number; totalScore: number; comment?: string; recommendation?: string; reviewer: { id: number; name: string; email: string }; createdAt: string }[];
  _count?: { reviews: number };
}

export const CommitteeEvaluation = () => {
  const { user, hasRole } = useAuth();
  const [committees, setCommittees] = useState<Committee[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Committee | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [experts, setExperts] = useState<any[]>([]);
  const [loadingExperts, setLoadingExperts] = useState(false);

  // Data for dropdowns
  const [worksList, setWorksList] = useState<{ id: number; title: string }[]>([]);
  const [usersList, setUsersList] = useState<{ id: number; name: string; email: string; role: string }[]>([]);

  // Score state
  const [scores, setScores] = useState({ innovation: 0, feasibility: 0, impact: 0 });
  const [comment, setComment] = useState('');
  const [recommendation, setRecommendation] = useState('');

  // Create form
  const [createForm, setCreateForm] = useState({
    name: '', description: '', workId: '', meetingDate: '', location: '',
    members: [{ userId: '', role: 'reviewer' }],
  });

  const totalScore = scores.innovation + scores.feasibility + scores.impact;

  useEffect(() => {
    loadCommittees();
  }, []);

  const loadCommittees = async () => {
    setLoading(true);
    try {
      const data = await committeeService.getAll();
      setCommittees(data);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const loadCommitteeDetail = async (id: number) => {
    try {
      const data = await committeeService.getOne(id);
      setSelected(data);
      setScores({ innovation: 0, feasibility: 0, impact: 0 });
      setComment('');
      setRecommendation('');
      setSubmitSuccess(false);

      // Load AI expert suggestions
      if (data.work?.id) {
        setLoadingExperts(true);
        try {
          const e = await aiService.suggestExperts(data.work.id);
          setExperts(e.suggestions || []);
        } catch { setExperts([]); }
        setLoadingExperts(false);
      }
    } catch { /* ignore */ }
  };

  const handleSubmitReview = async () => {
    if (!selected || !user) return;
    setSubmitting(true);
    try {
      await committeeService.submitReview({
        workId: selected.work.id,
        committeeId: selected.id,
        innovationScore: scores.innovation,
        feasibilityScore: scores.feasibility,
        impactScore: scores.impact,
        comment,
        recommendation,
      });
      setSubmitSuccess(true);
      loadCommitteeDetail(selected.id);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gửi đánh giá thất bại');
    }
    setSubmitting(false);
  };

  const handleCreate = async () => {
    setSubmitting(true);
    try {
      await committeeService.create({
        name: createForm.name,
        description: createForm.description,
        workId: +createForm.workId,
        meetingDate: createForm.meetingDate || undefined,
        location: createForm.location || undefined,
        members: createForm.members.filter(m => m.userId).map(m => ({ userId: +m.userId, role: m.role })),
      });
      setShowCreate(false);
      setCreateForm({ name: '', description: '', workId: '', meetingDate: '', location: '', members: [{ userId: '', role: 'reviewer' }] });
      loadCommittees();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Tạo hội đồng thất bại');
    }
    setSubmitting(false);
  };

  const handleScoreChange = (key: keyof typeof scores, value: number) => {
    setScores(prev => ({ ...prev, [key]: value }));
  };

  const userAlreadyReviewed = selected?.reviews?.some(r => r.reviewer.id === user?.id);
  const isMember = selected?.members?.some(m => m.user.id === user?.id);

  // Computed stats
  const completedCount = committees.filter(c => c.finalScore != null).length;
  const pendingCount = committees.filter(c => c.finalScore == null).length;
  const avgScore = completedCount > 0
    ? (committees.filter(c => c.finalScore != null).reduce((s, c) => s + (c.finalScore || 0), 0) / completedCount).toFixed(1)
    : '—';

  // --- Committee List View ---
  if (!selected) {
    return (
      <div className="ce-page">
        {/* Hero Banner */}
        <section className="ce-hero">
          <div className="ce-hero-left">
            <div className="ce-hero-greeting">
              <h1>Quản ly Hoi dong Danh gia</h1>
              <span className="ce-hero-badge"><Shield size={12} /> HOI DONG CHAM DIEM</span>
            </div>
            <p className="ce-hero-desc">
              He thong dang quan ly <strong>{committees.length}</strong> hoi dong,{' '}
              <strong>{completedCount}</strong> da hoan thanh va{' '}
              <strong>{pendingCount}</strong> dang cho xu ly.
            </p>
            <div className="ce-hero-actions">
              {hasRole(Role.ADMIN) && (
                <button className="ce-btn-hero primary" onClick={async () => {
                  setShowCreate(true);
                  try {
                    const [w, u] = await Promise.all([
                      workService.getAll({ page: '1', limit: '100' }),
                      userService.getAll(1, 100),
                    ]);
                    setWorksList((w.data || w).map((x: any) => ({ id: x.id, title: x.title })));
                    setUsersList((u.data || u).map((x: any) => ({ id: x.id, name: x.name || x.email, email: x.email, role: x.role })));
                  } catch { /* ignore */ }
                }}>
                  <Plus size={16} /> Tao Hoi dong moi
                </button>
              )}
              <button className="ce-btn-hero secondary">
                <BarChart3 size={16} /> Bao cao tong hop
              </button>
            </div>
          </div>
          <div className="ce-hero-right">
            <div className="ce-hero-ring">
              <svg viewBox="0 0 36 36" className="ce-ring-svg">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="2.5" />
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#10b981" strokeWidth="2.5"
                  strokeDasharray={`${committees.length > 0 ? (completedCount / committees.length) * 100 : 0} ${100 - (committees.length > 0 ? (completedCount / committees.length) * 100 : 0)}`}
                  strokeLinecap="round" transform="rotate(-90 18 18)" />
              </svg>
              <div className="ce-ring-center">
                <span className="ce-ring-pct">{committees.length > 0 ? ((completedCount / committees.length) * 100).toFixed(0) : 0}%</span>
                <span className="ce-ring-label">Hoan thanh</span>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Cards */}
        <section className="ce-stats-grid">
          <div className="surface-card ce-stat-card">
            <div className="ce-stat-icon" style={{ background: '#4f46e512', color: '#4f46e5' }}><Users size={22} /></div>
            <div className="ce-stat-info">
              <span className="ce-stat-value" style={{ color: '#4f46e5' }}>{committees.length}</span>
              <span className="ce-stat-label">Tong hoi dong</span>
              <span className="ce-stat-sub">tat ca cac ki</span>
            </div>
          </div>
          <div className="surface-card ce-stat-card">
            <div className="ce-stat-icon" style={{ background: '#10b98112', color: '#10b981' }}><CheckCircle size={22} /></div>
            <div className="ce-stat-info">
              <span className="ce-stat-value" style={{ color: '#10b981' }}>{completedCount}</span>
              <span className="ce-stat-label">Da hoan thanh</span>
              <span className="ce-stat-sub">{committees.length > 0 ? ((completedCount / committees.length) * 100).toFixed(0) : 0}% tong so</span>
            </div>
          </div>
          <div className="surface-card ce-stat-card">
            <div className="ce-stat-icon" style={{ background: '#f59e0b12', color: '#f59e0b' }}><Clock size={22} /></div>
            <div className="ce-stat-info">
              <span className="ce-stat-value" style={{ color: '#f59e0b' }}>{pendingCount}</span>
              <span className="ce-stat-label">Dang cho</span>
              <span className="ce-stat-sub">can phan bien</span>
            </div>
          </div>
          <div className="surface-card ce-stat-card">
            <div className="ce-stat-icon" style={{ background: '#7c3aed12', color: '#7c3aed' }}><Star size={22} /></div>
            <div className="ce-stat-info">
              <span className="ce-stat-value" style={{ color: '#7c3aed' }}>{avgScore}</span>
              <span className="ce-stat-label">Diem TB</span>
              <span className="ce-stat-sub">trung binh cong</span>
            </div>
          </div>
        </section>

        {/* Committee List */}
        {loading ? (
          <div className="ce-loading">
            <Loader2 size={36} className="ce-spin" color="#4f46e5" />
          </div>
        ) : committees.length === 0 ? (
          <div className="surface-card ce-empty">
            <Users size={48} style={{ opacity: 0.25, marginBottom: 12, color: 'var(--on-surface-muted)' }} />
            <p>Chua co hoi dong nao duoc tao.</p>
          </div>
        ) : (
          <div className="ce-grid">
            {committees.map(c => {
              const reviewCount = c._count?.reviews || c.reviews?.length || 0;
              const progress = c.members.length > 0 ? (reviewCount / c.members.length) * 100 : 0;
              return (
                <div key={c.id} className="surface-card ce-card" onClick={() => loadCommitteeDetail(c.id)}>
                  <div className="ce-card-top">
                    <span className={`ce-badge ${c.conclusion === 'Dat' ? 'pass' : c.conclusion === 'Khong dat' ? 'fail' : 'pending'}`}>
                      {c.conclusion || 'Dang danh gia'}
                    </span>
                    {c.finalScore != null && (
                      <span className="ce-final-score">{c.finalScore.toFixed(1)}<span className="ce-score-max">/100</span></span>
                    )}
                  </div>
                  <h3 className="ce-card-name">{c.name}</h3>
                  <p className="ce-card-work">{c.work.title}</p>
                  <div className="ce-card-meta">
                    <span><Users size={13} /> {c.members.length} thanh vien</span>
                    {c.meetingDate && (
                      <span><Calendar size={13} /> {new Date(c.meetingDate).toLocaleDateString('vi-VN')}</span>
                    )}
                    {c.location && <span><MapPin size={13} /> {c.location}</span>}
                  </div>
                  <div className="ce-card-progress">
                    <div className="ce-progress-header">
                      <span>{reviewCount}/{c.members.length} da cham</span>
                      <span className="ce-progress-pct">{progress.toFixed(0)}%</span>
                    </div>
                    <ProgressBar progress={progress} color="#4f46e5" height="4px" />
                  </div>
                  <div className="ce-card-arrow"><ArrowUpRight size={16} /></div>
                </div>
              );
            })}
          </div>
        )}

        {/* Create Modal */}
        {showCreate && (
          <div className="ce-modal-overlay" onClick={() => setShowCreate(false)}>
            <div className="surface-card ce-modal" onClick={e => e.stopPropagation()}>
              <div className="ce-modal-header">
                <div>
                  <h2>Tao Hoi dong moi</h2>
                  <p className="ce-modal-sub">Thiet lap hoi dong phan bien cho de tai nghien cuu</p>
                </div>
                <button className="ce-btn-close" onClick={() => setShowCreate(false)}><X size={20} /></button>
              </div>

              <div className="ce-form-grid">
                <div className="ce-form-field">
                  <label>Ten hoi dong <span className="ce-required">*</span></label>
                  <input value={createForm.name} onChange={e => setCreateForm({ ...createForm, name: e.target.value })} placeholder="VD: HD Tham dinh de tai DT-2024" />
                </div>
                <div className="ce-form-field">
                  <label>De tai nghien cuu <span className="ce-required">*</span></label>
                  <select value={createForm.workId} onChange={e => setCreateForm({ ...createForm, workId: e.target.value })}>
                    <option value="">-- Chon de tai --</option>
                    {worksList.map(w => <option key={w.id} value={w.id}>{w.title}</option>)}
                  </select>
                </div>
                <div className="ce-form-field">
                  <label>Ngay hop</label>
                  <input type="datetime-local" value={createForm.meetingDate} onChange={e => setCreateForm({ ...createForm, meetingDate: e.target.value })} />
                </div>
                <div className="ce-form-field">
                  <label>Dia diem</label>
                  <input value={createForm.location} onChange={e => setCreateForm({ ...createForm, location: e.target.value })} placeholder="VD: Phong hop A, Tang 3" />
                </div>
                <div className="ce-form-field ce-full-width">
                  <label>Mo ta</label>
                  <textarea value={createForm.description} onChange={e => setCreateForm({ ...createForm, description: e.target.value })} placeholder="Mo ta muc dich hoi dong..." rows={2} />
                </div>
                <div className="ce-form-field ce-full-width">
                  <label>Thanh vien hoi dong</label>
                  {createForm.members.map((m, i) => (
                    <div key={i} className="ce-member-row">
                      <select value={m.userId} onChange={e => {
                        const ms = [...createForm.members];
                        ms[i] = { ...ms[i], userId: e.target.value };
                        setCreateForm({ ...createForm, members: ms });
                      }} className="ce-member-select">
                        <option value="">-- Chon thanh vien --</option>
                        {usersList.filter(u => u.role === 'ADMIN' || u.role === 'REVIEWER' || u.role === 'LECTURER').map(u => (
                          <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                        ))}
                      </select>
                      <select value={m.role} onChange={e => {
                        const ms = [...createForm.members];
                        ms[i] = { ...ms[i], role: e.target.value };
                        setCreateForm({ ...createForm, members: ms });
                      }} className="ce-role-select">
                        <option value="chair">Chu tich</option>
                        <option value="secretary">Thu ky</option>
                        <option value="reviewer">Phan bien</option>
                        <option value="member">Thanh vien</option>
                      </select>
                      {createForm.members.length > 1 && (
                        <button className="ce-btn-remove" onClick={() => {
                          setCreateForm({ ...createForm, members: createForm.members.filter((_, j) => j !== i) });
                        }}><X size={14} /></button>
                      )}
                    </div>
                  ))}
                  <button className="ce-btn-add-member" onClick={() => setCreateForm({ ...createForm, members: [...createForm.members, { userId: '', role: 'reviewer' }] })}>
                    <Plus size={14} /> Them thanh vien
                  </button>
                </div>
              </div>

              <div className="ce-modal-actions">
                <button className="ce-btn-cancel" onClick={() => setShowCreate(false)}>Huy</button>
                <button className="ce-btn-submit" onClick={handleCreate} disabled={submitting || !createForm.name || !createForm.workId}>
                  {submitting ? <Loader2 size={16} className="ce-spin" /> : <Plus size={16} />}
                  Tao hoi dong
                </button>
              </div>
            </div>
          </div>
        )}

        <style>{ceStyles}</style>
      </div>
    );
  }

  // --- Committee Detail / Evaluation View ---
  return (
    <div className="ce-page">
      {/* Detail Hero */}
      <section className="ce-hero ce-hero-detail">
        <div className="ce-hero-left">
          <button className="ce-btn-back" onClick={() => setSelected(null)}>
            <ArrowLeft size={14} /> Quay lai danh sach
          </button>
          <h1>Tham dinh De tai Nghien cuu</h1>
          <p className="ce-hero-desc">
            Hoi dong: <strong>{selected.name}</strong> — {selected.members.length} thanh vien,{' '}
            {selected.reviews.length} phieu da cham.
          </p>
          <div className="ce-hero-actions">
            <button className="ce-btn-hero secondary">
              <Download size={16} /> Tai ho so goc
            </button>
            {isMember && !userAlreadyReviewed && (
              <button className="ce-btn-hero primary" onClick={handleSubmitReview} disabled={submitting || totalScore === 0}>
                {submitting ? <Loader2 size={16} className="ce-spin" /> : <Send size={16} />}
                Gui ket qua
              </button>
            )}
          </div>
        </div>
      </section>

      {submitSuccess && (
        <div className="ce-success-banner">
          <CheckCircle size={18} /> Danh gia da duoc gui thanh cong!
        </div>
      )}

      <div className="ce-detail-grid">
        {/* Main Column */}
        <div className="ce-main-col">
          {/* Project Summary */}
          <section className="surface-card ce-project-card">
            <div className="ce-project-visual">
              <div className="ce-visual-bg">
                <div className="ce-visual-overlay">
                  <span className="ce-visual-tag">LINH VUC</span>
                  <strong>{selected.work.level || 'Nghien cuu khoa hoc'}</strong>
                </div>
              </div>
            </div>
            <div className="ce-project-info">
              <h2 className="ce-project-title">{selected.work.title}</h2>
              {selected.work.abstract && (
                <p className="ce-project-abstract">{selected.work.abstract}</p>
              )}
              <div className="ce-meta-grid">
                <div className="ce-meta-item">
                  <span className="ce-meta-label">TAC GIA</span>
                  <strong>{selected.work.authors || '—'}</strong>
                </div>
                <div className="ce-meta-item">
                  <span className="ce-meta-label">TRANG THAI</span>
                  <strong>{selected.work.status || '—'}</strong>
                </div>
                <div className="ce-meta-item">
                  <span className="ce-meta-label">NGAY HOP</span>
                  <strong>{selected.meetingDate ? new Date(selected.meetingDate).toLocaleDateString('vi-VN') : 'Chua xac dinh'}</strong>
                </div>
                <div className="ce-meta-item">
                  <span className="ce-meta-label">DIA DIEM</span>
                  <strong>{selected.location || 'Chua xac dinh'}</strong>
                </div>
              </div>
            </div>
          </section>

          {/* Score Sheet or Reviews */}
          {isMember && !userAlreadyReviewed ? (
            <section className="surface-card ce-score-card">
              <div className="ce-score-header">
                <div className="ce-score-title-row">
                  <div className="ce-icon-wrap"><PenTool size={20} /></div>
                  <div>
                    <h3>Phieu danh gia dien tu</h3>
                    <p className="ce-score-subtitle">Cham diem theo 3 tieu chi</p>
                  </div>
                </div>
                <div className="ce-total-badge">
                  <span className="ce-total-label">TONG DIEM</span>
                  <span className="ce-total-value">{totalScore}</span>
                  <span className="ce-total-max">/ 100</span>
                </div>
              </div>

              <div className="ce-criteria-list">
                <CriterionSlider label="1. Tinh doi moi & Sang tao" desc="Danh gia su khac biet so voi cac nghien cuu hien co." max={40} value={scores.innovation} onChange={v => handleScoreChange('innovation', v)} />
                <CriterionSlider label="2. Tinh kha thi & Phuong phap luan" desc="Danh gia do tin cay cua mo hinh va doi ngu thuc hien." max={30} value={scores.feasibility} onChange={v => handleScoreChange('feasibility', v)} />
                <CriterionSlider label="3. Tac dong kinh te - xa hoi" desc="Danh gia kha nang chuyen giao va ap dung thuc tien." max={30} value={scores.impact} onChange={v => handleScoreChange('impact', v)} />
              </div>

              <div className="ce-comment-section">
                <h4>Nhan xet chi tiet & Kien nghi</h4>
                <textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Nhap y kien chuyen mon cua ban tai day..." className="ce-textarea" />
              </div>

              <div className="ce-recommendation-section">
                <label className="ce-rec-label">De xuat</label>
                <div className="ce-rec-buttons">
                  {[
                    { v: 'accept', l: 'Chap nhan', c: '#10b981', bg: '#10b98115' },
                    { v: 'revise', l: 'Yeu cau chinh sua', c: '#f59e0b', bg: '#f59e0b15' },
                    { v: 'reject', l: 'Tu choi', c: '#dc2626', bg: '#dc262615' },
                  ].map(opt => (
                    <button key={opt.v} onClick={() => setRecommendation(opt.v)}
                      className="ce-rec-btn"
                      style={{
                        borderColor: recommendation === opt.v ? opt.c : 'var(--surface-variant)',
                        background: recommendation === opt.v ? opt.bg : 'var(--surface-lowest)',
                        color: recommendation === opt.v ? opt.c : 'var(--on-surface-muted)',
                      }}>
                      {opt.l}
                    </button>
                  ))}
                </div>
              </div>
            </section>
          ) : (
            <section className="surface-card ce-reviews-card">
              <div className="ce-reviews-header">
                <div className="ce-icon-wrap"><PenTool size={18} /></div>
                <h3>Ket qua danh gia ({selected.reviews.length} phieu)</h3>
              </div>

              {selected.finalScore != null && (
                <div className={`ce-conclusion-banner ${selected.conclusion === 'Dat' ? 'pass' : selected.conclusion === 'Khong dat' ? 'fail' : 'pending'}`}>
                  <div className="ce-conclusion-score">{selected.finalScore.toFixed(1)}</div>
                  <div className="ce-conclusion-info">
                    <div className="ce-conclusion-label">Ket luan: {selected.conclusion}</div>
                    <div className="ce-conclusion-sub">Diem trung binh tu {selected.reviews.length} phieu danh gia</div>
                  </div>
                </div>
              )}

              {selected.reviews.length === 0 ? (
                <p className="ce-empty-text">Chua co danh gia nao</p>
              ) : (
                <div className="ce-review-list">
                  {selected.reviews.map(r => (
                    <div key={r.id} className="ce-review-item">
                      <div className="ce-review-top">
                        <div className="ce-reviewer-info">
                          <div className="ce-reviewer-avatar">{(r.reviewer.name || 'U')[0]}</div>
                          <span className="ce-reviewer-name">{r.reviewer.name || r.reviewer.email}</span>
                        </div>
                        <span className="ce-review-score">{r.totalScore}<span className="ce-score-unit">/100</span></span>
                      </div>
                      <div className="ce-review-scores">
                        <span>Doi moi: <b>{r.innovationScore}/40</b></span>
                        <span>Kha thi: <b>{r.feasibilityScore}/30</b></span>
                        <span>Tac dong: <b>{r.impactScore}/30</b></span>
                      </div>
                      {r.comment && <p className="ce-review-comment">{r.comment}</p>}
                      {r.recommendation && (
                        <span className={`ce-rec-pill ${r.recommendation}`}>
                          {r.recommendation === 'accept' ? 'Chap nhan' : r.recommendation === 'reject' ? 'Tu choi' : 'Yeu cau chinh sua'}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>

        {/* Sidebar */}
        <aside className="ce-sidebar">
          {/* AI Expert Suggestions */}
          <section className="ce-ai-card">
            <div className="ce-ai-header">
              <Sparkles size={16} />
              <span>AI GOI Y CHUYEN GIA DOI CHIEU</span>
            </div>
            {loadingExperts ? (
              <div className="ce-ai-loading">
                <Loader2 size={20} className="ce-spin" />
              </div>
            ) : experts.length > 0 ? (
              <>
                <p className="ce-ai-hint">He thong da phan tich tu khoa va de xuat chuyen gia phu hop:</p>
                <div className="ce-expert-list">
                  {experts.slice(0, 5).map((exp: any, idx: number) => (
                    <div key={idx} className="ce-expert-item">
                      <div className="ce-expert-avatar">{(exp.name || 'U')[0]}</div>
                      <div className="ce-expert-info">
                        <h5>{exp.name}</h5>
                        <p>{exp.specialization || exp.email}</p>
                      </div>
                      {exp.matchScore && <div className="ce-match-tag">{exp.matchScore}%</div>}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="ce-ai-hint">Chua co du lieu goi y chuyen gia cho de tai nay.</p>
            )}
          </section>

          {/* Council Progress */}
          <section className="surface-card ce-progress-card">
            <div className="ce-progress-title-row">
              <Award size={18} color="#4f46e5" />
              <h3>Tien do Hoi dong</h3>
            </div>
            <div className="ce-progress-stats">
              <span>Thanh vien da cham</span>
              <strong>{selected.reviews.length} / {selected.members.length}</strong>
            </div>
            <ProgressBar progress={selected.members.length > 0 ? (selected.reviews.length / selected.members.length) * 100 : 0} color="#4f46e5" height="6px" />

            <div className="ce-council-members">
              <span className="ce-section-label">THANH VIEN HOI DONG</span>
              <div className="ce-member-list">
                {selected.members.map(m => {
                  const reviewed = selected.reviews.some(r => r.reviewer.id === m.user.id);
                  const roleLabel = m.role === 'chair' ? 'Chu tich' : m.role === 'secretary' ? 'Thu ky' : m.role === 'reviewer' ? 'Phan bien' : 'Thanh vien';
                  return (
                    <div key={m.id} className="ce-member-item">
                      <div className={`ce-member-avatar ${reviewed ? 'done' : ''}`}>
                        {reviewed ? <CheckCircle size={14} /> : (m.user.name || 'U')[0]}
                      </div>
                      <div className="ce-member-detail">
                        <span className="ce-member-name">{m.user.name || m.user.email}</span>
                        <span className="ce-member-role">{roleLabel}</span>
                      </div>
                      {reviewed && <CheckCircle size={14} color="#10b981" />}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Actions */}
          <div className="ce-sidebar-actions">
            <button className="ce-btn-back-sidebar" onClick={() => setSelected(null)}>
              <ArrowLeft size={16} /> Quay lai danh sach
            </button>
            {isMember && !userAlreadyReviewed && (
              <button className="ce-btn-submit-sidebar" onClick={handleSubmitReview} disabled={submitting || totalScore === 0}>
                <ShieldCheck size={18} />
                {submitting ? 'Dang gui...' : 'Xac nhan & Gui danh gia'}
              </button>
            )}
          </div>
        </aside>
      </div>

      <style>{ceStyles}</style>
    </div>
  );
};

/* ======================== Criterion Slider Component ======================== */

function CriterionSlider({ label, desc, max, value, onChange }: { label: string; desc: string; max: number; value: number; onChange: (v: number) => void }) {
  return (
    <div className="ce-criterion">
      <div className="ce-criterion-header">
        <div className="ce-criterion-info">
          <h4>{label}</h4>
          <p>{desc}</p>
        </div>
        <div className="ce-criterion-score">
          <span className="ce-current">{value}</span>
          <span className="ce-max">/ {max}</span>
        </div>
      </div>
      <div className="ce-slider-wrap">
        <input type="range" min="0" max={max} value={value} onChange={(e) => onChange(parseInt(e.target.value))} className="ce-slider" />
      </div>
    </div>
  );
}

/* ======================== Styles ======================== */

const ceStyles = `
  /* Page */
  .ce-page { display: flex; flex-direction: column; gap: 1.5rem; padding-bottom: 3rem; }
  .ce-loading { display: flex; justify-content: center; padding: 80px; }

  /* Hero Banner — matches dashboard */
  .ce-hero {
    background: linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4338ca 100%);
    border-radius: 20px; padding: 2.5rem; display: flex;
    justify-content: space-between; align-items: center; color: white;
  }
  .ce-hero-detail { padding: 2rem 2.5rem; }
  .ce-hero-left { flex: 1; }
  .ce-hero-greeting { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
  .ce-hero-greeting h1 { font-size: 1.75rem; font-weight: 800; color: white; }
  .ce-hero-badge {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 3px 10px; border-radius: 100px;
    background: rgba(255,255,255,0.15); font-size: 0.7rem; font-weight: 700;
  }
  .ce-hero-desc { font-size: 0.9rem; opacity: 0.85; line-height: 1.6; max-width: 520px; margin-bottom: 1.5rem; }
  .ce-hero-desc strong { color: #a5b4fc; font-weight: 800; }
  .ce-hero-actions { display: flex; gap: 8px; flex-wrap: wrap; }
  .ce-btn-hero {
    display: flex; align-items: center; gap: 6px;
    padding: 10px 18px; border-radius: 10px; font-weight: 700;
    font-size: 0.8125rem; cursor: pointer; border: none; transition: transform 0.15s;
    font-family: inherit;
  }
  .ce-btn-hero:hover { transform: translateY(-1px); }
  .ce-btn-hero.primary { background: white; color: #1e1b4b; }
  .ce-btn-hero.secondary { background: rgba(255,255,255,0.12); color: white; border: 1.5px solid rgba(255,255,255,0.2); }
  .ce-btn-hero:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
  .ce-btn-back {
    background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.2);
    color: white; padding: 6px 14px; border-radius: 8px; font-size: 0.75rem;
    font-weight: 700; cursor: pointer; display: inline-flex; align-items: center;
    gap: 4px; margin-bottom: 12px; font-family: inherit;
  }

  /* Hero ring */
  .ce-hero-right { flex-shrink: 0; margin-left: 2rem; }
  .ce-hero-ring { position: relative; width: 140px; height: 140px; }
  .ce-ring-svg { width: 100%; height: 100%; }
  .ce-ring-center { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; }
  .ce-ring-pct { display: block; font-size: 1.75rem; font-weight: 800; }
  .ce-ring-label { font-size: 0.65rem; opacity: 0.7; font-weight: 600; }

  /* Stats Grid — matches dashboard */
  .ce-stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; }
  .ce-stat-card { display: flex; align-items: center; gap: 1rem; transition: transform 0.15s; cursor: default; }
  .ce-stat-card:hover { transform: translateY(-2px); }
  .ce-stat-icon {
    width: 48px; height: 48px; border-radius: 14px;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .ce-stat-value { font-size: 1.75rem; font-weight: 800; display: block; line-height: 1; }
  .ce-stat-label { font-size: 0.8rem; font-weight: 600; color: var(--on-surface-muted); }
  .ce-stat-sub { font-size: 0.65rem; color: var(--on-surface-variant); }

  /* Committee Grid */
  .ce-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 1.5rem; }
  .ce-card {
    cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; position: relative;
    overflow: hidden;
  }
  .ce-card:hover { transform: translateY(-3px); box-shadow: 0 12px 32px rgba(0,0,0,0.08); }
  .ce-card-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
  .ce-card-name { font-size: 1rem; font-weight: 700; margin-bottom: 4px; color: var(--on-surface); }
  .ce-card-work { font-size: 0.8125rem; color: var(--on-surface-muted); line-height: 1.4; margin-bottom: 12px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .ce-card-meta { display: flex; gap: 12px; font-size: 0.75rem; color: var(--on-surface-muted); flex-wrap: wrap; margin-bottom: 12px; }
  .ce-card-meta span { display: flex; align-items: center; gap: 4px; }
  .ce-card-progress { border-top: 1px solid var(--surface-variant, #f1f5f9); padding-top: 12px; }
  .ce-progress-header { display: flex; justify-content: space-between; font-size: 0.7rem; color: var(--on-surface-muted); font-weight: 600; margin-bottom: 6px; }
  .ce-progress-pct { font-weight: 800; color: #4f46e5; }
  .ce-card-arrow { position: absolute; top: 1.5rem; right: 1.5rem; color: var(--on-surface-variant, #cbd5e1); transition: color 0.15s; }
  .ce-card:hover .ce-card-arrow { color: #4f46e5; }

  /* Badges */
  .ce-badge {
    padding: 3px 12px; border-radius: 100px; font-size: 0.7rem; font-weight: 800;
    letter-spacing: 0.01em;
  }
  .ce-badge.pass { background: #d1fae5; color: #059669; }
  .ce-badge.fail { background: #fee2e2; color: #dc2626; }
  .ce-badge.pending { background: #fef3c7; color: #d97706; }
  .ce-final-score { font-weight: 800; font-size: 1.125rem; color: #4f46e5; }
  .ce-score-max { font-size: 0.75rem; font-weight: 600; color: var(--on-surface-muted); }

  /* Empty state */
  .ce-empty { text-align: center; padding: 4rem !important; color: var(--on-surface-muted); }

  /* Modal */
  .ce-modal-overlay {
    position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6);
    backdrop-filter: blur(4px); display: flex; align-items: center;
    justify-content: center; z-index: 1000;
  }
  .ce-modal { width: 620px; max-height: 92vh; overflow-y: auto; padding: 1.5rem !important; border-radius: 16px !important; }
  .ce-modal-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; }
  .ce-modal-header h2 { font-size: 1.25rem; font-weight: 800; }
  .ce-modal-sub { font-size: 0.8125rem; color: var(--on-surface-muted); margin-top: 2px; }
  .ce-btn-close { background: var(--surface-low, #f1f5f9); border: none; cursor: pointer; color: var(--on-surface-muted); padding: 6px; border-radius: 8px; display: flex; }
  .ce-btn-close:hover { background: var(--surface-variant, #e2e8f0); }

  .ce-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
  .ce-form-field { display: flex; flex-direction: column; gap: 0.375rem; }
  .ce-full-width { grid-column: 1 / -1; }
  .ce-required { color: #dc2626; }
  .ce-form-field label { font-size: 0.75rem; font-weight: 700; color: var(--on-surface-muted); }
  .ce-form-field input, .ce-form-field textarea, .ce-form-field select {
    padding: 0.625rem 0.875rem; border: 1.5px solid var(--surface-variant, #e2e8f0);
    border-radius: 10px; font-size: 0.875rem; font-family: inherit; outline: none;
    background: var(--surface-lowest, white); transition: border-color 0.15s;
  }
  .ce-form-field input:focus, .ce-form-field textarea:focus, .ce-form-field select:focus { border-color: #4f46e5; box-shadow: 0 0 0 3px rgba(79,70,229,0.08); }
  .ce-member-row { display: flex; gap: 8px; margin-bottom: 8px; align-items: center; }
  .ce-member-select {
    flex: 1; padding: 0.5rem 0.75rem; border: 1.5px solid var(--surface-variant, #e2e8f0);
    border-radius: 8px; font-size: 0.8125rem; outline: none; font-family: inherit;
    background: var(--surface-lowest, white);
  }
  .ce-role-select {
    width: 130px; padding: 0.5rem 0.75rem; border: 1.5px solid var(--surface-variant, #e2e8f0);
    border-radius: 8px; font-size: 0.8125rem; outline: none; font-family: inherit;
    background: var(--surface-lowest, white);
  }
  .ce-member-select:focus, .ce-role-select:focus { border-color: #4f46e5; }
  .ce-btn-remove { background: none; border: none; color: #dc2626; cursor: pointer; padding: 4px; display: flex; }
  .ce-btn-add-member {
    background: none; border: 1.5px dashed var(--surface-variant, #e2e8f0);
    border-radius: 10px; padding: 10px; cursor: pointer; font-size: 0.8125rem;
    font-weight: 600; color: #4f46e5; display: flex; align-items: center;
    gap: 4px; margin-top: 4px; font-family: inherit; transition: border-color 0.15s;
  }
  .ce-btn-add-member:hover { border-color: #4f46e5; background: #4f46e508; }

  .ce-modal-actions { display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid var(--surface-variant, #f1f5f9); }
  .ce-btn-cancel {
    background: var(--surface-lowest, white); border: 1.5px solid var(--surface-variant, #e2e8f0);
    padding: 0.625rem 1.25rem; border-radius: 10px; font-weight: 700;
    cursor: pointer; font-family: inherit; font-size: 0.8125rem;
  }
  .ce-btn-submit {
    background: #4f46e5; color: white; border: none;
    padding: 0.625rem 1.5rem; border-radius: 10px; font-weight: 700;
    cursor: pointer; display: flex; align-items: center; gap: 0.5rem;
    font-family: inherit; font-size: 0.8125rem; transition: background 0.15s;
  }
  .ce-btn-submit:hover { background: #4338ca; }
  .ce-btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }

  /* Detail Grid */
  .ce-detail-grid { display: grid; grid-template-columns: 1fr 340px; gap: 1.5rem; align-items: start; }
  .ce-main-col { display: flex; flex-direction: column; gap: 1.5rem; }
  .ce-sidebar { display: flex; flex-direction: column; gap: 1.5rem; }

  /* Success banner */
  .ce-success-banner {
    display: flex; align-items: center; gap: 0.5rem;
    background: #d1fae5; color: #065f46; padding: 0.875rem 1.25rem;
    border-radius: 12px; font-weight: 600; font-size: 0.875rem;
  }

  /* Project card */
  .ce-project-card { display: flex; gap: 2rem; }
  .ce-project-visual { width: 200px; flex-shrink: 0; }
  .ce-visual-bg {
    width: 100%; height: 240px; background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%);
    border-radius: 16px; position: relative; overflow: hidden;
  }
  .ce-visual-overlay {
    position: absolute; bottom: 0; left: 0; right: 0;
    background: rgba(0,0,0,0.5); backdrop-filter: blur(8px);
    padding: 1rem; color: white; display: flex; flex-direction: column; gap: 0.25rem;
  }
  .ce-visual-tag { font-size: 0.6rem; font-weight: 600; opacity: 0.8; letter-spacing: 0.05em; }
  .ce-visual-overlay strong { font-size: 0.875rem; }
  .ce-project-info { display: flex; flex-direction: column; gap: 1rem; flex: 1; }
  .ce-project-title { font-size: 1.375rem; font-weight: 800; color: #4f46e5; line-height: 1.3; }
  .ce-project-abstract { color: var(--on-surface-variant); line-height: 1.6; font-size: 0.875rem; }
  .ce-meta-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; padding-top: 1rem; border-top: 1px solid var(--surface-variant, #f1f5f9); }
  .ce-meta-item { display: flex; flex-direction: column; gap: 0.375rem; }
  .ce-meta-label { font-size: 0.65rem; font-weight: 700; color: var(--on-surface-muted); text-transform: uppercase; letter-spacing: 0.05em; }
  .ce-meta-item strong { font-size: 0.8125rem; }

  /* Score sheet */
  .ce-score-card { padding: 2rem !important; }
  .ce-score-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
  .ce-score-title-row { display: flex; align-items: center; gap: 0.75rem; }
  .ce-icon-wrap {
    background: #eef2ff; color: #4f46e5; padding: 0.625rem;
    border-radius: 12px; display: flex; align-items: center; justify-content: center;
  }
  .ce-score-title-row h3 { font-size: 0.9375rem; font-weight: 700; }
  .ce-score-subtitle { font-size: 0.75rem; color: var(--on-surface-muted); margin-top: 2px; }
  .ce-total-badge {
    background: linear-gradient(135deg, #1e1b4b 0%, #4338ca 100%);
    color: white; padding: 0.5rem 1.25rem; border-radius: 12px;
    display: flex; align-items: baseline; gap: 0.375rem;
  }
  .ce-total-label { font-size: 0.6rem; font-weight: 800; opacity: 0.9; letter-spacing: 0.03em; }
  .ce-total-value { font-size: 1.25rem; font-weight: 800; }
  .ce-total-max { font-size: 0.75rem; font-weight: 700; opacity: 0.7; }

  .ce-criteria-list { display: flex; flex-direction: column; gap: 2rem; margin-bottom: 2rem; }
  .ce-criterion-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 1rem; }
  .ce-criterion-info h4 { font-size: 0.9375rem; font-weight: 700; margin-bottom: 0.25rem; }
  .ce-criterion-info p { font-size: 0.8125rem; color: var(--on-surface-muted); }
  .ce-criterion-score {
    background: var(--surface-low, #f8fafc); padding: 0.5rem 1rem;
    border-radius: 10px; display: flex; align-items: baseline; gap: 0.25rem;
  }
  .ce-current { font-size: 1.5rem; font-weight: 800; color: #4f46e5; }
  .ce-max { font-weight: 700; color: var(--on-surface-muted); }
  .ce-slider-wrap { padding: 0.25rem 0; }
  .ce-slider {
    -webkit-appearance: none; width: 100%; height: 10px;
    border-radius: 100px; background: var(--surface-low, #f1f5f9); outline: none; cursor: pointer;
  }
  .ce-slider::-webkit-slider-thumb {
    -webkit-appearance: none; width: 22px; height: 22px; border-radius: 50%;
    background: #4f46e5; border: 3px solid white;
    box-shadow: 0 2px 8px rgba(79,70,229,0.3);
  }
  .ce-slider::-moz-range-thumb {
    width: 22px; height: 22px; border-radius: 50%;
    background: #4f46e5; border: 3px solid white;
    box-shadow: 0 2px 8px rgba(79,70,229,0.3);
  }

  .ce-comment-section { margin-bottom: 1rem; }
  .ce-comment-section h4 { margin-bottom: 0.75rem; font-size: 0.875rem; font-weight: 700; }
  .ce-textarea {
    width: 100%; height: 120px; background: var(--surface-low, #f8fafc);
    border: 2px solid var(--surface-variant, #f1f5f9); border-radius: 12px;
    padding: 1rem; font-size: 0.9375rem; font-family: inherit;
    resize: none; outline: none; transition: border-color 0.15s;
    box-sizing: border-box;
  }
  .ce-textarea:focus { border-color: #4f46e5; }

  .ce-recommendation-section { margin-top: 1rem; }
  .ce-rec-label { font-size: 0.875rem; font-weight: 700; margin-bottom: 10px; display: block; }
  .ce-rec-buttons { display: flex; gap: 8px; }
  .ce-rec-btn {
    flex: 1; padding: 12px; border-radius: 10px; border: 2px solid var(--surface-variant, #e2e8f0);
    font-weight: 700; font-size: 0.8125rem; cursor: pointer; font-family: inherit;
    transition: all 0.15s;
  }
  .ce-rec-btn:hover { transform: translateY(-1px); }

  /* Reviews */
  .ce-reviews-card { padding: 2rem !important; }
  .ce-reviews-header { display: flex; align-items: center; gap: 10px; margin-bottom: 1.5rem; }
  .ce-reviews-header h3 { font-size: 0.9375rem; font-weight: 700; }

  .ce-conclusion-banner {
    display: flex; align-items: center; gap: 16px; margin-bottom: 20px;
    padding: 1.25rem; border-radius: 14px;
  }
  .ce-conclusion-banner.pass { background: #d1fae5; }
  .ce-conclusion-banner.fail { background: #fee2e2; }
  .ce-conclusion-banner.pending { background: #fef3c7; }
  .ce-conclusion-score { font-size: 2rem; font-weight: 800; }
  .ce-conclusion-banner.pass .ce-conclusion-score { color: #059669; }
  .ce-conclusion-banner.fail .ce-conclusion-score { color: #dc2626; }
  .ce-conclusion-banner.pending .ce-conclusion-score { color: #d97706; }
  .ce-conclusion-label { font-weight: 700; font-size: 1rem; }
  .ce-conclusion-sub { font-size: 0.8125rem; color: var(--on-surface-muted); margin-top: 2px; }

  .ce-empty-text { color: var(--on-surface-muted); text-align: center; padding: 2rem; font-size: 0.8125rem; }

  .ce-review-list { display: flex; flex-direction: column; gap: 12px; }
  .ce-review-item { padding: 1.25rem; background: var(--surface-low, #f8fafc); border-radius: 14px; }
  .ce-review-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
  .ce-reviewer-info { display: flex; align-items: center; gap: 10px; }
  .ce-reviewer-avatar {
    width: 32px; height: 32px; border-radius: 10px; background: #eef2ff;
    color: #4f46e5; display: flex; align-items: center; justify-content: center;
    font-weight: 700; font-size: 0.8rem;
  }
  .ce-reviewer-name { font-weight: 700; font-size: 0.875rem; }
  .ce-review-score { font-weight: 800; color: #4f46e5; font-size: 1.25rem; }
  .ce-score-unit { font-size: 0.8rem; font-weight: 600; color: var(--on-surface-muted); }
  .ce-review-scores { display: flex; gap: 16px; font-size: 0.8rem; margin-bottom: 10px; color: var(--on-surface-muted); }
  .ce-review-scores b { color: var(--on-surface); }
  .ce-review-comment { font-size: 0.8125rem; color: var(--on-surface-muted); line-height: 1.6; margin-bottom: 8px; }
  .ce-rec-pill {
    display: inline-block; font-size: 0.7rem; font-weight: 700;
    padding: 3px 10px; border-radius: 6px;
  }
  .ce-rec-pill.accept { background: #d1fae5; color: #059669; }
  .ce-rec-pill.reject { background: #fee2e2; color: #dc2626; }
  .ce-rec-pill.revise { background: #fef3c7; color: #d97706; }

  /* AI Sidebar */
  .ce-ai-card {
    background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%);
    color: white; border-radius: 20px; padding: 1.5rem;
    box-shadow: 0 20px 40px -10px rgba(30,27,75,0.3);
  }
  .ce-ai-header {
    display: flex; align-items: center; gap: 0.5rem;
    font-weight: 800; font-size: 0.7rem; letter-spacing: 0.03em; margin-bottom: 1rem;
  }
  .ce-ai-loading { text-align: center; padding: 1rem; }
  .ce-ai-hint { font-size: 0.8rem; opacity: 0.8; line-height: 1.5; margin-bottom: 1rem; }
  .ce-expert-list { display: flex; flex-direction: column; gap: 0.5rem; }
  .ce-expert-item {
    background: rgba(255,255,255,0.08); border-radius: 12px; padding: 0.75rem;
    display: flex; align-items: center; gap: 0.75rem; position: relative;
    transition: background 0.15s;
  }
  .ce-expert-item:hover { background: rgba(255,255,255,0.12); }
  .ce-expert-avatar {
    width: 34px; height: 34px; border-radius: 10px; background: rgba(255,255,255,0.2);
    flex-shrink: 0; display: flex; align-items: center; justify-content: center;
    font-weight: 700; font-size: 0.8rem;
  }
  .ce-expert-info { flex: 1; min-width: 0; }
  .ce-expert-info h5 { font-size: 0.8rem; font-weight: 700; margin-bottom: 2px; }
  .ce-expert-info p { font-size: 0.65rem; opacity: 0.6; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .ce-match-tag { font-size: 0.65rem; font-weight: 800; color: #10b981; flex-shrink: 0; }

  /* Council Progress */
  .ce-progress-card { padding: 1.5rem !important; }
  .ce-progress-title-row { display: flex; align-items: center; gap: 8px; margin-bottom: 1rem; }
  .ce-progress-title-row h3 { font-size: 0.9375rem; font-weight: 700; }
  .ce-progress-stats { display: flex; justify-content: space-between; font-size: 0.8125rem; margin-bottom: 0.5rem; }
  .ce-progress-stats span { color: var(--on-surface-muted); }
  .ce-progress-stats strong { color: #4f46e5; }
  .ce-council-members { margin-top: 1.25rem; padding-top: 1.25rem; border-top: 1px solid var(--surface-variant, #f1f5f9); }
  .ce-section-label { font-size: 0.625rem; font-weight: 800; color: var(--on-surface-muted); display: block; margin-bottom: 0.75rem; letter-spacing: 0.05em; }
  .ce-member-list { display: flex; flex-direction: column; gap: 8px; }
  .ce-member-item { display: flex; align-items: center; gap: 10px; font-size: 0.8125rem; }
  .ce-member-avatar {
    width: 30px; height: 30px; border-radius: 50%; display: flex;
    align-items: center; justify-content: center; font-size: 0.7rem;
    font-weight: 700; background: var(--surface-low, #f1f5f9);
    color: var(--on-surface-muted); flex-shrink: 0;
  }
  .ce-member-avatar.done { background: #d1fae5; color: #059669; }
  .ce-member-detail { flex: 1; min-width: 0; }
  .ce-member-name { font-weight: 600; display: block; }
  .ce-member-role { font-size: 0.7rem; color: var(--on-surface-muted); }

  /* Sidebar actions */
  .ce-sidebar-actions { display: flex; flex-direction: column; gap: 0.75rem; }
  .ce-btn-back-sidebar {
    background: var(--surface-lowest, white); border: 1.5px solid var(--surface-variant, #e2e8f0);
    padding: 0.875rem; border-radius: 12px; font-weight: 700; cursor: pointer;
    display: flex; align-items: center; justify-content: center; gap: 0.5rem;
    font-family: inherit; font-size: 0.8125rem; transition: all 0.15s;
  }
  .ce-btn-back-sidebar:hover { border-color: #4f46e5; color: #4f46e5; }
  .ce-btn-submit-sidebar {
    background: #4f46e5; color: white; border: none;
    padding: 0.875rem; border-radius: 12px; font-weight: 700;
    display: flex; align-items: center; justify-content: center; gap: 0.5rem;
    cursor: pointer; font-family: inherit; font-size: 0.8125rem;
    box-shadow: 0 8px 20px -5px rgba(79,70,229,0.3); transition: all 0.15s;
  }
  .ce-btn-submit-sidebar:hover { background: #4338ca; transform: translateY(-1px); }
  .ce-btn-submit-sidebar:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

  /* Spinner */
  .ce-spin { animation: ce-spin 1s linear infinite; }
  @keyframes ce-spin { to { transform: rotate(360deg); } }

  /* Responsive */
  @media (max-width: 1200px) {
    .ce-detail-grid { grid-template-columns: 1fr; }
    .ce-stats-grid { grid-template-columns: repeat(2, 1fr); }
    .ce-hero { flex-direction: column; text-align: center; }
    .ce-hero-right { margin: 1.5rem 0 0; }
    .ce-hero-actions { justify-content: center; }
    .ce-hero-desc { max-width: 100%; }
  }
  @media (max-width: 768px) {
    .ce-stats-grid { grid-template-columns: 1fr 1fr; }
    .ce-grid { grid-template-columns: 1fr; }
    .ce-project-card { flex-direction: column; }
    .ce-project-visual { width: 100%; }
    .ce-visual-bg { height: 160px; }
    .ce-form-grid { grid-template-columns: 1fr; }
    .ce-modal { width: calc(100vw - 2rem); }
    .ce-hero { padding: 1.5rem; }
    .ce-hero-greeting h1 { font-size: 1.375rem; }
  }
`;
