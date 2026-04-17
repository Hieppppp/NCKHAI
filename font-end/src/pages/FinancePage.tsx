import { useState, useEffect } from 'react';
import {
  DollarSign, TrendingUp, Award, Briefcase, FileText, Banknote, Medal, ScrollText,
  ChevronRight, ArrowUpRight, Plus, Loader2, CheckCircle, XCircle, Clock,
} from 'lucide-react';
import { Modal } from '../components/common/Modal';
import { financeService } from '../services/financeService';
import { workService } from '../services/workService';
import { userService } from '../services/userService';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/common/Toast';
import { Role } from '../types';

interface Stats { totalBudget: number; totalDisbursed: number; activeProjects: number; totalRewards: number; byDepartment: { department: string | null; _sum: { totalAmount: number; disbursedAmount: number } }[]; }
interface Transaction { id: number; amount: number; type: string; description?: string; status: string; budget?: { name: string; department?: string }; work?: { id: number; title: string; authors: string }; approvedBy?: { name: string }; createdAt: string; }
interface Reward { id: number; title: string; type: string; amount?: number; period?: string; status: string; user?: { id: number; name: string }; work?: { title: string }; }

const TYPE_ICONS: Record<string, typeof Banknote> = { CASH: Banknote, CERTIFICATE: Medal, LETTER: ScrollText };
const TYPE_LABELS: Record<string, string> = { CASH: 'Tiền mặt', CERTIFICATE: 'Bằng khen', LETTER: 'Giấy khen' };
const TX_TYPE_LABELS: Record<string, string> = { DISBURSEMENT: 'Giải ngân', ALLOCATION: 'Phân bổ', REFUND: 'Hoàn trả' };
const STATUS_COLORS: Record<string, string> = { PENDING: '#f59e0b', APPROVED: '#3b82f6', COMPLETED: '#10b981', REJECTED: '#ef4444', AWARDED: '#8b5cf6' };
const STATUS_LABELS: Record<string, string> = { PENDING: 'Chờ duyệt', APPROVED: 'Đã duyệt', COMPLETED: 'Hoàn thành', REJECTED: 'Từ chối', AWARDED: 'Đã trao' };

function formatVND(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(3).replace(/\.?0+$/, '') + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
  return n.toLocaleString('vi-VN');
}

