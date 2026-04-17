import { useState, useEffect } from 'react';
import {
  Clock, Award, FileText, BookOpen, Users, Search, Loader2,
  CheckCircle, AlertTriangle, TrendingUp, Star, ChevronRight,
  Plus, BarChart3, GraduationCap, Building2,
} from 'lucide-react';
import { Modal } from '../components/common/Modal';
import { useToast } from '../components/common/Toast';
import { researchHoursService } from '../services/researchHoursService';
import { useAuth } from '../contexts/AuthContext';
import { Role } from '../types';

interface HoursData {
  id: number; userId: number; academicYear: string;
  publicationPoints: number; projectPoints: number; reviewPoints: number;
  supervisionPoints: number; otherPoints: number; totalPoints: number;
  requiredPoints: number; status: string;
  completion: string; percentage: number;
  details?: {
    publications: { title: string; journal?: string; points: number }[];
    projects: { title: string; level: string; points: number }[];
    reviews: number;
    reviewPointsPerReview: number;
  };
}

interface Journal {
  id: number; name: string; issn?: string; publisher?: string;
  category?: string; quartile?: string; impactFactor?: number;
  points: number; country?: string;
}

export default function ResearchHoursPage() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole(Role.ADMIN);
  const { error: showError, success: showSuccess } = useToast();

  const [hours, setHours] = useState<HoursData | null>(null);
  const [summary, setSummary] = useState<any>(null);
  const [journals, setJournals] = useState<Journal[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(getCurrentYear());
  const [tab, setTab] = useState<'my' | 'summary' | 'journals'>('my');
  const [journalSearch, setJournalSearch] = useState('');
  const [journalCategory, setJournalCategory] = useState('');

  const [showAddJournal, setShowAddJournal] = useState(false);
  const [jForm, setJForm] = useState({ name: '', issn: '', publisher: '', category: 'Scopus', quartile: 'Q1', impactFactor: '', points: '', country: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { loadData(); }, [year, tab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (tab === 'my') {
        setHours(await researchHoursService.getMyHours(year));
      } else if (tab === 'summary' && isAdmin) {
        setSummary(await researchHoursService.getSummary(year));
      } else if (tab === 'journals') {
        setJournals(await researchHoursService.getJournals(journalSearch || undefined, journalCategory || undefined));
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  const searchJournals = async () => {
    setLoading(true);
    try { setJournals(await researchHoursService.getJournals(journalSearch || undefined, journalCategory || undefined)); } catch { /* */ }
    setLoading(false);
  };

  const handleAddJournal = async () => {
    setSubmitting(true);
    try {
      await researchHoursService.createJournal({
        name: jForm.name, issn: jForm.issn || undefined, publisher: jForm.publisher || undefined,
        category: jForm.category, quartile: jForm.quartile || undefined,
        impactFactor: jForm.impactFactor ? +jForm.impactFactor : undefined,
        points: +jForm.points, country: jForm.country || undefined,
      });
      setShowAddJournal(false);
      setJForm({ name: '', issn: '', publisher: '', category: 'Scopus', quartile: 'Q1', impactFactor: '', points: '', country: '' });
      showSuccess('Đã thêm tạp chí vào danh mục');
      searchJournals();
    } catch (e: any) { showError(e.response?.data?.message || 'Thêm tạp chí thất bại'); }
    setSubmitting(false);
  };

  const pct = hours?.percentage || 0;
  const isCompleted = pct >= 100;

  return (
    <div className="rh">
      {/* Hero */}
      <section className="rh-hero">
        <div className="rh-hero-left">
          <h1>Quy đổi Giờ chuẩn NCKH</h1>
          <p>Tự động tính toán và quy đổi điểm nghiên cứu khoa học theo quy định Hội đồng Giáo sư Nhà nước</p>
          <div className="rh-year-select">
            <label>Năm học:</label>
            <select value={year} onChange={e => setYear(e.target.value)}>
              {getYearOptions().map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
        {hours && (
          <div className="rh-hero-ring">
            <svg viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,.2)" strokeWidth="2.5" />
              <circle cx="18" cy="18" r="15.9" fill="none" stroke={isCompleted ? '#10b981' : '#f59e0b'} strokeWidth="2.5"
                strokeDasharray={`${Math.min(pct, 100)} ${100 - Math.min(pct, 100)}`} strokeLinecap="round" transform="rotate(-90 18 18)" />
            </svg>
            <div className="rh-ring-center">
              <span>{pct.toFixed(0)}%</span>
              <small>{isCompleted ? 'Đạt' : 'Thiếu'}</small>
            </div>
          </div>
        )}
      </section>

      {/* Tabs */}
      <div className="rh-tabs">
        <button className={`rh-tab ${tab === 'my' ? 'active' : ''}`} onClick={() => setTab('my')}><Clock size={15} /> Giờ chuẩn của tôi</button>
        {isAdmin && <button className={`rh-tab ${tab === 'summary' ? 'active' : ''}`} onClick={() => setTab('summary')}><BarChart3 size={15} /> Tổng hợp toàn trường</button>}
        <button className={`rh-tab ${tab === 'journals' ? 'active' : ''}`} onClick={() => setTab('journals')}><BookOpen size={15} /> Danh mục tạp chí</button>
      </div>

      {loading ? (
        <div className="rh-loading"><Loader2 size={32} className="rh-spin" color="var(--primary-indigo)" /></div>
      ) : tab === 'my' && hours ? (
        /* ─── MY HOURS ─── */
        <div>
          {/* Stats */}
          <div className="rh-stats">
            <div className="surface-card rh-stat"><div className="rh-stat-icon" style={{ background: '#2563eb12', color: '#2563eb' }}><Star size={20} /></div><div><span className="rh-stat-val">{hours.totalPoints.toFixed(1)}</span><span className="rh-stat-label">Tổng điểm</span></div></div>
            <div className="surface-card rh-stat"><div className="rh-stat-icon" style={{ background: '#10b98112', color: '#10b981' }}><CheckCircle size={20} /></div><div><span className="rh-stat-val">{hours.requiredPoints}</span><span className="rh-stat-label">Định mức</span></div></div>
            <div className="surface-card rh-stat"><div className="rh-stat-icon" style={{ background: '#3b82f612', color: '#3b82f6' }}><FileText size={20} /></div><div><span className="rh-stat-val">{hours.publicationPoints.toFixed(1)}</span><span className="rh-stat-label">Điểm công bố</span></div></div>
            <div className="surface-card rh-stat"><div className="rh-stat-icon" style={{ background: '#d9770612', color: '#d97706' }}><BookOpen size={20} /></div><div><span className="rh-stat-val">{hours.projectPoints.toFixed(1)}</span><span className="rh-stat-label">Điểm đề tài</span></div></div>
          </div>

          {/* Completion status */}
          <div className={`surface-card rh-completion ${isCompleted ? 'pass' : 'warn'}`}>
            {isCompleted ? <CheckCircle size={24} /> : <AlertTriangle size={24} />}
            <div>
              <strong>{hours.completion}</strong>
              <p>{hours.totalPoints.toFixed(1)} / {hours.requiredPoints} điểm — Năm học {hours.academicYear}</p>
            </div>
          </div>

          {/* Details */}
          <div className="rh-detail-grid">
            {/* Publications */}
            <div className="surface-card rh-detail-card">
              <h3><FileText size={16} /> Công bố khoa học ({hours.details?.publications.length || 0})</h3>
              {hours.details?.publications.length ? (
                <div className="rh-detail-list">
                  {hours.details.publications.map((p, i) => (
                    <div key={i} className="rh-detail-item">
                      <div><span className="rh-item-title">{p.title}</span>{p.journal && <span className="rh-item-sub">{p.journal}</span>}</div>
                      <span className="rh-item-pts">+{p.points.toFixed(1)}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="rh-muted">Chưa có công bố trong năm học này</p>}
            </div>

            {/* Projects */}
            <div className="surface-card rh-detail-card">
              <h3><BookOpen size={16} /> Đề tài NCKH ({hours.details?.projects.length || 0})</h3>
              {hours.details?.projects.length ? (
                <div className="rh-detail-list">
                  {hours.details.projects.map((p, i) => (
                    <div key={i} className="rh-detail-item">
                      <div><span className="rh-item-title">{p.title}</span><span className="rh-item-sub">{p.level}</span></div>
                      <span className="rh-item-pts">+{p.points.toFixed(0)}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="rh-muted">Chưa có đề tài trong năm học này</p>}
            </div>

            {/* Reviews */}
            <div className="surface-card rh-detail-card">
              <h3><Award size={16} /> Phản biện khoa học</h3>
              <div className="rh-review-summary">
                <span>Số lần phản biện: <strong>{hours.details?.reviews || 0}</strong></span>
                <span>Điểm/lần: <strong>{hours.details?.reviewPointsPerReview || 2}</strong></span>
                <span>Tổng: <strong>{hours.reviewPoints.toFixed(1)}</strong></span>
              </div>
            </div>
          </div>
        </div>
      ) : tab === 'summary' && summary ? (
        /* ─── SUMMARY ─── */
        <div>
          <div className="rh-stats">
            <div className="surface-card rh-stat"><Users size={20} color="#2563eb" /><div><span className="rh-stat-val">{summary.total}</span><span className="rh-stat-label">Tổng giảng viên</span></div></div>
            <div className="surface-card rh-stat"><CheckCircle size={20} color="#10b981" /><div><span className="rh-stat-val">{summary.completed}</span><span className="rh-stat-label">Đạt định mức</span></div></div>
            <div className="surface-card rh-stat"><AlertTriangle size={20} color="#f59e0b" /><div><span className="rh-stat-val">{summary.total - summary.completed}</span><span className="rh-stat-label">Chưa đạt</span></div></div>
            <div className="surface-card rh-stat"><TrendingUp size={20} color="#3b82f6" /><div><span className="rh-stat-val">{summary.avgPoints.toFixed(1)}</span><span className="rh-stat-label">Điểm TB</span></div></div>
          </div>

          {/* By Department */}
          {Object.keys(summary.byDepartment || {}).length > 0 && (
            <div className="surface-card rh-dept-card">
              <h3><Building2 size={16} /> Theo Khoa/Phòng</h3>
              <table className="rh-table">
                <thead><tr><th>Khoa</th><th>Số GV</th><th>Đạt</th><th>Tỷ lệ</th><th>Điểm TB</th></tr></thead>
                <tbody>
                  {Object.entries(summary.byDepartment).map(([dept, d]: [string, any]) => (
                    <tr key={dept}>
                      <td className="rh-td-dept">{dept}</td>
                      <td>{d.count}</td>
                      <td>{d.completed}</td>
                      <td><span className={`rh-rate ${d.count > 0 && d.completed / d.count >= 0.8 ? 'good' : 'warn'}`}>{d.count > 0 ? ((d.completed / d.count) * 100).toFixed(0) : 0}%</span></td>
                      <td>{d.avgPoints.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Ranking table */}
          <div className="surface-card rh-ranking-card">
            <h3><Star size={16} /> Bảng xếp hạng giờ chuẩn NCKH — {summary.academicYear}</h3>
            <table className="rh-table">
              <thead><tr><th>#</th><th>Giảng viên</th><th>Khoa</th><th>Công bố</th><th>Đề tài</th><th>Phản biện</th><th>Tổng</th><th>Trạng thái</th></tr></thead>
              <tbody>
                {summary.records?.map((r: any, i: number) => (
                  <tr key={r.id}>
                    <td className="rh-td-rank">{i + 1}</td>
                    <td className="rh-td-name">{r.user?.name || r.user?.email}</td>
                    <td className="rh-td-dept">{r.user?.department || '—'}</td>
                    <td>{r.publicationPoints.toFixed(1)}</td>
                    <td>{r.projectPoints.toFixed(1)}</td>
                    <td>{r.reviewPoints.toFixed(1)}</td>
                    <td className="rh-td-total">{r.totalPoints.toFixed(1)}</td>
                    <td><span className={`rh-status ${r.totalPoints >= r.requiredPoints ? 'pass' : 'fail'}`}>{r.totalPoints >= r.requiredPoints ? 'Đạt' : 'Thiếu'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(!summary.records || summary.records.length === 0) && <p className="rh-muted" style={{ padding: '2rem', textAlign: 'center' }}>Chưa có dữ liệu. Hãy tính giờ chuẩn cho từng giảng viên trước.</p>}
          </div>
        </div>
      ) : tab === 'journals' ? (
        /* ─── JOURNALS ─── */
        <div>
          <div className="rh-journal-toolbar">
            <div className="rh-journal-search">
              <Search size={16} />
              <input value={journalSearch} onChange={e => setJournalSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && searchJournals()} placeholder="Tìm tạp chí theo tên hoặc ISSN..." />
            </div>
            <select value={journalCategory} onChange={e => { setJournalCategory(e.target.value); }}>
              <option value="">Tất cả danh mục</option>
              <option value="Scopus">Scopus</option>
              <option value="HDGSNN">HĐGSNN</option>
              <option value="Trong nước">Trong nước</option>
            </select>
            <button className="rh-search-btn" onClick={searchJournals}>Tìm</button>
            {isAdmin && <button className="rh-add-btn" onClick={() => setShowAddJournal(true)}><Plus size={14} /> Thêm tạp chí</button>}
          </div>

          <div className="surface-card rh-journal-card">
            <table className="rh-table">
              <thead><tr><th>Tên tạp chí</th><th>ISSN</th><th>Danh mục</th><th>Quartile</th><th>IF</th><th>Điểm QĐ</th><th>NXB</th></tr></thead>
              <tbody>
                {journals.map(j => (
                  <tr key={j.id}>
                    <td className="rh-td-name">{j.name}</td>
                    <td className="rh-td-issn">{j.issn || '—'}</td>
                    <td><span className={`rh-cat ${(j.category || '').toLowerCase().replace(/\s/g, '-')}`}>{j.category}</span></td>
                    <td>{j.quartile ? <span className={`rh-q rh-${j.quartile?.toLowerCase()}`}>{j.quartile}</span> : '—'}</td>
                    <td>{j.impactFactor?.toFixed(1) || '—'}</td>
                    <td className="rh-td-pts">{j.points.toFixed(1)}</td>
                    <td className="rh-td-pub">{j.publisher || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {journals.length === 0 && <p className="rh-muted" style={{ padding: '2rem', textAlign: 'center' }}>Không tìm thấy tạp chí nào</p>}
          </div>
        </div>
      ) : null}

      {/* Add Journal Modal */}
      <Modal open={showAddJournal} onClose={() => setShowAddJournal(false)} title="Thêm tạp chí vào danh mục" subtitle="Bổ sung tạp chí mới theo Danh mục HĐGSNN / Scopus" width={680}
        footer={<>
          <button className="g-btn secondary" onClick={() => setShowAddJournal(false)}>Hủy</button>
          <button className="g-btn primary" onClick={handleAddJournal} disabled={submitting || !jForm.name || !jForm.points}>
            {submitting ? <Loader2 size={14} className="rh-spin" /> : <Plus size={14} />} Thêm tạp chí
          </button>
        </>}>
        <div className="g-form-grid">
          <div className="g-field full"><label>Tên tạp chí *</label><input value={jForm.name} onChange={e => setJForm({ ...jForm, name: e.target.value })} placeholder="VD: IEEE Access" /></div>
          <div className="g-field"><label>ISSN</label><input value={jForm.issn} onChange={e => setJForm({ ...jForm, issn: e.target.value })} placeholder="2169-3536" /></div>
          <div className="g-field"><label>Nhà xuất bản</label><input value={jForm.publisher} onChange={e => setJForm({ ...jForm, publisher: e.target.value })} placeholder="IEEE" /></div>
          <div className="g-field"><label>Danh mục</label>
            <select value={jForm.category} onChange={e => setJForm({ ...jForm, category: e.target.value })}>
              <option value="Scopus">Scopus</option><option value="HDGSNN">HĐGSNN</option><option value="Trong nước">Trong nước</option>
            </select>
          </div>
          <div className="g-field"><label>Quartile</label>
            <select value={jForm.quartile} onChange={e => setJForm({ ...jForm, quartile: e.target.value })}>
              <option value="">— Không —</option><option value="Q1">Q1</option><option value="Q2">Q2</option><option value="Q3">Q3</option><option value="Q4">Q4</option><option value="ESCI">ESCI</option>
            </select>
          </div>
          <div className="g-field"><label>Impact Factor</label><input type="number" step="0.01" value={jForm.impactFactor} onChange={e => setJForm({ ...jForm, impactFactor: e.target.value })} placeholder="3.476" /></div>
          <div className="g-field"><label>Điểm quy đổi *</label><input type="number" step="0.1" value={jForm.points} onChange={e => setJForm({ ...jForm, points: e.target.value })} placeholder="1.5" /></div>
          <div className="g-field"><label>Quốc gia</label><input value={jForm.country} onChange={e => setJForm({ ...jForm, country: e.target.value })} placeholder="USA" /></div>
        </div>
      </Modal>

      <style>{rhStyles}</style>
    </div>
  );
}

function getCurrentYear(): string {
  const now = new Date();
  const y = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  return `${y}-${y + 1}`;
}

function getYearOptions(): string[] {
  const now = new Date().getFullYear();
  return Array.from({ length: 5 }, (_, i) => `${now - i}-${now - i + 1}`);
}

const rhStyles = `
  .rh{display:flex;flex-direction:column;gap:1.25rem;padding-bottom:3rem}
  .rh-loading{display:flex;justify-content:center;padding:4rem}

  .rh-hero{background:linear-gradient(135deg,#1e3a8a 0%,#1e40af 40%,#2563eb 100%);border-radius:20px;padding:2.5rem;color:#fff;display:flex;justify-content:space-between;align-items:center}
  .rh-hero-left h1{font-size:1.75rem;font-weight:800;color:#fff;margin-bottom:.375rem}
  .rh-hero-left p{font-size:.9rem;opacity:.85;max-width:500px;line-height:1.5;margin-bottom:1rem}
  .rh-year-select{display:flex;align-items:center;gap:8px}
  .rh-year-select label{font-size:.85rem;font-weight:700;opacity:.8}
  .rh-year-select select{background:rgba(255,255,255,.15);border:1.5px solid rgba(255,255,255,.3);border-radius:8px;padding:8px 12px;color:#fff;font-weight:700;font-size:.85rem;cursor:pointer}
  .rh-year-select select option{color:#1e40af}
  .rh-hero-ring{position:relative;width:130px;height:130px;flex-shrink:0}
  .rh-hero-ring svg{width:100%;height:100%}
  .rh-ring-center{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center}
  .rh-ring-center span{display:block;font-size:1.75rem;font-weight:800}
  .rh-ring-center small{font-size:.65rem;opacity:.7;font-weight:600}

  .rh-tabs{display:flex;gap:4px;background:var(--surface-low);padding:4px;border-radius:12px;width:fit-content}
  .rh-tab{display:flex;align-items:center;gap:6px;padding:.625rem 1.25rem;border-radius:8px;border:none;background:transparent;font-weight:700;font-size:.8125rem;cursor:pointer;color:var(--on-surface-muted);transition:all .15s;white-space:nowrap}
  .rh-tab.active{background:#fff;color:var(--primary-indigo);box-shadow:0 2px 8px rgba(0,0,0,.06)}

  .rh-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:1rem;margin-bottom:1rem}
  .rh-stat{display:flex;align-items:center;gap:1rem}
  .rh-stat-icon{width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
  .rh-stat-val{font-size:1.5rem;font-weight:800;display:block;line-height:1}
  .rh-stat-label{font-size:.75rem;color:var(--on-surface-muted)}

  .rh-completion{display:flex;align-items:center;gap:1rem;padding:1.25rem 1.5rem!important;margin-bottom:1rem}
  .rh-completion.pass{background:#d1fae5;color:#065f46}
  .rh-completion.warn{background:#fef3c7;color:#92400e}
  .rh-completion strong{display:block;font-size:1rem}
  .rh-completion p{font-size:.8125rem;opacity:.8;margin-top:2px}

  .rh-detail-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem}
  .rh-detail-card{padding:1.25rem!important}
  .rh-detail-card h3{display:flex;align-items:center;gap:6px;font-size:.85rem;font-weight:700;margin-bottom:.75rem}
  .rh-detail-list{display:flex;flex-direction:column;gap:.5rem}
  .rh-detail-item{display:flex;justify-content:space-between;align-items:flex-start;gap:.75rem;padding:.5rem 0;border-bottom:1px solid var(--surface-variant)}
  .rh-detail-item:last-child{border:none}
  .rh-item-title{font-size:.8rem;font-weight:600;display:block;line-height:1.3}
  .rh-item-sub{font-size:.7rem;color:var(--on-surface-muted)}
  .rh-item-pts{font-weight:800;font-size:.85rem;color:var(--primary-indigo);white-space:nowrap}
  .rh-review-summary{display:flex;flex-direction:column;gap:.5rem;font-size:.85rem}
  .rh-review-summary strong{color:var(--primary-indigo)}
  .rh-muted{color:var(--on-surface-muted);font-size:.8125rem}

  /* Summary */
  .rh-dept-card,.rh-ranking-card,.rh-journal-card{padding:0!important;overflow:hidden;margin-bottom:1rem}
  .rh-dept-card h3,.rh-ranking-card h3{display:flex;align-items:center;gap:6px;font-size:.9rem;font-weight:700;padding:1.25rem 1.5rem .75rem}
  .rh-table{width:100%;border-collapse:collapse}
  .rh-table th{text-align:left;padding:.625rem 1rem;font-size:.65rem;font-weight:800;color:var(--on-surface-muted);text-transform:uppercase;letter-spacing:.05em;background:var(--surface-low)}
  .rh-table td{padding:.75rem 1rem;font-size:.8rem;border-bottom:1px solid var(--surface-variant)}
  .rh-table tbody tr:hover{background:var(--surface-low)}
  .rh-td-rank{font-weight:800;color:var(--primary-indigo);width:40px}
  .rh-td-name{font-weight:600;max-width:250px}
  .rh-td-dept{color:var(--on-surface-muted);font-size:.75rem}
  .rh-td-total{font-weight:800;color:var(--primary-indigo)}
  .rh-td-pts{font-weight:800;color:var(--primary-violet)}
  .rh-td-issn{font-family:monospace;font-size:.75rem;color:var(--on-surface-muted)}
  .rh-td-pub{font-size:.75rem;color:var(--on-surface-muted)}
  .rh-status{padding:3px 8px;border-radius:6px;font-size:.65rem;font-weight:700}
  .rh-status.pass{background:#d1fae5;color:#059669}
  .rh-status.fail{background:#fee2e2;color:#dc2626}
  .rh-rate{font-weight:700;font-size:.8rem}
  .rh-rate.good{color:#059669}
  .rh-rate.warn{color:#d97706}

  /* Journals */
  .rh-journal-toolbar{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
  .rh-journal-search{flex:1;display:flex;align-items:center;gap:8px;background:var(--surface-lowest);border:1.5px solid var(--surface-variant);border-radius:10px;padding:0 12px}
  .rh-journal-search input{flex:1;border:none;outline:none;padding:10px 0;font-size:.85rem;background:transparent}
  .rh-journal-toolbar select{padding:10px 12px;border:1.5px solid var(--surface-variant);border-radius:10px;font-size:.8rem;font-weight:600;background:var(--surface-lowest);cursor:pointer}
  .rh-search-btn{background:var(--primary-indigo);color:#fff;border:none;padding:10px 18px;border-radius:10px;font-weight:700;font-size:.8rem;cursor:pointer}
  .rh-add-btn{background:var(--signature-gradient);color:#fff;border:none;padding:10px 18px;border-radius:10px;font-weight:700;font-size:.8rem;cursor:pointer;display:flex;align-items:center;gap:5px}
  .rh-cat{padding:2px 8px;border-radius:4px;font-size:.65rem;font-weight:700}
  .rh-cat.scopus{background:#dbeafe;color:#2563eb}
  .rh-cat.hdgsnn,.rh-cat.hđgsnn{background:#fef3c7;color:#d97706}
  .rh-cat.trong-nước{background:#d1fae5;color:#059669}
  .rh-q{padding:2px 6px;border-radius:4px;font-size:.65rem;font-weight:800}
  .rh-q1{background:#dc262615;color:#dc2626}
  .rh-q2{background:#f59e0b15;color:#d97706}
  .rh-q3{background:#3b82f615;color:#2563eb}
  .rh-q4{background:#94a3b815;color:#64748b}

  .rh-spin{animation:rh-spin 1s linear infinite}
  @keyframes rh-spin{to{transform:rotate(360deg)}}

  @media(max-width:1024px){.rh-stats{grid-template-columns:repeat(2,1fr)}.rh-detail-grid{grid-template-columns:1fr}.rh-hero{flex-direction:column;text-align:center}.rh-hero-ring{margin-top:1rem}}
`;
