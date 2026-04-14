import { useState, useRef } from 'react';
import { Upload, FileText, Sparkles, Search, AlertTriangle, CheckCircle, Loader2, Brain, TrendingUp } from 'lucide-react';
import { aiService } from '../../services/aiService';

export default function AiAnalysis() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [extraction, setExtraction] = useState<any>(null);
  const [similarity, setSimilarity] = useState<any>(null);
  const [checkingPlagiarism, setCheckingPlagiarism] = useState(false);
  const [plagiarismText, setPlagiarismText] = useState('');
  const [trends, setTrends] = useState<any>(null);
  const [loadingTrends, setLoadingTrends] = useState(false);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setExtraction(null);
    try {
      const result = await aiService.uploadAndProcess(file);
      setExtraction(result);
      if (result.extraction?.text) setPlagiarismText(result.extraction.text.substring(0, 2000));
    } catch (err: any) {
      alert(err.response?.data?.message || 'Upload thất bại');
    } finally { setUploading(false); }
  }

  async function handleCheckPlagiarism() {
    if (!plagiarismText || plagiarismText.length < 20) return;
    setCheckingPlagiarism(true);
    try {
      const result = await aiService.checkSimilarity(plagiarismText);
      setSimilarity(result);
    } catch { /* ignore */ }
    setCheckingPlagiarism(false);
  }

  async function handleLoadTrends() {
    setLoadingTrends(true);
    try {
      const t = await aiService.getTrends();
      setTrends(t);
    } catch { /* ignore */ }
    setLoadingTrends(false);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Trợ lý AI</h1>
        <p style={{ color: 'var(--on-surface-muted)', marginTop: 4 }}>Trích xuất thông tin, kiểm tra trùng lặp, phân tích xu hướng</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>
        {/* Upload & OCR Section */}
        <div className="surface-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--signature-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Brain size={18} color="#fff" />
            </div>
            <div>
              <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>Trích xuất tự động (OCR + NLP)</h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-muted)' }}>Upload PDF/ảnh - AI sẽ đọc và trích xuất thông tin</p>
            </div>
          </div>

          <div
            onClick={() => fileRef.current?.click()}
            style={{
              border: '2px dashed var(--surface-variant)', borderRadius: 12, padding: '32px 20px',
              textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.2s',
              background: 'var(--surface-low)',
            }}
          >
            {uploading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <Loader2 size={36} color="var(--primary-violet)" className="spin" />
                <p style={{ fontWeight: 600, color: 'var(--primary-indigo)' }}>Đang xử lý OCR...</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-muted)' }}>Quá trình có thể mất 10-30 giây</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <Upload size={36} color="var(--on-surface-muted)" />
                <p style={{ fontWeight: 600 }}>Kéo thả hoặc click để chọn file</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-muted)' }}>Hỗ trợ: PDF, PNG, JPG, TIFF (tối đa 50MB)</p>
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.tiff,.bmp,.txt" onChange={handleUpload} style={{ display: 'none' }} />

          {/* Extraction Results */}
          {extraction && (
            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                <Sparkles size={16} color="var(--primary-violet)" />
                <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--primary-indigo)' }}>Kết quả trích xuất</h3>
                {extraction.extraction.confidence && (
                  <span style={{ marginLeft: 'auto', fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: extraction.extraction.confidence > 80 ? '#d1fae5' : '#fef3c7', color: extraction.extraction.confidence > 80 ? '#059669' : '#b45309' }}>
                    Độ tin cậy: {extraction.extraction.confidence.toFixed(1)}%
                  </span>
                )}
              </div>

              {extraction.extraction.title && <ResultField label="Tiêu đề" value={extraction.extraction.title} />}
              {extraction.extraction.authors && <ResultField label="Tác giả" value={extraction.extraction.authors} />}
              {extraction.extraction.abstract && <ResultField label="Tóm tắt" value={extraction.extraction.abstract} />}
              {extraction.extraction.keywords?.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--on-surface-muted)' }}>TỪ KHÓA:</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                    {extraction.extraction.keywords.map((kw: string) => (
                      <span key={kw} style={{ padding: '2px 8px', borderRadius: 4, background: 'var(--surface-high)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary-indigo)' }}>{kw}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Plagiarism Check */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="surface-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: '#dc262615', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Search size={18} color="#dc2626" />
              </div>
              <div>
                <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>Kiểm tra trùng lặp</h2>
                <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-muted)' }}>So sánh với kho dữ liệu nội bộ</p>
              </div>
            </div>

            <textarea
              value={plagiarismText}
              onChange={(e) => setPlagiarismText(e.target.value)}
              placeholder="Dán nội dung cần kiểm tra trùng lặp tại đây (hoặc upload file ở bên trái)..."
              style={{ width: '100%', minHeight: 120, padding: '10px 14px', border: '1.5px solid var(--surface-variant)', borderRadius: 10, fontSize: '0.85rem', fontFamily: 'inherit', outline: 'none', resize: 'vertical', background: 'var(--surface-lowest)' }}
            />

            <button onClick={handleCheckPlagiarism} disabled={checkingPlagiarism || plagiarismText.length < 20}
              className="btn-signature" style={{ width: '100%', marginTop: 10, padding: '10px', fontSize: '0.85rem', opacity: plagiarismText.length < 20 ? 0.5 : 1 }}>
              {checkingPlagiarism ? <Loader2 size={16} className="spin" /> : <Search size={16} />}
              {checkingPlagiarism ? 'Đang kiểm tra...' : 'Kiểm tra đạo văn'}
            </button>

            {similarity && (
              <div style={{ marginTop: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  {similarity.maxSimilarity > 30 ? (
                    <AlertTriangle size={20} color="var(--error)" />
                  ) : (
                    <CheckCircle size={20} color="var(--success)" />
                  )}
                  <span style={{ fontWeight: 700, fontSize: '0.9rem', color: similarity.maxSimilarity > 30 ? 'var(--error)' : 'var(--success)' }}>
                    Mức tương đồng cao nhất: {similarity.maxSimilarity}%
                  </span>
                </div>
                {similarity.results.length > 0 && (
                  <div style={{ fontSize: '0.8rem' }}>
                    {similarity.results.slice(0, 5).map((r: any) => (
                      <div key={r.workId} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--surface-variant)' }}>
                        <span style={{ color: 'var(--on-surface-muted)', flex: 1, marginRight: 8 }}>{r.title}</span>
                        <span style={{ fontWeight: 700, color: r.similarity > 30 ? 'var(--error)' : 'var(--warning)' }}>{r.similarity}%</span>
                      </div>
                    ))}
                  </div>
                )}
                {similarity.results.length === 0 && (
                  <p style={{ fontSize: '0.8rem', color: 'var(--success)' }}>Không phát hiện trùng lặp đáng kể!</p>
                )}
              </div>
            )}
          </div>

          {/* Trends */}
          <div className="surface-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <TrendingUp size={18} color="var(--primary-violet)" />
              <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>Xu hướng nghiên cứu</h2>
              <button onClick={handleLoadTrends} disabled={loadingTrends}
                style={{ marginLeft: 'auto', padding: '4px 12px', borderRadius: 6, border: '1.5px solid var(--surface-variant)', background: 'var(--surface-lowest)', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.75rem', fontWeight: 600 }}>
                {loadingTrends ? 'Đang tải...' : 'Phân tích'}
              </button>
            </div>

            {trends ? (
              <div>
                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--on-surface-muted)', marginBottom: 6 }}>TOP TỪ KHÓA</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                  {trends.topKeywords.slice(0, 12).map((kw: any) => (
                    <span key={kw.keyword} style={{
                      padding: '4px 10px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600,
                      background: `hsl(${(kw.count * 50) % 360}, 70%, 95%)`,
                      color: `hsl(${(kw.count * 50) % 360}, 70%, 35%)`,
                    }}>
                      {kw.keyword} ({kw.count})
                    </span>
                  ))}
                </div>

                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--on-surface-muted)', marginBottom: 6 }}>PHÂN BỐ LOẠI</p>
                {trends.byType.map((t: any) => (
                  <div key={t.type} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: '0.8rem', flex: 1, color: 'var(--on-surface-muted)' }}>{t.type}</span>
                    <div style={{ width: 80, height: 6, borderRadius: 3, background: 'var(--surface-variant)' }}>
                      <div style={{ width: `${Math.min((t.count / 5) * 100, 100)}%`, height: '100%', borderRadius: 3, background: 'var(--primary-violet)' }} />
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, minWidth: 20, textAlign: 'right' }}>{t.count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: '0.8rem', color: 'var(--on-surface-muted)', textAlign: 'center', padding: 16 }}>
                Nhấn "Phân tích" để xem xu hướng nghiên cứu
              </p>
            )}
          </div>
        </div>
      </div>

      <style>{`.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function ResultField({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ marginTop: 8 }}>
      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--on-surface-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      <p style={{ fontSize: '0.85rem', lineHeight: 1.5, marginTop: 2, padding: '6px 10px', background: 'var(--surface-low)', borderRadius: 6 }}>{value}</p>
    </div>
  );
}
