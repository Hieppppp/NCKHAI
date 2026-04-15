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
    return <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--on-surface-muted)' }}><Loader2 size={32} className="spin" /></div>;
  }

  const totalBudget = stats?.totalBudget || 0;
  const totalDisbursed = stats?.totalDisbursed || 0;
  const disbursedPercent = totalBudget > 0 ? ((totalDisbursed / totalBudget) * 100).toFixed(0) : 0;
  const departments = stats?.byDepartment?.filter((d) => d.department) || [];
  const deptTotal = departments.reduce((s, d) => s + (d._sum.totalAmount || 0), 0);
  const DEPT_COLORS = ['#4f46e5', '#7c3aed', '#2563eb', '#0891b2', '#059669', '#d97706'];

  return (
    <div className="finance-page">
      <header className="page-header">
        <div>
          <p className="breadcrumb">Quản trị &gt; Kinh phí & Khen thưởng</p>
          <h1>Quản lý Kinh phí & Khen thưởng</h1>
        </div>
        {isAdmin && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-action" onClick={() => { setShowBudgetModal(true); }}><Plus size={16} /> Tạo ngân sách</button>
            <button className="btn-action" onClick={() => { loadDropdownData(); setShowTransactionModal(true); }}><Plus size={16} /> Giao dịch mới</button>
            <button className="btn-action accent" onClick={() => { loadDropdownData(); setShowRewardModal(true); }}><Award size={16} /> Khen thưởng</button>
          </div>
        )}
      </header>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card"><div className="stat-icon" style={{ background: '#eef2ff' }}><DollarSign size={22} color="#4f46e5" /></div><div className="stat-info"><span className="stat-value">{formatVND(totalBudget)}</span><span className="stat-label">Tổng ngân sách</span></div></div>
        <div className="stat-card"><div className="stat-icon" style={{ background: '#f0fdf4' }}><TrendingUp size={22} color="#16a34a" /></div><div className="stat-info"><span className="stat-value">{formatVND(totalDisbursed)}</span><span className="stat-label">Đã giải ngân</span></div></div>
        <div className="stat-card"><div className="stat-icon" style={{ background: '#fef3c7' }}><Briefcase size={22} color="#d97706" /></div><div className="stat-info"><span className="stat-value">{stats?.activeProjects || 0}</span><span className="stat-label">Đề tài đang thực hiện</span></div></div>
        <div className="stat-card"><div className="stat-icon" style={{ background: '#fce7f3' }}><Award size={22} color="#db2777" /></div><div className="stat-info"><span className="stat-value">{formatVND(stats?.totalRewards || 0)}</span><span className="stat-label">Khen thưởng</span></div></div>
      </div>

      <div className="content-grid">
        <div className="left-col">
          {/* Budget by Department */}
          <section className="surface-card chart-card">
            <h3>Phân bổ Ngân sách theo Khoa</h3>
            <div className="donut-section">
              <div className="donut-chart">
                <svg viewBox="0 0 36 36" className="donut-svg">
                  <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#f1f5f9" strokeWidth="3" />
                  {departments.length > 0 ? (() => { let off = 0; return departments.map((d, i) => { const pct = deptTotal > 0 ? ((d._sum.totalAmount || 0) / deptTotal) * 100 : 0; const el = (<circle key={i} cx="18" cy="18" r="15.9155" fill="none" stroke={DEPT_COLORS[i % DEPT_COLORS.length]} strokeWidth="3" strokeDasharray={`${pct} ${100 - pct}`} strokeDashoffset={-off} strokeLinecap="round" />); off += pct; return el; }); })() : <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#e2e8f0" strokeWidth="3" />}
                </svg>
                <div className="donut-center"><span className="donut-pct">{disbursedPercent}%</span><span className="donut-label">Giải ngân</span></div>
              </div>
              <div className="donut-legend">
                {departments.length > 0 ? departments.map((d, i) => (
                  <div key={i} className="legend-item">
                    <span className="legend-dot" style={{ background: DEPT_COLORS[i % DEPT_COLORS.length] }} />
                    <span className="legend-name">{d.department || 'Khác'}</span>
                    <span className="legend-value">{formatVND(d._sum.totalAmount || 0)}</span>
                  </div>
                )) : <p style={{ color: 'var(--on-surface-muted)', fontSize: '0.875rem' }}>Chưa có dữ liệu ngân sách</p>}
              </div>
            </div>
          </section>

          {/* Rewards with actions */}
          <section className="surface-card rewards-card">
            <h3>Quyết định Khen thưởng</h3>
            {rewards.length > 0 ? (
              <div className="rewards-list">
                {rewards.map((r) => {
                  const Icon = TYPE_ICONS[r.type] || Award;
                  return (
                    <div key={r.id} className="reward-item">
                      <div className="reward-icon-wrap"><Icon size={20} /></div>
                      <div className="reward-info">
                        <span className="reward-title">{r.title}</span>
                        <span className="reward-type">{TYPE_LABELS[r.type] || r.type} {r.user ? `- ${r.user.name}` : ''} {r.amount ? `- ${formatVND(r.amount)}` : ''}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span className="reward-status" style={{ color: STATUS_COLORS[r.status] }}>
                          {STATUS_LABELS[r.status] || r.status}
                        </span>
                        {isAdmin && r.status === 'PENDING' && (
                          <>
                            <button className="btn-icon-sm approve" title="Duyệt" onClick={() => handleUpdateRewardStatus(r.id, 'APPROVED')}><CheckCircle size={16} /></button>
                          </>
                        )}
                        {isAdmin && r.status === 'APPROVED' && (
                          <button className="btn-icon-sm award" title="Trao thưởng" onClick={() => handleUpdateRewardStatus(r.id, 'AWARDED')}><Award size={16} /></button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : <p className="empty-text">Chưa có quyết định khen thưởng</p>}
          </section>

          {/* Transactions with approve/reject actions */}
          <section className="surface-card table-card">
            <h3>Giao dịch & Giải ngân</h3>
            {transactions.length > 0 ? (
              <table className="finance-table">
                <thead>
                  <tr>
                    <th>Đề tài / Mô tả</th>
                    <th>Loại</th>
                    <th>Số tiền</th>
                    <th>Trạng thái</th>
                    {isAdmin && <th>Thao tác</th>}
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id}>
                      <td>{tx.work?.title || tx.description || '—'}</td>
                      <td><span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '2px 6px', borderRadius: 4, background: 'var(--surface-low)' }}>{tx.type === 'DISBURSEMENT' ? 'Giải ngân' : tx.type === 'ALLOCATION' ? 'Phân bổ' : 'Hoàn trả'}</span></td>
                      <td className="amount">{formatVND(tx.amount)}</td>
                      <td>
                        <span className="status-dot" style={{ background: STATUS_COLORS[tx.status] }} />
                        {STATUS_LABELS[tx.status] || tx.status}
                      </td>
                      {isAdmin && (
                        <td>
                          {tx.status === 'PENDING' && (
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button className="btn-icon-sm approve" title="Duyệt" onClick={() => handleUpdateTxStatus(tx.id, 'APPROVED')}><CheckCircle size={14} /></button>
                              <button className="btn-icon-sm reject" title="Từ chối" onClick={() => handleUpdateTxStatus(tx.id, 'REJECTED')}><XCircle size={14} /></button>
                            </div>
                          )}
                          {tx.status === 'APPROVED' && (
                            <button className="btn-icon-sm complete" title="Hoàn thành" onClick={() => handleUpdateTxStatus(tx.id, 'COMPLETED')}><CheckCircle size={14} /></button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <p className="empty-text">Chưa có giao dịch</p>}
          </section>
        </div>

        <div className="right-col">
          {/* Disbursement Progress */}
          <section className="surface-card progress-card">
            <h3>Tiến độ Giải ngân</h3>
            <div className="progress-bar-wrap">
              <div className="progress-bar"><div className="progress-fill" style={{ width: `${disbursedPercent}%` }} /></div>
              <div className="progress-labels">
                <span>{disbursedPercent}% đã giải ngân</span>
                <span>{formatVND(totalDisbursed)} / {formatVND(totalBudget)}</span>
              </div>
            </div>
            {disbursements.length > 0 ? (
              <div className="disbursement-list">
                {disbursements.map((d) => (
                  <div key={d.id} className="disbursement-item">
                    <div className="disb-info"><span className="disb-desc">{d.work?.title || d.description || 'Giải ngân'}</span><span className="disb-date">{new Date(d.createdAt).toLocaleDateString('vi-VN')}</span></div>
                    <span className="disb-amount">{formatVND(d.amount)}</span>
                  </div>
                ))}
              </div>
            ) : <p className="empty-text">Chưa có giải ngân</p>}
          </section>

          {/* Quick stats */}
          <section className="surface-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: '1rem' }}>Tình trạng xử lý</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#fef3c7', borderRadius: 8 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8125rem', fontWeight: 600 }}><Clock size={14} color="#d97706" /> Chờ duyệt</span>
                <span style={{ fontWeight: 800, color: '#d97706' }}>{transactions.filter(t => t.status === 'PENDING').length + rewards.filter(r => r.status === 'PENDING').length}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#dbeafe', borderRadius: 8 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8125rem', fontWeight: 600 }}><CheckCircle size={14} color="#2563eb" /> Đã duyệt</span>
                <span style={{ fontWeight: 800, color: '#2563eb' }}>{transactions.filter(t => t.status === 'APPROVED').length + rewards.filter(r => r.status === 'APPROVED').length}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#d1fae5', borderRadius: 8 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8125rem', fontWeight: 600 }}><CheckCircle size={14} color="#059669" /> Hoàn thành</span>
                <span style={{ fontWeight: 800, color: '#059669' }}>{transactions.filter(t => t.status === 'COMPLETED').length + rewards.filter(r => r.status === 'AWARDED').length}</span>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Featured Publications */}
      <section className="featured-section">
        <div className="featured-header">
          <h3>Công bố Khoa học Tiêu biểu</h3>
          <a href="/publications" className="see-all">Xem tất cả <ChevronRight size={16} /></a>
        </div>
        <div className="featured-grid">
          {featuredPubs.length > 0 ? featuredPubs.map((pub) => (
            <article key={pub.id} className="featured-card surface-card">
              <div className="featured-img-placeholder"><FileText size={32} color="#94a3b8" /></div>
              <div className="featured-info"><h4>{pub.title.slice(0, 60)}{pub.title.length > 60 ? '...' : ''}</h4><span className="featured-author">{pub.user?.name || pub.authors}</span></div>
              <ArrowUpRight size={16} className="featured-arrow" />
            </article>
          )) : <p style={{ color: 'var(--on-surface-muted)', gridColumn: '1 / -1', textAlign: 'center', padding: '2rem' }}>Chưa có công bố tiêu biểu</p>}
        </div>
      </section>

      {/* Budget Modal */}
      {showBudgetModal && (
        <Modal title="Tạo Ngân sách mới" onClose={() => setShowBudgetModal(false)}>
          <div className="form-grid-modal">
            <FormField label="Tên ngân sách *" value={budgetForm.name} onChange={v => setBudgetForm({ ...budgetForm, name: v })} placeholder="VD: Ngân sách NCKH 2024" />
            <FormField label="Tổng số tiền (VNĐ) *" type="number" value={budgetForm.totalAmount} onChange={v => setBudgetForm({ ...budgetForm, totalAmount: v })} placeholder="1000000000" />
            <FormField label="Năm tài chính *" type="number" value={budgetForm.fiscalYear} onChange={v => setBudgetForm({ ...budgetForm, fiscalYear: v })} />
            <FormField label="Khoa / Phòng ban" value={budgetForm.department} onChange={v => setBudgetForm({ ...budgetForm, department: v })} placeholder="VD: Khoa CNTT" />
          </div>
          <div className="modal-actions">
            <button className="btn-secondary" onClick={() => setShowBudgetModal(false)}>Hủy</button>
            <button className="btn-primary" onClick={handleCreateBudget} disabled={submitting || !budgetForm.name || !budgetForm.totalAmount}>
              {submitting ? <Loader2 size={16} className="spin" /> : <Plus size={16} />} Tạo
            </button>
          </div>
        </Modal>
      )}

      {/* Transaction Modal */}
      {showTransactionModal && (
        <Modal title="Tạo Giao dịch mới" onClose={() => setShowTransactionModal(false)}>
          <div className="form-grid-modal">
            <FormField label="Số tiền (VNĐ) *" type="number" value={txForm.amount} onChange={v => setTxForm({ ...txForm, amount: v })} />
            <div className="form-field-modal">
              <label>Loại giao dịch</label>
              <select value={txForm.type} onChange={e => setTxForm({ ...txForm, type: e.target.value })}>
                <option value="DISBURSEMENT">Giải ngân</option>
                <option value="ALLOCATION">Phân bổ</option>
                <option value="REFUND">Hoàn trả</option>
              </select>
            </div>
            <div className="form-field-modal">
              <label>Ngân sách *</label>
              <select value={txForm.budgetId} onChange={e => setTxForm({ ...txForm, budgetId: e.target.value })}>
                <option value="">-- Chọn ngân sách --</option>
                {budgetsList.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div className="form-field-modal">
              <label>Đề tài (tùy chọn)</label>
              <select value={txForm.workId} onChange={e => setTxForm({ ...txForm, workId: e.target.value })}>
                <option value="">-- Không chọn --</option>
                {worksList.map(w => <option key={w.id} value={w.id}>{w.title}</option>)}
              </select>
            </div>
            <div className="form-field-modal full-width">
              <label>Mô tả</label>
              <textarea value={txForm.description} onChange={e => setTxForm({ ...txForm, description: e.target.value })} placeholder="Mô tả giao dịch..." rows={2} />
            </div>
          </div>
          <div className="modal-actions">
            <button className="btn-secondary" onClick={() => setShowTransactionModal(false)}>Hủy</button>
            <button className="btn-primary" onClick={handleCreateTransaction} disabled={submitting || !txForm.amount || !txForm.budgetId}>
              {submitting ? <Loader2 size={16} className="spin" /> : <Plus size={16} />} Tạo
            </button>
          </div>
        </Modal>
      )}

      {/* Reward Modal */}
      {showRewardModal && (
        <Modal title="Tạo Khen thưởng" onClose={() => setShowRewardModal(false)}>
          <div className="form-grid-modal">
            <FormField label="Tiêu đề *" value={rewardForm.title} onChange={v => setRewardForm({ ...rewardForm, title: v })} placeholder="VD: Khen thưởng đề tài xuất sắc" />
            <div className="form-field-modal">
              <label>Hình thức</label>
              <select value={rewardForm.type} onChange={e => setRewardForm({ ...rewardForm, type: e.target.value })}>
                <option value="CASH">Tiền mặt</option>
                <option value="CERTIFICATE">Bằng khen</option>
                <option value="LETTER">Giấy khen</option>
              </select>
            </div>
            <FormField label="Số tiền (VNĐ)" type="number" value={rewardForm.amount} onChange={v => setRewardForm({ ...rewardForm, amount: v })} />
            <FormField label="Kỳ khen thưởng" value={rewardForm.period} onChange={v => setRewardForm({ ...rewardForm, period: v })} placeholder="VD: HK1 2024-2025" />
            <div className="form-field-modal">
              <label>Người nhận *</label>
              <select value={rewardForm.userId} onChange={e => setRewardForm({ ...rewardForm, userId: e.target.value })}>
                <option value="">-- Chọn người nhận --</option>
                {usersList.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div className="form-field-modal">
              <label>Đề tài (tùy chọn)</label>
              <select value={rewardForm.workId} onChange={e => setRewardForm({ ...rewardForm, workId: e.target.value })}>
                <option value="">-- Không chọn --</option>
                {worksList.map(w => <option key={w.id} value={w.id}>{w.title}</option>)}
              </select>
            </div>
          </div>
          <div className="modal-actions">
            <button className="btn-secondary" onClick={() => setShowRewardModal(false)}>Hủy</button>
            <button className="btn-primary" onClick={handleCreateReward} disabled={submitting || !rewardForm.title || !rewardForm.userId}>
              {submitting ? <Loader2 size={16} className="spin" /> : <Award size={16} />} Tạo
            </button>
          </div>
        </Modal>
      )}

      <style>{`
        .finance-page { display: flex; flex-direction: column; gap: 2rem; padding-bottom: 3rem; }
        .breadcrumb { font-size: 0.8125rem; color: var(--on-surface-muted); margin-bottom: 0.5rem; }
        .page-header { display: flex; justify-content: space-between; align-items: flex-start; }
        .page-header h1 { font-size: 1.75rem; font-weight: 800; }
        .btn-action { background: white; border: 1.5px solid var(--surface-variant); padding: 0.625rem 1rem; border-radius: 10px; font-weight: 700; display: flex; align-items: center; gap: 0.375rem; cursor: pointer; font-size: 0.8125rem; color: var(--on-surface); }
        .btn-action.accent { background: var(--primary-indigo); color: white; border-color: var(--primary-indigo); }

        .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.5rem; }
        .stat-card { background: white; border-radius: 16px; padding: 1.5rem; display: flex; align-items: center; gap: 1.25rem; }
        .stat-icon { padding: 0.875rem; border-radius: 14px; }
        .stat-info { display: flex; flex-direction: column; gap: 0.25rem; }
        .stat-value { font-size: 1.5rem; font-weight: 800; }
        .stat-label { font-size: 0.8125rem; color: var(--on-surface-muted); font-weight: 500; }

        .content-grid { display: grid; grid-template-columns: 1fr 360px; gap: 2rem; align-items: start; }
        .left-col, .right-col { display: flex; flex-direction: column; gap: 2rem; }
        .surface-card h3 { font-size: 1.0625rem; font-weight: 700; margin-bottom: 1.5rem; }
        .chart-card, .rewards-card, .table-card, .progress-card { padding: 2rem; }
        .empty-text { color: var(--on-surface-muted); font-size: 0.875rem; }

        .donut-section { display: flex; gap: 2rem; align-items: center; }
        .donut-chart { position: relative; width: 180px; height: 180px; flex-shrink: 0; }
        .donut-svg { width: 100%; height: 100%; transform: rotate(-90deg); }
        .donut-center { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; display: flex; flex-direction: column; }
        .donut-pct { font-size: 1.5rem; font-weight: 800; }
        .donut-label { font-size: 0.6875rem; color: var(--on-surface-muted); font-weight: 600; }
        .donut-legend { display: flex; flex-direction: column; gap: 0.75rem; }
        .legend-item { display: flex; align-items: center; gap: 0.625rem; font-size: 0.875rem; }
        .legend-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
        .legend-name { flex: 1; }
        .legend-value { font-weight: 700; }

        .rewards-list { display: flex; flex-direction: column; gap: 0.75rem; }
        .reward-item { display: flex; align-items: center; gap: 1rem; padding: 0.875rem; background: #f8f9ff; border-radius: 12px; }
        .reward-icon-wrap { width: 36px; height: 36px; border-radius: 10px; background: #eef2ff; display: flex; align-items: center; justify-content: center; color: var(--primary-indigo); }
        .reward-info { flex: 1; display: flex; flex-direction: column; gap: 0.125rem; }
        .reward-title { font-weight: 700; font-size: 0.875rem; }
        .reward-type { font-size: 0.7rem; color: var(--on-surface-muted); }
        .reward-status { font-weight: 700; font-size: 0.75rem; }

        .btn-icon-sm { width: 28px; height: 28px; border: none; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
        .btn-icon-sm.approve { background: #d1fae5; color: #059669; }
        .btn-icon-sm.reject { background: #fee2e2; color: #dc2626; }
        .btn-icon-sm.complete { background: #d1fae5; color: #059669; }
        .btn-icon-sm.award { background: #ede9fe; color: #7c3aed; }

        .finance-table { width: 100%; border-collapse: collapse; }
        .finance-table th { text-align: left; padding: 0.75rem 1rem; font-size: 0.75rem; font-weight: 800; color: var(--on-surface-muted); border-bottom: 2px solid var(--surface-low); }
        .finance-table td { padding: 0.875rem 1rem; font-size: 0.875rem; border-bottom: 1px solid #f1f5f9; }
        .finance-table .amount { font-weight: 700; color: var(--primary-indigo); }
        .status-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 0.5rem; }

        .progress-bar-wrap { margin-bottom: 1.5rem; }
        .progress-bar { height: 10px; background: #f1f5f9; border-radius: 100px; overflow: hidden; }
        .progress-fill { height: 100%; background: var(--signature-gradient, var(--primary-indigo)); border-radius: 100px; transition: width 0.6s ease; }
        .progress-labels { display: flex; justify-content: space-between; margin-top: 0.5rem; font-size: 0.75rem; color: var(--on-surface-muted); font-weight: 600; }
        .disbursement-list { display: flex; flex-direction: column; gap: 0.75rem; }
        .disbursement-item { display: flex; justify-content: space-between; align-items: center; padding: 0.875rem; background: #f8f9ff; border-radius: 12px; }
        .disb-info { display: flex; flex-direction: column; gap: 0.125rem; }
        .disb-desc { font-weight: 600; font-size: 0.8125rem; }
        .disb-date { font-size: 0.7rem; color: var(--on-surface-muted); }
        .disb-amount { font-weight: 800; font-size: 1rem; color: var(--primary-indigo); }

        .featured-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; }
        .featured-header h3 { font-size: 1.0625rem; font-weight: 700; margin: 0; }
        .see-all { color: var(--primary-indigo); font-weight: 700; font-size: 0.875rem; display: flex; align-items: center; gap: 0.25rem; text-decoration: none; }
        .featured-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.25rem; }
        .featured-card { padding: 1.25rem; display: flex; flex-direction: column; gap: 1rem; position: relative; cursor: pointer; transition: transform 0.2s; }
        .featured-card:hover { transform: translateY(-2px); }
        .featured-img-placeholder { height: 100px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center; }
        .featured-info h4 { font-size: 0.8125rem; font-weight: 700; line-height: 1.4; }
        .featured-author { font-size: 0.7rem; color: var(--on-surface-muted); }
        .featured-arrow { position: absolute; top: 1.25rem; right: 1.25rem; color: var(--on-surface-muted); }

        /* Modal */
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
        .modal-content { width: 520px; max-height: 80vh; overflow-y: auto; padding: 2rem; border-radius: 20px; background: white; }
        .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
        .modal-header h2 { font-size: 1.25rem; font-weight: 800; }
        .form-grid-modal { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        .form-field-modal { display: flex; flex-direction: column; gap: 0.375rem; }
        .form-field-modal.full-width { grid-column: 1 / -1; }
        .form-field-modal label { font-size: 0.75rem; font-weight: 700; color: var(--on-surface-muted); }
        .form-field-modal input, .form-field-modal textarea, .form-field-modal select { padding: 0.625rem; border: 1.5px solid var(--surface-variant); border-radius: 8px; font-size: 0.875rem; font-family: inherit; outline: none; }
        .form-field-modal input:focus, .form-field-modal textarea:focus { border-color: var(--primary-indigo); }
        .modal-actions { display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.5rem; }
        .btn-secondary { background: white; border: 1.5px solid var(--surface-variant); padding: 0.625rem 1.25rem; border-radius: 10px; font-weight: 700; cursor: pointer; }
        .btn-primary { background: var(--primary-indigo); color: white; border: none; padding: 0.625rem 1.5rem; border-radius: 10px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        @media (max-width: 1200px) {
          .stats-grid { grid-template-columns: repeat(2, 1fr); }
          .content-grid { grid-template-columns: 1fr; }
          .featured-grid { grid-template-columns: repeat(2, 1fr); }
        }
      `}</style>
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--on-surface-muted)' }}><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function FormField({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div className="form-field-modal">
      <label>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}
