import { StatusBadge } from '../components/common/StatusBadge';
import { ProgressBar } from '../components/common/ProgressBar';
import { 
  Building2, 
  PlayCircle, 
  BarChart2, 
  AlertCircle, 
  Search, 
  MoreVertical, 
  CheckCircle2, 
  FileText, 
  Download, 
  MessageCircle, 
  Clock,
  Plus
} from 'lucide-react';

export const ProjectManagement = () => {
  const stats = [
    { label: 'CẤP ĐỀ TÀI', value: 'Tất cả các cấp', icon: Building2, color: '#6366f1' },
    { label: 'TRẠNG THÁI', value: 'Đang thực hiện', icon: PlayCircle, color: '#3b82f6' },
    { label: 'HIỆU SUẤT', value: '84% Đúng hạn', icon: BarChart2, color: '#10b981' },
    { label: 'CẦN XỬ LÝ', value: '12 Hồ sơ mới', icon: AlertCircle, color: '#f59e0b' },
  ];

  const projects = [
    {
      id: '#NCKH-2024-089',
      level: 'CẤP NHÀ NƯỚC',
      title: 'Ứng dụng trí tuệ nhân tạo trong việc tối ưu hóa chuỗi cung ứng nông sản khu vực ĐBSCL',
      progress: 65,
      participants: 4,
      isActive: true
    },
    {
      id: '#NCKH-2024-112',
      level: 'CẤP BỘ',
      title: 'Nghiên cứu đặc tính vật lý của vật liệu Nano trong điều kiện áp suất cực cao',
      progress: 30,
      participants: 2,
      isActive: false
    },
    {
      id: '#NCKH-2024-005',
      level: 'CẤP TRƯỜNG',
      title: 'Chuyển đổi số trong quản lý giáo dục đại học: Mô hình và Thực tiễn',
      progress: 90,
      participants: 1,
      isActive: false
    }
  ];

  const processSteps = [
    { label: 'ĐĂNG KÝ', date: '12/01/2024', status: 'completed' },
    { label: 'ĐỀ CƯƠNG', date: '05/02/2024', status: 'completed' },
    { label: 'THUYẾT MINH', date: 'Đang xử lý', status: 'active' },
    { label: 'NGHIỆM THU', date: 'Dự kiến T12', status: 'upcoming' },
    { label: 'LƯU TRỮ', date: 'Chưa bắt đầu', status: 'upcoming' },
  ];

  return (
    <div className="project-management-page">
      {/* Header with Search & Filter */}
      <header className="page-header">
        <div className="header-left">
          <h1>Quản lý Quy trình xét duyệt</h1>
          <p className="subtitle">Giám sát và vận hành các giai đoạn nghiên cứu khoa học thời gian thực.</p>
        </div>
        <div className="header-actions">
           <div className="pill-switcher">
              <button className="pill-btn active">Tất cả</button>
              <button className="pill-btn">Của tôi</button>
           </div>
           <button className="btn-filter">
              <Search size={16} />
              <span>Bộ lọc nâng cao</span>
           </button>
        </div>
      </header>

      {/* Top Stat Cards */}
      <section className="stats-row">
        {stats.map((stat, idx) => (
          <div key={idx} className="surface-card stat-mini-card">
            <div className="stat-icon" style={{ backgroundColor: `${stat.color}15`, color: stat.color }}>
              <stat.icon size={20} />
            </div>
            <div className="stat-info">
              <span className="label-sm">{stat.label}</span>
              <div className="stat-val">{stat.value}</div>
            </div>
          </div>
        ))}
      </section>

      {/* Main Grid */}
      <div className="management-grid">
        {/* Left: Project List */}
        <div className="projects-column">
          <div className="section-header">
            <h3>Danh sách đề tài đang thực hiện</h3>
            <span className="count-badge">24 Đề tài</span>
          </div>
          
          <div className="project-list">
            {projects.map((p, i) => (
              <div key={i} className={`project-card ${p.isActive ? 'active-border' : ''}`}>
                <div className="card-top">
                  <StatusBadge 
                    label={p.level} 
                    variant={p.isActive ? 'primary' : 'subtle'} 
                  />
                  <span className="project-id">{p.id}</span>
                </div>
                <h4 className="project-title">{p.title}</h4>
                <div className="card-bottom">
                  <div className="avatar-stack">
                    {[...Array(p.participants)].map((_, i) => (
                      <div key={i} className="mini-avatar" />
                    ))}
                    {p.participants > 3 && <div className="mini-avatar more">+{p.participants - 2}</div>}
                  </div>
                  <div className="card-progress">
                    <ProgressBar progress={p.progress} label="Tiến độ" height="6px" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Process Details */}
        <div className="details-column">
          <div className="surface-card details-card">
             <div className="details-header">
                <h3>Chi tiết quy trình thực hiện</h3>
                <div className="header-badges">
                   <span className="status-label-chip warning">CẦN PHÊ DUYỆT</span>
                   <MoreVertical size={20} className="icon-btn" />
                </div>
             </div>

             {/* Steps Stepper */}
             <div className="stepper-horizontal">
                {processSteps.map((step, idx) => (
                  <div key={idx} className={`step-item ${step.status}`}>
                     <div className="step-circle">
                        {step.status === 'completed' ? <CheckCircle2 size={24} /> : 
                         step.status === 'active' ? <FileText size={24} /> : idx + 1}
                     </div>
                     <div className="step-info">
                        <div className="step-label">{step.label}</div>
                        <div className="step-date">{step.date}</div>
                     </div>
                     {idx < processSteps.length - 1 && <div className="step-line" />}
                  </div>
                ))}
             </div>

             {/* Info Alert Box */}
             <div className="info-alert-box">
                <div className="info-vertical-bar" />
                <div className="info-content">
                   <h5>Giai đoạn: Hoàn thiện Thuyết minh đề tài</h5>
                   <p>Hồ sơ đang ở bước thẩm định kinh phí bởi **Hội đồng Khoa học & Đào tạo**. Cần bổ sung danh mục thiết bị nghiên cứu chi tiết trước ngày **20/05/2024**.</p>
                </div>
             </div>

             <div className="details-actions">
                <button className="btn-main">
                   <Download size={18} />
                   Cập nhật Hồ sơ bổ sung
                </button>
                <button className="btn-secondary">
                   <MessageCircle size={18} />
                   Liên hệ Hội đồng
                </button>
             </div>
          </div>

          {/* Activity Log */}
          <div className="activity-section">
             <div className="section-header">
                <div className="title-with-icon">
                   <Clock size={20} />
                   <h3>Lịch sử hoạt động</h3>
                </div>
             </div>
             
             <div className="timeline">
                <div className="timeline-item">
                   <div className="timeline-icon success"><CheckCircle2 size={16} /></div>
                   <div className="timeline-content">
                      <div className="timeline-text">Đề cương đã được duyệt bởi **PGS.TS Nguyễn Văn A**</div>
                      <div className="timeline-time">Hôm qua, lúc 14:30</div>
                   </div>
                   <div className="timeline-line" />
                </div>
                <div className="timeline-item">
                   <div className="timeline-icon info"><FileText size={16} /></div>
                   <div className="timeline-content">
                      <div className="timeline-text">Chủ nhiệm đề tài tải lên bản thảo Thuyết minh v2</div>
                      <div className="timeline-time">15/05/2024, 09:15</div>
                   </div>
                   <div className="timeline-line" />
                </div>
                <div className="timeline-item">
                   <div className="timeline-icon start"><PlayCircle size={16} /></div>
                   <div className="timeline-content">
                      <div className="timeline-text">Khởi tạo quy trình xét duyệt đề tài</div>
                      <div className="timeline-time">12/01/2024, 08:00</div>
                   </div>
                </div>
             </div>
             <button className="btn-text-only">Xem toàn bộ lịch sử</button>
          </div>
        </div>
      </div>

      {/* Floating Action Button */}
      <button className="fab-button">
         <Plus size={28} />
      </button>

      <style>{`
        .project-management-page {
          display: flex;
          flex-direction: column;
          gap: 2.5rem;
          position: relative;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
        }

        .page-header h1 {
          color: var(--primary-indigo);
          font-size: 2.5rem;
          margin-bottom: 0.5rem;
        }

        .subtitle {
          color: var(--on-surface-muted);
          font-weight: 500;
        }

        .header-actions {
          display: flex;
          gap: 1rem;
          align-items: center;
        }

        .pill-switcher {
          background: var(--surface-low);
          padding: 4px;
          border-radius: 12px;
          display: flex;
        }

        .pill-btn {
          padding: 0.625rem 1.5rem;
          border-radius: 10px;
          border: none;
          background: transparent;
          font-weight: 700;
          font-size: 0.875rem;
          color: var(--on-surface-muted);
          cursor: pointer;
          transition: all 0.2s;
        }

        .pill-btn.active {
          background: white;
          color: var(--primary-indigo);
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }

        .btn-filter {
          background: var(--surface-low);
          color: var(--primary-indigo);
          border: none;
          padding: 0.75rem 1.25rem;
          border-radius: 12px;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 700;
          cursor: pointer;
        }

        .stats-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1.5rem;
        }

        .stat-mini-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1.25rem 1.5rem;
        }

        .stat-val {
          font-weight: 800;
          font-size: 1.125rem;
          color: var(--on-surface);
          margin-top: 0.25rem;
        }

        .management-grid {
          display: grid;
          grid-template-columns: 420px 1fr;
          gap: 2rem;
          align-items: start;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .count-badge {
          background: #eef2ff;
          color: var(--primary-indigo);
          padding: 0.25rem 0.75rem;
          border-radius: 100px;
          font-size: 0.75rem;
          font-weight: 800;
        }

        .project-list {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .project-card {
          background: white;
          border-radius: 16px;
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          transition: all 0.3s ease;
          border: 2px solid transparent;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        }

        .project-card.active-border {
          border-color: var(--primary-violet);
          box-shadow: 0 10px 30px -10px rgba(124, 77, 255, 0.2);
        }

        .card-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .project-id {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--on-surface-variant);
        }

        .project-title {
          font-size: 1rem;
          font-weight: 700;
          line-height: 1.4;
          color: var(--on-surface);
        }

        .card-bottom {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1.5rem;
          margin-top: 0.5rem;
        }

        .avatar-stack {
          display: flex;
          margin-left: 0.5rem;
        }

        .mini-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #e2e8f0;
          border: 2px solid white;
          margin-left: -8px;
        }

        .mini-avatar.more {
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.625rem;
          font-weight: 800;
          color: var(--on-surface-muted);
        }

        .card-progress {
          flex: 1;
        }

        .details-card {
          padding: 2.5rem;
        }

        .details-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 3rem;
        }

        .status-label-chip {
          padding: 0.5rem 1rem;
          border-radius: 100px;
          font-size: 0.75rem;
          font-weight: 800;
        }

        .status-label-chip.warning {
          background: #fffbeb;
          color: #d97706;
        }

        .stepper-horizontal {
          display: flex;
          justify-content: space-between;
          margin-bottom: 3.5rem;
          padding: 0 1rem;
        }

        .step-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
          position: relative;
          flex: 1;
        }

        .step-circle {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          z-index: 2;
          background: white;
          border: 2px solid var(--surface-low);
          color: var(--on-surface-variant);
          transition: all 0.3s;
        }

        .step-item.completed .step-circle {
          background: var(--primary-indigo);
          border-color: var(--primary-indigo);
          color: white;
        }

        .step-item.active .step-circle {
          border-color: var(--primary-violet);
          color: var(--primary-violet);
          box-shadow: 0 0 0 4px rgba(124, 77, 255, 0.1);
        }

        .step-label {
          font-size: 0.75rem;
          font-weight: 800;
          color: var(--on-surface);
        }

        .step-item.active .step-label {
          color: var(--primary-violet);
        }

        .step-date {
          font-size: 0.625rem;
          font-weight: 600;
          color: var(--on-surface-muted);
        }

        .step-line {
          position: absolute;
          top: 22px;
          left: 50%;
          width: 100%;
          height: 2px;
          background: var(--surface-low);
          z-index: 1;
        }

        .step-item.completed .step-line {
          background: var(--primary-indigo);
        }

        .info-alert-box {
          background: #f8faff;
          border-radius: 12px;
          display: flex;
          margin-bottom: 2.5rem;
          overflow: hidden;
        }

        .info-vertical-bar {
          width: 4px;
          background: var(--primary-indigo);
        }

        .info-content {
          padding: 1.5rem;
        }

        .info-content h5 {
          font-weight: 800;
          color: var(--primary-indigo);
          margin-bottom: 0.5rem;
        }

        .info-content p {
          font-size: 0.875rem;
          line-height: 1.6;
          color: var(--on-surface);
        }

        .details-actions {
          display: flex;
          gap: 1.25rem;
        }

        .btn-main {
          background: var(--primary-indigo);
          color: white;
          border: none;
          padding: 1rem 1.5rem;
          border-radius: 12px;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-secondary {
          background: #eef2ff;
          color: var(--primary-indigo);
          border: none;
          padding: 1rem 1.5rem;
          border-radius: 12px;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          cursor: pointer;
        }

        .activity-section {
          margin-top: 2rem;
        }

        .title-with-icon {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          color: var(--on-surface);
        }

        .timeline {
          margin-top: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          position: relative;
          padding-left: 0.5rem;
        }

        .timeline-item {
          display: flex;
          gap: 1.25rem;
          position: relative;
        }

        .timeline-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          z-index: 2;
        }

        .timeline-icon.success { background: #d1fae5; color: #059669; }
        .timeline-icon.info { background: #e0f2fe; color: #0284c7; }
        .timeline-icon.start { background: #eef2ff; color: #4f46e5; }

        .timeline-text {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--on-surface);
        }

        .timeline-time {
          font-size: 0.75rem;
          color: var(--on-surface-muted);
          margin-top: 0.25rem;
        }

        .timeline-line {
          position: absolute;
          left: 15px;
          top: 32px;
          width: 2px;
          height: calc(100% - 16px);
          background: var(--surface-low);
          z-index: 1;
        }

        .btn-text-only {
          background: transparent;
          border: none;
          color: var(--primary-violet);
          font-weight: 700;
          font-size: 0.875rem;
          margin-top: 2rem;
          text-align: center;
          width: 100%;
          cursor: pointer;
        }

        .fab-button {
          position: fixed;
          bottom: 40px;
          right: 40px;
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: var(--primary-violet);
          color: white;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 12px 24px rgba(124, 77, 255, 0.4);
          cursor: pointer;
          transition: all 0.3s;
          z-index: 1000;
        }

        .fab-button:hover {
          transform: translateY(-4px) rotate(90deg);
        }
      `}</style>
    </div>
  );
};
