import { useState, useEffect } from 'react';
import {
  Download,
  Send,
  Sparkles,
  ShieldCheck,
  Save,
  PenTool,
  ChevronRight,
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

  // --- Committee List View ---
  if (!selected) {
    return (
      <div className="committee-page">
        <header className="page-header">
          <div>
            <p className="breadcrumb">HỘI ĐỒNG CHẤM ĐIỂM</p>
            <h1>Quản lý Hội đồng Đánh giá</h1>
            <p className="subtitle">Quản lý và đánh giá các công trình khoa học qua hội đồng phản biện chuyên nghiệp</p>
          </div>
          {hasRole(Role.ADMIN) && (
            <button className="btn-create" onClick={async () => {
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
              <Plus size={18} /> Tạo Hội đồng mới
            </button>
          )}
        </header>

        {/* Stats */}
        <div className="stats-row">
          <div className="stat-box surface-card">
            <Users size={22} color="#4f46e5" />
            <div>
              <span className="stat-num">{committees.length}</span>
              <span className="stat-label">Tổng hội đồng</span>
            </div>
          </div>
          <div className="stat-box surface-card">
            <CheckCircle size={22} color="#10b981" />
            <div>
              <span className="stat-num">{committees.filter(c => c.finalScore != null).length}</span>
              <span className="stat-label">Đã hoàn thành</span>
            </div>
          </div>
          <div className="stat-box surface-card">
            <Clock size={22} color="#f59e0b" />
            <div>
              <span className="stat-num">{committees.filter(c => c.finalScore == null).length}</span>
              <span className="stat-label">Đang chờ</span>
            </div>
          </div>
          <div className="stat-box surface-card">
            <Star size={22} color="#7c3aed" />
            <div>
              <span className="stat-num">
                {committees.filter(c => c.finalScore != null).length > 0
                  ? (committees.filter(c => c.finalScore != null).reduce((s, c) => s + (c.finalScore || 0), 0) / committees.filter(c => c.finalScore != null).length).toFixed(1)
                  : '—'}
              </span>
              <span className="stat-label">Điểm TB</span>
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--on-surface-muted)' }}>
            <Loader2 size={32} className="spin" />
            <p style={{ marginTop: 8 }}>Đang tải...</p>
          </div>
        ) : committees.length === 0 ? (
          <div className="surface-card" style={{ textAlign: 'center', padding: '4rem' }}>
            <Users size={48} color="var(--on-surface-muted)" style={{ opacity: 0.4, marginBottom: 12 }} />
            <p style={{ color: 'var(--on-surface-muted)' }}>Chưa có hội đồng nào được tạo.</p>
          </div>
        ) : (
          <div className="committee-grid">
            {committees.map(c => (
              <div key={c.id} className="surface-card committee-card" onClick={() => loadCommitteeDetail(c.id)}>
                <div className="card-top">
                  <span className={`conclusion-badge ${c.conclusion === 'Đạt' ? 'pass' : c.conclusion === 'Không đạt' ? 'fail' : 'pending'}`}>
                    {c.conclusion || 'Đang đánh giá'}
                  </span>
                  {c.finalScore != null && (
                    <span className="final-score">{c.finalScore.toFixed(1)}/100</span>
                  )}
                </div>
                <h3>{c.name}</h3>
                <p className="card-work-title">{c.work.title}</p>
                <div className="card-meta">
                  <span><Users size={14} /> {c.members.length} thành viên</span>
                  {c.meetingDate && (
                    <span><Calendar size={14} /> {new Date(c.meetingDate).toLocaleDateString('vi-VN')}</span>
                  )}
                  {c.location && <span><MapPin size={14} /> {c.location}</span>}
                </div>
                <div className="card-progress">
                  <span className="progress-text">{c._count?.reviews || c.reviews?.length || 0}/{c.members.length} đã chấm</span>
                  <ProgressBar progress={c.members.length > 0 ? ((c._count?.reviews || c.reviews?.length || 0) / c.members.length) * 100 : 0} color="var(--primary-indigo)" height="4px" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Modal */}
        {showCreate && (
          <div className="modal-overlay" onClick={() => setShowCreate(false)}>
            <div className="modal-content surface-card" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Tạo Hội đồng mới</h2>
                <button className="btn-close" onClick={() => setShowCreate(false)}><X size={20} /></button>
              </div>
              <div className="form-grid">
                <div className="form-field">
                  <label>Tên hội đồng *</label>
                  <input value={createForm.name} onChange={e => setCreateForm({ ...createForm, name: e.target.value })} placeholder="VD: HĐ Thẩm định đề tài DT-2024" />
                </div>
                <div className="form-field">
                  <label>Đề tài nghiên cứu *</label>
                  <select value={createForm.workId} onChange={e => setCreateForm({ ...createForm, workId: e.target.value })}>
                    <option value="">-- Chọn đề tài --</option>
                    {worksList.map(w => <option key={w.id} value={w.id}>{w.title}</option>)}
                  </select>
                </div>
                <div className="form-field">
                  <label>Ngày họp</label>
                  <input type="datetime-local" value={createForm.meetingDate} onChange={e => setCreateForm({ ...createForm, meetingDate: e.target.value })} />
                </div>
                <div className="form-field">
                  <label>Địa điểm</label>
                  <input value={createForm.location} onChange={e => setCreateForm({ ...createForm, location: e.target.value })} placeholder="VD: Phòng họp A, Tầng 3" />
                </div>
                <div className="form-field full-width">
                  <label>Mô tả</label>
                  <textarea value={createForm.description} onChange={e => setCreateForm({ ...createForm, description: e.target.value })} placeholder="Mô tả mục đích hội đồng..." rows={2} />
                </div>
                <div className="form-field full-width">
                  <label>Thành viên hội đồng</label>
                  {createForm.members.map((m, i) => (
                    <div key={i} className="member-row">
                      <select value={m.userId} onChange={e => {
                        const ms = [...createForm.members];
                        ms[i] = { ...ms[i], userId: e.target.value };
                        setCreateForm({ ...createForm, members: ms });
                      }} style={{ flex: 1 }}>
                        <option value="">-- Chọn thành viên --</option>
                        {usersList.filter(u => u.role === 'ADMIN' || u.role === 'REVIEWER' || u.role === 'LECTURER').map(u => (
                          <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                        ))}
                      </select>
                      <select value={m.role} onChange={e => {
                        const ms = [...createForm.members];
                        ms[i] = { ...ms[i], role: e.target.value };
                        setCreateForm({ ...createForm, members: ms });
                      }}>
                        <option value="chair">Chủ tịch</option>
                        <option value="secretary">Thư ký</option>
                        <option value="reviewer">Phản biện</option>
                        <option value="member">Thành viên</option>
                      </select>
                      {createForm.members.length > 1 && (
                        <button className="btn-remove-member" onClick={() => {
                          setCreateForm({ ...createForm, members: createForm.members.filter((_, j) => j !== i) });
                        }}><X size={14} /></button>
                      )}
                    </div>
                  ))}
                  <button className="btn-add-member" onClick={() => setCreateForm({ ...createForm, members: [...createForm.members, { userId: '', role: 'reviewer' }] })}>
                    <Plus size={14} /> Thêm thành viên
                  </button>
                </div>
              </div>
              <div className="modal-actions">
                <button className="btn-secondary" onClick={() => setShowCreate(false)}>Hủy</button>
                <button className="btn-primary" onClick={handleCreate} disabled={submitting || !createForm.name || !createForm.workId}>
                  {submitting ? <Loader2 size={16} className="spin" /> : <Plus size={16} />}
                  Tạo hội đồng
                </button>
              </div>
            </div>
          </div>
        )}

        <style>{committeeStyles}</style>
      </div>
    );
  }

  // --- Committee Detail / Evaluation View ---
  return (
    <div className="evaluation-page">
      <header className="eval-header">
        <div className="header-breadcrumbs">
          <button className="btn-back" onClick={() => setSelected(null)}>
            <ArrowLeft size={16} /> Quay lại
          </button>
          <ChevronRight size={14} />
          <span className="breadcrumb-active">{selected.name}</span>
        </div>
        <div className="header-main">
          <h1>Thẩm định Đề tài Nghiên cứu</h1>
          <div className="header-actions">
            <button className="btn-outline-white">
              <Download size={18} /> Tải hồ sơ gốc
            </button>
            {isMember && !userAlreadyReviewed && (
              <button className="btn-primary-eval" onClick={handleSubmitReview} disabled={submitting || totalScore === 0}>
                {submitting ? <Loader2 size={18} className="spin" /> : <Send size={18} />}
                Gửi kết quả
              </button>
            )}
          </div>
        </div>
      </header>

      {submitSuccess && (
        <div className="success-banner">
          <CheckCircle size={18} /> Đánh giá đã được gửi thành công!
        </div>
      )}

      <div className="eval-content-grid">
        <div className="eval-main-column">
          {/* Project Summary */}
          <section className="surface-card project-overview-card">
            <div className="project-visual">
              <div className="visual-placeholder">
                <div className="overlay-tag">
                  <span>LĨNH VỰC</span>
                  <strong>{selected.work.level || 'Nghiên cứu khoa học'}</strong>
                </div>
              </div>
            </div>
            <div className="project-details">
              <div className="title-row">
                <h2>{selected.work.title}</h2>
              </div>
              {selected.work.abstract && (
                <p className="project-desc">{selected.work.abstract}</p>
              )}
              <div className="info-meta-grid">
                <div className="meta-item">
                  <span className="meta-label">TÁC GIẢ</span>
                  <strong>{selected.work.authors || '—'}</strong>
                </div>
                <div className="meta-item">
                  <span className="meta-label">TRẠNG THÁI</span>
                  <strong>{selected.work.status || '—'}</strong>
                </div>
                <div className="meta-item">
                  <span className="meta-label">NGÀY HỌP</span>
                  <strong>{selected.meetingDate ? new Date(selected.meetingDate).toLocaleDateString('vi-VN') : 'Chưa xác định'}</strong>
                </div>
                <div className="meta-item">
                  <span className="meta-label">ĐỊA ĐIỂM</span>
                  <strong>{selected.location || 'Chưa xác định'}</strong>
                </div>
              </div>
            </div>
          </section>

          {/* Score Sheet - only show if member and not yet reviewed */}
          {isMember && !userAlreadyReviewed ? (
            <section className="surface-card score-sheet-card">
              <div className="sheet-header">
                <div className="header-title">
                  <div className="icon-wrap indigo"><PenTool size={20} /></div>
                  <h3>Phiếu đánh giá điện tử</h3>
                </div>
                <div className="total-score-badge">
                  <span className="label">TỔNG ĐIỂM:</span>
                  <span className="value">{totalScore}</span>
                  <span className="max">/ 100</span>
                </div>
              </div>

              <div className="criteria-list">
                <CriterionSlider label="1. Tính đổi mới & Sáng tạo" desc="Đánh giá sự khác biệt so với các nghiên cứu hiện có." max={40} value={scores.innovation} onChange={v => handleScoreChange('innovation', v)} />
                <CriterionSlider label="2. Tính khả thi & Phương pháp luận" desc="Đánh giá độ tin cậy của mô hình và đội ngũ thực hiện." max={30} value={scores.feasibility} onChange={v => handleScoreChange('feasibility', v)} />
                <CriterionSlider label="3. Tác động kinh tế - xã hội" desc="Đánh giá khả năng chuyển giao và áp dụng thực tiễn." max={30} value={scores.impact} onChange={v => handleScoreChange('impact', v)} />
              </div>

              <div className="comment-box-section">
                <h4>Nhận xét chi tiết & Kiến nghị</h4>
                <textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Nhập ý kiến chuyên môn của bạn tại đây..." className="eval-textarea" />
              </div>

              <div style={{ marginTop: 16 }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: 8, display: 'block' }}>Đề xuất</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[{ v: 'accept', l: 'Chấp nhận', c: '#10b981' }, { v: 'revise', l: 'Yêu cầu chỉnh sửa', c: '#f59e0b' }, { v: 'reject', l: 'Từ chối', c: '#ef4444' }].map(opt => (
                    <button key={opt.v} onClick={() => setRecommendation(opt.v)}
                      style={{
                        flex: 1, padding: '10px', borderRadius: 10, border: `2px solid ${recommendation === opt.v ? opt.c : 'var(--surface-variant)'}`,
                        background: recommendation === opt.v ? `${opt.c}15` : 'var(--surface-lowest)',
                        fontWeight: 700, fontSize: '0.8125rem', cursor: 'pointer', fontFamily: 'inherit',
                        color: recommendation === opt.v ? opt.c : 'var(--on-surface-muted)',
                      }}>
                      {opt.l}
                    </button>
                  ))}
                </div>
              </div>
            </section>
          ) : (
            /* Show existing reviews */
            <section className="surface-card" style={{ padding: '2rem' }}>
              <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                <PenTool size={18} /> Kết quả đánh giá ({selected.reviews.length} phiếu)
              </h3>

              {selected.finalScore != null && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, padding: 16, background: selected.conclusion === 'Đạt' ? '#d1fae5' : selected.conclusion === 'Không đạt' ? '#fee2e2' : '#fef3c7', borderRadius: 12 }}>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: selected.conclusion === 'Đạt' ? '#059669' : selected.conclusion === 'Không đạt' ? '#dc2626' : '#d97706' }}>
                    {selected.finalScore.toFixed(1)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1rem' }}>Kết luận: {selected.conclusion}</div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--on-surface-muted)' }}>Điểm trung bình từ {selected.reviews.length} phiếu đánh giá</div>
                  </div>
                </div>
              )}

              {selected.reviews.length === 0 ? (
                <p style={{ color: 'var(--on-surface-muted)', textAlign: 'center', padding: '2rem' }}>Chưa có đánh giá nào</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {selected.reviews.map(r => (
                    <div key={r.id} style={{ padding: 16, background: 'var(--surface-low)', borderRadius: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontWeight: 700 }}>{r.reviewer.name || r.reviewer.email}</span>
                        <span style={{ fontWeight: 800, color: 'var(--primary-indigo)', fontSize: '1.125rem' }}>{r.totalScore}/100</span>
                      </div>
                      <div style={{ display: 'flex', gap: 12, fontSize: '0.8rem', marginBottom: 8 }}>
                        <span>Đổi mới: <b>{r.innovationScore}/40</b></span>
                        <span>Khả thi: <b>{r.feasibilityScore}/30</b></span>
                        <span>Tác động: <b>{r.impactScore}/30</b></span>
                      </div>
                      {r.comment && <p style={{ fontSize: '0.85rem', color: 'var(--on-surface-muted)', lineHeight: 1.5 }}>{r.comment}</p>}
                      {r.recommendation && (
                        <span style={{
                          display: 'inline-block', marginTop: 6, fontSize: '0.75rem', fontWeight: 700,
                          padding: '2px 8px', borderRadius: 4,
                          background: r.recommendation === 'accept' ? '#d1fae5' : r.recommendation === 'reject' ? '#fee2e2' : '#fef3c7',
                          color: r.recommendation === 'accept' ? '#059669' : r.recommendation === 'reject' ? '#dc2626' : '#d97706',
                        }}>
                          {r.recommendation === 'accept' ? 'Chấp nhận' : r.recommendation === 'reject' ? 'Từ chối' : 'Yêu cầu chỉnh sửa'}
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
        <aside className="eval-sidebar-column">
          {/* AI Expert Suggestions */}
          <section className="sidebar-card ai-matching-card">
            <div className="ai-matching-header">
              <div className="ai-box">
                <Sparkles size={18} />
                <span>AI GỢI Ý CHUYÊN GIA ĐỐI CHIẾU</span>
              </div>
            </div>
            {loadingExperts ? (
              <div style={{ textAlign: 'center', padding: '1rem' }}>
                <Loader2 size={20} className="spin" style={{ color: 'white' }} />
              </div>
            ) : experts.length > 0 ? (
              <>
                <p className="ai-hint">Hệ thống đã phân tích từ khóa và đề xuất chuyên gia phù hợp:</p>
                <div className="expert-list">
                  {experts.slice(0, 5).map((exp: any, idx: number) => (
                    <div key={idx} className="expert-item-small">
                      <div className="expert-avatar">{(exp.name || 'U')[0]}</div>
                      <div className="expert-info">
                        <h5>{exp.name}</h5>
                        <p>{exp.specialization || exp.email}</p>
                      </div>
                      {exp.matchScore && <div className="match-tag">{exp.matchScore}% Match</div>}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="ai-hint">Chưa có dữ liệu gợi ý chuyên gia cho đề tài này.</p>
            )}
          </section>

          {/* Council Progress */}
          <section className="surface-card council-progress-card">
            <h3 className="sidebar-title">Tiến độ Hội đồng</h3>
            <div className="progress-stats">
              <span>Số thành viên đã chấm</span>
              <strong>{selected.reviews.length} / {selected.members.length}</strong>
            </div>
            <ProgressBar progress={selected.members.length > 0 ? (selected.reviews.length / selected.members.length) * 100 : 0} color="var(--primary-indigo)" height="6px" />

            <div className="council-members">
              <span className="label-xs">THÀNH VIÊN HỘI ĐỒNG</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {selected.members.map(m => {
                  const reviewed = selected.reviews.some(r => r.reviewer.id === m.user.id);
                  return (
                    <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8125rem' }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: reviewed ? '#d1fae5' : '#f1f5f9', color: reviewed ? '#059669' : 'var(--on-surface-muted)',
                        fontSize: '0.7rem', fontWeight: 700,
                      }}>
                        {reviewed ? <CheckCircle size={14} /> : (m.user.name || 'U')[0]}
                      </div>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontWeight: 600 }}>{m.user.name || m.user.email}</span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--on-surface-muted)', marginLeft: 6 }}>
                          ({m.role === 'chair' ? 'Chủ tịch' : m.role === 'secretary' ? 'Thư ký' : m.role === 'reviewer' ? 'Phản biện' : 'Thành viên'})
                        </span>
                      </div>
                      {reviewed && <CheckCircle size={14} color="#10b981" />}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Save info */}
          <section className="sidebar-simple">
            <div className="sidebar-dual-actions">
              <button className="btn-secondary-sidebar" onClick={() => setSelected(null)}>
                <ArrowLeft size={16} /> Quay lại danh sách
              </button>
              {isMember && !userAlreadyReviewed && (
                <button className="btn-primary-sidebar" onClick={handleSubmitReview} disabled={submitting || totalScore === 0}>
                  <ShieldCheck size={18} />
                  {submitting ? 'Đang gửi...' : 'Xác nhận & Gửi đánh giá'}
                </button>
              )}
            </div>
          </section>
        </aside>
      </div>

      <style>{committeeStyles}</style>
    </div>
  );
};

function CriterionSlider({ label, desc, max, value, onChange }: { label: string; desc: string; max: number; value: number; onChange: (v: number) => void }) {
  return (
    <div className="criterion-item">
      <div className="criterion-header">
        <div className="criterion-info">
          <h4>{label}</h4>
          <p>{desc}</p>
        </div>
        <div className="score-display">
          <span className="current-score">{value}</span>
          <span className="max-score">/ {max}</span>
        </div>
      </div>
      <div className="slider-wrapper">
        <input type="range" min="0" max={max} value={value} onChange={(e) => onChange(parseInt(e.target.value))} className="score-slider" />
      </div>
    </div>
  );
}

const committeeStyles = `
  .committee-page, .evaluation-page { display: flex; flex-direction: column; gap: 2rem; padding-bottom: 3rem; }

  .breadcrumb { font-size: 0.8125rem; color: var(--on-surface-muted); margin-bottom: 0.25rem; font-weight: 700; letter-spacing: 0.05em; }
  .page-header { display: flex; justify-content: space-between; align-items: flex-start; }
  .page-header h1 { font-size: 1.75rem; font-weight: 800; }
  .subtitle { color: var(--on-surface-muted); font-size: 0.9375rem; margin-top: 0.25rem; }

  .btn-create {
    background: var(--primary-indigo); color: white; border: none;
    padding: 0.75rem 1.5rem; border-radius: 12px; font-weight: 700;
    display: flex; align-items: center; gap: 0.5rem; cursor: pointer; white-space: nowrap;
  }

  .stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; }
  .stat-box { padding: 1.25rem; display: flex; align-items: center; gap: 1rem; }
  .stat-num { font-size: 1.5rem; font-weight: 800; display: block; }
  .stat-label { font-size: 0.75rem; color: var(--on-surface-muted); }

  .committee-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 1.5rem; }
  .committee-card { padding: 1.5rem; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; }
  .committee-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.08); }
  .committee-card h3 { font-size: 1rem; font-weight: 700; margin: 8px 0 4px; }
  .card-work-title { font-size: 0.85rem; color: var(--on-surface-muted); line-height: 1.4; margin-bottom: 10px; }
  .card-top { display: flex; justify-content: space-between; align-items: center; }
  .conclusion-badge { padding: 3px 10px; border-radius: 100px; font-size: 0.7rem; font-weight: 800; }
  .conclusion-badge.pass { background: #d1fae5; color: #059669; }
  .conclusion-badge.fail { background: #fee2e2; color: #dc2626; }
  .conclusion-badge.pending { background: #fef3c7; color: #d97706; }
  .final-score { font-weight: 800; font-size: 1.125rem; color: var(--primary-indigo); }
  .card-meta { display: flex; gap: 12px; font-size: 0.75rem; color: var(--on-surface-muted); flex-wrap: wrap; }
  .card-meta span { display: flex; align-items: center; gap: 4px; }
  .card-progress { margin-top: 10px; }
  .progress-text { font-size: 0.7rem; color: var(--on-surface-muted); font-weight: 600; display: block; margin-bottom: 4px; }

  /* Modal */
  .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
  .modal-content { width: 560px; max-height: 80vh; overflow-y: auto; padding: 2rem; border-radius: 20px; }
  .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
  .modal-header h2 { font-size: 1.25rem; font-weight: 800; }
  .btn-close { background: none; border: none; cursor: pointer; color: var(--on-surface-muted); padding: 4px; }
  .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
  .form-field { display: flex; flex-direction: column; gap: 0.375rem; }
  .form-field.full-width { grid-column: 1 / -1; }
  .form-field label { font-size: 0.75rem; font-weight: 700; color: var(--on-surface-muted); }
  .form-field input, .form-field textarea, .form-field select {
    padding: 0.625rem 0.875rem; border: 1.5px solid var(--surface-variant); border-radius: 8px;
    font-size: 0.875rem; font-family: inherit; outline: none; background: var(--surface-lowest);
  }
  .form-field input:focus, .form-field textarea:focus { border-color: var(--primary-indigo); }
  .member-row { display: flex; gap: 8px; margin-bottom: 8px; align-items: center; }
  .member-row input, .member-row select { padding: 0.5rem; border: 1.5px solid var(--surface-variant); border-radius: 6px; font-size: 0.8rem; outline: none; }
  .btn-remove-member { background: none; border: none; color: var(--error); cursor: pointer; padding: 4px; }
  .btn-add-member { background: none; border: 1.5px dashed var(--surface-variant); border-radius: 8px; padding: 8px; cursor: pointer; font-size: 0.8rem; font-weight: 600; color: var(--primary-indigo); display: flex; align-items: center; gap: 4px; margin-top: 4px; }
  .modal-actions { display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.5rem; }
  .btn-secondary { background: white; border: 1.5px solid var(--surface-variant); padding: 0.625rem 1.25rem; border-radius: 10px; font-weight: 700; cursor: pointer; }
  .btn-primary { background: var(--primary-indigo); color: white; border: none; padding: 0.625rem 1.5rem; border-radius: 10px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

  /* Evaluation Detail */
  .eval-header { display: flex; flex-direction: column; gap: 0.75rem; }
  .header-breadcrumbs { display: flex; align-items: center; gap: 0.5rem; font-size: 0.8rem; font-weight: 700; color: var(--on-surface-muted); }
  .breadcrumb-active { color: var(--primary-indigo); }
  .btn-back { background: none; border: none; display: flex; align-items: center; gap: 4px; cursor: pointer; color: var(--on-surface-muted); font-weight: 700; font-size: 0.8rem; }
  .header-main { display: flex; justify-content: space-between; align-items: center; }
  .header-main h1 { font-size: 1.75rem; color: var(--primary-indigo); }
  .header-actions { display: flex; gap: 1rem; }
  .btn-outline-white { background: white; color: var(--on-surface); border: 1px solid var(--surface-low); padding: 0.75rem 1.25rem; border-radius: 8px; display: flex; align-items: center; gap: 0.5rem; font-weight: 700; cursor: pointer; }
  .btn-primary-eval { background: #4338ca; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 8px; display: flex; align-items: center; gap: 0.5rem; font-weight: 700; cursor: pointer; box-shadow: 0 4px 12px rgba(67,56,202,0.2); }
  .btn-primary-eval:disabled { opacity: 0.5; cursor: not-allowed; }

  .success-banner { display: flex; align-items: center; gap: 0.5rem; background: #d1fae5; color: #065f46; padding: 0.75rem 1.25rem; border-radius: 12px; font-weight: 600; }

  .eval-content-grid { display: grid; grid-template-columns: 1fr 320px; gap: 1.5rem; align-items: start; }
  .eval-main-column { display: flex; flex-direction: column; gap: 1.5rem; }
  .eval-sidebar-column { display: flex; flex-direction: column; gap: 1.5rem; }

  .project-overview-card { display: flex; padding: 1.5rem; gap: 2rem; }
  .project-visual { width: 200px; height: 240px; flex-shrink: 0; }
  .visual-placeholder { width: 100%; height: 100%; background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%); border-radius: 16px; position: relative; overflow: hidden; }
  .overlay-tag { position: absolute; bottom: 0; left: 0; right: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(8px); padding: 1rem; color: white; display: flex; flex-direction: column; gap: 0.25rem; }
  .overlay-tag span { font-size: 0.6rem; font-weight: 600; opacity: 0.8; }
  .overlay-tag strong { font-size: 0.875rem; }
  .project-details { display: flex; flex-direction: column; gap: 1rem; flex: 1; }
  .title-row h2 { font-size: 1.375rem; color: var(--primary-indigo); line-height: 1.3; }
  .project-desc { color: var(--on-surface-variant); line-height: 1.6; font-size: 0.875rem; }
  .info-meta-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; padding-top: 1rem; border-top: 1px solid var(--surface-low); }
  .meta-item { display: flex; flex-direction: column; gap: 0.375rem; }
  .meta-label { font-size: 0.65rem; font-weight: 700; color: var(--on-surface-muted); text-transform: uppercase; }

  .score-sheet-card { padding: 2rem; }
  .sheet-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
  .header-title { display: flex; align-items: center; gap: 0.75rem; }
  .icon-wrap.indigo { background: #eef2ff; color: var(--primary-indigo); padding: 0.625rem; border-radius: 10px; }
  .total-score-badge { background: var(--signature-gradient); color: white; padding: 0.5rem 1rem; border-radius: 10px; display: flex; align-items: baseline; gap: 0.25rem; }
  .total-score-badge .label { font-size: 0.6rem; font-weight: 800; opacity: 0.9; }
  .total-score-badge .value { font-size: 1.25rem; font-weight: 800; }
  .total-score-badge .max { font-size: 0.75rem; font-weight: 700; opacity: 0.7; }
  .criteria-list { display: flex; flex-direction: column; gap: 2rem; margin-bottom: 2rem; }
  .criterion-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 1rem; }
  .criterion-info h4 { font-size: 1rem; font-weight: 700; margin-bottom: 0.25rem; }
  .criterion-info p { font-size: 0.8125rem; color: var(--on-surface-muted); }
  .score-display { background: #f1f5f9; padding: 0.5rem 1rem; border-radius: 10px; display: flex; align-items: baseline; gap: 0.25rem; }
  .current-score { font-size: 1.5rem; font-weight: 800; color: var(--primary-indigo); }
  .max-score { font-weight: 700; color: var(--on-surface-muted); }
  .slider-wrapper { padding: 0.25rem 0; }
  .score-slider { -webkit-appearance: none; width: 100%; height: 10px; border-radius: 100px; background: #f1f5f9; outline: none; cursor: pointer; }
  .score-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 22px; height: 22px; border-radius: 50%; background: var(--primary-indigo); border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.15); }
  .comment-box-section h4 { margin-bottom: 0.75rem; font-weight: 700; }
  .eval-textarea { width: 100%; height: 120px; background: #f8fafc; border: 2px solid #f1f5f9; border-radius: 12px; padding: 1rem; font-size: 0.9375rem; font-family: inherit; resize: none; outline: none; }
  .eval-textarea:focus { border-color: var(--primary-indigo); }

  .ai-matching-card { background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%); color: white; border-radius: 20px; padding: 1.5rem; box-shadow: 0 20px 40px -10px rgba(30,27,75,0.3); }
  .ai-matching-header { margin-bottom: 1rem; }
  .ai-box { display: flex; align-items: center; gap: 0.5rem; font-weight: 800; font-size: 0.75rem; letter-spacing: 0.02em; }
  .ai-hint { font-size: 0.8rem; opacity: 0.8; line-height: 1.5; margin-bottom: 1rem; }
  .expert-list { display: flex; flex-direction: column; gap: 0.5rem; }
  .expert-item-small { background: rgba(255,255,255,0.08); border-radius: 10px; padding: 0.625rem; display: flex; align-items: center; gap: 0.625rem; position: relative; }
  .expert-avatar { width: 32px; height: 32px; border-radius: 8px; background: rgba(255,255,255,0.2); flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.8rem; }
  .expert-info h5 { font-size: 0.75rem; font-weight: 700; margin-bottom: 0.125rem; }
  .expert-info p { font-size: 0.65rem; opacity: 0.6; }
  .match-tag { position: absolute; right: 0.625rem; top: 0.625rem; font-size: 0.6rem; font-weight: 800; color: #10b981; }

  .sidebar-title { font-size: 1rem; margin-bottom: 1rem; }
  .progress-stats { display: flex; justify-content: space-between; font-size: 0.8rem; margin-bottom: 0.5rem; }
  .council-members { margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--surface-low); }
  .label-xs { font-size: 0.625rem; font-weight: 800; color: var(--on-surface-muted); display: block; margin-bottom: 0.75rem; }

  .sidebar-simple { padding: 0 0.5rem; }
  .sidebar-dual-actions { display: flex; flex-direction: column; gap: 0.75rem; }
  .btn-secondary-sidebar { background: white; border: 1px solid var(--surface-low); padding: 0.875rem; border-radius: 12px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.5rem; }
  .btn-primary-sidebar { background: var(--primary-indigo); color: white; border: none; padding: 0.875rem; border-radius: 12px; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 0.5rem; cursor: pointer; box-shadow: 0 8px 20px -5px rgba(79,70,229,0.3); }
  .btn-primary-sidebar:disabled { opacity: 0.5; cursor: not-allowed; }

  .spin { animation: spin 1s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  @media (max-width: 1024px) {
    .eval-content-grid { grid-template-columns: 1fr; }
    .stats-row { grid-template-columns: repeat(2, 1fr); }
    .project-overview-card { flex-direction: column; }
    .project-visual { width: 100%; height: 160px; }
  }
`;
