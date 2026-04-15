import { useState, useRef, useCallback } from 'react';
import {
  Sparkles, Search, AlertTriangle, CheckCircle,
  Loader2, Brain, TrendingUp, Code, FileJson, Eye, Layers,
  ZoomIn, ZoomOut, Copy, Check, FileSearch, MessageCircle,
  Send, BookOpen, BarChart3, FileUp, Type,
} from 'lucide-react';
import { aiService } from '../../services/aiService';
import { useToast } from '../../components/common/Toast';

type ViewMode = 'visual' | 'json' | 'markdown' | 'text';
type Tab = 'ocr' | 'plagiarism' | 'trends' | 'chat';

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
    try {
      const result = await aiService.uploadAndProcess(file);
      setExtraction(result);
      if (result.extraction?.text) setPlagiarismText(result.extraction.text.substring(0, 2000));
    } catch (err: any) {
      showError(err.response?.data?.message || 'Upload thất bại');
    } finally { setUploading(false); }
  }

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
    return JSON.stringify({
      metadata: { title: ext.title, authors: ext.authors, abstract: ext.abstract, keywords: ext.keywords || [] },
      ocr: { engine: ext.engine, confidence: ext.confidence, totalPages: ext.pages?.length || 0 },
      text: ext.text || '',
      annotations: (ext.annotations || []).slice(0, 100),
      lineAnnotations: (ext.lineAnnotations || []).slice(0, 50),
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
              <div className="drop-zone" onClick={() => fileRef.current?.click()}>
                {uploading ? (
                  <><Loader2 size={32} className="spin" color="var(--primary-indigo)" /><p className="drop-main">Đang xử lý OCR...</p><p className="drop-sub">10-30 giây tùy kích thước file</p></>
                ) : (
                  <><FileUp size={32} color="var(--on-surface-muted)" /><p className="drop-main">Kéo thả hoặc click chọn file</p><p className="drop-sub">PDF, PNG, JPG, TIFF - tối đa 50MB</p></>
                )}
              </div>
              <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.tiff,.bmp,.txt" onChange={handleUpload} style={{ display: 'none' }} />
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
                                  <span style={{ position: 'absolute', top: '50%', left: 3, transform: 'translateY(-50%)', fontSize: Math.max(7, 9 * zoom), color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: a.bbox.width * s - 6 }}>{a.text}</span>
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
                  <div>
                    <div className="text-toolbar">
                      <span className="text-info">Structured JSON</span>
                      <button className="copy-btn" onClick={() => handleCopy(buildJsonOutput())}>{copied ? <Check size={12} color="#10b981" /> : <Copy size={12} />} {copied ? 'Đã copy' : 'Copy'}</button>
                    </div>
                    <pre className="code-block dark">{buildJsonOutput()}</pre>
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
        <div className="surface-card" style={{ padding: '2rem', maxWidth: 800 }}>
          <div className="card-header"><Search size={18} color="#dc2626" /><span>Kiểm tra trùng lặp / Đạo văn</span></div>
          <p style={{ fontSize: '0.85rem', color: 'var(--on-surface-muted)', marginBottom: 16 }}>So sánh nội dung với toàn bộ kho dữ liệu nghiên cứu trong hệ thống</p>
          <textarea value={plagiarismText} onChange={e => setPlagiarismText(e.target.value)} placeholder="Dán nội dung cần kiểm tra (hoặc upload file ở tab OCR)..." className="plag-textarea" />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--on-surface-muted)' }}>{plagiarismText.length} ký tự (tối thiểu 20)</span>
            <button onClick={handleCheckPlagiarism} disabled={checkingPlagiarism || plagiarismText.length < 20} className="btn-check">
              {checkingPlagiarism ? <Loader2 size={16} className="spin" /> : <Search size={16} />}
              {checkingPlagiarism ? 'Đang kiểm tra...' : 'Kiểm tra đạo văn'}
            </button>
          </div>

          {similarity && (
            <div className="plag-result">
              <div className={`plag-score ${similarity.maxSimilarity > 30 ? 'danger' : 'safe'}`}>
                {similarity.maxSimilarity > 30 ? <AlertTriangle size={24} /> : <CheckCircle size={24} />}
                <div>
                  <span className="plag-pct">{similarity.maxSimilarity}%</span>
                  <span className="plag-label">{similarity.maxSimilarity > 30 ? 'Phát hiện trùng lặp cao' : 'Không phát hiện trùng lặp đáng kể'}</span>
                </div>
              </div>
              {similarity.results?.length > 0 && (
                <div className="plag-list">
                  <h4>Kết quả so sánh chi tiết</h4>
                  {similarity.results.slice(0, 10).map((r: any) => (
                    <div key={r.workId} className="plag-item">
                      <span className="plag-item-title">{r.title}</span>
                      <span className={`plag-item-pct ${r.similarity > 30 ? 'high' : ''}`}>{r.similarity}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB: Trends ─── */}
      {activeTab === 'trends' && (
        <div className="surface-card" style={{ padding: '2rem' }}>
          <div className="card-header">
            <BarChart3 size={18} color="var(--primary-violet)" />
            <span>Xu hướng Nghiên cứu</span>
            <button onClick={handleLoadTrends} disabled={loadingTrends} className="btn-load-trends">
              {loadingTrends ? <Loader2 size={14} className="spin" /> : <TrendingUp size={14} />}
              {loadingTrends ? 'Đang phân tích...' : 'Phân tích xu hướng'}
            </button>
          </div>

          {trends ? (
            <div className="trends-grid">
              <div className="trend-section">
                <h4>Top từ khóa nghiên cứu</h4>
                <div className="trend-tags">
                  {trends.topKeywords?.slice(0, 15).map((kw: any) => (
                    <span key={kw.keyword} className="trend-tag" style={{ background: `hsl(${(kw.count * 50) % 360}, 70%, 95%)`, color: `hsl(${(kw.count * 50) % 360}, 70%, 35%)` }}>
                      {kw.keyword} <strong>{kw.count}</strong>
                    </span>
                  ))}
                </div>
              </div>
              <div className="trend-section">
                <h4>Phân bố theo loại</h4>
                {trends.byType?.map((t: any) => (
                  <div key={t.type} className="trend-bar-row">
                    <span className="trend-bar-label">{t.type}</span>
                    <div className="trend-bar"><div className="trend-bar-fill" style={{ width: `${Math.min((t.count / Math.max(...trends.byType.map((x: any) => x.count), 1)) * 100, 100)}%` }} /></div>
                    <span className="trend-bar-count">{t.count}</span>
                  </div>
                ))}
              </div>
              <div className="trend-section">
                <h4>Phân bố theo cấp độ</h4>
                {trends.byLevel?.map((l: any) => (
                  <div key={l.level} className="trend-bar-row">
                    <span className="trend-bar-label">{l.level}</span>
                    <div className="trend-bar"><div className="trend-bar-fill purple" style={{ width: `${Math.min((l.count / Math.max(...trends.byLevel.map((x: any) => x.count), 1)) * 100, 100)}%` }} /></div>
                    <span className="trend-bar-count">{l.count}</span>
                  </div>
                ))}
              </div>
              {trends.byYear?.length > 0 && (
                <div className="trend-section">
                  <h4>Theo năm</h4>
                  {trends.byYear.map((y: any) => (
                    <div key={y.year} className="trend-bar-row">
                      <span className="trend-bar-label">{y.year}</span>
                      <div className="trend-bar"><div className="trend-bar-fill green" style={{ width: `${Math.min((y.count / Math.max(...trends.byYear.map((x: any) => x.count), 1)) * 100, 100)}%` }} /></div>
                      <span className="trend-bar-count">{y.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--on-surface-muted)' }}>
              <BarChart3 size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
              <p>Nhấn "Phân tích xu hướng" để xem thống kê nghiên cứu</p>
            </div>
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

  .meta-chips { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 12px; }
  .chip { padding: 3px 8px; background: var(--surface-low); border-radius: 4px; font-size: 0.7rem; font-weight: 600; }

  .meta-field { margin-bottom: 10px; }
  .meta-field label { font-size: 0.65rem; font-weight: 800; color: var(--on-surface-muted); text-transform: uppercase; letter-spacing: 0.04em; display: block; margin-bottom: 3px; }
  .meta-field p { font-size: 0.8rem; line-height: 1.5; padding: 6px 10px; background: var(--surface-low); border-radius: 6px; }
  .kw-list { display: flex; flex-wrap: wrap; gap: 4px; }
  .kw { padding: 2px 8px; background: #eef2ff; color: var(--primary-indigo); border-radius: 4px; font-size: 0.7rem; font-weight: 700; }

  .summarize-section { margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--surface-low); }
  .btn-summarize { background: linear-gradient(135deg, #4f46e5, #7c3aed); color: white; border: none; padding: 8px 16px; border-radius: 8px; font-weight: 700; font-size: 0.8rem; cursor: pointer; display: flex; align-items: center; gap: 6px; width: 100%; justify-content: center; }
  .btn-summarize:disabled { opacity: 0.6; cursor: not-allowed; }
  .summary-box { margin-top: 10px; padding: 12px; background: #f0fdf4; border-radius: 8px; border-left: 3px solid #10b981; }
  .summary-header { font-size: 0.7rem; font-weight: 800; color: #059669; display: flex; align-items: center; gap: 4px; margin-bottom: 6px; }
  .summary-box p { font-size: 0.8rem; line-height: 1.6; color: #1e293b; }

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
  .code-block { padding: 14px; border-radius: 10px; font-size: 0.72rem; line-height: 1.6; max-height: 500px; overflow: auto; font-family: "JetBrains Mono", "Fira Code", monospace; }
  .code-block.dark { background: #1e293b; color: #e2e8f0; }
  .code-block.light { background: #fffbeb; color: #1e293b; white-space: pre-wrap; }

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

  /* Plagiarism */
  .plag-textarea { width: 100%; min-height: 160px; padding: 14px; border: 1.5px solid var(--surface-variant); border-radius: 12px; font-size: 0.875rem; font-family: inherit; outline: none; resize: vertical; background: var(--surface-lowest); }
  .plag-textarea:focus { border-color: var(--primary-indigo); }
  .btn-check { background: #dc2626; color: white; border: none; padding: 10px 20px; border-radius: 10px; font-weight: 700; font-size: 0.85rem; cursor: pointer; display: flex; align-items: center; gap: 6px; }
  .btn-check:disabled { opacity: 0.5; cursor: not-allowed; }
  .plag-result { margin-top: 20px; }
  .plag-score { display: flex; align-items: center; gap: 16px; padding: 20px; border-radius: 12px; margin-bottom: 16px; }
  .plag-score.safe { background: #d1fae5; color: #065f46; }
  .plag-score.danger { background: #fee2e2; color: #991b1b; }
  .plag-pct { font-size: 2rem; font-weight: 800; display: block; line-height: 1; }
  .plag-label { font-size: 0.85rem; font-weight: 600; }
  .plag-list h4 { font-size: 0.85rem; font-weight: 700; margin-bottom: 8px; }
  .plag-item { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; border-bottom: 1px solid var(--surface-variant); }
  .plag-item-title { flex: 1; font-size: 0.85rem; color: var(--on-surface-muted); margin-right: 12px; }
  .plag-item-pct { font-weight: 800; font-size: 0.9rem; color: var(--on-surface-muted); }
  .plag-item-pct.high { color: #dc2626; }

  /* Trends */
  .btn-load-trends { margin-left: auto; background: var(--primary-indigo); color: white; border: none; padding: 6px 14px; border-radius: 8px; font-weight: 700; font-size: 0.75rem; cursor: pointer; display: flex; align-items: center; gap: 4px; }
  .btn-load-trends:disabled { opacity: 0.5; }
  .trends-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
  .trend-section { }
  .trend-section h4 { font-size: 0.85rem; font-weight: 700; margin-bottom: 10px; }
  .trend-tags { display: flex; flex-wrap: wrap; gap: 6px; }
  .trend-tag { padding: 5px 12px; border-radius: 6px; font-size: 0.75rem; font-weight: 700; display: flex; align-items: center; gap: 4px; }
  .trend-tag strong { font-size: 0.65rem; opacity: 0.7; }
  .trend-bar-row { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
  .trend-bar-label { font-size: 0.75rem; color: var(--on-surface-muted); width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .trend-bar { flex: 1; height: 8px; background: var(--surface-low); border-radius: 4px; overflow: hidden; }
  .trend-bar-fill { height: 100%; background: var(--primary-indigo); border-radius: 4px; transition: width 0.6s ease; }
  .trend-bar-fill.purple { background: #7c3aed; }
  .trend-bar-fill.green { background: #059669; }
  .trend-bar-count { font-size: 0.75rem; font-weight: 800; min-width: 20px; text-align: right; }

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
