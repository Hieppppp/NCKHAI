import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Sparkles, Search, AlertTriangle, CheckCircle,
  Loader2, Brain, TrendingUp, Code, FileJson, Eye, Layers,
  ZoomIn, ZoomOut, Copy, Check, FileSearch, MessageCircle,
  Send, BookOpen, BarChart3, FileUp, Type, Zap, Clock,
} from 'lucide-react';
import { aiService } from '../../services/aiService';
import { jobService, STATUS_LABEL, STATUS_COLOR } from '../../services/jobService';
import type { JobRecord } from '../../services/jobService';
import { useToast } from '../../components/common/Toast';

type ViewMode = 'visual' | 'json' | 'markdown' | 'text';
type Tab = 'ocr' | 'plagiarism' | 'trends' | 'chat';

const TYPE_LABELS: Record<string, string> = {
  JOURNAL_ARTICLE: 'Bài báo', CONFERENCE_PAPER: 'Hội nghị', RESEARCH_PROJECT: 'Đề tài NCKH',
  PATENT: 'Bằng sáng chế', TEXTBOOK: 'Giáo trình', THESIS: 'Luận văn',
};
const LEVEL_LABELS: Record<string, string> = {
  UNIVERSITY: 'Cấp Trường', MINISTRY: 'Cấp Bộ', STATE: 'Cấp Nhà nước',
};

interface Annotation {
  text: string; type: string; confidence: number; page: number;
  bbox: { x: number; y: number; width: number; height: number };
}

