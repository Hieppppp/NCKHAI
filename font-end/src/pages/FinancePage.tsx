import { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  Award,
  Briefcase,
  FileText,
  Banknote,
  Medal,
  ScrollText,
  ChevronRight,
  ArrowUpRight,
  Plus,
  X,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Shield,
  BarChart3,
} from 'lucide-react';
import { financeService } from '../services/financeService';
import { workService } from '../services/workService';
import { userService } from '../services/userService';
import { useAuth } from '../contexts/AuthContext';
import { Role } from '../types';

interface Stats {
  totalBudget: number;
  totalDisbursed: number;
  activeProjects: number;
  totalRewards: number;
  byDepartment: { department: string | null; _sum: { totalAmount: number; disbursedAmount: number } }[];
}

interface Transaction {
  id: number;
  amount: number;
  type: string;
  description?: string;
  status: string;
  budget?: { name: string; department?: string };
  work?: { id: number; title: string; authors: string };
  approvedBy?: { name: string };
  createdAt: string;
}

interface Reward {
  id: number;
  title: string;
  type: string;
  amount?: number;
  period?: string;
  status: string;
  user?: { id: number; name: string };
  work?: { title: string };
}

interface Publication {
  id: number;
  title: string;
  authors: string;
  user?: { name: string };
  createdAt: string;
}

const TYPE_ICONS: Record<string, typeof Banknote> = { CASH: Banknote, CERTIFICATE: Medal, LETTER: ScrollText };
const TYPE_LABELS: Record<string, string> = { CASH: 'Tiền mặt', CERTIFICATE: 'Bằng khen', LETTER: 'Giấy khen' };
const STATUS_COLORS: Record<string, string> = { PENDING: '#f59e0b', APPROVED: '#3b82f6', COMPLETED: '#10b981', REJECTED: '#ef4444', AWARDED: '#8b5cf6' };
const STATUS_LABELS: Record<string, string> = { PENDING: 'Chờ duyệt', APPROVED: 'Đã duyệt', COMPLETED: 'Hoàn thành', REJECTED: 'Từ chối', AWARDED: 'Đã trao' };
const STATUS_BG: Record<string, string> = { PENDING: '#fef3c7', APPROVED: '#dbeafe', COMPLETED: '#d1fae5', REJECTED: '#fee2e2', AWARDED: '#ede9fe' };

function formatVND(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(3).replace(/\.?0+$/, '') + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
  return n.toLocaleString('vi-VN');
}

