import { useState, useEffect, useRef } from 'react';
import {
  Activity, CheckCircle2, XCircle, Clock, Loader2, RefreshCw, Trash2, Play,
  Layers, AlertTriangle, Eye, X, ChevronLeft, ChevronRight,
  Zap, Database, Cpu, Filter, TrendingUp,
} from 'lucide-react';
import { Modal } from '../components/common/Modal';
import { jobService, STATUS_LABEL, STATUS_COLOR, QUEUE_LABEL } from '../services/jobService';
import type { JobRecord, JobStats } from '../services/jobService';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/common/Toast';
import { Role } from '../types';

const QUEUE_ICON: Record<string, any> = {
  'ocr-processing': Layers,
  'ai-summarize': Cpu,
  'ai-embedding': Database,
};

export default function JobManagerPage() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole(Role.ADMIN);
  const { success, error: showError, confirm } = useToast();

  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, totalPages: 1 });
  const [stats, setStats] = useState<JobStats | null>(null);
  const [loading, setLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState('');
  const [queueFilter, setQueueFilter] = useState('');
  const [viewAll, setViewAll] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const [detail, setDetail] = useState<JobRecord | null>(null);
  const refreshTimer = useRef<any>(null);

  const fetchJobs = async (page = 1) => {
    try {
      const res = await jobService.list({
        page, limit: 15,
        status: statusFilter || undefined,
        queueName: queueFilter || undefined,
        all: viewAll && isAdmin,
      });
      setJobs(res.data);
      setMeta(res.meta);
    } catch {
      showError('Không tải được danh sách tác vụ');
    }
    setLoading(false);
  };

  const fetchStats = async () => {
    if (!isAdmin) return;
    try { setStats(await jobService.getStats()); } catch { /* ignore */ }
  };

  useEffect(() => { fetchJobs(); fetchStats(); }, [statusFilter, queueFilter, viewAll]);

  useEffect(() => {
    if (!autoRefresh) return;
    refreshTimer.current = setInterval(() => {
      fetchJobs(meta.page);
      fetchStats();
    }, 5000);
    return () => clearInterval(refreshTimer.current);
  }, [autoRefresh, meta.page, statusFilter, queueFilter, viewAll]);

  const handleRetry = (j: JobRecord) => {
    confirm('Chạy lại tác vụ', `Đưa job "${j.jobId.substring(0, 12)}..." vào hàng đợi lại?`, async () => {
      try {
        await jobService.retry(j.jobId);
        success('Đã đưa tác vụ vào hàng đợi');
        fetchJobs(meta.page);
      } catch {
        showError('Retry thất bại');
      }
    });
  };

  const handleRemove = (j: JobRecord) => {
    confirm('Xóa tác vụ', 'Xóa bản ghi tác vụ này khỏi hệ thống?', async () => {
      try {
        await jobService.remove(j.jobId);
        success('Đã xóa tác vụ');
        fetchJobs(meta.page);
        fetchStats();
        if (detail?.jobId === j.jobId) setDetail(null);
      } catch {
        showError('Xóa thất bại');
      }
    }, { danger: true, confirmLabel: 'Xóa' });
  };

  const handleCleanOld = () => {
    confirm('Dọn dẹp tác vụ cũ', 'Xóa các tác vụ đã hoàn thành/thất bại quá 24 giờ?', async () => {
      try {
        const res = await jobService.clean(24);
        success(res.message);
        fetchJobs(1);
        fetchStats();
      } catch {
        showError('Dọn dẹp thất bại');
      }
    });
  };

  const getElapsed = (j: JobRecord) => {
    const start = j.startedAt ? new Date(j.startedAt).getTime() : new Date(j.createdAt).getTime();
    const end = j.completedAt ? new Date(j.completedAt).getTime() : Date.now();
    const sec = Math.round((end - start) / 1000);
    if (sec < 60) return `${sec}s`;
    if (sec < 3600) return `${Math.floor(sec / 60)}p ${sec % 60}s`;
    return `${Math.floor(sec / 3600)}g ${Math.floor((sec % 3600) / 60)}p`;
  };

  const totalByStatus = stats?.byStatus || {};
  const total = stats?.totalRecords || 0;
  const successRate = total > 0 ? Math.round(((totalByStatus.completed || 0) / total) * 100) : 0;

  return (
    <div className="jm">
      {/* Hero */}
      <section className="jm-hero">
        <div className="jm-hero-left">
          <div className="jm-hero-badge"><Zap size={14} /> Redis + BullMQ Queue</div>
          <h1>Quản lý tác vụ</h1>
          <p>Theo dõi tất cả tác vụ xử lý bất đồng bộ: OCR tài liệu, tóm tắt AI, vector hóa embedding, gửi email, xuất báo cáo. Tự động làm mới mỗi 5 giây.</p>
          <div className="jm-hero-actions">
            <label className="jm-hero-toggle">
              <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
              <span className="jm-hero-slider"></span>
              <span>Tự động làm mới {autoRefresh && <span className="jm-live-dot"></span>}</span>
            </label>
            <button className="jm-hero-btn" onClick={() => { fetchJobs(meta.page); fetchStats(); }}>
              <RefreshCw size={14} /> Làm mới
            </button>
            {isAdmin && (
              <button className="jm-hero-btn" onClick={handleCleanOld}>
                <Trash2 size={14} /> Dọn dẹp cũ
              </button>
            )}
          </div>
        </div>
        {isAdmin && stats && (
          <div className="jm-hero-right">
            <div className="jm-hero-ring">
              <svg viewBox="0 0 120 120" className="jm-ring-svg">
                <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,.15)" strokeWidth="10" />
                <circle
                  cx="60" cy="60" r="52" fill="none" stroke="#fff" strokeWidth="10"
                  strokeLinecap="round" transform="rotate(-90 60 60)"
                  strokeDasharray={`${(successRate / 100) * 326} 326`}
                />
              </svg>
              <div className="jm-ring-center">
                <span className="jm-ring-pct">{successRate}%</span>
                <span className="jm-ring-lbl">Tỉ lệ thành công</span>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Stat Cards */}
      {isAdmin && stats && (
        <section className="jm-stats">
          <StatCard icon={<Clock size={20} />} color="#d97706" bg="#fef3c7" val={totalByStatus.pending || 0} label="Đang chờ" pulse />
          <StatCard icon={<Loader2 size={20} className="spin" />} color="#2563eb" bg="#dbeafe" val={totalByStatus.processing || 0} label="Đang xử lý" />
          <StatCard icon={<CheckCircle2 size={20} />} color="#059669" bg="#d1fae5" val={totalByStatus.completed || 0} label="Hoàn thành" />
          <StatCard icon={<XCircle size={20} />} color="#dc2626" bg="#fee2e2" val={totalByStatus.failed || 0} label="Thất bại" />
          <StatCard icon={<TrendingUp size={20} />} color="#7c3aed" bg="#ede9fe" val={stats.totalRecords} label="Tổng cộng" />
        </section>
      )}

      {/* Queue cards */}
      {isAdmin && stats && (
        <section className="jm-queues">
          {Object.entries(stats.queues).map(([queue, counts]) => {
            const Icon = QUEUE_ICON[queue] || Cpu;
            const totalQ = Object.values(counts).reduce((a, b) => a + (b || 0), 0);
            const activeRate = totalQ > 0 ? ((counts.active || 0) + (counts.waiting || 0)) / totalQ * 100 : 0;
            return (
              <div key={queue} className="surface-card jm-queue-card">
                <div className="jm-queue-head">
                  <div className="jm-queue-ic"><Icon size={20} /></div>
                  <div style={{ flex: 1 }}>
                    <div className="jm-queue-name">{QUEUE_LABEL[queue] || queue}</div>
                    <div className="jm-queue-sub">{totalQ} tác vụ trong hàng đợi</div>
                  </div>
                  <div className={`jm-queue-state ${activeRate > 0 ? 'busy' : 'idle'}`}>
                    {activeRate > 0 ? 'Đang hoạt động' : 'Nhàn rỗi'}
                  </div>
                </div>
                <div className="jm-queue-grid">
                  <div><span className="jm-q-n" style={{ color: '#d97706' }}>{counts.waiting || 0}</span><span>Chờ</span></div>
                  <div><span className="jm-q-n" style={{ color: '#2563eb' }}>{counts.active || 0}</span><span>Đang chạy</span></div>
                  <div><span className="jm-q-n" style={{ color: '#059669' }}>{counts.completed || 0}</span><span>Xong</span></div>
                  <div><span className="jm-q-n" style={{ color: '#dc2626' }}>{counts.failed || 0}</span><span>Lỗi</span></div>
                  <div><span className="jm-q-n" style={{ color: '#8b5cf6' }}>{counts.delayed || 0}</span><span>Hoãn</span></div>
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* Toolbar */}
      <section className="surface-card jm-toolbar">
        <div className="jm-toolbar-left">
          <div className="jm-filter">
            <Filter size={14} />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">Tất cả trạng thái</option>
              {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="jm-filter">
            <Zap size={14} />
            <select value={queueFilter} onChange={(e) => setQueueFilter(e.target.value)}>
              <option value="">Tất cả hàng đợi</option>
              {Object.entries(QUEUE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          {isAdmin && (
            <label className="jm-toggle-small">
              <input type="checkbox" checked={viewAll} onChange={(e) => setViewAll(e.target.checked)} />
              <span>Xem tất cả người dùng</span>
            </label>
          )}
        </div>
        <div className="jm-toolbar-right">
          <span className="jm-toolbar-count">{meta.total.toLocaleString('vi-VN')} tác vụ</span>
        </div>
      </section>

      {/* List */}
      {loading ? (
        <div className="surface-card jm-state"><Loader2 className="spin" size={28} /><p>Đang tải danh sách tác vụ...</p></div>
      ) : jobs.length === 0 ? (
        <div className="surface-card jm-state">
          <Activity size={44} style={{ opacity: .25 }} />
          <p>Chưa có tác vụ nào</p>
          <span className="jm-state-sub">Các tác vụ OCR hoặc AI sẽ hiển thị tại đây</span>
        </div>
      ) : (
        <div className="surface-card jm-list">
          <table className="jm-table">
            <thead>
              <tr>
                <th>Mã tác vụ</th>
                <th>Hàng đợi</th>
                <th>Trạng thái</th>
                <th>Tiến độ</th>
                <th>Thời gian</th>
                <th>Tạo lúc</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((j) => {
                const QIcon = QUEUE_ICON[j.queueName] || Cpu;
                return (
                  <tr key={j.jobId} onClick={() => setDetail(j)} className="jm-row">
                    <td>
                      <div className="jm-job-cell">
                        <div className="jm-job-dot" style={{ background: STATUS_COLOR[j.status] }}></div>
                        <span className="jm-jobid">{j.jobId.substring(0, 14)}</span>
                      </div>
                    </td>
                    <td>
                      <span className="jm-queue-badge">
                        <QIcon size={11} /> {QUEUE_LABEL[j.queueName] || j.queueName}
                      </span>
                    </td>
                    <td>
                      <span className="jm-status-badge" style={{ background: `${STATUS_COLOR[j.status]}18`, color: STATUS_COLOR[j.status] }}>
                        {j.status === 'processing' && <Loader2 size={11} className="spin" />}
                        {j.status === 'completed' && <CheckCircle2 size={11} />}
                        {j.status === 'failed' && <XCircle size={11} />}
                        {j.status === 'pending' && <Clock size={11} />}
                        {STATUS_LABEL[j.status] || j.status}
                      </span>
                    </td>
                    <td>
                      <div className="jm-progress">
                        <div className="jm-progress-bar">
                          <div
                            className="jm-progress-fill"
                            style={{ width: `${j.progress}%`, background: STATUS_COLOR[j.status] }}
                          />
                        </div>
                        <span className="jm-progress-text">{j.progress}%</span>
                      </div>
                    </td>
                    <td className="jm-duration">{getElapsed(j)}</td>
                    <td className="jm-date">{new Date(j.createdAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}</td>
                    <td>
                      <div className="jm-actions" onClick={(e) => e.stopPropagation()}>
                        <button className="jm-ic-btn" title="Chi tiết" onClick={() => setDetail(j)}><Eye size={14} /></button>
                        {isAdmin && j.status === 'failed' && (
                          <button className="jm-ic-btn" title="Chạy lại" onClick={() => handleRetry(j)}><Play size={14} /></button>
                        )}
                        {isAdmin && (
                          <button className="jm-ic-btn danger" title="Xóa" onClick={() => handleRemove(j)}><Trash2 size={14} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {meta.totalPages > 1 && (
            <div className="jm-pager">
              <button disabled={meta.page <= 1} onClick={() => fetchJobs(meta.page - 1)}>
                <ChevronLeft size={16} /> Trang trước
              </button>
              <span>Trang <b>{meta.page}</b> / {meta.totalPages}</span>
              <button disabled={meta.page >= meta.totalPages} onClick={() => fetchJobs(meta.page + 1)}>
                Trang sau <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      )}

      {detail && (
        <Modal open={true} onClose={() => setDetail(null)} title="Chi tiết tác vụ" size="lg">
          <div className="jm-detail">
            <div className="jm-detail-head">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="jm-detail-id">Job #{detail.jobId}</div>
                <div className="jm-detail-queue">
                  <Zap size={12} /> {QUEUE_LABEL[detail.queueName] || detail.queueName}
                </div>
              </div>
              <span className="jm-status-badge big" style={{ background: `${STATUS_COLOR[detail.status]}18`, color: STATUS_COLOR[detail.status] }}>
                {STATUS_LABEL[detail.status]}
              </span>
            </div>

            <div className="jm-detail-grid">
              <div><span>Tạo lúc</span><b>{new Date(detail.createdAt).toLocaleString('vi-VN')}</b></div>
              <div><span>Bắt đầu</span><b>{detail.startedAt ? new Date(detail.startedAt).toLocaleString('vi-VN') : '—'}</b></div>
              <div><span>Hoàn thành</span><b>{detail.completedAt ? new Date(detail.completedAt).toLocaleString('vi-VN') : '—'}</b></div>
              <div><span>Thời gian xử lý</span><b>{getElapsed(detail)}</b></div>
              <div><span>Tiến độ</span><b>{detail.progress}%</b></div>
              {detail.userId && <div><span>Người dùng</span><b>#{detail.userId}</b></div>}
            </div>

            {detail.error && (
              <div className="jm-detail-error">
                <div className="jm-detail-label"><AlertTriangle size={14} /> Chi tiết lỗi</div>
                <pre>{detail.error}</pre>
              </div>
            )}

            {detail.input && (
              <div className="jm-detail-section">
                <div className="jm-detail-label"><Layers size={14} /> Dữ liệu vào</div>
                <pre>{JSON.stringify(detail.input, null, 2)}</pre>
              </div>
            )}

            {detail.result && (
              <div className="jm-detail-section">
                <div className="jm-detail-label success"><CheckCircle2 size={14} /> Kết quả xử lý</div>
                <pre>{JSON.stringify(detail.result, null, 2).substring(0, 2000)}</pre>
              </div>
            )}

            <div className="jm-detail-actions">
              {isAdmin && detail.status === 'failed' && (
                <button className="btn-primary" onClick={() => handleRetry(detail)}><Play size={16} /> Chạy lại</button>
              )}
              {isAdmin && (
                <button className="btn-danger" onClick={() => handleRemove(detail)}><Trash2 size={16} /> Xóa tác vụ</button>
              )}
              <button className="btn-outline" onClick={() => setDetail(null)}><X size={16} /> Đóng</button>
            </div>
          </div>
        </Modal>
      )}

      <style>{jmStyles}</style>
    </div>
  );
}

function StatCard({ icon, color, bg, val, label, pulse }: any) {
  return (
    <div className="surface-card jm-stat-card">
      <div className="jm-stat-icon" style={{ background: bg, color }}>
        {icon}
        {pulse && <span className="jm-pulse" style={{ background: color }}></span>}
      </div>
      <div>
        <div className="jm-stat-val">{val}</div>
        <div className="jm-stat-label">{label}</div>
      </div>
    </div>
  );
}

const jmStyles = `
  .jm { display: flex; flex-direction: column; gap: 1.5rem; padding-bottom: 3rem; }

  /* Hero */
  .jm-hero {
    background: var(--hero-gradient);
    border-radius: 20px; padding: 2.5rem;
    display: flex; justify-content: space-between; align-items: center;
    color: #fff; gap: 2rem; flex-wrap: wrap;
  }
  .jm-hero-left { flex: 1; min-width: 320px; }
  .jm-hero-badge {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 4px 12px; border-radius: 100px; background: rgba(255,255,255,.15);
    font-size: .7rem; font-weight: 700; letter-spacing: .5px; margin-bottom: .75rem;
  }
  .jm-hero-left h1 { font-size: 1.75rem; font-weight: 800; color: #fff; margin-bottom: .5rem; }
  .jm-hero-left p { font-size: .9rem; opacity: .85; line-height: 1.55; max-width: 560px; margin-bottom: 1.5rem; }
  .jm-hero-actions { display: flex; gap: .75rem; align-items: center; flex-wrap: wrap; }
  .jm-hero-toggle {
    display: inline-flex; align-items: center; gap: .5rem;
    padding: .5rem 1rem; background: rgba(255,255,255,.15); border-radius: 10px;
    font-size: .82rem; font-weight: 600; cursor: pointer; color: #fff;
  }
  .jm-hero-toggle input { display: none; }
  .jm-hero-slider {
    position: relative; width: 32px; height: 18px; background: rgba(255,255,255,.25);
    border-radius: 100px; transition: background .2s;
  }
  .jm-hero-slider::after {
    content: ''; position: absolute; left: 2px; top: 2px;
    width: 14px; height: 14px; background: #fff; border-radius: 50%;
    transition: transform .2s;
  }
  .jm-hero-toggle input:checked + .jm-hero-slider { background: #10b981; }
  .jm-hero-toggle input:checked + .jm-hero-slider::after { transform: translateX(14px); }
  .jm-live-dot { display: inline-block; width: 6px; height: 6px; background: #10b981; border-radius: 50%; margin-left: .25rem; animation: pulse 1.5s infinite; }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .4; } }
  .jm-hero-btn {
    display: inline-flex; align-items: center; gap: .35rem;
    padding: .5rem 1rem; background: rgba(255,255,255,.15); color: #fff;
    border: none; border-radius: 10px; font-size: .82rem; font-weight: 600; cursor: pointer;
    transition: background .15s;
  }
  .jm-hero-btn:hover { background: rgba(255,255,255,.25); }

  .jm-hero-right { display: flex; align-items: center; }
  .jm-hero-ring { position: relative; width: 140px; height: 140px; }
  .jm-ring-svg { width: 100%; height: 100%; }
  .jm-ring-center { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); text-align: center; color: #fff; }
  .jm-ring-pct { display: block; font-size: 1.75rem; font-weight: 800; }
  .jm-ring-lbl { font-size: .68rem; opacity: .75; font-weight: 600; }

  /* Stats */
  .jm-stats { display: grid; grid-template-columns: repeat(5, 1fr); gap: 1rem; }
  .jm-stat-card { display: flex; align-items: center; gap: 1rem; padding: 1.25rem !important; transition: transform .15s; }
  .jm-stat-card:hover { transform: translateY(-2px); }
  .jm-stat-icon { position: relative; width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .jm-stat-val { font-size: 1.5rem; font-weight: 800; color: var(--on-surface); line-height: 1.1; }
  .jm-stat-label { font-size: .8rem; font-weight: 600; color: var(--on-surface-muted); margin-top: 2px; }
  .jm-pulse {
    position: absolute; inset: 0; border-radius: 12px; opacity: .3;
    animation: ring-pulse 2s infinite;
  }
  @keyframes ring-pulse {
    0% { transform: scale(1); opacity: .3; }
    100% { transform: scale(1.4); opacity: 0; }
  }

  /* Queues */
  .jm-queues { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; }
  .jm-queue-card { padding: 1.25rem !important; }
  .jm-queue-head { display: flex; align-items: center; gap: .75rem; margin-bottom: 1rem; }
  .jm-queue-ic { width: 40px; height: 40px; background: var(--primary-blue-light); color: var(--primary-indigo); border-radius: 10px; display: flex; align-items: center; justify-content: center; }
  .jm-queue-name { font-weight: 700; color: var(--on-surface); font-size: .95rem; }
  .jm-queue-sub { font-size: .75rem; color: var(--on-surface-muted); margin-top: 2px; }
  .jm-queue-state {
    padding: .25rem .65rem; border-radius: 100px;
    font-size: .7rem; font-weight: 700;
  }
  .jm-queue-state.busy { background: #dbeafe; color: #2563eb; }
  .jm-queue-state.idle { background: var(--surface-low); color: var(--on-surface-muted); }
  .jm-queue-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: .5rem; text-align: center; }
  .jm-queue-grid > div {
    display: flex; flex-direction: column; gap: .2rem; padding: .65rem .25rem;
    background: var(--surface-low); border-radius: 10px;
  }
  .jm-q-n { font-size: 1.2rem; font-weight: 800; line-height: 1; }
  .jm-queue-grid span:nth-child(2) { font-size: .68rem; color: var(--on-surface-muted); font-weight: 600; }

  /* Toolbar */
  .jm-toolbar {
    display: flex; justify-content: space-between; align-items: center;
    padding: .75rem 1.25rem !important; flex-wrap: wrap; gap: .75rem;
  }
  .jm-toolbar-left { display: flex; gap: .75rem; align-items: center; flex-wrap: wrap; }
  .jm-filter {
    display: inline-flex; align-items: center; gap: .5rem;
    padding: .4rem .75rem; background: var(--surface-low); border-radius: 8px;
  }
  .jm-filter svg { color: var(--on-surface-muted); }
  .jm-filter select {
    background: transparent; border: none; outline: none;
    font-size: .82rem; color: var(--on-surface); font-weight: 600; cursor: pointer;
  }
  .jm-toggle-small { display: inline-flex; align-items: center; gap: .35rem; font-size: .82rem; color: var(--on-surface); cursor: pointer; }
  .jm-toggle-small input { cursor: pointer; accent-color: var(--primary-indigo); }
  .jm-toolbar-count { font-size: .85rem; color: var(--on-surface-muted); font-weight: 600; }

  /* State */
  .jm-state { padding: 3rem !important; text-align: center; display: flex; flex-direction: column; align-items: center; gap: .5rem; color: var(--on-surface-variant); }
  .jm-state p { font-weight: 600; color: var(--on-surface-muted); font-size: .9rem; }
  .jm-state-sub { font-size: .8rem; }

  /* Table */
  .jm-list { padding: 0 !important; overflow: hidden; }
  .jm-table { width: 100%; border-collapse: collapse; }
  .jm-table thead { background: var(--surface-low); }
  .jm-table th {
    text-align: left; padding: .75rem 1rem;
    font-size: .68rem; font-weight: 800; color: var(--on-surface-muted);
    text-transform: uppercase; letter-spacing: .5px;
  }
  .jm-table td {
    padding: .85rem 1rem; border-top: 1px solid var(--surface-variant);
    font-size: .85rem; vertical-align: middle;
  }
  .jm-row { cursor: pointer; transition: background .12s; }
  .jm-row:hover { background: var(--surface-low); }

  .jm-job-cell { display: flex; align-items: center; gap: .5rem; }
  .jm-job-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .jm-jobid { font-family: 'SF Mono', Monaco, Consolas, monospace; font-size: .78rem; color: var(--on-surface); font-weight: 600; }
  .jm-queue-badge {
    display: inline-flex; align-items: center; gap: .3rem;
    padding: .2rem .6rem; background: var(--primary-blue-light); color: var(--primary-indigo);
    border-radius: 6px; font-size: .72rem; font-weight: 700;
  }
  .jm-status-badge {
    display: inline-flex; align-items: center; gap: .3rem;
    padding: .25rem .65rem; border-radius: 100px;
    font-size: .72rem; font-weight: 700;
  }
  .jm-status-badge.big { padding: .45rem 1rem; font-size: .82rem; }

  .jm-progress { display: flex; align-items: center; gap: .5rem; }
  .jm-progress-bar { flex: 1; height: 6px; background: var(--surface-low); border-radius: 100px; overflow: hidden; max-width: 140px; }
  .jm-progress-fill { height: 100%; transition: width .3s; border-radius: 100px; }
  .jm-progress-text { font-size: .72rem; color: var(--on-surface-muted); font-variant-numeric: tabular-nums; font-weight: 600; min-width: 30px; }

  .jm-duration, .jm-date { color: var(--on-surface-muted); font-size: .8rem; font-variant-numeric: tabular-nums; }

  .jm-actions { display: flex; gap: .25rem; }
  .jm-ic-btn {
    background: var(--surface-low); border: none;
    width: 30px; height: 30px; border-radius: 7px;
    display: inline-flex; align-items: center; justify-content: center;
    cursor: pointer; color: var(--on-surface-muted); transition: all .12s;
  }
  .jm-ic-btn:hover { background: var(--primary-blue-light); color: var(--primary-indigo); }
  .jm-ic-btn.danger:hover { background: #fee2e2; color: #dc2626; }

  .spin { animation: spin 1s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* Pager */
  .jm-pager { display: flex; justify-content: space-between; align-items: center; padding: .85rem 1.25rem; border-top: 1px solid var(--surface-variant); }
  .jm-pager button {
    display: inline-flex; align-items: center; gap: .35rem;
    padding: .5rem 1rem; background: var(--surface-low); border: none;
    border-radius: 8px; cursor: pointer; font-size: .85rem; color: var(--on-surface);
    font-weight: 600; transition: all .12s;
  }
  .jm-pager button:not(:disabled):hover { background: var(--primary-blue-light); color: var(--primary-indigo); }
  .jm-pager button:disabled { opacity: 0.4; cursor: not-allowed; }
  .jm-pager span { font-size: .85rem; color: var(--on-surface-muted); }
  .jm-pager span b { color: var(--on-surface); }

  /* Detail modal */
  .jm-detail-head { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 1rem; border-bottom: 1px solid var(--surface-variant); margin-bottom: 1rem; gap: 1rem; }
  .jm-detail-id { font-family: 'SF Mono', Monaco, Consolas, monospace; font-size: .9rem; color: var(--on-surface); font-weight: 700; word-break: break-all; }
  .jm-detail-queue {
    margin-top: .4rem; display: inline-flex; align-items: center; gap: .3rem;
    font-size: .78rem; color: var(--primary-indigo); background: var(--primary-blue-light);
    padding: .25rem .65rem; border-radius: 100px; font-weight: 700;
  }
  .jm-detail-grid {
    display: grid; grid-template-columns: 1fr 1fr; gap: .5rem;
    margin-bottom: 1rem;
  }
  .jm-detail-grid > div {
    padding: .65rem .85rem; background: var(--surface-low);
    border-radius: 8px; display: flex; flex-direction: column; gap: .25rem;
  }
  .jm-detail-grid span { font-size: .7rem; color: var(--on-surface-muted); font-weight: 600; text-transform: uppercase; letter-spacing: .3px; }
  .jm-detail-grid b { font-size: .85rem; color: var(--on-surface); font-weight: 700; }

  .jm-detail-section, .jm-detail-error {
    background: var(--surface-low); border-radius: 10px;
    padding: 1rem 1.15rem; margin: .75rem 0;
  }
  .jm-detail-error { background: #fef2f2; border: 1px solid #fecaca; }
  .jm-detail-label { font-weight: 700; color: var(--on-surface); display: flex; align-items: center; gap: .35rem; font-size: .85rem; margin-bottom: .65rem; }
  .jm-detail-error .jm-detail-label { color: #dc2626; }
  .jm-detail-label.success { color: #059669; }
  .jm-detail-section pre, .jm-detail-error pre {
    margin: 0; padding: .75rem;
    background: #fff; border-radius: 8px;
    font-size: .75rem; color: #334155;
    overflow: auto; max-height: 250px;
    white-space: pre-wrap; word-break: break-all;
    border: 1px solid var(--surface-variant);
    font-family: 'SF Mono', Monaco, Consolas, monospace;
  }
  /* Detail action buttons - chuyên nghiệp */
  .jm-detail-actions {
    display: flex; gap: .65rem; justify-content: flex-end;
    padding: 1.25rem 0 0; margin-top: 1.25rem;
    border-top: 1px solid var(--surface-variant);
  }
  .jm-detail-actions .btn-primary,
  .jm-detail-actions .btn-danger,
  .jm-detail-actions .btn-outline {
    display: inline-flex; align-items: center; gap: .45rem;
    padding: .6rem 1.15rem; border-radius: 10px;
    font-size: .85rem; font-weight: 700; cursor: pointer;
    transition: all .18s cubic-bezier(.4, 0, .2, 1);
    border: 1.5px solid transparent;
    letter-spacing: .01em;
  }
  .jm-detail-actions .btn-primary {
    background: var(--signature-gradient);
    color: #fff;
    box-shadow: 0 1px 2px rgba(30, 64, 175, .15), 0 0 0 1px rgba(30, 64, 175, .1);
  }
  .jm-detail-actions .btn-primary:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 16px -4px rgba(30, 64, 175, .35), 0 0 0 1px rgba(30, 64, 175, .15);
  }
  .jm-detail-actions .btn-primary:active { transform: translateY(0); }

  .jm-detail-actions .btn-danger {
    background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%);
    color: #fff;
    box-shadow: 0 1px 2px rgba(220, 38, 38, .15), 0 0 0 1px rgba(220, 38, 38, .1);
  }
  .jm-detail-actions .btn-danger:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 16px -4px rgba(220, 38, 38, .35), 0 0 0 1px rgba(220, 38, 38, .15);
  }
  .jm-detail-actions .btn-danger:active { transform: translateY(0); }

  .jm-detail-actions .btn-outline {
    background: #fff;
    color: var(--on-surface);
    border-color: var(--surface-variant);
  }
  .jm-detail-actions .btn-outline:hover {
    background: var(--surface-low);
    border-color: var(--on-surface-variant);
    color: var(--on-surface);
  }
  .jm-detail-actions .btn-outline:active { background: var(--surface-high); }

  .jm-detail-actions button:disabled {
    opacity: .5; cursor: not-allowed; transform: none !important; box-shadow: none !important;
  }

  @media (max-width: 640px) {
    .jm-detail-actions { flex-direction: column-reverse; }
    .jm-detail-actions button { width: 100%; justify-content: center; }
  }

  @media (max-width: 1024px) {
    .jm-stats { grid-template-columns: repeat(2, 1fr); }
    .jm-queues { grid-template-columns: 1fr; }
    .jm-detail-grid { grid-template-columns: 1fr; }
  }
`;