export default function FinancePage() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole(Role.ADMIN);
  const { error: showError, success: showSuccess } = useToast();

  const [stats, setStats] = useState<Stats | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [disbursements, setDisbursements] = useState<Transaction[]>([]);
  const [featuredPubs, setFeaturedPubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showTxModal, setShowTxModal] = useState(false);
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [budgetsList, setBudgetsList] = useState<{ id: number; name: string }[]>([]);
  const [worksList, setWorksList] = useState<{ id: number; title: string }[]>([]);
  const [usersList, setUsersList] = useState<{ id: number; name: string }[]>([]);

  const [budgetForm, setBudgetForm] = useState({ name: '', totalAmount: '', fiscalYear: new Date().getFullYear().toString(), department: '' });
  const [txForm, setTxForm] = useState({ amount: '', type: 'DISBURSEMENT', description: '', budgetId: '', workId: '' });
  const [rewardForm, setRewardForm] = useState({ title: '', type: 'CASH', amount: '', period: '', userId: '', workId: '' });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [s, t, r, d, p] = await Promise.all([
        financeService.getStats(), financeService.getTransactions({ limit: 10 }),
        financeService.getRewards({ limit: 10 }), financeService.getDisbursementProgress(),
        financeService.getFeaturedPublications(),
      ]);
      setStats(s); setTransactions(t.data || []); setRewards(r.data || []);
      setDisbursements(d || []); setFeaturedPubs(p || []);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const loadDropdownData = async () => {
    try {
      const [b, w, u] = await Promise.all([financeService.getBudgets({}), workService.getAll({ page: '1', limit: '100' }), userService.getAll(1, 100)]);
      setBudgetsList((b || []).map((x: any) => ({ id: x.id, name: x.name })));
      setWorksList(((w.data || w) || []).map((x: any) => ({ id: x.id, title: x.title })));
      setUsersList(((u.data || u) || []).map((x: any) => ({ id: x.id, name: x.name || x.email })));
    } catch { /* ignore */ }
  };

  const handleCreateBudget = async () => { setSubmitting(true); try { await financeService.createBudget({ name: budgetForm.name, totalAmount: +budgetForm.totalAmount, fiscalYear: +budgetForm.fiscalYear, department: budgetForm.department || undefined }); setShowBudgetModal(false); setBudgetForm({ name: '', totalAmount: '', fiscalYear: new Date().getFullYear().toString(), department: '' }); showSuccess('Tạo ngân sách thành công'); loadData(); } catch (e: any) { showError(e.response?.data?.message || 'Thao tác thất bại'); } setSubmitting(false); };
  const handleCreateTx = async () => { setSubmitting(true); try { await financeService.createTransaction({ amount: +txForm.amount, type: txForm.type, description: txForm.description || undefined, budgetId: +txForm.budgetId, workId: txForm.workId ? +txForm.workId : undefined }); setShowTxModal(false); setTxForm({ amount: '', type: 'DISBURSEMENT', description: '', budgetId: '', workId: '' }); loadData(); } catch (e: any) { showError(e.response?.data?.message || 'Thao tác thất bại'); } setSubmitting(false); };
  const handleCreateReward = async () => { setSubmitting(true); try { await financeService.createReward({ title: rewardForm.title, type: rewardForm.type, amount: rewardForm.amount ? +rewardForm.amount : undefined, period: rewardForm.period || undefined, userId: +rewardForm.userId, workId: rewardForm.workId ? +rewardForm.workId : undefined }); setShowRewardModal(false); setRewardForm({ title: '', type: 'CASH', amount: '', period: '', userId: '', workId: '' }); loadData(); } catch (e: any) { showError(e.response?.data?.message || 'Thao tác thất bại'); } setSubmitting(false); };
  const updateTxStatus = async (id: number, status: string) => { try { await financeService.updateTransactionStatus(id, status); loadData(); } catch { showError('Thao tác thất bại'); } };
  const updateRewardStatus = async (id: number, status: string) => { try { await financeService.updateRewardStatus(id, status); loadData(); } catch { showError('Thao tác thất bại'); } };

  if (loading) return <div className="fin-loading"><Loader2 size={36} className="fin-spin" color="var(--primary-indigo)" /></div>;

  const totalBudget = stats?.totalBudget || 0;
  const totalDisbursed = stats?.totalDisbursed || 0;
  const disbPct = totalBudget > 0 ? ((totalDisbursed / totalBudget) * 100).toFixed(0) : '0';
  const depts = stats?.byDepartment?.filter(d => d.department) || [];
  const deptTotal = depts.reduce((s, d) => s + (d._sum.totalAmount || 0), 0);
  const COLORS = ['#4f46e5', '#475569', '#2563eb', '#0891b2', '#059669', '#d97706'];

  return (
    <div className="fin">
      {/* Hero */}
      <section className="fin-hero">
        <div className="fin-hero-left">
          <h1>Quản lý Kinh phí & Khen thưởng</h1>
          <p>Tổng ngân sách <strong>{formatVND(totalBudget)}</strong> VNĐ — đã giải ngân <strong>{disbPct}%</strong></p>
          {isAdmin && (
            <div className="fin-hero-actions">
              <button className="fin-btn-hero primary" onClick={() => setShowBudgetModal(true)}><Plus size={15} /> Tạo ngân sách</button>
              <button className="fin-btn-hero secondary" onClick={() => { loadDropdownData(); setShowTxModal(true); }}><Plus size={15} /> Giao dịch mới</button>
              <button className="fin-btn-hero secondary" onClick={() => { loadDropdownData(); setShowRewardModal(true); }}><Award size={15} /> Khen thưởng</button>
            </div>
          )}
        </div>
        <div className="fin-hero-ring">
          <svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,.2)" strokeWidth="2.5" /><circle cx="18" cy="18" r="15.9" fill="none" stroke="#10b981" strokeWidth="2.5" strokeDasharray={`${disbPct} ${100 - +disbPct}`} strokeLinecap="round" transform="rotate(-90 18 18)" /></svg>
          <div className="fin-ring-center"><span>{disbPct}%</span><small>Giải ngân</small></div>
        </div>
      </section>

      {/* Stats */}
      <div className="fin-stats">
        <StatCard icon={DollarSign} label="Tổng ngân sách" value={formatVND(totalBudget)} color="#4f46e5" sub={`${depts.length} khoa/phòng`} />
        <StatCard icon={TrendingUp} label="Đã giải ngân" value={formatVND(totalDisbursed)} color="#16a34a" sub={`${disbPct}% tổng ngân sách`} />
        <StatCard icon={Briefcase} label="Đề tài đang thực hiện" value={String(stats?.activeProjects || 0)} color="#d97706" sub="đang nghiên cứu" />
        <StatCard icon={Award} label="Khen thưởng" value={formatVND(stats?.totalRewards || 0)} color="#db2777" sub={`${rewards.length} quyết định`} />
      </div>

      <div className="fin-grid">
        <div className="fin-left">
          {/* Donut */}
          <div className="surface-card fin-card">
            <h3 className="fin-card-head">Phân bổ ngân sách theo Khoa</h3>
            <div className="fin-donut-row">
              <div className="fin-donut">
                <svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="15.9" fill="none" stroke="#f1f5f9" strokeWidth="3" />
                  {depts.length > 0 ? (() => { let off = 0; return depts.map((d, i) => { const p = deptTotal > 0 ? ((d._sum.totalAmount || 0) / deptTotal) * 100 : 0; const el = <circle key={i} cx="18" cy="18" r="15.9" fill="none" stroke={COLORS[i % COLORS.length]} strokeWidth="3" strokeDasharray={`${p} ${100 - p}`} strokeDashoffset={-off} strokeLinecap="round" />; off += p; return el; }); })() : null}
                </svg>
                <div className="fin-donut-center"><span>{disbPct}%</span><small>Giải ngân</small></div>
              </div>
              <div className="fin-legend">
                {depts.map((d, i) => (
                  <div key={i} className="fin-legend-item"><span className="fin-legend-dot" style={{ background: COLORS[i % COLORS.length] }} /><span className="fin-legend-name">{d.department}</span><strong>{formatVND(d._sum.totalAmount || 0)}</strong></div>
                ))}
                {depts.length === 0 && <p className="fin-muted">Chưa có dữ liệu</p>}
              </div>
            </div>
          </div>

          {/* Rewards */}
          <div className="surface-card fin-card">
            <h3 className="fin-card-head">Quyết định Khen thưởng</h3>
            {rewards.length > 0 ? <div className="fin-reward-list">{rewards.map(r => { const Icon = TYPE_ICONS[r.type] || Award; const sc = STATUS_COLORS[r.status]; return (
              <div key={r.id} className="fin-reward-item">
                <div className="fin-reward-icon"><Icon size={18} /></div>
                <div className="fin-reward-info"><span className="fin-reward-title">{r.title}</span><span className="fin-reward-sub">{TYPE_LABELS[r.type]} {r.user ? `— ${r.user.name}` : ''} {r.amount ? `— ${formatVND(r.amount)}` : ''}</span></div>
                <div className="fin-reward-actions">
                  <span className="fin-status" style={{ background: `${sc}15`, color: sc }}>{STATUS_LABELS[r.status]}</span>
                  {isAdmin && r.status === 'PENDING' && <button className="fin-act approve" onClick={() => updateRewardStatus(r.id, 'APPROVED')}><CheckCircle size={15} /></button>}
                  {isAdmin && r.status === 'APPROVED' && <button className="fin-act award" onClick={() => updateRewardStatus(r.id, 'AWARDED')}><Award size={15} /></button>}
                </div>
              </div>
            ); })}</div> : <p className="fin-muted">Chưa có quyết định khen thưởng</p>}
          </div>

          {/* Transactions */}
          <div className="surface-card fin-card fin-table-card">
            <h3 className="fin-card-head" style={{ padding: '0 1.5rem' }}>Giao dịch & Giải ngân</h3>
            {transactions.length > 0 ? <table className="fin-table"><thead><tr><th>Đề tài / Mô tả</th><th>Loại</th><th>Số tiền</th><th>Ngày</th><th>Trạng thái</th>{isAdmin && <th>Thao tác</th>}</tr></thead><tbody>
              {transactions.map(tx => { const sc = STATUS_COLORS[tx.status]; return (
                <tr key={tx.id}>
                  <td className="fin-td-title">{tx.work?.title || tx.description || '—'}</td>
                  <td><span className="fin-type-chip">{TX_TYPE_LABELS[tx.type] || tx.type}</span></td>
                  <td className="fin-td-amount">{formatVND(tx.amount)}</td>
                  <td className="fin-td-date">{new Date(tx.createdAt).toLocaleDateString('vi-VN')}</td>
                  <td><span className="fin-status" style={{ background: `${sc}15`, color: sc }}>{STATUS_LABELS[tx.status]}</span></td>
                  {isAdmin && <td><div className="fin-act-group">
                    {tx.status === 'PENDING' && <><button className="fin-act approve" title="Duyệt" onClick={() => updateTxStatus(tx.id, 'APPROVED')}><CheckCircle size={14} /></button><button className="fin-act reject" title="Từ chối" onClick={() => updateTxStatus(tx.id, 'REJECTED')}><XCircle size={14} /></button></>}
                    {tx.status === 'APPROVED' && <button className="fin-act approve" title="Hoàn thành" onClick={() => updateTxStatus(tx.id, 'COMPLETED')}><CheckCircle size={14} /></button>}
                  </div></td>}
                </tr>
              ); })}
            </tbody></table> : <p className="fin-muted" style={{ padding: '1.5rem' }}>Chưa có giao dịch</p>}
          </div>
        </div>

        <div className="fin-right">
          {/* Disbursement progress */}
          <div className="surface-card fin-card">
            <h3 className="fin-card-head">Tiến độ giải ngân</h3>
            <div className="fin-progress"><div className="fin-progress-bar"><div className="fin-progress-fill" style={{ width: `${disbPct}%` }} /></div><div className="fin-progress-labels"><span>{disbPct}%</span><span>{formatVND(totalDisbursed)} / {formatVND(totalBudget)}</span></div></div>
            {disbursements.length > 0 ? <div className="fin-disb-list">{disbursements.map(d => (
              <div key={d.id} className="fin-disb-item"><div><span className="fin-disb-desc">{d.work?.title || d.description || 'Giải ngân'}</span><span className="fin-disb-date">{new Date(d.createdAt).toLocaleDateString('vi-VN')}</span></div><span className="fin-disb-amount">{formatVND(d.amount)}</span></div>
            ))}</div> : <p className="fin-muted">Chưa có giải ngân</p>}
          </div>

          {/* Status summary */}
          <div className="surface-card fin-card">
            <h3 className="fin-card-head">Tình trạng xử lý</h3>
            <div className="fin-status-summary">
              <div className="fin-ss-row" style={{ background: '#fef3c7' }}><Clock size={14} color="#d97706" /><span>Chờ duyệt</span><strong style={{ color: '#d97706' }}>{transactions.filter(t => t.status === 'PENDING').length + rewards.filter(r => r.status === 'PENDING').length}</strong></div>
              <div className="fin-ss-row" style={{ background: '#dbeafe' }}><CheckCircle size={14} color="#2563eb" /><span>Đã duyệt</span><strong style={{ color: '#2563eb' }}>{transactions.filter(t => t.status === 'APPROVED').length + rewards.filter(r => r.status === 'APPROVED').length}</strong></div>
              <div className="fin-ss-row" style={{ background: '#d1fae5' }}><CheckCircle size={14} color="#059669" /><span>Hoàn thành</span><strong style={{ color: '#059669' }}>{transactions.filter(t => t.status === 'COMPLETED').length + rewards.filter(r => r.status === 'AWARDED').length}</strong></div>
            </div>
          </div>
        </div>
      </div>

      {/* Featured */}
      {featuredPubs.length > 0 && (
        <section className="fin-featured">
          <div className="fin-featured-head"><h3>Công bố khoa học tiêu biểu</h3><a href="/publications">Xem tất cả <ChevronRight size={14} /></a></div>
          <div className="fin-featured-grid">{featuredPubs.map(pub => (
            <article key={pub.id} className="surface-card fin-pub-card">
              <div className="fin-pub-img"><FileText size={28} color="#94a3b8" /></div>
              <h4>{pub.title?.slice(0, 55)}{pub.title?.length > 55 ? '...' : ''}</h4>
              <span className="fin-pub-author">{pub.user?.name || pub.authors}</span>
              <ArrowUpRight size={14} className="fin-pub-arrow" />
            </article>
          ))}</div>
        </section>
      )}

      {/* Budget Modal */}
      <Modal open={showBudgetModal} onClose={() => setShowBudgetModal(false)} title="Tạo Ngân sách mới" subtitle="Thêm nguồn ngân sách cho khoa/phòng" width={580}
        footer={<><button className="g-btn secondary" onClick={() => setShowBudgetModal(false)}>Hủy</button><button className="g-btn primary" onClick={handleCreateBudget} disabled={submitting || !budgetForm.name || !budgetForm.totalAmount}>{submitting ? <Loader2 size={14} className="fin-spin" /> : <Plus size={14} />} Tạo</button></>}>
        <div className="g-form-grid">
          <div className="g-field full"><label>Tên ngân sách *</label><input value={budgetForm.name} onChange={e => setBudgetForm({ ...budgetForm, name: e.target.value })} placeholder="VD: Ngân sách NCKH 2024" /></div>
          <div className="g-field"><label>Tổng số tiền (VNĐ) *</label><input type="number" value={budgetForm.totalAmount} onChange={e => setBudgetForm({ ...budgetForm, totalAmount: e.target.value })} placeholder="1000000000" /></div>
          <div className="g-field"><label>Năm tài chính *</label><input type="number" value={budgetForm.fiscalYear} onChange={e => setBudgetForm({ ...budgetForm, fiscalYear: e.target.value })} /></div>
          <div className="g-field full"><label>Khoa / Phòng ban</label><input value={budgetForm.department} onChange={e => setBudgetForm({ ...budgetForm, department: e.target.value })} placeholder="VD: Khoa CNTT" /></div>
        </div>
      </Modal>

      {/* Transaction Modal */}
      <Modal open={showTxModal} onClose={() => setShowTxModal(false)} title="Tạo Giao dịch mới" subtitle="Tạo phân bổ, giải ngân hoặc hoàn trả" width={620}
        footer={<><button className="g-btn secondary" onClick={() => setShowTxModal(false)}>Hủy</button><button className="g-btn primary" onClick={handleCreateTx} disabled={submitting || !txForm.amount || !txForm.budgetId}>{submitting ? <Loader2 size={14} className="fin-spin" /> : <Plus size={14} />} Tạo</button></>}>
        <div className="g-form-grid">
          <div className="g-field"><label>Số tiền (VNĐ) *</label><input type="number" value={txForm.amount} onChange={e => setTxForm({ ...txForm, amount: e.target.value })} /></div>
          <div className="g-field"><label>Loại giao dịch</label><select value={txForm.type} onChange={e => setTxForm({ ...txForm, type: e.target.value })}><option value="DISBURSEMENT">Giải ngân</option><option value="ALLOCATION">Phân bổ</option><option value="REFUND">Hoàn trả</option></select></div>
          <div className="g-field"><label>Ngân sách *</label><select value={txForm.budgetId} onChange={e => setTxForm({ ...txForm, budgetId: e.target.value })}><option value="">— Chọn ngân sách —</option>{budgetsList.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
          <div className="g-field"><label>Đề tài</label><select value={txForm.workId} onChange={e => setTxForm({ ...txForm, workId: e.target.value })}><option value="">— Không chọn —</option>{worksList.map(w => <option key={w.id} value={w.id}>{w.title}</option>)}</select></div>
          <div className="g-field full"><label>Mô tả</label><textarea value={txForm.description} onChange={e => setTxForm({ ...txForm, description: e.target.value })} placeholder="Mô tả giao dịch..." rows={2} /></div>
        </div>
      </Modal>

      {/* Reward Modal */}
      <Modal open={showRewardModal} onClose={() => setShowRewardModal(false)} title="Tạo Khen thưởng" subtitle="Khen thưởng cá nhân / đề tài xuất sắc" width={640}
        footer={<><button className="g-btn secondary" onClick={() => setShowRewardModal(false)}>Hủy</button><button className="g-btn primary" onClick={handleCreateReward} disabled={submitting || !rewardForm.title || !rewardForm.userId}>{submitting ? <Loader2 size={14} className="fin-spin" /> : <Award size={14} />} Tạo</button></>}>
        <div className="g-form-grid">
          <div className="g-field"><label>Tiêu đề *</label><input value={rewardForm.title} onChange={e => setRewardForm({ ...rewardForm, title: e.target.value })} placeholder="VD: Khen thưởng đề tài xuất sắc" /></div>
          <div className="g-field"><label>Hình thức</label><select value={rewardForm.type} onChange={e => setRewardForm({ ...rewardForm, type: e.target.value })}><option value="CASH">Tiền mặt</option><option value="CERTIFICATE">Bằng khen</option><option value="LETTER">Giấy khen</option></select></div>
          <div className="g-field"><label>Số tiền (VNĐ)</label><input type="number" value={rewardForm.amount} onChange={e => setRewardForm({ ...rewardForm, amount: e.target.value })} /></div>
          <div className="g-field"><label>Kỳ khen thưởng</label><input value={rewardForm.period} onChange={e => setRewardForm({ ...rewardForm, period: e.target.value })} placeholder="VD: HK1 2024-2025" /></div>
          <div className="g-field"><label>Người nhận *</label><select value={rewardForm.userId} onChange={e => setRewardForm({ ...rewardForm, userId: e.target.value })}><option value="">— Chọn người nhận —</option>{usersList.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select></div>
          <div className="g-field"><label>Đề tài</label><select value={rewardForm.workId} onChange={e => setRewardForm({ ...rewardForm, workId: e.target.value })}><option value="">— Không chọn —</option>{worksList.map(w => <option key={w.id} value={w.id}>{w.title}</option>)}</select></div>
        </div>
      </Modal>

      <style>{finStyles}</style>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, sub }: { icon: typeof DollarSign; label: string; value: string; color: string; sub?: string }) {
  return (
    <div className="surface-card fin-stat">
      <div className="fin-stat-icon" style={{ background: `${color}12`, color }}><Icon size={22} /></div>
      <div><span className="fin-stat-val" style={{ color }}>{value}</span><span className="fin-stat-label">{label}</span>{sub && <span className="fin-stat-sub">{sub}</span>}</div>
    </div>
  );
}

