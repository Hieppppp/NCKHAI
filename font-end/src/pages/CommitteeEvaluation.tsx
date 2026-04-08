import { useState } from 'react';
import { 
  Download, 
  Send, 
  MessageSquare, 
  Sparkles, 
  ShieldCheck, 
  Save, 
  PenTool, 
  ChevronRight
} from 'lucide-react';
import { ProgressBar } from '../components/common/ProgressBar';

export const CommitteeEvaluation = () => {
  // Mock state for interactive sliders
  const [scores, setScores] = useState({
    innovation: 0,
    feasibility: 0,
    impact: 0
  });

  const totalScore = scores.innovation + scores.feasibility + scores.impact;

  const handleScoreChange = (key: keyof typeof scores, value: number) => {
    setScores(prev => ({ ...prev, [key]: value }));
  };

  const experts = [
    { name: 'GS. TS. Trần Hải Đăng', role: 'ĐH Bách Khoa - Xử lý tín hiệu', match: 98 },
    { name: 'PGS. TS. Mai Lan Hương', role: 'ĐH Y Dược - Tim mạch học', match: 92 },
    { name: 'GS. TS. Robert Nguyen', role: 'Stanford University - Bio-AI', match: 85 }
  ];

  return (
    <div className="evaluation-page">
      {/* Top Navigation & Actions */}
      <header className="eval-header">
        <div className="header-breadcrumbs">
          <span className="breadcrumb-path">HỘI ĐỒNG</span>
          <ChevronRight size={14} />
          <span className="breadcrumb-active">ĐANG ĐÁNH GIÁ</span>
        </div>
        <div className="header-main">
          <h1>Thẩm định Đề tài Nghiên cứu</h1>
          <div className="header-actions">
            <button className="btn-outline-white">
              <Download size={18} />
              Tải hồ sơ gốc
            </button>
            <button className="btn-primary-eval">
              <Send size={18} />
              Gửi kết quả
            </button>
          </div>
        </div>
      </header>

      <div className="eval-content-grid">
        {/* Main Content Area */}
        <div className="eval-main-column">
          {/* Project Summary Card */}
          <section className="surface-card project-overview-card">
            <div className="project-visual">
              <div className="visual-placeholder">
                <div className="overlay-tag">
                   <span>LĨNH VỰC</span>
                   <strong>Y sinh học điện tử</strong>
                </div>
              </div>
            </div>
            <div className="project-details">
              <div className="title-row">
                <h2>Ứng dụng AI trong chẩn đoán sớm các biến chứng tim mạch hậu COVID-19 qua tín hiệu ECG</h2>
                <span className="project-id-tag">MÃ: DT-2024-0812</span>
              </div>
              <p className="project-desc">
                Đề tài tập trung xây dựng mô hình Deep Learning tối ưu để phân tích dữ liệu ECG từ xa, nhằm phát hiện sớm các dấu hiệu bất thường tiềm ẩn. Mục tiêu là triển khai hệ thống cảnh báo sớm tại các cơ sở y tế tuyến dưới.
              </p>
              <div className="info-meta-grid">
                <div className="meta-item">
                  <span className="meta-label">CHỦ NHIỆM ĐỀ TÀI</span>
                  <div className="owner-info">
                    <div className="mini-avatar" />
                    <strong>TS. Nguyễn Văn Bình</strong>
                  </div>
                </div>
                <div className="meta-item">
                  <span className="meta-label">THỜI GIAN THỰC HIỆN</span>
                  <strong>24 tháng (2024 - 2026)</strong>
                </div>
                <div className="meta-item">
                  <span className="meta-label">KINH PHÍ DỰ KIẾN</span>
                  <strong className="text-highlight">1.200.000.000 VNĐ</strong>
                </div>
                <div className="meta-item">
                  <span className="meta-label">TRẠNG THÁI HỒ SƠ</span>
                  <div className="status-indicator">
                    <div className="pulse-dot" />
                    <strong>Đầy đủ chứng từ</strong>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Electronic Score Sheet */}
          <section className="surface-card score-sheet-card">
            <div className="sheet-header">
              <div className="header-title">
                <div className="icon-wrap indigo">
                  <PenTool size={20} />
                </div>
                <h3>Phiếu đánh giá điện tử</h3>
              </div>
              <div className="total-score-badge">
                <span className="label">TỔNG ĐIỂM:</span>
                <span className="value">{totalScore}</span>
                <span className="max">/ 100</span>
              </div>
            </div>

            <div className="criteria-list">
              {/* Criterion 1 */}
              <div className="criterion-item">
                <div className="criterion-header">
                  <div className="criterion-info">
                    <h4>1. Tính đổi mới & Sáng tạo</h4>
                    <p>Đánh giá sự khác biệt so với các nghiên cứu hiện có.</p>
                  </div>
                  <div className="score-display">
                    <span className="current-score">{scores.innovation}</span>
                    <span className="max-score">/ 40</span>
                  </div>
                </div>
                <div className="slider-wrapper">
                  <input 
                    type="range" 
                    min="0" 
                    max="40" 
                    value={scores.innovation} 
                    onChange={(e) => handleScoreChange('innovation', parseInt(e.target.value))}
                    className="score-slider"
                  />
                </div>
              </div>

              {/* Criterion 2 */}
              <div className="criterion-item">
                <div className="criterion-header">
                  <div className="criterion-info">
                    <h4>2. Tính khả thi & Phương pháp luận</h4>
                    <p>Đánh giá độ tin cậy của mô hình và đội ngũ thực hiện.</p>
                  </div>
                  <div className="score-display">
                    <span className="current-score">{scores.feasibility}</span>
                    <span className="max-score">/ 30</span>
                  </div>
                </div>
                <div className="slider-wrapper">
                  <input 
                    type="range" 
                    min="0" 
                    max="30" 
                    value={scores.feasibility} 
                    onChange={(e) => handleScoreChange('feasibility', parseInt(e.target.value))}
                    className="score-slider"
                  />
                </div>
              </div>

              {/* Criterion 3 */}
              <div className="criterion-item">
                <div className="criterion-header">
                  <div className="criterion-info">
                    <h4>3. Tác động kinh tế - xã hội</h4>
                    <p>Đánh giá khả năng chuyển giao và áp dụng thực tiễn.</p>
                  </div>
                  <div className="score-display">
                    <span className="current-score">{scores.impact}</span>
                    <span className="max-score">/ 30</span>
                  </div>
                </div>
                <div className="slider-wrapper">
                  <input 
                    type="range" 
                    min="0" 
                    max="30" 
                    value={scores.impact} 
                    onChange={(e) => handleScoreChange('impact', parseInt(e.target.value))}
                    className="score-slider"
                  />
                </div>
              </div>
            </div>

            {/* Comments Section */}
            <div className="comment-box-section">
               <h4>Nhận xét chi tiết & Kiến nghị</h4>
               <textarea 
                  placeholder="Nhập ý kiến chuyên môn của bạn tại đây..."
                  className="eval-textarea"
               ></textarea>
            </div>
          </section>
        </div>

        {/* Sidebar Column */}
        <aside className="eval-sidebar-column">
          {/* AI Suggestions */}
          <section className="sidebar-card ai-matching-card">
            <div className="ai-matching-header">
              <div className="ai-box">
                 <Sparkles size={18} />
                 <span>AI GỢI Ý CHUYÊN GIA ĐỐI CHIẾU</span>
              </div>
            </div>
            <p className="ai-hint">Hệ thống đã phân tích từ khóa và đề xuất 3 chuyên gia cùng lĩnh vực để tham vấn chéo:</p>
            
            <div className="expert-list">
              {experts.map((exp, idx) => (
                <div key={idx} className="expert-item-small">
                  <div className="expert-avatar" />
                  <div className="expert-info">
                    <h5>{exp.name}</h5>
                    <p>{exp.role}</p>
                  </div>
                  <div className="match-tag">{exp.match}% Match</div>
                </div>
              ))}
            </div>
            
            <button className="btn-ai-action">
              GỬI LỜI MỜI THẨM ĐỊNH CHÉO
            </button>
          </section>

          {/* Council Progress */}
          <section className="surface-card council-progress-card">
            <h3 className="sidebar-title">Tiến độ Hội đồng</h3>
            <div className="progress-stats">
              <span>Số thành viên đã chấm</span>
              <strong>3 / 5</strong>
            </div>
            <ProgressBar progress={60} color="var(--primary-indigo)" height="6px" />
            
            <div className="council-members">
              <span className="label-xs">TRẠNG THÁI CÁC THÀNH VIÊN</span>
              <div className="member-status-group">
                <div className="status-avatar checked" />
                <div className="status-avatar checked" />
                <div className="status-avatar checked" />
                <div className="status-avatar waiting">LC</div>
                <div className="status-avatar waiting">BT</div>
              </div>
              <p className="status-subtext">Đang chờ 02 thành viên hoàn tất nhận xét.</p>
            </div>
          </section>

          {/* Actions & Backup */}
          <section className="sidebar-simple">
             <div className="backup-info">
                <Save size={16} />
                <span>Phiên bản lưu nháp cuối</span>
             </div>
             <p className="backup-time">Tự động lưu lúc 14:32:05 hôm nay.</p>
             <div className="sidebar-dual-actions">
                <button className="btn-secondary-sidebar">Lưu nháp</button>
                <button className="btn-primary-sidebar">
                   <ShieldCheck size={18} />
                   Ký điện tử
                </button>
             </div>
          </section>
        </aside>
      </div>

      {/* Floating Chat Bubble */}
      <button className="floating-chat-btn">
         <MessageSquare size={24} />
      </button>

      <style>{`
        .evaluation-page {
          display: flex;
          flex-direction: column;
          gap: 2rem;
          padding-bottom: 5rem;
        }

        .eval-header {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .header-breadcrumbs {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--on-surface-muted);
          letter-spacing: 0.05em;
        }

        .breadcrumb-active {
          color: var(--primary-indigo);
        }

        .header-main {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .header-main h1 {
          font-size: 2.25rem;
          color: var(--primary-indigo);
        }

        .header-actions {
          display: flex;
          gap: 1rem;
        }

        .btn-outline-white {
          background: white;
          color: var(--on-surface);
          border: 1px solid var(--surface-low);
          padding: 0.75rem 1.25rem;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 700;
          cursor: pointer;
        }

        .btn-primary-eval {
          background: #4338ca;
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(67, 56, 202, 0.2);
        }

        .eval-content-grid {
          display: grid;
          grid-template-columns: 1fr 320px;
          gap: 1.5rem;
          align-items: start;
        }

        .eval-main-column {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .project-overview-card {
          display: flex;
          padding: 1.5rem;
          gap: 2rem;
        }

        .project-visual {
          width: 240px;
          height: 280px;
          flex-shrink: 0;
        }

        .visual-placeholder {
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%);
          border-radius: 16px;
          position: relative;
          overflow: hidden;
        }

        .overlay-tag {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: rgba(0,0,0,0.5);
          backdrop-filter: blur(8px);
          padding: 1.25rem;
          color: white;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .overlay-tag span {
          font-size: 0.625rem;
          font-weight: 600;
          opacity: 0.8;
        }

        .overlay-tag strong {
          font-size: 0.9375rem;
        }

        .project-details {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          flex: 1;
        }

        .title-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
        }

        .project-details h2 {
          font-size: 1.75rem;
          color: var(--primary-indigo);
          line-height: 1.2;
        }

        .project-id-tag {
          background: #eef2ff;
          color: var(--primary-indigo);
          padding: 0.25rem 0.75rem;
          border-radius: 100px;
          font-size: 0.75rem;
          font-weight: 800;
          white-space: nowrap;
        }

        .project-desc {
          color: var(--on-surface-variant);
          line-height: 1.6;
          font-size: 0.9375rem;
        }

        .info-meta-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1.5rem;
          margin-top: 0.5rem;
          padding-top: 1.5rem;
          border-top: 1px solid var(--surface-low);
        }

        .meta-item {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .meta-label {
          font-size: 0.6875rem;
          font-weight: 700;
          color: var(--on-surface-muted);
          text-transform: uppercase;
        }

        .owner-info {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .mini-avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: #e2e8f0;
        }

        .text-highlight {
          color: var(--primary-violet);
          font-size: 1.125rem;
          font-weight: 800;
        }

        .status-indicator {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #10b981;
        }

        .pulse-dot {
          width: 8px;
          height: 8px;
          background: #10b981;
          border-radius: 50%;
          box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4);
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
          70% { box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
          100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }

        .score-sheet-card {
          padding: 2.5rem;
        }

        .sheet-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2.5rem;
        }

        .header-title {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .icon-wrap.indigo {
          background: #eef2ff;
          color: var(--primary-indigo);
          padding: 0.75rem;
          border-radius: 12px;
        }

        .total-score-badge {
          background: var(--signature-gradient);
          color: white;
          padding: 0.5rem 1rem;
          border-radius: 10px;
          display: flex;
          align-items: baseline;
          gap: 0.25rem;
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);
        }

        .total-score-badge .label {
          font-size: 0.625rem;
          font-weight: 800;
          opacity: 0.9;
        }

        .total-score-badge .value {
          font-size: 1.25rem;
          font-weight: 800;
        }

        .total-score-badge .max {
          font-size: 0.75rem;
          font-weight: 700;
          opacity: 0.7;
        }

        .criteria-list {
          display: flex;
          flex-direction: column;
          gap: 2.5rem;
          margin-bottom: 3rem;
        }

        .criterion-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 1.25rem;
        }

        .criterion-info h4 {
          font-size: 1.125rem;
          font-weight: 700;
          margin-bottom: 0.25rem;
        }

        .criterion-info p {
          font-size: 0.875rem;
          color: var(--on-surface-muted);
        }

        .score-display {
          background: #f1f5f9;
          padding: 0.5rem 1.25rem;
          border-radius: 12px;
          display: flex;
          align-items: baseline;
          gap: 0.25rem;
        }

        .current-score {
          font-size: 1.75rem;
          font-weight: 800;
          color: var(--primary-indigo);
        }

        .max-score {
          font-weight: 700;
          color: var(--on-surface-muted);
        }

        .slider-wrapper {
          padding: 0.5rem 0;
        }

        .score-slider {
          -webkit-appearance: none;
          width: 100%;
          height: 12px;
          border-radius: 100px;
          background: #f1f5f9;
          outline: none;
          cursor: pointer;
        }

        .score-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: var(--primary-indigo);
          border: 4px solid white;
          box-shadow: 0 4px 8px rgba(0,0,0,0.1);
          transition: transform 0.2s;
        }

        .score-slider::-webkit-slider-thumb:hover {
          transform: scale(1.1);
        }

        .comment-box-section h4 {
          margin-bottom: 1rem;
          font-weight: 700;
        }

        .eval-textarea {
          width: 100%;
          height: 160px;
          background: #f8fafc;
          border: 2px solid #f1f5f9;
          border-radius: 16px;
          padding: 1.5rem;
          font-size: 1rem;
          font-family: inherit;
          resize: none;
          outline: none;
          transition: border-color 0.2s;
        }

        .eval-textarea:focus {
          border-color: var(--primary-indigo);
        }

        .eval-sidebar-column {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .sidebar-card {
           border-radius: 20px;
           padding: 1.5rem;
        }

        .ai-matching-card {
           background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%);
           color: white;
           box-shadow: 0 20px 40px -10px rgba(30, 27, 75, 0.3);
        }

        .ai-matching-header {
           margin-bottom: 1.25rem;
        }

        .ai-box {
           display: flex;
           align-items: center;
           gap: 0.5rem;
           font-weight: 800;
           font-size: 0.8125rem;
           letter-spacing: 0.02em;
        }

        .ai-hint {
           font-size: 0.8125rem;
           opacity: 0.8;
           line-height: 1.5;
           margin-bottom: 1.5rem;
        }

        .expert-list {
           display: flex;
           flex-direction: column;
           gap: 0.75rem;
           margin-bottom: 1.5rem;
        }

        .expert-item-small {
           background: rgba(255,255,255,0.08);
           border-radius: 12px;
           padding: 0.75rem;
           display: flex;
           align-items: center;
           gap: 0.75rem;
           position: relative;
        }

        .expert-avatar {
           width: 36px;
           height: 36px;
           border-radius: 8px;
           background: rgba(255,255,255,0.2);
           flex-shrink: 0;
        }

        .expert-info h5 {
           font-size: 0.8125rem;
           font-weight: 700;
           margin-bottom: 0.125rem;
        }

        .expert-info p {
           font-size: 0.6875rem;
           opacity: 0.6;
        }

        .match-tag {
           position: absolute;
           right: 0.75rem;
           top: 0.75rem;
           font-size: 0.625rem;
           font-weight: 800;
           color: #10b981;
        }

        .btn-ai-action {
           width: 100%;
           background: transparent;
           border: 2px solid rgba(255,255,255,0.15);
           color: white;
           padding: 0.875rem;
           border-radius: 12px;
           font-weight: 700;
           font-size: 0.75rem;
           cursor: pointer;
           transition: all 0.2s;
        }

        .btn-ai-action:hover {
           background: rgba(255,255,255,0.05);
        }

        .sidebar-title {
           font-size: 1.125rem;
           margin-bottom: 1.5rem;
        }

        .progress-stats {
           display: flex;
           justify-content: space-between;
           font-size: 0.8125rem;
           margin-bottom: 0.75rem;
        }

        .council-members {
           margin-top: 1.5rem;
           padding-top: 1.5rem;
           border-top: 1px solid var(--surface-low);
        }

        .label-xs {
           font-size: 0.625rem;
           font-weight: 800;
           color: var(--on-surface-muted);
           display: block;
           margin-bottom: 1rem;
        }

        .member-status-group {
           display: flex;
           gap: 0.5rem;
           margin-bottom: 1rem;
        }

        .status-avatar {
           width: 32px;
           height: 32px;
           border-radius: 50%;
           background: #e2e8f0;
           position: relative;
        }

        .status-avatar.checked::after {
           content: '✓';
           position: absolute;
           bottom: -2px;
           right: -2px;
           width: 14px;
           height: 14px;
           background: #10b981;
           color: white;
           font-size: 9px;
           border-radius: 50%;
           display: flex;
           align-items: center;
           justify-content: center;
           border: 2px solid white;
        }

        .status-avatar.waiting {
           display: flex;
           align-items: center;
           justify-content: center;
           font-size: 0.625rem;
           font-weight: 800;
           color: var(--on-surface-muted);
        }

        .status-subtext {
           font-size: 0.75rem;
           color: var(--on-surface-muted);
        }

        .sidebar-simple {
           padding: 0 0.5rem;
        }

        .backup-info {
           display: flex;
           align-items: center;
           gap: 0.5rem;
           font-size: 0.8125rem;
           font-weight: 700;
           color: var(--on-surface);
        }

        .backup-time {
           font-size: 0.75rem;
           color: var(--on-surface-muted);
           margin: 0.5rem 0 1.5rem 1.75rem;
        }

        .sidebar-dual-actions {
           display: flex;
           flex-direction: column;
           gap: 0.75rem;
        }

        .btn-secondary-sidebar {
           background: white;
           border: 1px solid var(--surface-low);
           padding: 1rem;
           border-radius: 12px;
           font-weight: 700;
           cursor: pointer;
        }

        .btn-primary-sidebar {
           background: var(--primary-indigo);
           color: white;
           border: none;
           padding: 1rem;
           border-radius: 12px;
           font-weight: 700;
           display: flex;
           align-items: center;
           justify-content: center;
           gap: 0.75rem;
           cursor: pointer;
           box-shadow: 0 10px 20px -5px rgba(79, 70, 229, 0.3);
        }

        .floating-chat-btn {
           position: fixed;
           bottom: 40px;
           right: 40px;
           width: 60px;
           height: 60px;
           border-radius: 50%;
           background: var(--primary-indigo);
           color: white;
           border: none;
           display: flex;
           align-items: center;
           justify-content: center;
           box-shadow: 0 12px 24px rgba(0,0,0,0.2);
           cursor: pointer;
           z-index: 1000;
        }
      `}</style>
    </div>
  );
};