export default function AiAnalysis() {
  const { error: showError } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<Tab>('ocr');

  // Upload & OCR
  const [uploading, setUploading] = useState(false);
  const [extraction, setExtraction] = useState<any>(null);
  const [uploadMode, setUploadMode] = useState<'sync' | 'async'>('async');
  const [activeJob, setActiveJob] = useState<JobRecord | null>(null);
  const jobPollRef = useRef<any>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('text');
  const [showBbox, setShowBbox] = useState(true);
  const [bboxLevel, setBboxLevel] = useState<'word' | 'line'>('line');
  const [zoom, setZoom] = useState(1);
  const [copied, setCopied] = useState(false);
  const [selectedPage, setSelectedPage] = useState(1);

  // Summarize
  const [summary, setSummary] = useState<string | null>(null);
  const [summarizing, setSummarizing] = useState(false);

  // Plagiarism
  const [similarity, setSimilarity] = useState<any>(null);
  const [checkingPlagiarism, setCheckingPlagiarism] = useState(false);
  const [plagiarismText, setPlagiarismText] = useState('');

  // Trends
  const [trends, setTrends] = useState<any>(null);
  const [loadingTrends, setLoadingTrends] = useState(false);

  // Chat
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'bot'; text: string }[]>([
    { role: 'bot', text: 'Xin chào! Tôi là trợ lý AI nghiên cứu. Bạn có thể hỏi tôi về phương pháp nghiên cứu, phân tích dữ liệu, hoặc gợi ý cải thiện bài báo.' },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setExtraction(null); setSummary(null);
    setViewMode('text'); setZoom(1); setSelectedPage(1);
    setActiveJob(null);
    try {
      if (uploadMode === 'async') {
        // Đẩy file lên MinIO + queue OCR job, rồi poll status
        const res = await aiService.uploadAsync(file);
        // Bắt đầu polling job
        const initial = await jobService.getOne(res.jobId);
        if (initial) setActiveJob(initial);
        startJobPolling(res.jobId);
      } else {
        const result = await aiService.uploadAndProcess(file);
        setExtraction(result);
        if (result.extraction?.text) setPlagiarismText(result.extraction.text.substring(0, 2000));
      }
    } catch (err: any) {
      showError(err.response?.data?.message || 'Upload thất bại');
    } finally { setUploading(false); }
  }

  function startJobPolling(jobId: string) {
    if (jobPollRef.current) clearInterval(jobPollRef.current);
    jobPollRef.current = setInterval(async () => {
      try {
        const job = await jobService.getOne(jobId);
        if (!job) return;
        setActiveJob(job);
        if (job.status === 'completed') {
          clearInterval(jobPollRef.current);
          if (job.result) {
            // Map kết quả từ JobRecord sang format extraction giống upload sync
            const r: any = job.result;
            setExtraction({
              file: { objectName: (job.input as any)?.objectName, originalName: (job.input as any)?.originalName },
              extraction: {
                ...(r.extraction || {}),
                text: r.ocr?.text || '',
                confidence: r.ocr?.confidence,
                engine: r.ocr?.engine,
                annotations: r.annotations || [],
                lineAnnotations: r.lineAnnotations || [],
                pages: r.pages || [],
              },
              processingTime: r.processingTime,
            });
            if (r.ocr?.text) setPlagiarismText(r.ocr.text.substring(0, 2000));
          }
        } else if (job.status === 'failed') {
          clearInterval(jobPollRef.current);
          showError(`OCR thất bại: ${job.error || 'Unknown error'}`);
        }
      } catch { /* ignore */ }
    }, 1500);
  }

  useEffect(() => () => { if (jobPollRef.current) clearInterval(jobPollRef.current); }, []);

  async function handleSummarize() {
    if (!extraction?.extraction?.text) return;
    setSummarizing(true);
    try {
      const res = await aiService.summarize(extraction.extraction.text.substring(0, 8000), 300);
      setSummary(res.summary || res.error || 'Không thể tóm tắt.');
    } catch { setSummary('Dịch vụ AI chưa sẵn sàng. Kiểm tra Ollama đã chạy chưa.'); }
    setSummarizing(false);
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
    try { setTrends(await aiService.getTrends()); } catch { /* ignore */ }
    setLoadingTrends(false);
  }

  async function handleChat() {
    if (!chatInput.trim() || chatLoading) return;
    const msg = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: msg }]);
    setChatLoading(true);
    try {
      const res = await aiService.chat(msg);
      setChatMessages(prev => [...prev, { role: 'bot', text: res.reply || res.answer || 'Không có phản hồi.' }]);
    } catch {
      setChatMessages(prev => [...prev, { role: 'bot', text: 'Dịch vụ AI không khả dụng. Kiểm tra Ollama.' }]);
    }
    setChatLoading(false);
  }

  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text); setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  const buildJsonOutput = () => {
    if (!extraction) return '';
    const ext = extraction.extraction || {};
    const pages = ext.pages || [];
    const allLines = ext.lineAnnotations || [];
    const allWords = ext.annotations || [];

    // Group annotations by page
    const byPage = pages.map((p: any, idx: number) => {
      const pageNum = p.page || idx + 1;
      const pageLines = allLines.filter((a: any) => a.page === pageNum);
      const pageWords = allWords.filter((a: any) => a.page === pageNum);
      return {
        page: pageNum,
        size: { width: p.width || 595, height: p.height || 842 },
        stats: {
          lines: pageLines.length,
          words: pageWords.length,
          characters: pageLines.reduce((s: number, l: any) => s + (l.text?.length || 0), 0),
        },
        lines: pageLines.slice(0, 30).map((l: any) => ({
          text: l.text,
          confidence: l.confidence,
          bbox: l.bbox,
        })),
      };
    });

    return JSON.stringify({
      metadata: {
        title: ext.title,
        authors: ext.authors,
        abstract: ext.abstract,
        keywords: ext.keywords || [],
      },
      ocr: {
        engine: ext.engine,
        confidence: ext.confidence,
        totalPages: pages.length,
        totalLines: allLines.length,
        totalWords: allWords.length,
      },
      pages: byPage,
      fullText: (ext.text || '').substring(0, 3000) + (ext.text?.length > 3000 ? '... (truncated)' : ''),
    }, null, 2);
  };

  const buildMarkdownOutput = () => {
    if (!extraction) return '';
    const ext = extraction.extraction || {};
    let md = `# Kết quả OCR\n\n**Engine:** ${ext.engine || 'unknown'}\n**Confidence:** ${(ext.confidence || 0).toFixed(1)}%\n**Trang:** ${ext.pages?.length || 0}\n\n`;
    if (ext.title) md += `## Tiêu đề\n${ext.title}\n\n`;
    if (ext.authors) md += `## Tác giả\n${ext.authors}\n\n`;
    if (ext.abstract) md += `## Tóm tắt\n${ext.abstract}\n\n`;
    if (ext.keywords?.length) md += `## Từ khóa\n${ext.keywords.map((k: string) => `- ${k}`).join('\n')}\n\n`;
    md += `## Nội dung\n\`\`\`\n${(ext.text || '').substring(0, 5000)}\n\`\`\`\n`;
    const lines = ext.lineAnnotations || [];
    if (lines.length > 0) {
      md += `\n## Annotation (${lines.length} dòng)\n\n| # | Nội dung | Confidence | BBox |\n|---|---------|-----------|------|\n`;
      lines.slice(0, 30).forEach((a: Annotation, i: number) => {
        md += `| ${i + 1} | ${a.text.substring(0, 50)} | ${(a.confidence * 100).toFixed(0)}% | (${a.bbox.x},${a.bbox.y}) ${a.bbox.width}x${a.bbox.height} |\n`;
      });
    }
    return md;
  };

  const getPageAnnotations = () => {
    if (!extraction) return [];
    const ext = extraction.extraction || {};
    const anns = bboxLevel === 'word' ? (ext.annotations || []) : (ext.lineAnnotations || []);
    if (anns.length === 0) return [];
    // If annotations don't have page field, return all
    const hasPageField = anns.some((a: Annotation) => a.page != null);
    if (!hasPageField) return anns;
    return anns.filter((a: Annotation) => a.page === selectedPage);
  };

  const ext = extraction?.extraction || {};
  const pageAnnotations = getPageAnnotations();
  const pageSize = ext.pages?.[selectedPage - 1] || {};
  const wordCount = ext.text ? ext.text.split(/\s+/).filter(Boolean).length : 0;
  const charCount = ext.text?.length || 0;

  const tabs: { key: Tab; label: string; icon: typeof Brain }[] = [
    { key: 'ocr', label: 'OCR & Phân tích', icon: Brain },
    { key: 'plagiarism', label: 'Kiểm tra đạo văn', icon: Search },
    { key: 'trends', label: 'Xu hướng NC', icon: TrendingUp },
    { key: 'chat', label: 'Trợ lý AI', icon: MessageCircle },
  ];

  return (
    <div className="ai-page">
      <div className="ai-header">
        <div>
          <h1>Trợ lý AI Nghiên cứu</h1>
          <p>Trích xuất, phân tích, kiểm tra đạo văn, tóm tắt tài liệu và tư vấn nghiên cứu</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="tab-bar">
        {tabs.map(t => (
          <button key={t.key} className={`tab-btn ${activeTab === t.key ? 'active' : ''}`} onClick={() => setActiveTab(t.key)}>
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      {/* ─── TAB: OCR & Analysis ─── */}
      {activeTab === 'ocr' && (
        <div className="ocr-layout">
          {/* Upload + Metadata */}
          <div className="ocr-left">
            {/* Upload zone */}
            <div className="surface-card upload-card">
              <div className="card-header">
                <Brain size={18} color="var(--primary-indigo)" />
                <span>Upload & Trích xuất OCR</span>
              </div>

              {/* Mode toggle */}
              <div className="upload-mode-switch">
                <button
                  className={`upload-mode-btn ${uploadMode === 'async' ? 'active' : ''}`}
                  onClick={() => setUploadMode('async')}
                >
                  <Zap size={14} /> Async (Job Queue)
                  <span className="upload-mode-tag">Khuyến nghị</span>
                </button>
                <button
                  className={`upload-mode-btn ${uploadMode === 'sync' ? 'active' : ''}`}
                  onClick={() => setUploadMode('sync')}
                >
                  <Clock size={14} /> Sync (đợi trực tiếp)
                </button>
              </div>

              <div className="drop-zone" onClick={() => fileRef.current?.click()}>
                {uploading ? (
                  <><Loader2 size={32} className="spin" color="var(--primary-indigo)" /><p className="drop-main">Đang upload...</p><p className="drop-sub">{uploadMode === 'async' ? 'Đẩy file vào MinIO + queue OCR' : 'Đợi OCR hoàn tất'}</p></>
                ) : (
                  <><FileUp size={32} color="var(--on-surface-muted)" /><p className="drop-main">Kéo thả hoặc click chọn file</p><p className="drop-sub">PDF, PNG, JPG, TIFF - tối đa 50MB</p></>
                )}
              </div>
              <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.tiff,.bmp,.txt" onChange={handleUpload} style={{ display: 'none' }} />

              {/* Job progress card */}
              {activeJob && (
                <div className="job-progress-card" style={{ borderColor: STATUS_COLOR[activeJob.status] }}>
                  <div className="job-progress-head">
                    <div>
                      <div className="job-progress-id">Job #{activeJob.jobId.substring(0, 12)}...</div>
                      <span className="job-status-pill" style={{ background: `${STATUS_COLOR[activeJob.status]}18`, color: STATUS_COLOR[activeJob.status] }}>
                        {activeJob.status === 'processing' && <Loader2 size={11} className="spin" />}
                        {activeJob.status === 'completed' && <CheckCircle size={11} />}
                        {activeJob.status === 'failed' && <AlertTriangle size={11} />}
                        {STATUS_LABEL[activeJob.status]}
                      </span>
                    </div>
                    <div className="job-progress-pct">{activeJob.progress}%</div>
                  </div>
                  <div className="job-progress-bar">
                    <div className="job-progress-fill" style={{ width: `${activeJob.progress}%`, background: STATUS_COLOR[activeJob.status] }} />
                  </div>
                  {activeJob.error && <div className="job-progress-err">{activeJob.error}</div>}
                  {activeJob.status === 'completed' && <div className="job-progress-msg">✓ Hoàn tất! Đang hiển thị kết quả bên dưới...</div>}
                </div>
              )}
            </div>

            {/* Extraction metadata */}
            {extraction && (
              <div className="surface-card meta-card">
                <div className="card-header">
                  <Sparkles size={16} color="var(--primary-violet)" />
                  <span>Kết quả trích xuất</span>
                  {ext.confidence != null && (
                    <span className={`conf-pill ${ext.confidence > 80 ? 'high' : ext.confidence > 50 ? 'mid' : 'low'}`}>
                      {ext.confidence.toFixed(1)}%
                    </span>
                  )}
                </div>

                <div className="meta-chips">
                  <span className="chip">Engine: {ext.engine || '?'}</span>
                  <span className="chip">{ext.pages?.length || 0} trang</span>
                  <span className="chip">{wordCount.toLocaleString()} từ</span>
                  <span className="chip">{charCount.toLocaleString()} ký tự</span>
                  <span className="chip">{(ext.annotations || []).length} words</span>
                  <span className="chip">{(ext.lineAnnotations || []).length} lines</span>
                </div>

                {ext.title && <MetaField label="Tiêu đề" value={ext.title} />}
                {ext.authors && <MetaField label="Tác giả" value={ext.authors} />}
                {ext.abstract && <MetaField label="Tóm tắt" value={ext.abstract} />}
                {ext.keywords?.length > 0 && (
                  <div className="meta-field">
                    <label>Từ khóa</label>
                    <div className="kw-list">{ext.keywords.map((k: string) => <span key={k} className="kw">{k}</span>)}</div>
                  </div>
                )}

                {/* AI Summarize */}
                <div className="summarize-section">
                  <button className="btn-summarize" onClick={handleSummarize} disabled={summarizing || !ext.text}>
                    {summarizing ? <Loader2 size={14} className="spin" /> : <BookOpen size={14} />}
                    {summarizing ? 'Đang tóm tắt...' : 'AI Tóm tắt nội dung'}
                  </button>
                  {summary && (
                    <div className="summary-box">
                      <div className="summary-header"><Sparkles size={12} /> Tóm tắt AI</div>
                      <p>{summary}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* OCR Preview - right */}
          <div className="ocr-right">
            {extraction ? (
              <div className="surface-card preview-card">
                <div className="card-header">
                  <FileSearch size={16} />
                  <span>OCR Preview</span>
                  <div className="view-tabs">
                    {([['text', Type, 'Text'], ['visual', Eye, 'BBox'], ['json', FileJson, 'JSON'], ['markdown', Code, 'MD']] as const).map(([key, Icon, label]) => (
                      <button key={key} className={`vtab ${viewMode === key ? 'active' : ''}`} onClick={() => setViewMode(key as ViewMode)}>
                        <Icon size={12} /> {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Text view - full extracted text */}
                {viewMode === 'text' && (
                  <div className="text-preview">
                    <div className="text-toolbar">
                      <span className="text-info">{wordCount.toLocaleString()} từ | {charCount.toLocaleString()} ký tự</span>
                      <button className="copy-btn" onClick={() => handleCopy(ext.text || '')}>
                        {copied ? <Check size={12} color="#10b981" /> : <Copy size={12} />} {copied ? 'Đã copy' : 'Copy text'}
                      </button>
                    </div>
                    <pre className="text-content">{ext.text || 'Không có nội dung.'}</pre>
                  </div>
                )}

                {/* Visual BBox view */}
                {viewMode === 'visual' && (
                  <div>
                    <div className="bbox-toolbar">
                      <label className="bbox-toggle">
                        <input type="checkbox" checked={showBbox} onChange={() => setShowBbox(!showBbox)} /> BBox
                      </label>
                      <select value={bboxLevel} onChange={e => setBboxLevel(e.target.value as any)} className="bbox-select">
                        <option value="line">Dòng</option><option value="word">Từ</option>
                      </select>
                      <div className="zoom-btns">
                        <button onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}><ZoomOut size={12} /></button>
                        <span>{(zoom * 100).toFixed(0)}%</span>
                        <button onClick={() => setZoom(Math.min(3, zoom + 0.25))}><ZoomIn size={12} /></button>
                      </div>
                      {(ext.pages?.length || 0) > 1 && (
                        <select value={selectedPage} onChange={e => setSelectedPage(+e.target.value)} className="bbox-select">
                          {ext.pages.map((_: any, i: number) => <option key={i} value={i + 1}>Trang {i + 1}</option>)}
                        </select>
                      )}
                    </div>

                    {pageAnnotations.length > 0 && pageAnnotations[0]?.bbox ? (
                      <div className="bbox-canvas-wrap">
                        <div className="bbox-canvas" style={{
                          width: (pageSize.width || 800) * zoom * 0.35,
                          height: (pageSize.height || 1000) * zoom * 0.35,
                        }}>
                          {showBbox && pageAnnotations.map((a: Annotation, i: number) => {
                            const s = zoom * 0.35;
                            const c = a.confidence >= 0.9 ? '#10b981' : a.confidence >= 0.7 ? '#f59e0b' : '#ef4444';
                            return (
                              <div key={i} title={`"${a.text}" ${(a.confidence * 100).toFixed(0)}%`}
                                style={{ position: 'absolute', left: a.bbox.x * s, top: a.bbox.y * s, width: a.bbox.width * s, height: a.bbox.height * s,
                                  border: `1.5px solid ${c}`, background: `${c}10`, borderRadius: 1, cursor: 'pointer' }}>
                                {bboxLevel === 'line' && zoom >= 0.75 && (
                                  <span style={{ position: 'absolute', top: '50%', left: 3, transform: 'translateY(-50%)', fontSize: Math.max(7, 9 * zoom), color: '#1e40af', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: a.bbox.width * s - 6 }}>{a.text}</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      /* Annotation table fallback for digital PDFs */
                      <div className="bbox-table-wrap">
                        <div className="bbox-info-banner">
                          <Layers size={16} />
                          <span>{ext.engine === 'pypdf2-text' ? 'PDF số - text trích xuất trực tiếp (không cần OCR scan)' : 'Dữ liệu annotation'}</span>
                        </div>
                        {ext.text ? (
                          <div className="bbox-text-lines">
                            {ext.text.split('\n').filter((l: string) => l.trim()).slice(0, 80).map((line: string, i: number) => (
                              <div key={i} className="bbox-line-row">
                                <span className="bbox-line-num">{i + 1}</span>
                                <span className="bbox-line-text">{line}</span>
                              </div>
                            ))}
                            {ext.text.split('\n').filter((l: string) => l.trim()).length > 80 && (
                              <div className="bbox-line-row" style={{ justifyContent: 'center', color: 'var(--on-surface-muted)', fontStyle: 'italic' }}>
                                ... còn {ext.text.split('\n').filter((l: string) => l.trim()).length - 80} dòng nữa
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="empty-bbox"><Layers size={28} /><p>Không có dữ liệu</p></div>
                        )}
                      </div>
                    )}
                    <div className="bbox-legend">
                      <span><span className="dot green" /> Cao (&ge;90%)</span>
                      <span><span className="dot yellow" /> TB (70-90%)</span>
                      <span><span className="dot red" /> Thấp (&lt;70%)</span>
                    </div>
                  </div>
                )}

                {/* JSON view */}
                {viewMode === 'json' && (
                  <div className="json-view">
                    <div className="text-toolbar">
                      <span className="text-info">
                        Structured JSON — {((ext.annotations || []).length + (ext.lineAnnotations || []).length).toLocaleString()} annotations across {ext.pages?.length || 1} pages
                      </span>
                      <button className="copy-btn" onClick={() => handleCopy(buildJsonOutput())}>{copied ? <Check size={12} color="#10b981" /> : <Copy size={12} />} {copied ? 'Đã copy' : 'Copy'}</button>
                    </div>
                    <pre className="code-block dark json-pre">{buildJsonOutput()}</pre>
                  </div>
                )}

                {/* Markdown view */}
                {viewMode === 'markdown' && (
                  <div>
                    <div className="text-toolbar">
                      <span className="text-info">Markdown</span>
                      <button className="copy-btn" onClick={() => handleCopy(buildMarkdownOutput())}>{copied ? <Check size={12} color="#10b981" /> : <Copy size={12} />} {copied ? 'Đã copy' : 'Copy'}</button>
                    </div>
                    <pre className="code-block light">{buildMarkdownOutput()}</pre>
                  </div>
                )}
              </div>
            ) : (
              <div className="surface-card" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
                <Brain size={48} color="var(--on-surface-muted)" style={{ opacity: 0.3, marginBottom: 16 }} />
                <p style={{ color: 'var(--on-surface-muted)', fontWeight: 600 }}>Upload file để bắt đầu phân tích</p>
                <p style={{ color: 'var(--on-surface-muted)', fontSize: '0.8rem', marginTop: 4 }}>Hỗ trợ PDF, ảnh scan, văn bản</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB: Plagiarism ─── */}
      {activeTab === 'plagiarism' && (
        <div className="plag-wrap">
          <div className="surface-card plag-input-card">
            <div className="card-header"><Search size={18} color="#dc2626" /><span>Kiểm tra trùng lặp / Đạo văn</span></div>
            <p className="plag-desc">So sánh văn bản với toàn bộ kho dữ liệu NCKH nội bộ - đánh giá mức độ tương đồng, cảnh báo đạo văn</p>
            <textarea value={plagiarismText} onChange={e => setPlagiarismText(e.target.value)} placeholder="Dán nội dung cần kiểm tra hoặc upload file ở tab OCR..." className="plag-textarea" />
            <div className="plag-toolbar">
              <span className="plag-count">{plagiarismText.length} ký tự · {plagiarismText.split(/\s+/).filter(Boolean).length} từ</span>
              <button onClick={handleCheckPlagiarism} disabled={checkingPlagiarism || plagiarismText.length < 20} className="btn-check">
                {checkingPlagiarism ? <Loader2 size={16} className="spin" /> : <Search size={16} />}
                {checkingPlagiarism ? 'Đang phân tích...' : 'Kiểm tra đạo văn'}
              </button>
            </div>
          </div>

          {similarity && (
            <>
              {/* Tổng quan */}
              <div className="plag-overview">
                <div className={`plag-main-score ${similarity.riskLevel}`}>
                  <div className="plag-ring">
                    <svg viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,.2)" strokeWidth="3" />
                      <circle cx="18" cy="18" r="15.9" fill="none" stroke="#fff" strokeWidth="3"
                        strokeDasharray={`${Math.min(similarity.maxSimilarity, 100)} ${100 - Math.min(similarity.maxSimilarity, 100)}`}
                        strokeLinecap="round" transform="rotate(-90 18 18)" />
                    </svg>
                    <div className="plag-ring-center">
                      <span>{similarity.maxSimilarity.toFixed(1)}%</span>
                      <small>Cao nhất</small>
                    </div>
                  </div>
                  <div className="plag-verdict">
                    {similarity.riskLevel === 'critical' || similarity.riskLevel === 'high'
                      ? <AlertTriangle size={24} />
                      : similarity.riskLevel === 'medium'
                      ? <Search size={24} />
                      : <CheckCircle size={24} />}
                    <strong>{similarity.verdict}</strong>
                    <p>So sánh với {similarity.totalCompared} công trình trong hệ thống</p>
                  </div>
                </div>

                <div className="plag-stats-grid">
                  <div className="plag-stat"><span className="plag-stat-val">{similarity.maxSimilarity.toFixed(1)}%</span><span className="plag-stat-label">Tương đồng cao nhất</span></div>
                  <div className="plag-stat"><span className="plag-stat-val">{similarity.avgSimilarity.toFixed(1)}%</span><span className="plag-stat-label">Tương đồng trung bình</span></div>
                  <div className="plag-stat"><span className="plag-stat-val" style={{ color: similarity.highRiskCount > 0 ? '#dc2626' : '#10b981' }}>{similarity.highRiskCount}</span><span className="plag-stat-label">Công trình trùng cao</span></div>
                  <div className="plag-stat"><span className="plag-stat-val">{similarity.totalCompared}</span><span className="plag-stat-label">Tổng so sánh</span></div>
                </div>
              </div>

              {/* Chi tiết từng công trình */}
              {similarity.results?.length > 0 && (
                <div className="surface-card plag-detail-card">
                  <h3 className="plag-section-title"><Search size={16} /> Chi tiết so sánh ({similarity.results.length} công trình)</h3>
                  <div className="plag-items">
                    {similarity.results.slice(0, 15).map((r: any) => {
                      const risk = r.riskLevel || (r.similarity > 30 ? 'high' : r.similarity > 15 ? 'medium' : 'safe');
                      return (
                        <div key={r.workId} className={`plag-work-item risk-${risk}`}>
                          <div className="plag-work-bar" style={{ width: `${Math.min(r.similarity * 2, 100)}%` }} />
                          <div className="plag-work-content">
                            <div className="plag-work-head">
                              <span className="plag-work-title">{r.title}</span>
                              <span className={`plag-work-pct ${risk}`}>{r.similarity.toFixed(1)}%</span>
                            </div>
                            <div className="plag-work-meta">
                              {r.authors && <span>{r.authors}</span>}
                              {r.user?.department && <><span>·</span><span>{r.user.department}</span></>}
                              {r.createdAt && <><span>·</span><span>{new Date(r.createdAt).getFullYear()}</span></>}
                              <span className={`plag-risk-badge ${risk}`}>
                                {risk === 'high' ? 'Cao' : risk === 'medium' ? 'TB' : risk === 'low' ? 'Thấp' : 'An toàn'}
                              </span>
                            </div>
                            {r.keywords?.length > 0 && (
                              <div className="plag-work-kws">
                                {r.keywords.slice(0, 4).map((kw: string) => <span key={kw} className="plag-kw">{kw}</span>)}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="plag-guide">
                    <h4>Hướng dẫn đánh giá kết quả</h4>
                    <div className="plag-guide-items">
                      <div><span className="plag-guide-dot critical" /><strong>&ge;50%:</strong> Đạo văn nghiêm trọng - cần xem xét lại</div>
                      <div><span className="plag-guide-dot high" /><strong>30-50%:</strong> Trùng lặp đáng kể - cần trích dẫn</div>
                      <div><span className="plag-guide-dot medium" /><strong>15-30%:</strong> Tương đồng trung bình - nên tham khảo</div>
                      <div><span className="plag-guide-dot safe" /><strong>&lt;15%:</strong> An toàn - nội dung gốc</div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {!similarity && !checkingPlagiarism && (
            <div className="surface-card plag-empty">
              <Search size={48} style={{ opacity: .15 }} />
              <h3>Chưa có kết quả</h3>
              <p>Nhập văn bản và nhấn "Kiểm tra đạo văn" để bắt đầu phân tích</p>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB: Trends ─── */}
      {activeTab === 'trends' && (
        <div className="trends-wrap">
          {!trends && !loadingTrends && (
            <div className="surface-card trends-empty">
              <BarChart3 size={48} style={{ opacity: .15 }} />
              <h3>Phân tích xu hướng nghiên cứu</h3>
              <p>Thống kê toàn diện: từ khóa hot, tăng trưởng, tác giả top, phân bố khoa/cấp/loại</p>
              <button onClick={handleLoadTrends} className="btn-check" style={{ background: 'var(--signature-gradient)' }}>
                <TrendingUp size={16} /> Bắt đầu phân tích
              </button>
            </div>
          )}

          {loadingTrends && (
            <div className="surface-card trends-empty">
              <Loader2 size={40} className="spin" color="var(--primary-indigo)" />
              <h3>Đang phân tích dữ liệu...</h3>
              <p>Tổng hợp từ toàn bộ kho công trình NCKH</p>
            </div>
          )}

          {trends && (
            <>
              {/* Overview stats */}
              <div className="trends-overview">
                <div className="surface-card trend-overview-stat primary">
                  <BookOpen size={22} />
                  <div>
                    <span className="trend-overview-val">{trends.overview?.total || 0}</span>
                    <span className="trend-overview-label">Tổng công trình</span>
                  </div>
                </div>
                <div className="surface-card trend-overview-stat">
                  <TrendingUp size={22} />
                  <div>
                    <span className="trend-overview-val" style={{ color: (trends.overview?.growthRate || 0) >= 0 ? '#10b981' : '#dc2626' }}>
                      {(trends.overview?.growthRate || 0) >= 0 ? '+' : ''}{trends.overview?.growthRate || 0}%
                    </span>
                    <span className="trend-overview-label">Tăng trưởng YoY</span>
                  </div>
                </div>
                <div className="surface-card trend-overview-stat">
                  <Sparkles size={22} />
                  <div>
                    <span className="trend-overview-val">{trends.overview?.avgAiScore || 0}</span>
                    <span className="trend-overview-label">Điểm AI TB</span>
                  </div>
                </div>
                <div className="surface-card trend-overview-stat">
                  <BarChart3 size={22} />
                  <div>
                    <span className="trend-overview-val">{trends.topDepartments?.length || 0}</span>
                    <span className="trend-overview-label">Khoa tham gia</span>
                  </div>
                </div>
              </div>

              {/* AI Insights */}
              {trends.insights?.length > 0 && (
                <div className="surface-card trend-insights">
                  <h3><Sparkles size={16} /> Phân tích AI</h3>
                  <div className="trend-insight-list">
                    {trends.insights.map((insight: string, i: number) => (
                      <div key={i} className="trend-insight-item">
                        <span className="trend-insight-num">{i + 1}</span>
                        <span>{insight}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="trends-grid">
                {/* Top Keywords */}
                <div className="surface-card trend-card">
                  <h3><Sparkles size={16} /> Top từ khóa nghiên cứu</h3>
                  <div className="trend-keywords">
                    {trends.topKeywords?.slice(0, 20).map((kw: any, idx: number) => (
                      <div key={kw.keyword} className="trend-kw-item">
                        <span className="trend-kw-rank">{idx + 1}</span>
                        <span className="trend-kw-name">{kw.keyword}</span>
                        <div className="trend-kw-bar-wrap">
                          <div className="trend-kw-bar" style={{ width: `${Math.max((kw.count / (trends.topKeywords[0]?.count || 1)) * 100, 8)}%` }} />
                        </div>
                        <span className="trend-kw-count">{kw.count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* By Year - Growth chart */}
                <div className="surface-card trend-card">
                  <h3><TrendingUp size={16} /> Tăng trưởng theo năm</h3>
                  {trends.byYear?.length > 0 ? (
                    <>
                      <div className="trend-bar-chart">
                        {trends.byYear.map((y: any) => {
                          const max = Math.max(...trends.byYear.map((x: any) => x.count), 1);
                          const pct = (y.count / max) * 100;
                          return (
                            <div key={y.year} className="trend-bar-col">
                              <div className="trend-bar-col-val">{y.count}</div>
                              <div className="trend-bar-col-bar" style={{ height: `${pct}%` }} />
                              <div className="trend-bar-col-label">{y.year}</div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  ) : <p className="trend-empty">Chưa đủ dữ liệu theo năm</p>}
                </div>

                {/* By Type */}
                <div className="surface-card trend-card">
                  <h3><FileJson size={16} /> Phân bố theo loại hình</h3>
                  <div className="trend-bars">
                    {trends.byType?.map((t: any) => (
                      <div key={t.type} className="trend-bar-row">
                        <span className="trend-bar-label">{TYPE_LABELS[t.type] || t.type}</span>
                        <div className="trend-bar"><div className="trend-bar-fill" style={{ width: `${t.percentage}%` }} /></div>
                        <span className="trend-bar-pct">{t.percentage}%</span>
                        <span className="trend-bar-count">{t.count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* By Level */}
                <div className="surface-card trend-card">
                  <h3><BarChart3 size={16} /> Phân bố theo cấp độ</h3>
                  <div className="trend-bars">
                    {trends.byLevel?.map((l: any) => (
                      <div key={l.level} className="trend-bar-row">
                        <span className="trend-bar-label">{LEVEL_LABELS[l.level] || l.level}</span>
                        <div className="trend-bar"><div className="trend-bar-fill green" style={{ width: `${l.percentage}%` }} /></div>
                        <span className="trend-bar-pct">{l.percentage}%</span>
                        <span className="trend-bar-count">{l.count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top Authors */}
                {trends.topAuthors?.length > 0 && (
                  <div className="surface-card trend-card">
                    <h3><BookOpen size={16} /> Top tác giả nhiều công trình</h3>
                    <div className="trend-author-list">
                      {trends.topAuthors.slice(0, 8).map((a: any, idx: number) => (
                        <div key={idx} className="trend-author-item">
                          <span className="trend-author-rank">#{idx + 1}</span>
                          <div className="trend-author-avatar">{(a.name || 'U')[0]}</div>
                          <div className="trend-author-info">
                            <span className="trend-author-name">{a.name}</span>
                            {a.department && <span className="trend-author-dept">{a.department}</span>}
                          </div>
                          <span className="trend-author-count">{a.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Top Departments */}
                {trends.topDepartments?.length > 0 && (
                  <div className="surface-card trend-card">
                    <h3><BarChart3 size={16} /> Top khoa / phòng ban</h3>
                    <div className="trend-bars">
                      {trends.topDepartments.slice(0, 6).map((d: any) => {
                        const max = trends.topDepartments[0].count;
                        return (
                          <div key={d.department} className="trend-bar-row">
                            <span className="trend-bar-label" title={d.department}>{d.department.substring(0, 20)}</span>
                            <div className="trend-bar"><div className="trend-bar-fill" style={{ width: `${(d.count / max) * 100}%` }} /></div>
                            <span className="trend-bar-count">{d.count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ─── TAB: Chat ─── */}
      {activeTab === 'chat' && (
        <div className="surface-card chat-container">
          <div className="card-header"><MessageCircle size={18} color="var(--primary-indigo)" /><span>Trợ lý AI Nghiên cứu</span></div>
          <div className="chat-body">
            {chatMessages.map((m, i) => (
              <div key={i} className={`chat-msg ${m.role}`}>
                {m.role === 'bot' && <div className="chat-avatar"><Sparkles size={14} /></div>}
                <div className="chat-bubble">{m.text}</div>
              </div>
            ))}
            {chatLoading && (
              <div className="chat-msg bot">
                <div className="chat-avatar"><Sparkles size={14} /></div>
                <div className="chat-bubble"><Loader2 size={14} className="spin" style={{ display: 'inline-block', marginRight: 6 }} /> Đang suy nghĩ...</div>
              </div>
            )}
          </div>
          <div className="chat-input-bar">
            <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleChat()} placeholder="Hỏi về phương pháp nghiên cứu, phân tích dữ liệu, gợi ý cải thiện..." />
            <button onClick={handleChat} disabled={chatLoading || !chatInput.trim()} className="chat-send-btn"><Send size={18} /></button>
          </div>
        </div>
      )}

      <style>{aiStyles}</style>
    </div>
  );
}

function MetaField({ label, value }: { label: string; value: string }) {
  return (
    <div className="meta-field">
      <label>{label}</label>
      <p>{value}</p>
    </div>
  );
}

const aiStyles = `
  .ai-page { display: flex; flex-direction: column; gap: 1.5rem; padding-bottom: 3rem; }
  .ai-header h1 { font-size: 1.75rem; font-weight: 800; }
  .ai-header p { color: var(--on-surface-muted); font-size: 0.9rem; margin-top: 2px; }

  .tab-bar { display: flex; gap: 4px; background: var(--surface-low); padding: 4px; border-radius: 14px; width: fit-content; }
  .tab-btn { display: flex; align-items: center; gap: 6px; padding: 0.625rem 1.25rem; border-radius: 10px; border: none; background: transparent; font-weight: 700; font-size: 0.8125rem; cursor: pointer; color: var(--on-surface-muted); transition: all 0.2s; white-space: nowrap; }
  .tab-btn.active { background: white; color: var(--primary-indigo); box-shadow: 0 2px 8px rgba(0,0,0,0.06); }

  .card-header { display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 0.9rem; margin-bottom: 1rem; }
  .card-header .conf-pill { margin-left: auto; font-size: 0.7rem; font-weight: 800; padding: 3px 8px; border-radius: 4px; }
  .conf-pill.high { background: #d1fae5; color: #059669; }
  .conf-pill.mid { background: #fef3c7; color: #b45309; }
  .conf-pill.low { background: #fee2e2; color: #dc2626; }

  /* OCR Layout */
  .ocr-layout { display: grid; grid-template-columns: 380px 1fr; gap: 1.5rem; align-items: start; }
  .ocr-left { display: flex; flex-direction: column; gap: 1rem; }
  .upload-card, .meta-card { padding: 1.5rem; }
  .preview-card { padding: 1.5rem; }

  .drop-zone { border: 2px dashed var(--surface-variant); border-radius: 12px; padding: 2rem; text-align: center; cursor: pointer; transition: border-color 0.2s; }
  .drop-zone:hover { border-color: var(--primary-indigo); }
  .drop-main { font-weight: 600; margin: 8px 0 4px; }
  .drop-sub { font-size: 0.75rem; color: var(--on-surface-muted); }

  /* Upload mode switch */
  .upload-mode-switch { display: flex; gap: .35rem; padding: 4px; background: var(--surface-low); border-radius: 10px; margin-bottom: 1rem; }
  .upload-mode-btn {
    flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: .35rem;
    padding: .5rem .75rem; background: transparent; border: none; border-radius: 8px;
    font-size: .78rem; font-weight: 600; color: var(--on-surface-muted); cursor: pointer;
    transition: all .15s; position: relative;
  }
  .upload-mode-btn:hover { color: var(--on-surface); }
  .upload-mode-btn.active { background: #fff; color: var(--primary-indigo); box-shadow: 0 1px 3px rgba(0,0,0,.08); }
  .upload-mode-tag {
    background: #10b981; color: #fff; font-size: .6rem; font-weight: 700;
    padding: 1px 6px; border-radius: 100px; margin-left: .25rem;
  }

  /* Job progress */
  .job-progress-card {
    margin-top: 1rem; padding: 1rem 1.15rem;
    background: var(--surface-low); border: 1.5px solid var(--surface-variant);
    border-radius: 12px; transition: border-color .3s;
  }
  .job-progress-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: .65rem; gap: .5rem; }
  .job-progress-id { font-family: 'SF Mono', Monaco, Consolas, monospace; font-size: .75rem; color: var(--on-surface-muted); margin-bottom: .35rem; }
  .job-status-pill { display: inline-flex; align-items: center; gap: .3rem; padding: .2rem .6rem; border-radius: 100px; font-size: .72rem; font-weight: 700; }
  .job-progress-pct { font-size: 1.25rem; font-weight: 800; color: var(--on-surface); font-variant-numeric: tabular-nums; }
  .job-progress-bar { height: 6px; background: var(--surface-variant); border-radius: 100px; overflow: hidden; }
  .job-progress-fill { height: 100%; transition: width .4s; border-radius: 100px; }
  .job-progress-err { margin-top: .5rem; font-size: .78rem; color: #dc2626; }
  .job-progress-msg { margin-top: .5rem; font-size: .8rem; color: #059669; font-weight: 600; }

  .meta-chips { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 12px; }
  .chip { padding: 3px 8px; background: var(--surface-low); border-radius: 4px; font-size: 0.7rem; font-weight: 600; }

  .meta-field { margin-bottom: 10px; }
  .meta-field label { font-size: 0.65rem; font-weight: 800; color: var(--on-surface-muted); text-transform: uppercase; letter-spacing: 0.04em; display: block; margin-bottom: 3px; }
  .meta-field p { font-size: 0.8rem; line-height: 1.5; padding: 6px 10px; background: var(--surface-low); border-radius: 6px; }
  .kw-list { display: flex; flex-wrap: wrap; gap: 4px; }
  .kw { padding: 2px 8px; background: #eef2ff; color: var(--primary-indigo); border-radius: 4px; font-size: 0.7rem; font-weight: 700; }

  .summarize-section { margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--surface-low); }
  .btn-summarize { background: linear-gradient(135deg, #2563eb, #3b82f6); color: white; border: none; padding: 8px 16px; border-radius: 8px; font-weight: 700; font-size: 0.8rem; cursor: pointer; display: flex; align-items: center; gap: 6px; width: 100%; justify-content: center; }
  .btn-summarize:disabled { opacity: 0.6; cursor: not-allowed; }
  .summary-box { margin-top: 10px; padding: 12px; background: #f0fdf4; border-radius: 8px; border-left: 3px solid #10b981; }
  .summary-header { font-size: 0.7rem; font-weight: 800; color: #059669; display: flex; align-items: center; gap: 4px; margin-bottom: 6px; }
  .summary-box p { font-size: 0.8rem; line-height: 1.6; color: #1e40af; }

  /* Preview tabs */
  .view-tabs { margin-left: auto; display: flex; gap: 3px; }
  .vtab { display: flex; align-items: center; gap: 3px; padding: 3px 8px; border-radius: 5px; border: none; background: var(--surface-low); color: var(--on-surface-muted); font-size: 0.65rem; font-weight: 700; cursor: pointer; }
  .vtab.active { background: var(--primary-indigo); color: white; }

  /* Text preview */
  .text-preview { display: flex; flex-direction: column; }
  .text-toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
  .text-info { font-size: 0.7rem; color: var(--on-surface-muted); font-weight: 600; }
  .copy-btn { display: flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 6px; border: 1px solid var(--surface-variant); background: var(--surface-lowest); cursor: pointer; font-size: 0.7rem; font-weight: 600; color: var(--on-surface-muted); }
  .text-content { background: var(--surface-low); padding: 14px; border-radius: 10px; font-size: 0.8rem; line-height: 1.7; max-height: 500px; overflow: auto; white-space: pre-wrap; font-family: inherit; }
  .code-block { padding: 14px; border-radius: 10px; font-size: 0.72rem; line-height: 1.6; max-height: 600px; overflow: auto; font-family: "JetBrains Mono", "Fira Code", monospace; white-space: pre-wrap; word-break: break-word; }
  .code-block.dark { background: #0f172a; color: #e2e8f0; border: 1px solid #1e293b; }
  .json-view { width: 100%; }
  .json-pre { max-width: 100%; }
  .json-pre::-webkit-scrollbar { height: 8px; }
  .json-pre::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
  .code-block.light { background: #fffbeb; color: #1e40af; white-space: pre-wrap; }

  /* BBox */
  .bbox-toolbar { display: flex; gap: 8px; align-items: center; margin-bottom: 8px; flex-wrap: wrap; }
  .bbox-toggle { display: flex; align-items: center; gap: 4px; font-size: 0.7rem; font-weight: 600; cursor: pointer; }
  .bbox-select { font-size: 0.7rem; padding: 3px 8px; border-radius: 5px; border: 1px solid var(--surface-variant); background: var(--surface-lowest); }
  .zoom-btns { display: flex; align-items: center; gap: 3px; margin-left: auto; }
  .zoom-btns button { width: 24px; height: 24px; border: 1px solid var(--surface-variant); border-radius: 4px; background: var(--surface-lowest); cursor: pointer; display: flex; align-items: center; justify-content: center; }
  .zoom-btns span { font-size: 0.7rem; font-weight: 700; min-width: 32px; text-align: center; }
  .bbox-canvas-wrap { overflow: auto; max-height: 450px; border: 1px solid var(--surface-variant); border-radius: 8px; background: #f8fafc; }
  .bbox-canvas { position: relative; background: white; margin: 0 auto; min-height: 250px; }
  .empty-bbox { text-align: center; padding: 3rem; color: var(--on-surface-muted); }
  .empty-bbox p { font-size: 0.8rem; margin-top: 8px; }
  .bbox-table-wrap { }
  .bbox-info-banner { display: flex; align-items: center; gap: 8px; padding: 10px 14px; background: #eef2ff; border-radius: 8px; margin-bottom: 10px; font-size: 0.8rem; font-weight: 600; color: var(--primary-indigo); }
  .bbox-text-lines { max-height: 450px; overflow: auto; border: 1px solid var(--surface-variant); border-radius: 8px; background: var(--surface-lowest); }
  .bbox-line-row { display: flex; gap: 0; border-bottom: 1px solid var(--surface-variant); font-size: 0.75rem; line-height: 1.6; }
  .bbox-line-row:last-child { border: none; }
  .bbox-line-num { width: 40px; padding: 4px 8px; text-align: right; color: var(--on-surface-variant); background: var(--surface-low); font-weight: 600; font-size: 0.7rem; flex-shrink: 0; font-family: monospace; }
  .bbox-line-text { padding: 4px 10px; flex: 1; white-space: pre-wrap; word-break: break-word; }
  .bbox-legend { display: flex; gap: 12px; font-size: 0.7rem; margin-top: 8px; color: var(--on-surface-muted); }
  .bbox-legend span { display: flex; align-items: center; gap: 4px; }
  .dot { width: 8px; height: 8px; border-radius: 2px; display: inline-block; }
  .dot.green { background: #10b981; } .dot.yellow { background: #f59e0b; } .dot.red { background: #ef4444; }

  /* Plagiarism - NEW */
  .plag-wrap { display: flex; flex-direction: column; gap: 1rem; }
  .plag-input-card { padding: 1.5rem !important; }
  .plag-desc { font-size: .8rem; color: var(--on-surface-muted); margin-bottom: 1rem; }
  .plag-textarea { width: 100%; min-height: 140px; padding: 14px; border: 1.5px solid var(--surface-variant); border-radius: 10px; font-size: .875rem; font-family: inherit; outline: none; resize: vertical; background: var(--surface-lowest); }
  .plag-textarea:focus { border-color: var(--primary-indigo); }
  .plag-toolbar { display: flex; justify-content: space-between; align-items: center; margin-top: 10px; }
  .plag-count { font-size: .75rem; color: var(--on-surface-muted); font-weight: 600; }
  .btn-check { background: #dc2626; color: #fff; border: none; padding: 10px 20px; border-radius: 10px; font-weight: 700; font-size: .85rem; cursor: pointer; display: flex; align-items: center; gap: 6px; }
  .btn-check:disabled { opacity: .5; cursor: not-allowed; }

  .plag-empty { text-align: center; padding: 3rem !important; color: var(--on-surface-muted); }
  .plag-empty h3 { font-size: 1rem; margin: 1rem 0 .25rem; color: var(--on-surface); }
  .plag-empty p { font-size: .85rem; }

  .plag-overview { display: grid; grid-template-columns: 1fr 380px; gap: 1rem; align-items: stretch; }
  .plag-main-score { display: flex; align-items: center; gap: 1.5rem; padding: 2rem; border-radius: 16px; color: #fff; }
  .plag-main-score.critical, .plag-main-score.high { background: linear-gradient(135deg, #dc2626, #ef4444); }
  .plag-main-score.medium { background: linear-gradient(135deg, #d97706, #f59e0b); }
  .plag-main-score.low, .plag-main-score.safe { background: linear-gradient(135deg, #059669, #10b981); }
  .plag-ring { position: relative; width: 110px; height: 110px; flex-shrink: 0; }
  .plag-ring svg { width: 100%; height: 100%; }
  .plag-ring-center { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; }
  .plag-ring-center span { display: block; font-size: 1.5rem; font-weight: 800; }
  .plag-ring-center small { font-size: .65rem; opacity: .8; }
  .plag-verdict { flex: 1; }
  .plag-verdict strong { display: block; font-size: 1rem; margin-bottom: .375rem; }
  .plag-verdict p { font-size: .8rem; opacity: .85; }

  .plag-stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: .75rem; }
  .plag-stat { background: var(--surface-lowest); padding: 1rem; border-radius: 12px; text-align: center; box-shadow: 0 1px 3px rgba(15,23,42,.04); }
  .plag-stat-val { display: block; font-size: 1.5rem; font-weight: 800; color: var(--primary-indigo); line-height: 1; margin-bottom: 4px; }
  .plag-stat-label { font-size: .7rem; color: var(--on-surface-muted); font-weight: 600; }

  .plag-detail-card { padding: 1.5rem !important; }
  .plag-section-title { display: flex; align-items: center; gap: 6px; font-size: .95rem; font-weight: 700; margin-bottom: 1rem; }
  .plag-items { display: flex; flex-direction: column; gap: .625rem; }
  .plag-work-item { position: relative; padding: 1rem; background: var(--surface-low); border-radius: 10px; overflow: hidden; }
  .plag-work-bar { position: absolute; top: 0; left: 0; bottom: 0; opacity: .15; z-index: 0; }
  .plag-work-item.risk-high .plag-work-bar { background: #dc2626; }
  .plag-work-item.risk-medium .plag-work-bar { background: #d97706; }
  .plag-work-item.risk-low .plag-work-bar { background: #0891b2; }
  .plag-work-item.risk-safe .plag-work-bar { background: #10b981; }
  .plag-work-content { position: relative; z-index: 1; }
  .plag-work-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; margin-bottom: 4px; }
  .plag-work-title { font-weight: 700; font-size: .875rem; flex: 1; }
  .plag-work-pct { font-size: 1.125rem; font-weight: 800; white-space: nowrap; }
  .plag-work-pct.high { color: #dc2626; }
  .plag-work-pct.medium { color: #d97706; }
  .plag-work-pct.low { color: #0891b2; }
  .plag-work-pct.safe { color: #10b981; }
  .plag-work-meta { display: flex; gap: 6px; align-items: center; font-size: .7rem; color: var(--on-surface-muted); flex-wrap: wrap; margin-bottom: 6px; }
  .plag-risk-badge { margin-left: auto; padding: 2px 8px; border-radius: 100px; font-size: .6rem; font-weight: 800; text-transform: uppercase; }
  .plag-risk-badge.high { background: #fee2e2; color: #dc2626; }
  .plag-risk-badge.medium { background: #fef3c7; color: #d97706; }
  .plag-risk-badge.low { background: #dbeafe; color: #0891b2; }
  .plag-risk-badge.safe { background: #d1fae5; color: #059669; }
  .plag-work-kws { display: flex; gap: 4px; flex-wrap: wrap; }
  .plag-kw { background: #eff6ff; color: var(--primary-indigo); padding: 1px 8px; border-radius: 4px; font-size: .65rem; font-weight: 700; }

  .plag-guide { margin-top: 1.25rem; padding: 1rem; background: var(--surface-low); border-radius: 10px; }
  .plag-guide h4 { font-size: .8rem; font-weight: 700; margin-bottom: .625rem; }
  .plag-guide-items { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: .75rem; color: var(--on-surface-muted); }
  .plag-guide-items > div { display: flex; align-items: center; gap: 6px; }
  .plag-guide-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
  .plag-guide-dot.critical { background: #dc2626; }
  .plag-guide-dot.high { background: #f59e0b; }
  .plag-guide-dot.medium { background: #3b82f6; }
  .plag-guide-dot.safe { background: #10b981; }

  /* Trends - NEW */
  .trends-wrap { display: flex; flex-direction: column; gap: 1rem; }
  .trends-empty { text-align: center; padding: 3rem !important; color: var(--on-surface-muted); display: flex; flex-direction: column; align-items: center; gap: .625rem; }
  .trends-empty h3 { font-size: 1.125rem; color: var(--on-surface); }
  .trends-empty p { font-size: .85rem; max-width: 400px; }

  .trends-overview { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; }
  .trend-overview-stat { display: flex; align-items: center; gap: 1rem; padding: 1.25rem !important; }
  .trend-overview-stat > svg { color: var(--on-surface-muted); }
  .trend-overview-stat.primary > svg { color: var(--primary-indigo); }
  .trend-overview-val { display: block; font-size: 1.5rem; font-weight: 800; color: var(--on-surface); line-height: 1; }
  .trend-overview-label { font-size: .7rem; color: var(--on-surface-muted); font-weight: 600; }

  .trend-insights { padding: 1.5rem !important; background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%) !important; border: 1.5px solid #bfdbfe; }
  .trend-insights h3 { display: flex; align-items: center; gap: 8px; font-size: .95rem; font-weight: 700; color: var(--primary-indigo); margin-bottom: .75rem; }
  .trend-insight-list { display: flex; flex-direction: column; gap: .5rem; }
  .trend-insight-item { display: flex; gap: 10px; align-items: flex-start; font-size: .85rem; line-height: 1.5; color: var(--on-surface); }
  .trend-insight-num { flex-shrink: 0; width: 22px; height: 22px; border-radius: 50%; background: var(--primary-indigo); color: #fff; display: flex; align-items: center; justify-content: center; font-size: .7rem; font-weight: 800; }

  .trends-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
  .trend-card { padding: 1.5rem !important; }
  .trend-card h3 { display: flex; align-items: center; gap: 6px; font-size: .9rem; font-weight: 700; margin-bottom: 1rem; }
  .trend-empty { font-size: .8rem; color: var(--on-surface-muted); padding: 1rem 0; text-align: center; }

  .trend-keywords { display: flex; flex-direction: column; gap: 6px; max-height: 400px; overflow-y: auto; }
  .trend-kw-item { display: flex; align-items: center; gap: 8px; font-size: .8rem; }
  .trend-kw-rank { width: 22px; font-weight: 800; color: var(--on-surface-muted); font-size: .7rem; }
  .trend-kw-name { flex-shrink: 0; min-width: 100px; max-width: 140px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .trend-kw-bar-wrap { flex: 1; height: 6px; background: var(--surface-low); border-radius: 3px; overflow: hidden; }
  .trend-kw-bar { height: 100%; background: var(--signature-gradient); border-radius: 3px; transition: width .6s; }
  .trend-kw-count { font-weight: 800; min-width: 24px; text-align: right; color: var(--primary-indigo); }

  .trend-bar-chart { display: flex; align-items: flex-end; gap: 8px; height: 220px; padding: .5rem 0; border-bottom: 1.5px solid var(--surface-variant); }
  .trend-bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; height: 100%; justify-content: flex-end; }
  .trend-bar-col-val { font-size: .75rem; font-weight: 800; color: var(--primary-indigo); }
  .trend-bar-col-bar { width: 100%; max-width: 60px; background: var(--signature-gradient); border-radius: 6px 6px 0 0; min-height: 8px; transition: height .6s; }
  .trend-bar-col-label { font-size: .7rem; color: var(--on-surface-muted); font-weight: 600; }

  .trend-bars { display: flex; flex-direction: column; gap: 8px; }
  .trend-bar-row { display: flex; align-items: center; gap: 8px; font-size: .8rem; }
  .trend-bar-label { flex-shrink: 0; min-width: 110px; max-width: 140px; color: var(--on-surface-muted); font-weight: 600; font-size: .75rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .trend-bar { flex: 1; height: 8px; background: var(--surface-low); border-radius: 4px; overflow: hidden; }
  .trend-bar-fill { height: 100%; background: var(--primary-indigo); border-radius: 4px; transition: width .6s; }
  .trend-bar-fill.green { background: #10b981; }
  .trend-bar-pct { font-size: .7rem; color: var(--on-surface-muted); font-weight: 600; min-width: 38px; text-align: right; }
  .trend-bar-count { font-weight: 800; min-width: 24px; text-align: right; color: var(--on-surface); font-size: .75rem; }

  .trend-author-list { display: flex; flex-direction: column; gap: 8px; }
  .trend-author-item { display: flex; align-items: center; gap: 10px; padding: 8px; background: var(--surface-low); border-radius: 8px; }
  .trend-author-rank { font-size: .7rem; font-weight: 800; color: var(--on-surface-muted); width: 24px; }
  .trend-author-avatar { width: 32px; height: 32px; border-radius: 50%; background: var(--signature-gradient); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: .8rem; flex-shrink: 0; }
  .trend-author-info { flex: 1; min-width: 0; }
  .trend-author-name { display: block; font-weight: 700; font-size: .8rem; }
  .trend-author-dept { font-size: .65rem; color: var(--on-surface-muted); }
  .trend-author-count { font-weight: 800; color: var(--primary-indigo); font-size: 1rem; }

  /* Chat */
  .chat-container { display: flex; flex-direction: column; height: 560px; padding: 0 !important; overflow: hidden; }
  .chat-container .card-header { padding: 1rem 1.5rem; margin-bottom: 0; border-bottom: 1px solid var(--surface-low); }
  .chat-body { flex: 1; padding: 1.25rem; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; }
  .chat-msg { display: flex; gap: 8px; align-items: flex-start; }
  .chat-msg.user { flex-direction: row-reverse; }
  .chat-avatar { width: 28px; height: 28px; border-radius: 50%; background: #eef2ff; color: var(--primary-indigo); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .chat-bubble { padding: 10px 14px; border-radius: 14px; font-size: 0.8125rem; line-height: 1.5; max-width: 75%; white-space: pre-wrap; }
  .chat-msg.bot .chat-bubble { background: var(--surface-low); }
  .chat-msg.user .chat-bubble { background: var(--primary-indigo); color: white; }
  .chat-input-bar { display: flex; gap: 8px; padding: 1rem 1.25rem; border-top: 1px solid var(--surface-low); }
  .chat-input-bar input { flex: 1; border: 1.5px solid var(--surface-variant); outline: none; padding: 10px 14px; border-radius: 12px; font-size: 0.85rem; background: var(--surface-lowest); }
  .chat-input-bar input:focus { border-color: var(--primary-indigo); }
  .chat-send-btn { background: var(--primary-indigo); color: white; border: none; padding: 10px 14px; border-radius: 12px; cursor: pointer; }
  .chat-send-btn:disabled { opacity: 0.4; }

  .spin { animation: spin 1s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  @media (max-width: 1024px) {
    .ocr-layout { grid-template-columns: 1fr; }
    .trends-grid { grid-template-columns: 1fr; }
  }
`;
