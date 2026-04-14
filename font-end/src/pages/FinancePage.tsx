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
} from 'lucide-react';
import { financeService } from '../services/financeService';

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

const TYPE_ICONS: Record<string, typeof Banknote> = {
  CASH: Banknote,
  CERTIFICATE: Medal,
  LETTER: ScrollText,
};

const TYPE_LABELS: Record<string, string> = {
  CASH: 'Tiền mặt',
  CERTIFICATE: 'Bằng khen',
  LETTER: 'Giấy khen',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#f59e0b',
  APPROVED: '#3b82f6',
  COMPLETED: '#10b981',
  REJECTED: '#ef4444',
  AWARDED: '#8b5cf6',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Chờ duyệt',
  APPROVED: 'Đã duyệt',
  COMPLETED: 'Hoàn thành',
  REJECTED: 'Từ chối',
  AWARDED: 'Đã trao',
};

function formatVND(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(3).replace(/\.?0+$/, '') + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
  return n.toLocaleString('vi-VN');
}

export default function FinancePage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [disbursements, setDisbursements] = useState<Transaction[]>([]);
  const [featuredPubs, setFeaturedPubs] = useState<Publication[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [s, t, r, d, p] = await Promise.all([
          financeService.getStats(),
          financeService.getTransactions({ limit: 5 }),
          financeService.getRewards({ limit: 5 }),
          financeService.getDisbursementProgress(),
          financeService.getFeaturedPublications(),
        ]);
        setStats(s);
        setTransactions(t.data || []);
        setRewards(r.data || []);
        setDisbursements(d || []);
        setFeaturedPubs(p || []);
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--on-surface-muted)' }}>Đang tải dữ liệu...</div>;
  }

  const totalBudget = stats?.totalBudget || 0;
  const totalDisbursed = stats?.totalDisbursed || 0;
  const disbursedPercent = totalBudget > 0 ? ((totalDisbursed / totalBudget) * 100).toFixed(0) : 0;

  // Build department chart data
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
        <button className="btn-export">
          <FileText size={18} />
          Tạo báo cáo tổng
        </button>
      </header>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#eef2ff' }}><DollarSign size={22} color="#4f46e5" /></div>
          <div className="stat-info">
            <span className="stat-value">{formatVND(totalBudget)}</span>
            <span className="stat-label">Tổng ngân sách</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#f0fdf4' }}><TrendingUp size={22} color="#16a34a" /></div>
          <div className="stat-info">
            <span className="stat-value">{formatVND(totalDisbursed)}</span>
            <span className="stat-label">Đã giải ngân</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fef3c7' }}><Briefcase size={22} color="#d97706" /></div>
          <div className="stat-info">
            <span className="stat-value">{stats?.activeProjects || 0}</span>
            <span className="stat-label">Đề tài đang thực hiện</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fce7f3' }}><Award size={22} color="#db2777" /></div>
          <div className="stat-info">
            <span className="stat-value">{formatVND(stats?.totalRewards || 0)}</span>
            <span className="stat-label">Khen thưởng</span>
          </div>
        </div>
      </div>

      <div className="content-grid">
        {/* Left Column */}
        <div className="left-col">
          {/* Budget by Department - Donut Chart */}
          <section className="surface-card chart-card">
            <h3>Phân bổ Ngân sách theo Khoa</h3>
            <div className="donut-section">
              <div className="donut-chart">
                <svg viewBox="0 0 36 36" className="donut-svg">
                  <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#f1f5f9" strokeWidth="3" />
                  {departments.length > 0 ? (
                    (() => {
                      let offset = 0;
                      return departments.map((d, i) => {
                        const pct = deptTotal > 0 ? ((d._sum.totalAmount || 0) / deptTotal) * 100 : 0;
                        const el = (
                          <circle
                            key={i}
                            cx="18" cy="18" r="15.9155" fill="none"
                            stroke={DEPT_COLORS[i % DEPT_COLORS.length]}
                            strokeWidth="3"
                            strokeDasharray={`${pct} ${100 - pct}`}
                            strokeDashoffset={-offset}
                            strokeLinecap="round"
                          />
                        );
                        offset += pct;
                        return el;
                      });
                    })()
                  ) : (
                    <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                  )}
                </svg>
                <div className="donut-center">
                  <span className="donut-pct">100%</span>
                  <span className="donut-label">Phân bổ</span>
                </div>
              </div>
              <div className="donut-legend">
                {departments.length > 0 ? departments.map((d, i) => (
                  <div key={i} className="legend-item">
                    <span className="legend-dot" style={{ background: DEPT_COLORS[i % DEPT_COLORS.length] }} />
                    <span className="legend-name">{d.department || 'Khác'}</span>
                    <span className="legend-value">{formatVND(d._sum.totalAmount || 0)}</span>
                  </div>
                )) : (
                  <p style={{ color: 'var(--on-surface-muted)', fontSize: '0.875rem' }}>Chưa có dữ liệu ngân sách</p>
                )}
              </div>
            </div>
          </section>

          {/* Rewards */}
          <section className="surface-card rewards-card">
            <h3>Quyết định Khen thưởng</h3>
            {rewards.length > 0 ? (
              <div className="rewards-list">
                {rewards.map((r) => {
                  const Icon = TYPE_ICONS[r.type] || Award;
                  return (
                    <div key={r.id} className="reward-item">
                      <div className="reward-icon-wrap">
                        <Icon size={20} />
                      </div>
                      <div className="reward-info">
                        <span className="reward-title">{r.title}</span>
                        <span className="reward-type">{TYPE_LABELS[r.type] || r.type}</span>
                      </div>
                      <span className="reward-status" style={{ color: STATUS_COLORS[r.status] }}>
                        {STATUS_LABELS[r.status] || r.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="empty-text">Chưa có quyết định khen thưởng</p>
            )}
          </section>

          {/* Transactions Table */}
          <section className="surface-card table-card">
            <h3>Theo dõi đơn mua giá NCKH</h3>
            {transactions.length > 0 ? (
              <table className="finance-table">
                <thead>
                  <tr>
                    <th>Đề tài / Mô tả</th>
                    <th>Người phụ trách</th>
                    <th>Số tiền</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id}>
                      <td>{tx.work?.title || tx.description || '—'}</td>
                      <td>{tx.approvedBy?.name || '—'}</td>
                      <td className="amount">{formatVND(tx.amount)}</td>
                      <td>
                        <span className="status-dot" style={{ background: STATUS_COLORS[tx.status] }} />
                        {STATUS_LABELS[tx.status] || tx.status}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="empty-text">Chưa có giao dịch</p>
            )}
          </section>
        </div>

        {/* Right Column */}
        <div className="right-col">
          {/* Disbursement Progress */}
          <section className="surface-card progress-card">
            <h3>Tiến độ Giải ngân</h3>
            <div className="progress-bar-wrap">
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${disbursedPercent}%` }} />
              </div>
              <div className="progress-labels">
                <span>{disbursedPercent}% đã giải ngân</span>
                <span>{formatVND(totalDisbursed)} / {formatVND(totalBudget)}</span>
              </div>
            </div>

            {disbursements.length > 0 ? (
              <div className="disbursement-list">
                {disbursements.map((d) => (
                  <div key={d.id} className="disbursement-item">
                    <div className="disb-info">
                      <span className="disb-desc">{d.work?.title || d.description || 'Giải ngân'}</span>
                      <span className="disb-date">{new Date(d.createdAt).toLocaleDateString('vi-VN')}</span>
                    </div>
                    <span className="disb-amount">{formatVND(d.amount)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty-text">Chưa có giải ngân</p>
            )}
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
              <div className="featured-img-placeholder">
                <FileText size={32} color="#94a3b8" />
              </div>
              <div className="featured-info">
                <h4>{pub.title.slice(0, 60)}{pub.title.length > 60 ? '...' : ''}</h4>
                <span className="featured-author">{pub.user?.name || pub.authors}</span>
              </div>
              <ArrowUpRight size={16} className="featured-arrow" />
            </article>
          )) : (
            <p style={{ color: 'var(--on-surface-muted)', gridColumn: '1 / -1', textAlign: 'center', padding: '2rem' }}>
              Chưa có công bố tiêu biểu
            </p>
          )}
        </div>
      </section>

      <style>{`
        .finance-page { display: flex; flex-direction: column; gap: 2rem; padding-bottom: 3rem; }

        .breadcrumb { font-size: 0.8125rem; color: var(--on-surface-muted); margin-bottom: 0.5rem; }
        .page-header { display: flex; justify-content: space-between; align-items: flex-start; }
        .page-header h1 { font-size: 1.75rem; font-weight: 800; }

        .btn-export {
          background: white; border: none; padding: 0.75rem 1.5rem; border-radius: 12px;
          font-weight: 700; display: flex; align-items: center; gap: 0.5rem; cursor: pointer;
          color: var(--primary-indigo); font-size: 0.875rem;
        }

        .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.5rem; }
        .stat-card {
          background: white; border-radius: 16px; padding: 1.5rem; display: flex; align-items: center; gap: 1.25rem;
        }
        .stat-icon { padding: 0.875rem; border-radius: 14px; }
        .stat-info { display: flex; flex-direction: column; gap: 0.25rem; }
        .stat-value { font-size: 1.5rem; font-weight: 800; color: var(--on-surface); }
        .stat-label { font-size: 0.8125rem; color: var(--on-surface-muted); font-weight: 500; }

        .content-grid { display: grid; grid-template-columns: 1fr 360px; gap: 2rem; align-items: start; }
        .left-col { display: flex; flex-direction: column; gap: 2rem; }
        .right-col { display: flex; flex-direction: column; gap: 2rem; }

        .surface-card h3 { font-size: 1.0625rem; font-weight: 700; margin-bottom: 1.5rem; }
        .chart-card, .rewards-card, .table-card, .progress-card { padding: 2rem; }
        .empty-text { color: var(--on-surface-muted); font-size: 0.875rem; }

        /* Donut Chart */
        .donut-section { display: flex; gap: 2rem; align-items: center; }
        .donut-chart { position: relative; width: 180px; height: 180px; flex-shrink: 0; }
        .donut-svg { width: 100%; height: 100%; transform: rotate(-90deg); }
        .donut-center {
          position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
          text-align: center; display: flex; flex-direction: column;
        }
        .donut-pct { font-size: 1.5rem; font-weight: 800; color: var(--on-surface); }
        .donut-label { font-size: 0.6875rem; color: var(--on-surface-muted); font-weight: 600; }
        .donut-legend { display: flex; flex-direction: column; gap: 0.75rem; }
        .legend-item { display: flex; align-items: center; gap: 0.625rem; font-size: 0.875rem; }
        .legend-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
        .legend-name { flex: 1; color: var(--on-surface); }
        .legend-value { font-weight: 700; }

        /* Rewards */
        .rewards-list { display: flex; flex-direction: column; gap: 1rem; }
        .reward-item { display: flex; align-items: center; gap: 1rem; padding: 1rem; background: #f8f9ff; border-radius: 12px; }
        .reward-icon-wrap {
          width: 40px; height: 40px; border-radius: 10px; background: #eef2ff;
          display: flex; align-items: center; justify-content: center; color: var(--primary-indigo);
        }
        .reward-info { flex: 1; display: flex; flex-direction: column; gap: 0.125rem; }
        .reward-title { font-weight: 700; font-size: 0.9375rem; }
        .reward-type { font-size: 0.75rem; color: var(--on-surface-muted); }
        .reward-status { font-weight: 700; font-size: 0.8125rem; }

        /* Table */
        .finance-table { width: 100%; border-collapse: collapse; }
        .finance-table th {
          text-align: left; padding: 0.75rem 1rem; font-size: 0.75rem; font-weight: 800;
          color: var(--on-surface-muted); letter-spacing: 0.05em; border-bottom: 2px solid var(--surface-low);
        }
        .finance-table td { padding: 1rem; font-size: 0.875rem; border-bottom: 1px solid #f1f5f9; }
        .finance-table .amount { font-weight: 700; color: var(--primary-indigo); }
        .status-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 0.5rem; }

        /* Progress */
        .progress-bar-wrap { margin-bottom: 1.5rem; }
        .progress-bar { height: 10px; background: #f1f5f9; border-radius: 100px; overflow: hidden; }
        .progress-fill { height: 100%; background: var(--signature-gradient, var(--primary-indigo)); border-radius: 100px; transition: width 0.6s ease; }
        .progress-labels { display: flex; justify-content: space-between; margin-top: 0.5rem; font-size: 0.75rem; color: var(--on-surface-muted); font-weight: 600; }

        .disbursement-list { display: flex; flex-direction: column; gap: 0.75rem; }
        .disbursement-item {
          display: flex; justify-content: space-between; align-items: center;
          padding: 1rem; background: #f8f9ff; border-radius: 12px;
        }
        .disb-info { display: flex; flex-direction: column; gap: 0.125rem; }
        .disb-desc { font-weight: 600; font-size: 0.875rem; }
        .disb-date { font-size: 0.75rem; color: var(--on-surface-muted); }
        .disb-amount { font-weight: 800; font-size: 1rem; color: var(--primary-indigo); }

        /* Featured */
        .featured-section { }
        .featured-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; }
        .featured-header h3 { font-size: 1.0625rem; font-weight: 700; margin: 0; }
        .see-all { color: var(--primary-indigo); font-weight: 700; font-size: 0.875rem; display: flex; align-items: center; gap: 0.25rem; text-decoration: none; }
        .featured-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.25rem; }
        .featured-card { padding: 1.25rem; display: flex; flex-direction: column; gap: 1rem; position: relative; cursor: pointer; transition: transform 0.2s; }
        .featured-card:hover { transform: translateY(-2px); }
        .featured-img-placeholder {
          height: 120px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 12px; display: flex; align-items: center; justify-content: center;
        }
        .featured-info h4 { font-size: 0.875rem; font-weight: 700; line-height: 1.4; }
        .featured-author { font-size: 0.75rem; color: var(--on-surface-muted); }
        .featured-arrow { position: absolute; top: 1.25rem; right: 1.25rem; color: var(--on-surface-muted); }

        @media (max-width: 1200px) {
          .stats-grid { grid-template-columns: repeat(2, 1fr); }
          .content-grid { grid-template-columns: 1fr; }
          .featured-grid { grid-template-columns: repeat(2, 1fr); }
        }
      `}</style>
    </div>
  );
}
