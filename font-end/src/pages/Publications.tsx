import { useState, useRef } from 'react';
import { 
  Upload, 
  CheckCircle2, 
  Calendar, 
  Plus, 
  X, 
  RotateCcw, 
  Check, 
  Lightbulb,
  ZoomIn,
  ZoomOut,
  Sparkles
} from 'lucide-react';

export const Publications = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [keywords, setKeywords] = useState(['Deep Learning', 'Climate Change', 'Remote Sensing']);
  const [newKeyword, setNewKeyword] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const addKeyword = () => {
    if (newKeyword && !keywords.includes(newKeyword)) {
      setKeywords([...keywords, newKeyword]);
      setNewKeyword('');
    }
  };

  const removeKeyword = (tag: string) => {
    setKeywords(keywords.filter(k => k !== tag));
  };

  return (
    <div className="publications-page">
      <header className="page-header">
        <h1>Công bố khoa học</h1>
        <p className="subtitle">Tải lên bài báo khoa học để AI tự động trích xuất thông tin định danh.</p>
      </header>

      {/* Upload Section */}
      <section 
        className={`upload-zone ${isDragging ? 'dragging' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={(e) => { e.preventDefault(); setIsDragging(false); }}
        onClick={() => fileInputRef.current?.click()}
      >
        <input type="file" ref={fileInputRef} style={{ display: 'none' }} />
        <div className="upload-content">
          <div className="upload-icon-circle">
            <Upload size={32} color="var(--primary-indigo)" />
          </div>
          <h3>Kéo thả tài liệu vào đây</h3>
          <p>Hỗ trợ PDF, DOCX, hoặc hình ảnh (Max 20MB)</p>
          <button className="btn-upload-trigger">Chọn tệp từ máy tính</button>
        </div>
      </section>

      <div className="processing-layout">
        {/* Left: Document Preview */}
        <div className="preview-column">
          <div className="section-header">
            <h3>BẢN XEM TRƯỚC TÀI LIỆU</h3>
            <div className="zoom-controls">
              <button className="icon-btn"><ZoomOut size={18} /></button>
              <button className="icon-btn"><ZoomIn size={18} /></button>
            </div>
          </div>
          <div className="document-frame">
            <div className="doc-content-mock">
               <div className="doc-title-placeholder"></div>
               <div className="doc-text-line short"></div>
               <div className="doc-text-line"></div>
               <div className="doc-text-line"></div>
               <div className="doc-text-line medium"></div>
               <div className="doc-text-block"></div>
               <div className="doc-text-line"></div>
               <div className="doc-text-line short"></div>
            </div>
          </div>
        </div>

        {/* Right: AI Results */}
        <div className="results-column">
          <section className="surface-card ai-results-card">
            <div className="results-header">
              <div className="ai-status">
                <div className="status-icon-wrap">
                  <Sparkles size={20} className="sparkle-icon" />
                </div>
                <div className="status-text">
                  <h4>Kết quả bóc tách AI</h4>
                  <p>Xử lý hoàn tất trong 1.2 giây</p>
                </div>
              </div>
              <div className="confidence-gauge">
                <span className="gauge-value">98.4%</span>
                <span className="gauge-label">ĐỘ TIN CẬY (CONFIDENCE)</span>
              </div>
            </div>

            <form className="extraction-form">
              <div className="form-group full">
                <label>TÊN BÀI BÁO KHOA HỌC</label>
                <div className="input-with-check">
                  <input 
                    type="text" 
                    defaultValue="Ứng dụng mạng nơ-ron tích chập (CNN) trong việc dự đoán biến đổi khí hậu khu vực Đông Nam Á" 
                  />
                  <CheckCircle2 size={18} color="#10b981" className="success-check" />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>TÁC GIẢ CHÍNH</label>
                  <input type="text" defaultValue="Nguyễn Văn A, Trần Thị B" />
                </div>
                <div className="form-group">
                  <label>NGÀY XUẤT BẢN</label>
                  <div className="input-with-icon">
                    <input type="text" defaultValue="24/05/2024" />
                    <Calendar size={18} color="var(--on-surface-muted)" />
                  </div>
                </div>
              </div>

              <div className="form-group full">
                <label>TẠP CHÍ / HỘI NGHỊ</label>
                <input type="text" defaultValue="IEEE Transactions on Geoscience and Remote Sensing" />
              </div>

              <div className="form-group full">
                <label>TÓM TẮT (ABSTRACT)</label>
                <textarea 
                  defaultValue="Nghiên cứu này đề xuất một kiến trúc mạng nơ-ron tích chập cải tiến để phân tích dữ liệu vệ tinh đa phổ... Kết quả thực nghiệm cho thấy mô hình đạt độ chính xác 92% trong việc dự báo các hiện tượng cực đoan như hạn hán và lũ lụt."
                ></textarea>
              </div>

              <div className="form-group full">
                <label>TỪ KHÓA (KEYWORDS)</label>
                <div className="keywords-container">
                  {keywords.map(tag => (
                    <span key={tag} className="keyword-tag">
                      {tag}
                      <X size={14} className="remove-tag" onClick={() => removeKeyword(tag)} />
                    </span>
                  ))}
                  <div className="add-keyword-input">
                    <input 
                      type="text" 
                      placeholder="Thêm..." 
                      value={newKeyword}
                      onChange={(e) => setNewKeyword(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                    />
                    <Plus size={16} onClick={addKeyword} />
                  </div>
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="btn-manual">
                  <RotateCcw size={18} />
                  Chỉnh sửa thủ công
                </button>
                <button type="button" className="btn-confirm">
                  <Check size={18} />
                  Xác nhận & Lưu trữ
                </button>
              </div>
            </form>
          </section>

          {/* AI Helper Box */}
          <div className="ai-tip-box">
             <div className="tip-icon">
                <Lightbulb size={18} />
             </div>
             <div className="tip-content">
                <strong>Mẹo từ Trợ lý AI:</strong>
                <p>Tài liệu này dường như thiếu chỉ số DOI. Bạn có muốn tôi tìm kiếm DOI tự động dựa trên tên bài báo không?</p>
             </div>
          </div>
        </div>
      </div>

      <style>{`
        .publications-page {
          display: flex;
          flex-direction: column;
          gap: 2.5rem;
          padding-bottom: 3rem;
        }

        .upload-zone {
          background: white;
          border: 2px dashed #e2e8f0;
          border-radius: 20px;
          padding: 4rem 2rem;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s;
        }

        .upload-zone:hover, .upload-zone.dragging {
          border-color: var(--primary-indigo);
          background: #f8faff;
        }

        .upload-icon-circle {
          width: 64px;
          height: 64px;
          background: #eef2ff;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 1.5rem;
        }

        .upload-content h3 {
          font-size: 1.25rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
        }

        .upload-content p {
          color: var(--on-surface-muted);
          font-size: 0.875rem;
          margin-bottom: 2rem;
        }

        .btn-upload-trigger {
          background: #eef2ff;
          color: var(--primary-indigo);
          border: none;
          padding: 0.875rem 2rem;
          border-radius: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-upload-trigger:hover {
          background: var(--primary-indigo);
          color: white;
        }

        .processing-layout {
          display: grid;
          grid-template-columns: 460px 1fr;
          gap: 2rem;
          align-items: start;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.25rem;
        }

        .section-header h3 {
          font-size: 0.8125rem;
          font-weight: 800;
          color: var(--on-surface-muted);
          letter-spacing: 0.05em;
        }

        .zoom-controls {
          display: flex;
          gap: 0.5rem;
        }

        .icon-btn {
          background: var(--surface-low);
          border: none;
          padding: 0.5rem;
          border-radius: 8px;
          cursor: pointer;
          color: var(--on-surface-muted);
        }

        .document-frame {
          background: #334155;
          border-radius: 16px;
          height: 640px;
          padding: 2.5rem;
          overflow: hidden;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
        }

        .doc-content-mock {
          background: white;
          width: 100%;
          height: 100%;
          border-radius: 4px;
          padding: 3rem;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .doc-title-placeholder {
          height: 24px;
          width: 80%;
          background: #e2e8f0;
          margin-bottom: 2rem;
        }

        .doc-text-line {
          height: 10px;
          width: 100%;
          background: #f1f5f9;
        }

        .doc-text-line.short { width: 40%; }
        .doc-text-line.medium { width: 65%; }
        .doc-text-block {
          height: 100px;
          width: 100%;
          background: #f1f5f9;
          margin: 1rem 0;
        }

        .ai-results-card {
          padding: 2.5rem;
        }

        .results-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 2.5rem;
          padding-bottom: 2.5rem;
          border-bottom: 1px solid var(--surface-low);
        }

        .ai-status {
          display: flex;
          gap: 1rem;
          align-items: center;
        }

        .status-icon-wrap {
          background: #eef2ff;
          color: var(--primary-indigo);
          padding: 0.75rem;
          border-radius: 12px;
        }

        .status-text h4 {
          font-size: 1.125rem;
          font-weight: 700;
          margin-bottom: 0.25rem;
        }

        .status-text p {
          font-size: 0.8125rem;
          color: var(--on-surface-muted);
        }

        .confidence-gauge {
          text-align: right;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .gauge-value {
          font-size: 2.25rem;
          font-weight: 800;
          color: var(--primary-violet);
          line-height: 1;
        }

        .gauge-label {
          font-size: 0.625rem;
          font-weight: 800;
          color: var(--on-surface-muted);
          letter-spacing: 0.05em;
        }

        .extraction-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 200px;
          gap: 1.5rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .form-group label {
          font-size: 0.75rem;
          font-weight: 800;
          color: var(--on-surface-muted);
          letter-spacing: 0.05em;
        }

        .form-group input, .form-group textarea {
          background: #f8faff;
          border: 1px solid transparent;
          border-radius: 12px;
          padding: 1rem 1.25rem;
          font-size: 0.9375rem;
          color: var(--on-surface);
          outline: none;
          transition: border-color 0.2s;
        }

        .form-group input:focus, .form-group textarea:focus {
          border-color: var(--primary-indigo);
          background: white;
        }

        .input-with-check, .input-with-icon {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-with-check input, .input-with-icon input {
          width: 100%;
        }

        .success-check {
          position: absolute;
          right: 1.25rem;
        }

        .input-with-icon svg {
          position: absolute;
          right: 1.25rem;
        }

        .form-group textarea {
          height: 120px;
          resize: none;
          line-height: 1.6;
        }

        .keywords-container {
          background: #f8faff;
          border-radius: 12px;
          padding: 0.75rem;
          display: flex;
          flex-wrap: wrap;
          gap: 0.625rem;
          align-items: center;
        }

        .keyword-tag {
          background: #eef2ff;
          color: var(--primary-indigo);
          padding: 0.5rem 1rem;
          border-radius: 100px;
          font-size: 0.8125rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .remove-tag {
          cursor: pointer;
          opacity: 0.6;
        }

        .remove-tag:hover {
          opacity: 1;
        }

        .add-keyword-input {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding-left: 0.5rem;
        }

        .add-keyword-input input {
          background: transparent !important;
          border: none !important;
          padding: 0 !important;
          width: 80px;
          font-size: 0.8125rem;
        }

        .add-keyword-input svg {
          color: var(--on-surface-muted);
          cursor: pointer;
        }

        .form-actions {
          display: flex;
          gap: 1rem;
          margin-top: 1.5rem;
        }

        .btn-manual {
          flex: 1;
          background: #f1f5f9;
          color: var(--on-surface-muted);
          border: none;
          padding: 1.125rem;
          border-radius: 14px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          cursor: pointer;
        }

        .btn-confirm {
          flex: 1;
          background: var(--primary-indigo);
          color: white;
          border: none;
          padding: 1.125rem;
          border-radius: 14px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          cursor: pointer;
          box-shadow: 0 10px 20px -5px rgba(79, 70, 229, 0.4);
        }

        .ai-tip-box {
          margin-top: 2rem;
          background: #f0f9ff;
          border-radius: 16px;
          padding: 1.5rem;
          display: flex;
          gap: 1.25rem;
          align-items: center;
        }

        .tip-icon {
          color: #0ea5e9;
        }

        .tip-content strong {
          display: block;
          font-size: 0.875rem;
          margin-bottom: 0.25rem;
          color: #0369a1;
        }

        .tip-content p {
          font-size: 0.8125rem;
          color: #0369a1;
          line-height: 1.5;
        }

        .sparkle-icon {
          animation: rotate 4s linear infinite;
        }

        @keyframes rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