const finStyles = `
  .fin{display:flex;flex-direction:column;gap:1.5rem;padding-bottom:3rem}
  .fin-loading{display:flex;justify-content:center;padding:80px}

  .fin-hero{background:linear-gradient(135deg,#0f172a 0%,#1e293b 40%,#334155 100%);border-radius:20px;padding:2.5rem;color:#fff;display:flex;justify-content:space-between;align-items:center}
  .fin-hero-left h1{font-size:1.75rem;font-weight:800;color:#fff;margin-bottom:.375rem}
  .fin-hero-left p{font-size:.9rem;opacity:.85;margin-bottom:1.25rem}
  .fin-hero-left strong{color:#cbd5e1}
  .fin-hero-actions{display:flex;gap:8px;flex-wrap:wrap}
  .fin-btn-hero{display:flex;align-items:center;gap:6px;padding:9px 16px;border-radius:10px;font-weight:700;font-size:.8rem;cursor:pointer;border:none}
  .fin-btn-hero.primary{background:#fff;color:#0f172a}
  .fin-btn-hero.secondary{background:rgba(255,255,255,.12);color:#fff;border:1.5px solid rgba(255,255,255,.2)}
  .fin-hero-ring{position:relative;width:120px;height:120px;flex-shrink:0}
  .fin-hero-ring svg{width:100%;height:100%}
  .fin-ring-center{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center}
  .fin-ring-center span{display:block;font-size:1.5rem;font-weight:800}
  .fin-ring-center small{font-size:.6rem;opacity:.7}

  .fin-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:1rem}
  .fin-stat{display:flex;align-items:center;gap:1rem}
  .fin-stat-icon{width:48px;height:48px;border-radius:14px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
  .fin-stat-val{font-size:1.5rem;font-weight:800;display:block;line-height:1}
  .fin-stat-label{font-size:.8rem;color:var(--on-surface-muted)}
  .fin-stat-sub{font-size:.65rem;color:var(--on-surface-variant)}

  .fin-grid{display:grid;grid-template-columns:1fr 340px;gap:1.5rem;align-items:start}
  .fin-left,.fin-right{display:flex;flex-direction:column;gap:1.5rem}
  .fin-card{padding:1.5rem}
  .fin-card-head{font-size:.9375rem;font-weight:700;margin-bottom:1rem}
  .fin-muted{color:var(--on-surface-muted);font-size:.85rem}

  .fin-donut-row{display:flex;gap:2rem;align-items:center}
  .fin-donut{position:relative;width:160px;height:160px;flex-shrink:0}
  .fin-donut svg{width:100%;height:100%;transform:rotate(-90deg)}
  .fin-donut-center{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center}
  .fin-donut-center span{font-size:1.25rem;font-weight:800;display:block}
  .fin-donut-center small{font-size:.6rem;color:var(--on-surface-muted)}
  .fin-legend{display:flex;flex-direction:column;gap:.5rem}
  .fin-legend-item{display:flex;align-items:center;gap:.5rem;font-size:.8rem}
  .fin-legend-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0}
  .fin-legend-name{flex:1}
  .fin-legend-item strong{font-weight:700}

  .fin-reward-list{display:flex;flex-direction:column;gap:.5rem}
  .fin-reward-item{display:flex;align-items:center;gap:.75rem;padding:.75rem;background:var(--surface-low);border-radius:10px}
  .fin-reward-icon{width:36px;height:36px;border-radius:8px;background:#eef2ff;display:flex;align-items:center;justify-content:center;color:var(--primary-indigo);flex-shrink:0}
  .fin-reward-info{flex:1;min-width:0}
  .fin-reward-title{font-weight:700;font-size:.85rem;display:block}
  .fin-reward-sub{font-size:.7rem;color:var(--on-surface-muted)}
  .fin-reward-actions{display:flex;align-items:center;gap:4px}
  .fin-status{padding:3px 8px;border-radius:6px;font-size:.65rem;font-weight:700;white-space:nowrap}
  .fin-act{width:28px;height:28px;border:none;border-radius:6px;cursor:pointer;display:flex;align-items:center;justify-content:center}
  .fin-act.approve{background:#d1fae5;color:#059669}
  .fin-act.reject{background:#fee2e2;color:#dc2626}
  .fin-act.award{background:#ede9fe;color:#475569}
  .fin-act-group{display:flex;gap:3px}

  .fin-table-card{padding:0!important;overflow:hidden}
  .fin-table-card .fin-card-head{padding-top:1.25rem}
  .fin-table{width:100%;border-collapse:collapse}
  .fin-table th{text-align:left;padding:.625rem 1rem;font-size:.65rem;font-weight:800;color:var(--on-surface-muted);text-transform:uppercase;letter-spacing:.05em;background:var(--surface-low)}
  .fin-table td{padding:.75rem 1rem;font-size:.8rem;border-bottom:1px solid var(--surface-variant)}
  .fin-table tbody tr:hover{background:var(--surface-low)}
  .fin-td-title{font-weight:600;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .fin-td-amount{font-weight:700;color:var(--primary-indigo)}
  .fin-td-date{font-size:.7rem;color:var(--on-surface-muted)}
  .fin-type-chip{padding:2px 6px;border-radius:4px;font-size:.65rem;font-weight:600;background:var(--surface-low);color:var(--on-surface-muted)}

  .fin-progress{margin-bottom:1rem}
  .fin-progress-bar{height:8px;background:var(--surface-low);border-radius:100px;overflow:hidden}
  .fin-progress-fill{height:100%;background:var(--signature-gradient);border-radius:100px;transition:width .6s}
  .fin-progress-labels{display:flex;justify-content:space-between;margin-top:.375rem;font-size:.7rem;color:var(--on-surface-muted);font-weight:600}
  .fin-disb-list{display:flex;flex-direction:column;gap:.5rem}
  .fin-disb-item{display:flex;justify-content:space-between;align-items:center;padding:.75rem;background:var(--surface-low);border-radius:10px}
  .fin-disb-desc{font-weight:600;font-size:.8rem;display:block}
  .fin-disb-date{font-size:.65rem;color:var(--on-surface-muted)}
  .fin-disb-amount{font-weight:800;font-size:.9rem;color:var(--primary-indigo)}

  .fin-status-summary{display:flex;flex-direction:column;gap:.5rem}
  .fin-ss-row{display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:8px;font-size:.8rem}
  .fin-ss-row span{flex:1}
  .fin-ss-row strong{font-weight:800}

  .fin-featured-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem}
  .fin-featured-head h3{font-size:.9375rem;font-weight:700}
  .fin-featured-head a{color:var(--primary-indigo);font-weight:700;font-size:.8rem;display:flex;align-items:center;gap:4px;text-decoration:none}
  .fin-featured-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:1rem}
  .fin-pub-card{padding:1rem!important;display:flex;flex-direction:column;gap:.5rem;position:relative;cursor:pointer;transition:transform .15s}
  .fin-pub-card:hover{transform:translateY(-2px)}
  .fin-pub-img{height:80px;background:linear-gradient(135deg,#667eea,#764ba2);border-radius:10px;display:flex;align-items:center;justify-content:center}
  .fin-pub-card h4{font-size:.8rem;font-weight:700;line-height:1.4}
  .fin-pub-author{font-size:.7rem;color:var(--on-surface-muted)}
  .fin-pub-arrow{position:absolute;top:1rem;right:1rem;color:var(--on-surface-muted)}

  .fin-spin{animation:fin-spin 1s linear infinite}
  @keyframes fin-spin{to{transform:rotate(360deg)}}

  @media(max-width:1200px){.fin-stats{grid-template-columns:repeat(2,1fr)}.fin-grid{grid-template-columns:1fr}.fin-featured-grid{grid-template-columns:repeat(2,1fr)}}
  @media(max-width:640px){.fin-hero{flex-direction:column;text-align:center}.fin-hero-ring{margin-top:1rem}}
`;