export default function FinancePage() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole(Role.ADMIN);

  const [stats, setStats] = useState<Stats | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [disbursements, setDisbursements] = useState<Transaction[]>([]);
  const [featuredPubs, setFeaturedPubs] = useState<Publication[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Dropdown data
  const [budgetsList, setBudgetsList] = useState<{ id: number; name: string }[]>([]);
  const [worksList, setWorksList] = useState<{ id: number; title: string }[]>([]);
  const [usersList, setUsersList] = useState<{ id: number; name: string }[]>([]);

  const loadDropdownData = async () => {
    try {
      const [b, w, u] = await Promise.all([
        financeService.getBudgets({}),
        workService.getAll({ page: '1', limit: '100' }),
        userService.getAll(1, 100),
      ]);
      setBudgetsList((b || []).map((x: any) => ({ id: x.id, name: x.name })));
      setWorksList(((w.data || w) || []).map((x: any) => ({ id: x.id, title: x.title })));
      setUsersList(((u.data || u) || []).map((x: any) => ({ id: x.id, name: x.name || x.email })));
    } catch { /* ignore */ }
  };

  // Budget form
  const [budgetForm, setBudgetForm] = useState({ name: '', totalAmount: '', fiscalYear: new Date().getFullYear().toString(), department: '' });
  // Transaction form
  const [txForm, setTxForm] = useState({ amount: '', type: 'DISBURSEMENT', description: '', budgetId: '', workId: '' });
  // Reward form
  const [rewardForm, setRewardForm] = useState({ title: '', type: 'CASH', amount: '', period: '', userId: '', workId: '' });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [s, t, r, d, p] = await Promise.all([
        financeService.getStats(),
        financeService.getTransactions({ limit: 10 }),
        financeService.getRewards({ limit: 10 }),
        financeService.getDisbursementProgress(),
        financeService.getFeaturedPublications(),
      ]);
      setStats(s);
      setTransactions(t.data || []);
      setRewards(r.data || []);
      setDisbursements(d || []);
      setFeaturedPubs(p || []);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const handleCreateBudget = async () => {
    setSubmitting(true);
    try {
      await financeService.createBudget({
        name: budgetForm.name,
        totalAmount: +budgetForm.totalAmount,
        fiscalYear: +budgetForm.fiscalYear,
        department: budgetForm.department || undefined,
      });
      setShowBudgetModal(false);
      setBudgetForm({ name: '', totalAmount: '', fiscalYear: new Date().getFullYear().toString(), department: '' });
      loadData();
    } catch (err: any) { alert(err.response?.data?.message || 'Tạo ngân sách thất bại'); }
    setSubmitting(false);
  };

  const handleCreateTransaction = async () => {
    setSubmitting(true);
    try {
      await financeService.createTransaction({
        amount: +txForm.amount,
        type: txForm.type,
        description: txForm.description || undefined,
        budgetId: +txForm.budgetId,
        workId: txForm.workId ? +txForm.workId : undefined,
      });
      setShowTransactionModal(false);
      setTxForm({ amount: '', type: 'DISBURSEMENT', description: '', budgetId: '', workId: '' });
      loadData();
    } catch (err: any) { alert(err.response?.data?.message || 'Tạo giao dịch thất bại'); }
    setSubmitting(false);
  };

  const handleCreateReward = async () => {
    setSubmitting(true);
    try {
      await financeService.createReward({
        title: rewardForm.title,
        type: rewardForm.type,
        amount: rewardForm.amount ? +rewardForm.amount : undefined,
        period: rewardForm.period || undefined,
        userId: +rewardForm.userId,
        workId: rewardForm.workId ? +rewardForm.workId : undefined,
      });
      setShowRewardModal(false);
      setRewardForm({ title: '', type: 'CASH', amount: '', period: '', userId: '', workId: '' });
      loadData();
    } catch (err: any) { alert(err.response?.data?.message || 'Tạo khen thưởng thất bại'); }
    setSubmitting(false);
  };

  const handleUpdateTxStatus = async (id: number, status: string) => {
    try {
      await financeService.updateTransactionStatus(id, status);
      loadData();
    } catch (err: any) { alert(err.response?.data?.message || 'Cập nhật thất bại'); }
  };

  const handleUpdateRewardStatus = async (id: number, status: string) => {
    try {
      await financeService.updateRewardStatus(id, status);
      loadData();
    } catch (err: any) { alert(err.response?.data?.message || 'Cập nhật thất bại'); }
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Loader2 size={36} className="spin" color="var(--primary-indigo)" /></div>;
  }

  const totalBudget = stats?.totalBudget || 0;
  const totalDisbursed = stats?.totalDisbursed || 0;
  const disbursedPercent = totalBudget > 0 ? ((totalDisbursed / totalBudget) * 100).toFixed(0) : '0';
  const departments = stats?.byDepartment?.filter((d) => d.department) || [];
  const deptTotal = departments.reduce((s, d) => s + (d._sum.totalAmount || 0), 0);
  const DEPT_COLORS = ['#4f46e5', '#7c3aed', '#2563eb', '#0891b2', '#059669', '#d97706'];

  const pendingCount = transactions.filter(t => t.status === 'PENDING').length + rewards.filter(r => r.status === 'PENDING').length;
  const approvedCount = transactions.filter(t => t.status === 'APPROVED').length + rewards.filter(r => r.status === 'APPROVED').length;
  const completedCount = transactions.filter(t => t.status === 'COMPLETED').length + rewards.filter(r => r.status === 'AWARDED').length;

  return (
    <div className="fin">
      {/* ===== HERO BANNER ===== */}
      <section className="fin-hero">
        <div className="fin-hero-left">
          <div className="fin-hero-greeting">
            <h1>Quản ly Kinh phi & Khen thuong</h1>
            <span className="fin-hero-badge"><Shield size={12} /> Quan tri</span>
          </div>
          <p className="fin-hero-desc">
            Tong ngan sach <strong>{formatVND(totalBudget)}</strong> VND,
            da giai ngan <strong>{formatVND(totalDisbursed)}</strong> VND ({disbursedPercent}%).
            Hien co <strong>{stats?.activeProjects || 0}</strong> de tai dang thuc hien.
          </p>
          {isAdmin && (
            <div className="fin-hero-actions">
              <button className="btn-hero primary" onClick={() => setShowBudgetModal(true)}><Plus size={16} /> Tao ngan sach</button>
              <button className="btn-hero secondary" onClick={() => { loadDropdownData(); setShowTransactionModal(true); }}><DollarSign size={16} /> Giao dich moi</button>
              <button className="btn-hero secondary" onClick={() => { loadDropdownData(); setShowRewardModal(true); }}><Award size={16} /> Khen thuong</button>
            </div>
          )}
        </div>
        <div className="fin-hero-right">
          <div className="fin-ring-wrap">
            <svg viewBox="0 0 36 36" className="fin-ring-svg">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="2.5" />
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#10b981" strokeWidth="2.5"
                strokeDasharray={`${disbursedPercent} ${100 - Number(disbursedPercent)}`}
                strokeLinecap="round" transform="rotate(-90 18 18)" />
            </svg>
            <div className="fin-ring-center">
              <span className="fin-ring-pct">{disbursedPercent}%</span>
              <span className="fin-ring-label">Giai ngan</span>
            </div>
          </div>
        </div>
      </section>

      {/* ===== STATS CARDS ===== */}
      <section className="fin-stats-grid">
        <div className="surface-card fin-stat-card">
          <div className="fin-stat-icon" style={{ background: '#4f46e512', color: '#4f46e5' }}><DollarSign size={22} /></div>
          <div className="fin-stat-info">
            <span className="fin-stat-value" style={{ color: '#4f46e5' }}>{formatVND(totalBudget)}</span>
            <span className="fin-stat-label">Tong ngan sach</span>
            <span className="fin-stat-sub">Nam {new Date().getFullYear()}</span>
          </div>
        </div>
        <div className="surface-card fin-stat-card">
          <div className="fin-stat-icon" style={{ background: '#10b98112', color: '#10b981' }}><TrendingUp size={22} /></div>
          <div className="fin-stat-info">
            <span className="fin-stat-value" style={{ color: '#10b981' }}>{formatVND(totalDisbursed)}</span>
            <span className="fin-stat-label">Da giai ngan</span>
            <span className="fin-stat-sub">{disbursedPercent}% tong ngan sach</span>
          </div>
        </div>
        <div className="surface-card fin-stat-card">
          <div className="fin-stat-icon" style={{ background: '#f59e0b12', color: '#f59e0b' }}><Briefcase size={22} /></div>
          <div className="fin-stat-info">
            <span className="fin-stat-value" style={{ color: '#f59e0b' }}>{stats?.activeProjects || 0}</span>
            <span className="fin-stat-label">De tai dang thuc hien</span>
            <span className="fin-stat-sub">Can giai ngan</span>
          </div>
        </div>
        <div className="surface-card fin-stat-card">
          <div className="fin-stat-icon" style={{ background: '#8b5cf612', color: '#8b5cf6' }}><Award size={22} /></div>
          <div className="fin-stat-info">
            <span className="fin-stat-value" style={{ color: '#8b5cf6' }}>{formatVND(stats?.totalRewards || 0)}</span>
            <span className="fin-stat-label">Khen thuong</span>
            <span className="fin-stat-sub">{rewards.length} quyet dinh</span>
          </div>
        </div>
      </section>

      {/* ===== MAIN GRID ===== */}
      <div className="fin-grid">
        {/* Left Column */}
        <div className="fin-left">

          {/* Budget by Department Donut Chart */}
          <div className="surface-card">
            <div className="fin-card-head">
              <BarChart3 size={18} color="var(--primary-indigo)" />
              <h2>Phan bo Ngan sach theo Khoa</h2>
            </div>
            <div className="fin-donut-section">
              <div className="fin-donut-chart">
                <svg viewBox="0 0 36 36" className="fin-donut-svg">
                  <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#f1f5f9" strokeWidth="3" />
                  {departments.length > 0 ? (() => {
                    let off = 0;
                    return departments.map((d, i) => {
                      const pct = deptTotal > 0 ? ((d._sum.totalAmount || 0) / deptTotal) * 100 : 0;
                      const el = (
                        <circle key={i} cx="18" cy="18" r="15.9155" fill="none"
                          stroke={DEPT_COLORS[i % DEPT_COLORS.length]} strokeWidth="3"
                          strokeDasharray={`${pct} ${100 - pct}`} strokeDashoffset={-off}
                          strokeLinecap="round" />
                      );
                      off += pct;
                      return el;
                    });
                  })() : (
                    <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                  )}
                </svg>
                <div className="fin-donut-center">
                  <span className="fin-donut-pct">{disbursedPercent}%</span>
                  <span className="fin-donut-lbl">Giai ngan</span>
                </div>
              </div>
              <div className="fin-donut-legend">
                {departments.length > 0 ? departments.map((d, i) => (
                  <div key={i} className="fin-legend-item">
                    <span className="fin-legend-dot" style={{ background: DEPT_COLORS[i % DEPT_COLORS.length] }} />
                    <span className="fin-legend-name">{d.department || 'Khac'}</span>
                    <span className="fin-legend-val">{formatVND(d._sum.totalAmount || 0)}</span>
                  </div>
                )) : (
                  <p className="fin-empty">Chua co du lieu ngan sach</p>
                )}
              </div>
            </div>
          </div>

          {/* Rewards */}
          <div className="surface-card">
            <div className="fin-card-head">
              <Award size={18} color="#8b5cf6" />
              <h2>Quyet dinh Khen thuong</h2>
            </div>
            {rewards.length > 0 ? (
              <div className="fin-rewards-list">
                {rewards.map((r) => {
                  const Icon = TYPE_ICONS[r.type] || Award;
                  return (
                    <div key={r.id} className="fin-reward-item">
                      <div className="fin-reward-icon"><Icon size={18} /></div>
                      <div className="fin-reward-info">
                        <span className="fin-reward-title">{r.title}</span>
                        <span className="fin-reward-meta">
                          {TYPE_LABELS[r.type] || r.type}
                          {r.user ? ` \u2014 ${r.user.name}` : ''}
                          {r.amount ? ` \u2014 ${formatVND(r.amount)}` : ''}
                        </span>
                      </div>
                      <div className="fin-reward-actions">
                        <span className="fin-status-pill" style={{ background: STATUS_BG[r.status] || '#f1f5f9', color: STATUS_COLORS[r.status] || '#64748b' }}>
                          {STATUS_LABELS[r.status] || r.status}
                        </span>
                        {isAdmin && r.status === 'PENDING' && (
                          <button className="fin-btn-sm approve" title="Duyet" onClick={() => handleUpdateRewardStatus(r.id, 'APPROVED')}><CheckCircle size={15} /></button>
                        )}
                        {isAdmin && r.status === 'APPROVED' && (
                          <button className="fin-btn-sm award" title="Trao thuong" onClick={() => handleUpdateRewardStatus(r.id, 'AWARDED')}><Award size={15} /></button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="fin-empty">Chua co quyet dinh khen thuong</p>
            )}
          </div>

          {/* Transactions Table */}
          <div className="surface-card fin-table-card">
            <div className="fin-card-head">
              <DollarSign size={18} color="var(--primary-indigo)" />
              <h2>Giao dich & Giai ngan</h2>
            </div>
            {transactions.length > 0 ? (
              <div className="fin-table-wrap">
                <table className="fin-table">
                  <thead>
                    <tr>
                      <th>De tai / Mo ta</th>
                      <th>Loai</th>
                      <th>So tien</th>
                      <th>Trang thai</th>
                      {isAdmin && <th>Thao tac</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => (
                      <tr key={tx.id}>
                        <td className="fin-td-title">{tx.work?.title || tx.description || '\u2014'}</td>
                        <td>
                          <span className="fin-type-chip">
                            {tx.type === 'DISBURSEMENT' ? 'Giai ngan' : tx.type === 'ALLOCATION' ? 'Phan bo' : 'Hoan tra'}
                          </span>
                        </td>
                        <td className="fin-td-amount">{formatVND(tx.amount)}</td>
                        <td>
                          <span className="fin-status-pill" style={{ background: STATUS_BG[tx.status] || '#f1f5f9', color: STATUS_COLORS[tx.status] || '#64748b' }}>
                            {STATUS_LABELS[tx.status] || tx.status}
                          </span>
                        </td>
                        {isAdmin && (
                          <td>
                            <div className="fin-action-btns">
                              {tx.status === 'PENDING' && (
                                <>
                                  <button className="fin-btn-sm approve" title="Duyet" onClick={() => handleUpdateTxStatus(tx.id, 'APPROVED')}><CheckCircle size={14} /></button>
                                  <button className="fin-btn-sm reject" title="Tu choi" onClick={() => handleUpdateTxStatus(tx.id, 'REJECTED')}><XCircle size={14} /></button>
                                </>
                              )}
                              {tx.status === 'APPROVED' && (
                                <button className="fin-btn-sm complete" title="Hoan thanh" onClick={() => handleUpdateTxStatus(tx.id, 'COMPLETED')}><CheckCircle size={14} /></button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="fin-empty">Chua co giao dich</p>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="fin-right">

          {/* Disbursement Progress */}
          <div className="surface-card">
            <div className="fin-card-head">
              <TrendingUp size={16} color="#10b981" />
              <h3>Tien do Giai ngan</h3>
            </div>
            <div className="fin-progress-wrap">
              <div className="fin-progress-bar">
                <div className="fin-progress-fill" style={{ width: `${disbursedPercent}%` }} />
              </div>
              <div className="fin-progress-labels">
                <span>{disbursedPercent}% da giai ngan</span>
                <span>{formatVND(totalDisbursed)} / {formatVND(totalBudget)}</span>
              </div>
            </div>
            {disbursements.length > 0 ? (
              <div className="fin-disb-list">
                {disbursements.map((d) => (
                  <div key={d.id} className="fin-disb-item">
                    <div className="fin-disb-info">
                      <span className="fin-disb-desc">{d.work?.title || d.description || 'Giai ngan'}</span>
                      <span className="fin-disb-date">{new Date(d.createdAt).toLocaleDateString('vi-VN')}</span>
                    </div>
                    <span className="fin-disb-amount">{formatVND(d.amount)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="fin-empty">Chua co giai ngan</p>
            )}
          </div>

          {/* Processing Status */}
          <div className="surface-card">
            <div className="fin-card-head">
              <BarChart3 size={16} color="var(--primary-indigo)" />
              <h3>Tinh trang xu ly</h3>
            </div>
            <div className="fin-status-rows">
              <div className="fin-status-row" style={{ background: '#fef3c7' }}>
                <span className="fin-status-row-label"><Clock size={14} color="#d97706" /> Cho duyet</span>
                <span className="fin-status-row-count" style={{ color: '#d97706' }}>{pendingCount}</span>
              </div>
              <div className="fin-status-row" style={{ background: '#dbeafe' }}>
                <span className="fin-status-row-label"><CheckCircle size={14} color="#2563eb" /> Da duyet</span>
                <span className="fin-status-row-count" style={{ color: '#2563eb' }}>{approvedCount}</span>
              </div>
              <div className="fin-status-row" style={{ background: '#d1fae5' }}>
                <span className="fin-status-row-label"><CheckCircle size={14} color="#059669" /> Hoan thanh</span>
                <span className="fin-status-row-count" style={{ color: '#059669' }}>{completedCount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== FEATURED PUBLICATIONS ===== */}
      <section className="fin-featured">
        <div className="fin-featured-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={18} color="var(--primary-indigo)" />
            <h2>Cong bo Khoa hoc Tieu bieu</h2>
          </div>
          <a href="/publications" className="fin-see-all">Xem tat ca <ChevronRight size={14} /></a>
        </div>
        <div className="fin-featured-grid">
          {featuredPubs.length > 0 ? featuredPubs.map((pub) => (
            <article key={pub.id} className="surface-card fin-featured-card">
              <div className="fin-featured-img"><FileText size={28} color="#94a3b8" /></div>
              <div className="fin-featured-info">
                <h4>{pub.title.length > 60 ? pub.title.slice(0, 60) + '...' : pub.title}</h4>
                <span className="fin-featured-author">{pub.user?.name || pub.authors}</span>
              </div>
              <ArrowUpRight size={14} className="fin-featured-arrow" />
            </article>
          )) : (
            <p className="fin-empty" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem' }}>Chua co cong bo tieu bieu</p>
          )}
        </div>
      </section>

      {/* ===== MODALS ===== */}

      {/* Budget Modal */}
      {showBudgetModal && (
        <Modal title="Tao Ngan sach moi" onClose={() => setShowBudgetModal(false)}>
          <div className="fin-form-grid">
            <FormField label="Ten ngan sach *" value={budgetForm.name} onChange={v => setBudgetForm({ ...budgetForm, name: v })} placeholder="VD: Ngan sach NCKH 2024" />
            <FormField label="Tong so tien (VND) *" type="number" value={budgetForm.totalAmount} onChange={v => setBudgetForm({ ...budgetForm, totalAmount: v })} placeholder="1000000000" />
            <FormField label="Nam tai chinh *" type="number" value={budgetForm.fiscalYear} onChange={v => setBudgetForm({ ...budgetForm, fiscalYear: v })} />
            <FormField label="Khoa / Phong ban" value={budgetForm.department} onChange={v => setBudgetForm({ ...budgetForm, department: v })} placeholder="VD: Khoa CNTT" />
          </div>
          <div className="fin-modal-actions">
            <button className="fin-btn-cancel" onClick={() => setShowBudgetModal(false)}>Huy</button>
            <button className="fin-btn-submit" onClick={handleCreateBudget} disabled={submitting || !budgetForm.name || !budgetForm.totalAmount}>
              {submitting ? <Loader2 size={16} className="spin" /> : <Plus size={16} />} Tao
            </button>
          </div>
        </Modal>
      )}

      {/* Transaction Modal */}
      {showTransactionModal && (
        <Modal title="Tao Giao dich moi" onClose={() => setShowTransactionModal(false)}>
          <div className="fin-form-grid">
            <FormField label="So tien (VND) *" type="number" value={txForm.amount} onChange={v => setTxForm({ ...txForm, amount: v })} />
            <div className="fin-form-field">
              <label>Loai giao dich</label>
              <select value={txForm.type} onChange={e => setTxForm({ ...txForm, type: e.target.value })}>
                <option value="DISBURSEMENT">Giai ngan</option>
                <option value="ALLOCATION">Phan bo</option>
                <option value="REFUND">Hoan tra</option>
              </select>
            </div>
            <div className="fin-form-field">
              <label>Ngan sach *</label>
              <select value={txForm.budgetId} onChange={e => setTxForm({ ...txForm, budgetId: e.target.value })}>
                <option value="">-- Chon ngan sach --</option>
                {budgetsList.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div className="fin-form-field">
              <label>De tai (tuy chon)</label>
              <select value={txForm.workId} onChange={e => setTxForm({ ...txForm, workId: e.target.value })}>
                <option value="">-- Khong chon --</option>
                {worksList.map(w => <option key={w.id} value={w.id}>{w.title}</option>)}
              </select>
            </div>
            <div className="fin-form-field fin-full-width">
              <label>Mo ta</label>
              <textarea value={txForm.description} onChange={e => setTxForm({ ...txForm, description: e.target.value })} placeholder="Mo ta giao dich..." rows={2} />
            </div>
          </div>
          <div className="fin-modal-actions">
            <button className="fin-btn-cancel" onClick={() => setShowTransactionModal(false)}>Huy</button>
            <button className="fin-btn-submit" onClick={handleCreateTransaction} disabled={submitting || !txForm.amount || !txForm.budgetId}>
              {submitting ? <Loader2 size={16} className="spin" /> : <Plus size={16} />} Tao
            </button>
          </div>
        </Modal>
      )}

      {/* Reward Modal */}
      {showRewardModal && (
        <Modal title="Tao Khen thuong" onClose={() => setShowRewardModal(false)}>
          <div className="fin-form-grid">
            <FormField label="Tieu de *" value={rewardForm.title} onChange={v => setRewardForm({ ...rewardForm, title: v })} placeholder="VD: Khen thuong de tai xuat sac" />
            <div className="fin-form-field">
              <label>Hinh thuc</label>
              <select value={rewardForm.type} onChange={e => setRewardForm({ ...rewardForm, type: e.target.value })}>
                <option value="CASH">Tien mat</option>
                <option value="CERTIFICATE">Bang khen</option>
                <option value="LETTER">Giay khen</option>
              </select>
            </div>
            <FormField label="So tien (VND)" type="number" value={rewardForm.amount} onChange={v => setRewardForm({ ...rewardForm, amount: v })} />
            <FormField label="Ky khen thuong" value={rewardForm.period} onChange={v => setRewardForm({ ...rewardForm, period: v })} placeholder="VD: HK1 2024-2025" />
            <div className="fin-form-field">
              <label>Nguoi nhan *</label>
              <select value={rewardForm.userId} onChange={e => setRewardForm({ ...rewardForm, userId: e.target.value })}>
                <option value="">-- Chon nguoi nhan --</option>
                {usersList.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div className="fin-form-field">
              <label>De tai (tuy chon)</label>
              <select value={rewardForm.workId} onChange={e => setRewardForm({ ...rewardForm, workId: e.target.value })}>
                <option value="">-- Khong chon --</option>
                {worksList.map(w => <option key={w.id} value={w.id}>{w.title}</option>)}
              </select>
            </div>
          </div>
          <div className="fin-modal-actions">
            <button className="fin-btn-cancel" onClick={() => setShowRewardModal(false)}>Huy</button>
            <button className="fin-btn-submit" onClick={handleCreateReward} disabled={submitting || !rewardForm.title || !rewardForm.userId}>
              {submitting ? <Loader2 size={16} className="spin" /> : <Award size={16} />} Tao
            </button>
          </div>
        </Modal>
      )}

      <style>{finStyles}</style>
    </div>
  );
}

/* ===== Sub-components ===== */

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fin-overlay" onClick={onClose}>
      <div className="fin-modal" onClick={e => e.stopPropagation()}>
        <div className="fin-modal-header">
          <h2>{title}</h2>
          <button className="fin-modal-close" onClick={onClose}><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function FormField({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div className="fin-form-field">
      <label>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

/* ===== Styles (matching DashboardPage theme) ===== */

const finStyles = `
  .fin { display: flex; flex-direction: column; gap: 1.5rem; padding-bottom: 3rem; }

  /* Hero */
  .fin-hero {
    background: linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4338ca 100%);
    border-radius: 20px; padding: 2.5rem; display: flex; justify-content: space-between;
    align-items: center; color: white;
  }
  .fin-hero-left { flex: 1; }
  .fin-hero-greeting { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
  .fin-hero-greeting h1 { font-size: 1.75rem; font-weight: 800; color: white; }
  .fin-hero-badge {
    display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px;
    border-radius: 100px; background: rgba(255,255,255,0.15);
    font-size: 0.7rem; font-weight: 700;
  }
  .fin-hero-desc { font-size: 0.9rem; opacity: 0.85; line-height: 1.6; max-width: 520px; margin-bottom: 1.5rem; }
  .fin-hero-desc strong { color: #a5b4fc; font-weight: 800; }
  .fin-hero-actions { display: flex; gap: 8px; flex-wrap: wrap; }
  .btn-hero {
    display: flex; align-items: center; gap: 6px; padding: 10px 18px;
    border-radius: 10px; font-weight: 700; font-size: 0.8125rem;
    cursor: pointer; border: none; transition: transform 0.15s;
  }
  .btn-hero:hover { transform: translateY(-1px); }
  .btn-hero.primary { background: white; color: #1e1b4b; }
  .btn-hero.secondary { background: rgba(255,255,255,0.12); color: white; border: 1.5px solid rgba(255,255,255,0.2); }
  .fin-hero-right { flex-shrink: 0; margin-left: 2rem; }
  .fin-ring-wrap { position: relative; width: 140px; height: 140px; }
  .fin-ring-svg { width: 100%; height: 100%; }
  .fin-ring-center { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; }
  .fin-ring-pct { display: block; font-size: 1.75rem; font-weight: 800; }
  .fin-ring-label { font-size: 0.65rem; opacity: 0.7; font-weight: 600; }

  /* Stats Grid */
  .fin-stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; }
  .fin-stat-card { display: flex; align-items: center; gap: 1rem; transition: transform 0.15s; cursor: default; }
  .fin-stat-card:hover { transform: translateY(-2px); }
  .fin-stat-icon { width: 48px; height: 48px; border-radius: 14px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .fin-stat-info { display: flex; flex-direction: column; }
  .fin-stat-value { font-size: 1.75rem; font-weight: 800; display: block; line-height: 1; }
  .fin-stat-label { font-size: 0.8rem; font-weight: 600; color: var(--on-surface-muted); margin-top: 2px; }
  .fin-stat-sub { font-size: 0.65rem; color: var(--on-surface-variant); }

  /* Surface Card base (matches dashboard) */
  .surface-card {
    background: white; border-radius: 16px; padding: 1.5rem;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02);
  }

  /* Card Head */
  .fin-card-head { display: flex; align-items: center; gap: 8px; margin-bottom: 1.25rem; }
  .fin-card-head h2 { font-size: 0.9375rem; font-weight: 700; flex: 1; margin: 0; }
  .fin-card-head h3 { font-size: 0.9375rem; font-weight: 700; flex: 1; margin: 0; }

  /* Main Grid */
  .fin-grid { display: grid; grid-template-columns: 1fr 360px; gap: 1.5rem; align-items: start; }
  .fin-left, .fin-right { display: flex; flex-direction: column; gap: 1.5rem; }

  /* Donut Chart */
  .fin-donut-section { display: flex; gap: 2rem; align-items: center; }
  .fin-donut-chart { position: relative; width: 160px; height: 160px; flex-shrink: 0; }
  .fin-donut-svg { width: 100%; height: 100%; transform: rotate(-90deg); }
  .fin-donut-center { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; display: flex; flex-direction: column; }
  .fin-donut-pct { font-size: 1.5rem; font-weight: 800; color: var(--on-surface); }
  .fin-donut-lbl { font-size: 0.65rem; color: var(--on-surface-muted); font-weight: 600; }
  .fin-donut-legend { display: flex; flex-direction: column; gap: 0.625rem; }
  .fin-legend-item { display: flex; align-items: center; gap: 0.625rem; font-size: 0.8125rem; }
  .fin-legend-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
  .fin-legend-name { flex: 1; color: var(--on-surface); }
  .fin-legend-val { font-weight: 700; color: var(--on-surface); }

  /* Rewards */
  .fin-rewards-list { display: flex; flex-direction: column; gap: 0.625rem; }
  .fin-reward-item {
    display: flex; align-items: center; gap: 0.875rem; padding: 0.75rem 1rem;
    background: var(--surface-low, #f8fafc); border-radius: 12px;
    transition: background 0.15s;
  }
  .fin-reward-item:hover { background: #eef2ff; }
  .fin-reward-icon {
    width: 36px; height: 36px; border-radius: 10px; background: #eef2ff;
    display: flex; align-items: center; justify-content: center; color: #4f46e5; flex-shrink: 0;
  }
  .fin-reward-info { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .fin-reward-title { font-weight: 700; font-size: 0.8125rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .fin-reward-meta { font-size: 0.7rem; color: var(--on-surface-muted); }
  .fin-reward-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }

  /* Status Pills */
  .fin-status-pill {
    display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 100px;
    font-size: 0.7rem; font-weight: 700; white-space: nowrap;
  }

  /* Action Buttons */
  .fin-btn-sm {
    width: 28px; height: 28px; border: none; border-radius: 8px;
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    transition: transform 0.15s;
  }
  .fin-btn-sm:hover { transform: scale(1.1); }
  .fin-btn-sm.approve { background: #d1fae5; color: #059669; }
  .fin-btn-sm.reject { background: #fee2e2; color: #dc2626; }
  .fin-btn-sm.complete { background: #d1fae5; color: #059669; }
  .fin-btn-sm.award { background: #ede9fe; color: #7c3aed; }
  .fin-action-btns { display: flex; gap: 4px; }

  /* Table */
  .fin-table-card { padding: 1.5rem; }
  .fin-table-wrap { overflow-x: auto; }
  .fin-table { width: 100%; border-collapse: collapse; }
  .fin-table thead th {
    text-align: left; padding: 0.75rem 1rem; font-size: 0.7rem; font-weight: 800;
    color: var(--on-surface-muted); text-transform: uppercase; letter-spacing: 0.04em;
    background: var(--surface-low, #f8fafc); border-bottom: 2px solid #e2e8f0;
  }
  .fin-table thead th:first-child { border-radius: 8px 0 0 0; }
  .fin-table thead th:last-child { border-radius: 0 8px 0 0; }
  .fin-table tbody td {
    padding: 0.875rem 1rem; font-size: 0.8125rem; border-bottom: 1px solid #f1f5f9;
    vertical-align: middle;
  }
  .fin-table tbody tr { transition: background 0.15s; }
  .fin-table tbody tr:hover { background: #f8fafc; }
  .fin-td-title { font-weight: 600; max-width: 280px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .fin-td-amount { font-weight: 800; color: #4f46e5; }
  .fin-type-chip {
    display: inline-flex; padding: 2px 8px; border-radius: 6px;
    background: var(--surface-low, #f1f5f9); font-size: 0.7rem; font-weight: 700;
    color: var(--on-surface-muted);
  }

  /* Progress */
  .fin-progress-wrap { margin-bottom: 1.25rem; }
  .fin-progress-bar { height: 10px; background: #f1f5f9; border-radius: 100px; overflow: hidden; }
  .fin-progress-fill {
    height: 100%; border-radius: 100px; transition: width 0.6s ease;
    background: linear-gradient(135deg, #4f46e5, #7c3aed);
  }
  .fin-progress-labels {
    display: flex; justify-content: space-between; margin-top: 0.5rem;
    font-size: 0.7rem; color: var(--on-surface-muted); font-weight: 600;
  }

  /* Disbursement List */
  .fin-disb-list { display: flex; flex-direction: column; gap: 0.625rem; }
  .fin-disb-item {
    display: flex; justify-content: space-between; align-items: center;
    padding: 0.75rem 1rem; background: var(--surface-low, #f8fafc); border-radius: 10px;
    transition: background 0.15s;
  }
  .fin-disb-item:hover { background: #eef2ff; }
  .fin-disb-info { display: flex; flex-direction: column; gap: 2px; }
  .fin-disb-desc { font-weight: 600; font-size: 0.8125rem; }
  .fin-disb-date { font-size: 0.65rem; color: var(--on-surface-muted); }
  .fin-disb-amount { font-weight: 800; font-size: 0.9375rem; color: #4f46e5; }

  /* Processing Status Rows */
  .fin-status-rows { display: flex; flex-direction: column; gap: 8px; }
  .fin-status-row {
    display: flex; justify-content: space-between; align-items: center;
    padding: 10px 14px; border-radius: 10px;
  }
  .fin-status-row-label { display: flex; align-items: center; gap: 6px; font-size: 0.8125rem; font-weight: 600; }
  .fin-status-row-count { font-weight: 800; font-size: 1.125rem; }

  /* Featured Publications */
  .fin-featured { margin-top: 0.5rem; }
  .fin-featured-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
  .fin-featured-head h2 { font-size: 0.9375rem; font-weight: 700; margin: 0; }
  .fin-see-all {
    color: #4f46e5; font-weight: 700; font-size: 0.8125rem;
    display: flex; align-items: center; gap: 4px; text-decoration: none;
  }
  .fin-see-all:hover { text-decoration: underline; }
  .fin-featured-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; }
  .fin-featured-card {
    padding: 1.25rem !important; display: flex; flex-direction: column; gap: 0.875rem;
    position: relative; cursor: pointer; transition: transform 0.15s, box-shadow 0.15s;
  }
  .fin-featured-card:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,0.08); }
  .fin-featured-img {
    height: 90px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 12px; display: flex; align-items: center; justify-content: center;
  }
  .fin-featured-info h4 { font-size: 0.8125rem; font-weight: 700; line-height: 1.4; margin: 0; }
  .fin-featured-author { font-size: 0.65rem; color: var(--on-surface-muted); }
  .fin-featured-arrow { position: absolute; top: 1.25rem; right: 1.25rem; color: var(--on-surface-muted); }

  /* Empty */
  .fin-empty { color: var(--on-surface-muted); font-size: 0.8125rem; margin: 0; }

  /* Modal Overlay */
  .fin-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex;
    align-items: center; justify-content: center; z-index: 1000;
    backdrop-filter: blur(4px);
  }
  .fin-modal {
    width: 600px; max-height: 92vh; overflow-y: auto; padding: 1.5rem;
    border-radius: 20px; background: white; box-shadow: 0 24px 48px rgba(0,0,0,0.15);
  }
  .fin-modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
  .fin-modal-header h2 { font-size: 1.25rem; font-weight: 800; margin: 0; }
  .fin-modal-close {
    background: var(--surface-low, #f1f5f9); border: none; cursor: pointer;
    color: var(--on-surface-muted); width: 32px; height: 32px; border-radius: 8px;
    display: flex; align-items: center; justify-content: center; transition: background 0.15s;
  }
  .fin-modal-close:hover { background: #e2e8f0; }

  /* Form */
  .fin-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
  .fin-form-field { display: flex; flex-direction: column; gap: 0.375rem; }
  .fin-full-width { grid-column: 1 / -1; }
  .fin-form-field label { font-size: 0.7rem; font-weight: 700; color: var(--on-surface-muted); text-transform: uppercase; letter-spacing: 0.03em; }
  .fin-form-field input,
  .fin-form-field textarea,
  .fin-form-field select {
    padding: 0.625rem 0.75rem; border: 1.5px solid #e2e8f0; border-radius: 10px;
    font-size: 0.875rem; font-family: inherit; outline: none;
    background: white; transition: border-color 0.15s, box-shadow 0.15s;
  }
  .fin-form-field input:focus,
  .fin-form-field textarea:focus,
  .fin-form-field select:focus {
    border-color: #4f46e5; box-shadow: 0 0 0 3px rgba(79,70,229,0.1);
  }
  .fin-modal-actions { display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.5rem; }
  .fin-btn-cancel {
    background: white; border: 1.5px solid #e2e8f0; padding: 0.625rem 1.25rem;
    border-radius: 10px; font-weight: 700; cursor: pointer; font-size: 0.8125rem;
    transition: background 0.15s;
  }
  .fin-btn-cancel:hover { background: #f8fafc; }
  .fin-btn-submit {
    background: linear-gradient(135deg, #4f46e5, #7c3aed); color: white; border: none;
    padding: 0.625rem 1.5rem; border-radius: 10px; font-weight: 700; cursor: pointer;
    display: flex; align-items: center; gap: 0.5rem; font-size: 0.8125rem;
    transition: transform 0.15s, box-shadow 0.15s;
  }
  .fin-btn-submit:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(79,70,229,0.3); }
  .fin-btn-submit:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; }

  /* Spinner */
  .spin { animation: fin-spin 1s linear infinite; }
  @keyframes fin-spin { to { transform: rotate(360deg); } }

  /* Responsive */
  @media (max-width: 1200px) {
    .fin-stats-grid { grid-template-columns: repeat(2, 1fr); }
    .fin-grid { grid-template-columns: 1fr; }
    .fin-featured-grid { grid-template-columns: repeat(2, 1fr); }
  }
  @media (max-width: 640px) {
    .fin-hero { flex-direction: column; text-align: center; padding: 2rem 1.5rem; }
    .fin-hero-left { text-align: center; }
    .fin-hero-greeting { justify-content: center; flex-wrap: wrap; }
    .fin-hero-actions { justify-content: center; }
    .fin-hero-right { margin-left: 0; margin-top: 1.5rem; }
    .fin-stats-grid { grid-template-columns: 1fr; }
    .fin-featured-grid { grid-template-columns: 1fr; }
    .fin-donut-section { flex-direction: column; }
    .fin-form-grid { grid-template-columns: 1fr; }
    .fin-modal { width: calc(100vw - 2rem); }
  }
`;
