import { useState, useEffect, useRef } from 'react';
import {
  Activity, CheckCircle2, XCircle, Clock, Loader2, RefreshCw, Trash2, Play,
  Layers, AlertTriangle, Eye, X, ChevronLeft, ChevronRight, Filter,
  Zap, Database, Cpu,
} from 'lucide-react';
import { Modal } from '../components/common/Modal';
import { jobService, STATUS_LABEL, STATUS_COLOR, QUEUE_LABEL } from '../services/jobService';
import type { JobRecord, JobStats } from '../services/jobService';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/common/Toast';
import { Role } from '../types';

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
      showError('Không tải được danh sách job');
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
    confirm('Chạy lại job', `Tạo lại job "${j.jobId.substring(0, 12)}..."?`, async () => {
      try {
        await jobService.retry(j.jobId);
        success('Đã đưa job vào hàng đợi lại');
        fetchJobs(meta.page);
      } catch {
        showError('Retry thất bại');
      }
    });
  };

  const handleRemove = (j: JobRecord) => {
    confirm('Xóa job', 'Xóa bản ghi job này khỏi hệ thống?', async () => {
      try {
        await jobService.remove(j.jobId);
        success('Đã xóa job');
        fetchJobs(meta.page);
        fetchStats();
        if (detail?.jobId === j.jobId) setDetail(null);
      } catch {
        showError('Xóa thất bại');
      }
    }, { danger: true, confirmLabel: 'Xóa' });
  };

  const handleCleanOld = () => {
    confirm('Dọn dẹp jobs cũ', 'Xóa các job đã hoàn thành/thất bại hơn 24 giờ?', async () => {
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
    if (sec < 3600) return `${Math.floor(sec / 60)}m ${sec % 60}s`;
    return `${Math.floor(sec / 3600)}h ${Math.floor((sec % 3600) / 60)}m`;
  };

  const totalByStatus = stats?.byStatus || {};

  return (
    <div className="jm-page">
      <div className="jm-header">
        <div>
          <h1 className="jm-title">Quản lý tác vụ</h1>
          <p className="jm-subtitle">Theo dõi các tác vụ xử lý bất đồng bộ trên hệ thống</p>
        </div>
        <div className="jm-header-actions">
          <label className="jm-toggle">
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
            <span>Tự động làm mới</span>
          </label>
          <button className="btn-outline" onClick={() => { fetchJobs(meta.page); fetchStats(); }}>
            <RefreshCw size={16} /> Làm mới
          </button>
          {isAdmin && (
            <button className="btn-outline" onClick={handleCleanOld}>
              <Trash2 size={16} /> Dọn dẹp
            </button>
          )}
        </div>
      </div>

      {isAdmin && stats && (
        <div className="jm-stats">
          <div className="surface-card jm-stat-card">
            <div className="jm-stat-icon" style={{ background: '#fef3c7', color: '#d97706' }}><Clock size={22} /></div>
            <div>
              <div className="jm-stat-val">{totalByStatus.pending || 0}</div>
              <div className="jm-stat-label">Đang chờ</div>
            </div>
          </div>
          <div className="surface-card jm-stat-card">
            <div className="jm-stat-icon" style={{ background: '#dbeafe', color: '#2563eb' }}><Loader2 size={22} /></div>
            <div>
              <div className="jm-stat-val">{totalByStatus.processing || 0}</div>
              <div className="jm-stat-label">Đang xử lý</div>
            </div>
          </div>
          <div className="surface-card jm-stat-card">
            <div className="jm-stat-icon" style={{ background: '#dcfce7', color: '#059669' }}><CheckCircle2 size={22} /></div>
            <div>
              <div className="jm-stat-val">{totalByStatus.completed || 0}</div>
              <div className="jm-stat-label">Hoàn thành</div>
            </div>
          </div>
          <div className="surface-card jm-stat-card">
            <div className="jm-stat-icon" style={{ background: '#fee2e2', color: '#dc2626' }}><XCircle size={22} /></div>
            <div>
              <div className="jm-stat-val">{totalByStatus.failed || 0}</div>
              <div className="jm-stat-label">Thất bại</div>
            </div>
          </div>
          <div className="surface-card jm-stat-card">
            <div className="jm-stat-icon" style={{ background: '#ede9fe', color: '#8b5cf6' }}><Database size={22} /></div>
            <div>
              <div className="jm-stat-val">{stats.totalRecords}</div>
              <div className="jm-stat-label">Tổng bản ghi</div>
            </div>
          </div>
        </div>
      )}

      {isAdmin && stats && (
        <div className="jm-queues">
          {Object.entries(stats.queues).map(([queue, counts]) => (
            <div key={queue} className="surface-card jm-queue-card">
              <div className="jm-queue-head">
                <Cpu size={18} />
                <span className="jm-queue-name">{QUEUE_LABEL[queue] || queue}</span>
              </div>
              <div className="jm-queue-grid">
                <div><span className="jm-q-n">{counts.waiting || 0}</span><span>Chờ</span></div>
                <div><span className="jm-q-n" style={{ color: '#2563eb' }}>{counts.active || 0}</span><span>Chạy</span></div>
                <div><span className="jm-q-n" style={{ color: '#059669' }}>{counts.completed || 0}</span><span>Xong</span></div>
                <div><span className="jm-q-n" style={{ color: '#dc2626' }}>{counts.failed || 0}</span><span>Lỗi</span></div>
                <div><span className="jm-q-n" style={{ color: '#8b5cf6' }}>{counts.delayed || 0}</span><span>Hoãn</span></div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="surface-card jm-toolbar">
        <Filter size={16} style={{ color: '#64748b' }} />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">Tất cả trạng thái</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={queueFilter} onChange={(e) => setQueueFilter(e.target.value)}>
          <option value="">Tất cả hàng đợi</option>
          {Object.entries(QUEUE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        {isAdmin && (
          <label className="jm-toggle">
            <input type="checkbox" checked={viewAll} onChange={(e) => setViewAll(e.target.checked)} />
            <span>Xem tất cả người dùng</span>
          </label>
        )}
      </div>

      <div className="surface-card jm-list">
        {loading ? (
          <div className="jm-loading"><Loader2 className="spin" size={24} /> Đang tải...</div>
        ) : jobs.length === 0 ? (
          <div className="jm-empty">
            <Activity size={40} />
            <p>Chưa có tác vụ nào</p>
          </div>
        ) : (
          <table className="jm-table">
            <thead>
              <tr>
                <th>Mã job</th>
                <th>Hàng đợi</th>
                <th>Trạng thái</th>
                <th>Tiến độ</th>
                <th>Thời gian</th>
                <th>Tạo lúc</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((j) => (
                <tr key={j.jobId} onClick={() => setDetail(j)} className="jm-row">
                  <td className="jm-jobid">{j.jobId.substring(0, 12)}...</td>
                  <td>
                    <span className="jm-queue-badge">
                      <Zap size={11} /> {QUEUE_LABEL[j.queueName] || j.queueName}
                    </span>
                  </td>
                  <td>
                    <span className="jm-status-badge" style={{ background: `${STATUS_COLOR[j.status]}22`, color: STATUS_COLOR[j.status] }}>
                      {j.status === 'processing' && <Loader2 size={11} className="spin" />}
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
              ))}
            </tbody>
          </table>
        )}

        {meta.totalPages > 1 && (
          <div className="jm-pager">
            <button disabled={meta.page <= 1} onClick={() => fetchJobs(meta.page - 1)}>
              <ChevronLeft size={16} /> Trước
            </button>
            <span>Trang {meta.page}/{meta.totalPages} • {meta.total} tác vụ</span>
            <button disabled={meta.page >= meta.totalPages} onClick={() => fetchJobs(meta.page + 1)}>
              Sau <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {detail && (
        <Modal open={true} onClose={() => setDetail(null)} title="Chi tiết tác vụ" size="lg">
          <div className="jm-detail">
            <div className="jm-detail-head">
              <div>
                <div className="jm-detail-id">Job #{detail.jobId}</div>
                <div className="jm-detail-queue">
                  <Zap size={12} /> {QUEUE_LABEL[detail.queueName] || detail.queueName}
                </div>
              </div>
              <span className="jm-status-badge big" style={{ background: `${STATUS_COLOR[detail.status]}22`, color: STATUS_COLOR[detail.status] }}>
                {STATUS_LABEL[detail.status]}
              </span>
            </div>

            <div className="jm-detail-grid">
              <div><span>Tạo lúc:</span> {new Date(detail.createdAt).toLocaleString('vi-VN')}</div>
              <div><span>Bắt đầu:</span> {detail.startedAt ? new Date(detail.startedAt).toLocaleString('vi-VN') : '—'}</div>
              <div><span>Hoàn thành:</span> {detail.completedAt ? new Date(detail.completedAt).toLocaleString('vi-VN') : '—'}</div>
              <div><span>Thời gian:</span> {getElapsed(detail)}</div>
              <div><span>Tiến độ:</span> {detail.progress}%</div>
              {detail.userId && <div><span>Người dùng #:</span> {detail.userId}</div>}
            </div>

            {detail.error && (
              <div className="jm-detail-error">
                <div className="jm-detail-label"><AlertTriangle size={14} /> Lỗi</div>
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
                <div className="jm-detail-label"><CheckCircle2 size={14} /> Kết quả</div>
                <pre>{JSON.stringify(detail.result, null, 2).substring(0, 2000)}</pre>
              </div>
            )}

            <div className="jm-detail-actions">
              {isAdmin && detail.status === 'failed' && (
                <button className="btn-primary" onClick={() => handleRetry(detail)}><Play size={16} /> Chạy lại</button>
              )}
              {isAdmin && (
                <button className="btn-danger" onClick={() => handleRemove(detail)}><Trash2 size={16} /> Xóa job</button>
              )}
              <button className="btn-outline" onClick={() => setDetail(null)}><X size={16} /> Đóng</button>
            </div>
          </div>
        </Modal>
      )}

      <style>{`
        .jm-page { max-width: 1400px; margin: 0 auto; padding: 1.5rem; }
        .jm-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
        .jm-title { font-size: 1.75rem; font-weight: 700; color: #1e3a8a; margin: 0; }
        .jm-subtitle { color: #64748b; margin-top: 0.25rem; }
        .jm-header-actions { display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; }
        .jm-toggle { display: inline-flex; align-items: center; gap: 0.4rem; font-size: 0.85rem; color: #475569; cursor: pointer; }
        .jm-toggle input { cursor: pointer; }

        .jm-stats { display: grid; grid-template-columns: repeat(5, 1fr); gap: 1rem; margin-bottom: 1.25rem; }
        .jm-stat-card { display: flex; align-items: center; gap: 0.75rem; padding: 1rem; }
        .jm-stat-icon { width: 42px; height: 42px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .jm-stat-val { font-size: 1.4rem; font-weight: 700; color: #1e293b; line-height: 1.1; }
        .jm-stat-label { font-size: 0.75rem; color: #64748b; }

        .jm-queues { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-bottom: 1.25rem; }
        .jm-queue-card { padding: 1rem 1.25rem; }
        .jm-queue-head { display: flex; align-items: center; gap: 0.5rem; color: #1e40af; font-weight: 600; font-size: 0.95rem; margin-bottom: 0.75rem; }
        .jm-queue-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 0.5rem; text-align: center; }
        .jm-queue-grid > div { display: flex; flex-direction: column; gap: 0.2rem; padding: 0.4rem 0; background: #f8fafc; border-radius: 8px; }
        .jm-q-n { font-size: 1.1rem; font-weight: 700; color: #1e293b; }
        .jm-queue-grid span:nth-child(2) { font-size: 0.7rem; color: #64748b; }

        .jm-toolbar { display: flex; gap: 0.75rem; padding: 0.75rem 1rem; margin-bottom: 1rem; align-items: center; }
        .jm-toolbar select { padding: 0.45rem 0.75rem; border: 1px solid #e2e8f0; border-radius: 8px; background: #fff; font-size: 0.85rem; color: #1e293b; }

        .jm-list { padding: 0; overflow: hidden; }
        .jm-table { width: 100%; border-collapse: collapse; }
        .jm-table thead { background: #f8fafc; }
        .jm-table th { text-align: left; padding: 0.75rem 1rem; font-size: 0.78rem; font-weight: 600; color: #475569; border-bottom: 1px solid #e2e8f0; text-transform: uppercase; letter-spacing: 0.3px; }
        .jm-table td { padding: 0.75rem 1rem; border-bottom: 1px solid #f1f5f9; font-size: 0.88rem; vertical-align: middle; }
        .jm-row { cursor: pointer; }
        .jm-row:hover { background: #eff6ff; }

        .jm-jobid { font-family: 'SF Mono', Monaco, Consolas, monospace; font-size: 0.78rem; color: #475569; }
        .jm-queue-badge { display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.2rem 0.55rem; background: #eff6ff; color: #1e40af; border-radius: 999px; font-size: 0.72rem; font-weight: 600; }
        .jm-status-badge { display: inline-flex; align-items: center; gap: 0.3rem; padding: 0.25rem 0.6rem; border-radius: 999px; font-size: 0.72rem; font-weight: 700; }
        .jm-status-badge.big { padding: 0.4rem 0.9rem; font-size: 0.82rem; }

        .jm-progress { display: flex; align-items: center; gap: 0.5rem; }
        .jm-progress-bar { flex: 1; height: 6px; background: #f1f5f9; border-radius: 999px; overflow: hidden; max-width: 120px; }
        .jm-progress-fill { height: 100%; transition: width 0.3s; }
        .jm-progress-text { font-size: 0.72rem; color: #64748b; font-variant-numeric: tabular-nums; }

        .jm-duration, .jm-date { color: #64748b; font-size: 0.8rem; font-variant-numeric: tabular-nums; }

        .jm-actions { display: flex; gap: 0.25rem; }
        .jm-ic-btn { background: #f1f5f9; border: none; width: 28px; height: 28px; border-radius: 6px; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; color: #475569; }
        .jm-ic-btn:hover { background: #dbeafe; color: #2563eb; }
        .jm-ic-btn.danger:hover { background: #fee2e2; color: #dc2626; }

        .jm-loading, .jm-empty { padding: 3rem; text-align: center; color: #94a3b8; display: flex; flex-direction: column; align-items: center; gap: 0.5rem; }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        .jm-pager { display: flex; justify-content: space-between; align-items: center; padding: 1rem; border-top: 1px solid #f1f5f9; }
        .jm-pager button { display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.5rem 0.9rem; background: #f1f5f9; border: none; border-radius: 8px; cursor: pointer; font-size: 0.85rem; color: #475569; }
        .jm-pager button:disabled { opacity: 0.4; cursor: not-allowed; }
        .jm-pager span { font-size: 0.85rem; color: #64748b; }

        .jm-detail-head { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 1rem; border-bottom: 1px solid #e2e8f0; margin-bottom: 1rem; }
        .jm-detail-id { font-family: 'SF Mono', Monaco, Consolas, monospace; font-size: 0.88rem; color: #1e293b; font-weight: 600; word-break: break-all; }
        .jm-detail-queue { margin-top: 0.3rem; display: inline-flex; align-items: center; gap: 0.3rem; font-size: 0.78rem; color: #1e40af; background: #eff6ff; padding: 0.2rem 0.5rem; border-radius: 999px; font-weight: 600; }
        .jm-detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem 1rem; margin-bottom: 1rem; font-size: 0.85rem; color: #475569; }
        .jm-detail-grid span { color: #94a3b8; font-weight: 500; margin-right: 0.3rem; }
        .jm-detail-section, .jm-detail-error { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 0.75rem 1rem; margin: 0.75rem 0; }
        .jm-detail-error { background: #fef2f2; border-color: #fecaca; }
        .jm-detail-label { font-weight: 600; color: #475569; display: flex; align-items: center; gap: 0.3rem; font-size: 0.85rem; margin-bottom: 0.5rem; }
        .jm-detail-error .jm-detail-label { color: #dc2626; }
        .jm-detail-section pre, .jm-detail-error pre { margin: 0; padding: 0.5rem; background: #fff; border-radius: 6px; font-size: 0.75rem; color: #334155; overflow: auto; max-height: 250px; white-space: pre-wrap; word-break: break-all; border: 1px solid #f1f5f9; }
        .jm-detail-actions { display: flex; gap: 0.5rem; justify-content: flex-end; padding-top: 1rem; border-top: 1px solid #e2e8f0; margin-top: 1rem; }
      `}</style>
    </div>
  );
}
