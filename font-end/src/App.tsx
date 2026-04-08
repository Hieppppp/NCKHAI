import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { ProjectManagement } from './pages/ProjectManagement';
import { CommitteeEvaluation } from './pages/CommitteeEvaluation';
import { Publications } from './pages/Publications';
import { 
  TrendingUp, 
  MessageSquare, 
  BarChart3, 
  PlusCircle,
  Sparkles
} from 'lucide-react';

function Dashboard() {
  const stats = [
    { label: 'Tổng đề tài', value: '1,284', trend: '+12%', icon: TrendingUp, color: '#6366f1' },
    { label: 'Tổng trích dẫn', value: '45,902', trend: '+8.4%', icon: MessageSquare, color: '#a855f7' },
    { label: 'H-Index Trung bình', value: '24.5', trend: 'Ổn định', icon: BarChart3, color: '#3b82f6' },
  ];

  const recentActivity = [
    { 
      title: 'Tối ưu hóa thuật toán CNN trong nhận diện khuôn mặt', 
      id: 'NCKH-2024-012', 
      author: 'Nguyễn Văn A', 
      status: 'Đã duyệt', 
      date: '12/05/2024',
      statusColor: '#10b981'
    },
    { 
      title: 'Ảnh hưởng của hạt nano lên cấu trúc tế bào g...', 
      id: 'NCKH-2024-008', 
      author: 'Trần Thị B', 
      status: 'Chờ phản biện', 
      date: '10/05/2024',
      statusColor: '#f59e0b'
    },
  ];

  const upcomingEvents = [
    { day: '15', month: 'TH5', title: 'Hội đồng Nghiệm thu Cấp trường', location: 'Phòng 402, Nhà A1', time: '08:30 AM' },
    { day: '18', month: 'TH5', title: 'Hội đồng Xét duyệt Đề tài 2024', location: 'Trực tuyến (MS Teams)', time: '02:00 PM' },
  ];

  return (
    <div className="dashboard-view">
      <section className="welcome-header">
        <h1>Tổng quan Nghiên cứu</h1>
        <p className="subtitle">Chào mừng bạn trở lại. Hệ thống đã cập nhật 12 công bố mới và 3 hội đồng sắp diễn ra trong tuần này.</p>
      </section>

      <section className="stats-row">
        {stats.map((stat, idx) => (
          <div key={idx} className="surface-card stat-card">
            <div className="stat-icon" style={{ backgroundColor: `${stat.color}15`, color: stat.color }}>
              <stat.icon size={24} />
            </div>
            <div className="stat-content">
              <span className="label-sm">{stat.label}</span>
              <div className="stat-value">{stat.value}</div>
            </div>
            <div className="stat-trend" style={{ backgroundColor: stat.trend.includes('+') ? '#d1fae5' : '#f1f5f9', color: stat.trend.includes('+') ? '#059669' : '#64748b' }}>
              {stat.trend}
            </div>
          </div>
        ))}
      </section>

      <div className="main-grid">
        <div className="left-column">
          <section className="surface-card chart-card">
            <div className="card-header">
              <h2>Xu hướng công bố khoa học</h2>
              <div className="filter-select">Tất cả lĩnh vực</div>
            </div>
            <div className="chart-placeholder">
              <div className="chart-bars">
                {[40, 60, 45, 80, 55, 90].map((h, i) => (
                  <div key={i} className="bar-wrapper">
                    <div className="bar" style={{ height: `${h}%` }}></div>
                    <span className="year">202{i+1}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="surface-card table-card">
            <div className="card-header">
              <h2>Hoạt động gần đây</h2>
            </div>
            <table className="activity-table">
              <thead>
                <tr>
                  <th>BÀI BÁO / ĐỀ TÀI</th>
                  <th>TÁC GIẢ</th>
                  <th>TRẠNG THÁI</th>
                  <th>NGÀY DUYỆT</th>
                </tr>
              </thead>
              <tbody>
                {recentActivity.map((item, idx) => (
                  <tr key={idx}>
                    <td>
                      <div className="work-title">{item.title}</div>
                      <div className="work-id">Mã số: {item.id}</div>
                    </td>
                    <td>
                       <div className="author-avatar-group">
                         <div className="mini-avatar"></div>
                         <div className="mini-avatar"></div>
                       </div>
                    </td>
                    <td>
                      <span className="status-chip" style={{ backgroundColor: `${item.statusColor}15`, color: item.statusColor }}>
                        {item.status}
                      </span>
                    </td>
                    <td>{item.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>

        <div className="right-column">
          <section className="surface-card curator-card">
            <div className="ai-header">
              <div className="ai-icon">
                <Sparkles size={16} />
              </div>
              <span className="ai-title">Gợi ý từ Curator AI</span>
            </div>
            <p className="ai-text">
              "Dựa trên xu hướng 2024, các đề tài về **Ứng dụng AI trong Chẩn đoán Y tế** đang có tỷ lệ trích dẫn cao nhất tại đơn vị."
            </p>
          </section>

          <section className="surface-card events-card">
            <div className="card-header">
              <h2>Hội đồng sắp tới</h2>
            </div>
            <div className="events-list">
              {upcomingEvents.map((event, idx) => (
                <div key={idx} className="event-item">
                  <div className="event-date">
                    <span className="month">{event.month}</span>
                    <span className="day">{event.day}</span>
                  </div>
                  <div className="event-info">
                    <div className="event-title">{event.title}</div>
                    <div className="event-meta">
                      {event.location} • {event.time}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button className="btn-outline-full">XEM TOÀN BỘ LỊCH HỌP</button>
          </section>
        </div>
      </div>

      <style>{`
        .dashboard-view {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .welcome-header h1 {
          color: var(--primary-indigo);
          margin-bottom: 0.5rem;
        }

        .subtitle {
          color: var(--on-surface-muted);
        }

        .stats-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.5rem;
        }

        .stat-card {
          display: flex;
          align-items: center;
          gap: 1.25rem;
          position: relative;
        }

        .stat-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .stat-value {
          font-size: 1.75rem;
          font-weight: 800;
          color: var(--primary-indigo);
          margin-top: 0.25rem;
        }

        .stat-trend {
          position: absolute;
          top: 1.5rem;
          right: 1.5rem;
          font-size: 0.75rem;
          font-weight: 700;
          padding: 0.25rem 0.5rem;
          border-radius: 6px;
        }

        .main-grid {
          display: grid;
          grid-template-columns: 1fr 340px;
          gap: 1.5rem;
          align-items: start;
        }

        .left-column, .right-column {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .filter-select {
          font-size: 0.875rem;
          color: var(--on-surface-muted);
          background: var(--surface-low);
          padding: 0.5rem 1rem;
          border-radius: 8px;
          cursor: pointer;
        }

        .chart-placeholder {
          height: 240px;
          display: flex;
          align-items: flex-end;
          padding-bottom: 1rem;
        }

        .chart-bars {
          display: flex;
          justify-content: space-between;
          width: 100%;
          height: 100%;
          align-items: flex-end;
          gap: 1rem;
        }

        .bar-wrapper {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
        }

        .bar {
          width: 100%;
          background: var(--surface-low);
          border-radius: 6px;
          transition: background 0.3s;
        }

        .bar-wrapper:last-child .bar {
          background: var(--signature-gradient);
        }

        .year {
          font-size: 0.75rem;
          color: var(--on-surface-variant);
          font-weight: 600;
        }

        .activity-table {
          width: 100%;
          border-collapse: collapse;
        }

        .activity-table th {
          text-align: left;
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--on-surface-variant);
          padding: 0.75rem 0;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .activity-table td {
          padding: 1.25rem 0;
          border-top: 2px solid var(--surface-low);
        }

        .work-title {
          font-weight: 700;
          font-size: 0.9375rem;
          color: var(--on-surface);
          margin-bottom: 0.25rem;
        }

        .work-id {
          font-size: 0.75rem;
          color: var(--on-surface-muted);
        }

        .status-chip {
          font-size: 0.75rem;
          font-weight: 700;
          padding: 0.25rem 0.75rem;
          border-radius: 6px;
        }

        .ai-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }

        .ai-icon {
          background: var(--signature-gradient);
          color: white;
          padding: 0.25rem;
          border-radius: 4px;
        }

        .ai-title {
          font-weight: 700;
          font-size: 0.875rem;
          color: var(--primary-indigo);
        }

        .curator-card {
          background: #fdf2ff;
          border: none;
        }

        .ai-text {
          font-size: 0.875rem;
          line-height: 1.6;
          color: var(--on-surface);
          font-style: italic;
        }

        .events-list {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          margin-bottom: 1.5rem;
        }

        .event-item {
          display: flex;
          gap: 1rem;
          align-items: center;
        }

        .event-date {
          background: var(--surface-low);
          padding: 0.5rem;
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          align-items: center;
          min-width: 48px;
 profile.day;
        }

        .event-info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .event-title {
          font-weight: 700;
          font-size: 0.875rem;
          margin-bottom: 0.25rem;
        }

        .event-meta {
          font-size: 0.75rem;
          color: var(--on-surface-muted);
        }

        .btn-outline-full {
          width: 100%;
          background: transparent;
          border: 2px solid var(--surface-low);
          color: var(--on-surface-muted);
          padding: 0.75rem;
          border-radius: 12px;
          font-weight: 700;
          font-size: 0.75rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-outline-full:hover {
          background: var(--surface-low);
          color: var(--on-surface);
        }
      `}</style>
    </div>
  );
}

function App() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/projects" element={<ProjectManagement />} />
        <Route path="/committees" element={<CommitteeEvaluation />} />
        <Route path="/publications" element={<Publications />} />
        {/* Placeholder for other routes */}
        <Route path="*" element={<Dashboard />} />
      </Routes>
    </AppLayout>
  );
}

export default App;
