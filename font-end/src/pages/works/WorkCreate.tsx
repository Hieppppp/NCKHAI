import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { workService } from '../../services/workService';

export default function WorkCreate() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    title: '', authors: '', abstract: '', type: 'RESEARCH_PROJECT',
    level: 'UNIVERSITY', keywords: '', budget: '', journalName: '', issn: '', doi: '',
  });

  const set = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.title || !form.authors) { setError('Vui lòng nhập tên đề tài và tác giả'); return; }
    setLoading(true);
    setError('');
    try {
      const payload: Record<string, unknown> = {
        title: form.title, authors: form.authors, abstract: form.abstract || undefined,
        type: form.type, level: form.level,
        keywords: form.keywords ? form.keywords.split(',').map((k) => k.trim()).filter(Boolean) : [],
        budget: form.budget ? parseFloat(form.budget) : undefined,
        journalName: form.journalName || undefined, issn: form.issn || undefined, doi: form.doi || undefined,
      };
      const work = await workService.create(payload);
      navigate(`/projects/${work.id}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Đăng ký thất bại');
    } finally { setLoading(false); }
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <button onClick={() => navigate('/projects')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--on-surface-muted)', fontFamily: 'inherit', fontSize: '0.85rem', padding: 0, marginBottom: 16 }}>
        <ArrowLeft size={16} /> Quay lại
      </button>

      <div className="surface-card">
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 4 }}>Đăng ký công trình mới</h1>
        <p style={{ color: 'var(--on-surface-muted)', marginBottom: 24 }}>Điền thông tin đề tài / bài báo / công trình khoa học</p>

        {error && <div style={{ padding: '10px 14px', background: '#fef2f2', color: 'var(--error)', borderRadius: 8, fontSize: '0.85rem', marginBottom: 16 }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <Field label="Tên đề tài *" value={form.title} onChange={(v) => set('title', v)} placeholder="VD: Ứng dụng AI trong chẩn đoán y tế" />
          <Field label="Tác giả *" value={form.authors} onChange={(v) => set('authors', v)} placeholder="VD: PGS.TS Nguyễn Văn A, ThS. Trần Văn B" />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={labelStyle}>Loại công trình</label>
              <select value={form.type} onChange={(e) => set('type', e.target.value)} style={selectStyle}>
                <option value="RESEARCH_PROJECT">Đề tài NCKH</option>
                <option value="JOURNAL_ARTICLE">Bài báo khoa học</option>
                <option value="CONFERENCE_PAPER">Bài hội nghị</option>
                <option value="THESIS">Luận văn / Luận án</option>
                <option value="PATENT">Bằng sáng chế</option>
                <option value="TEXTBOOK">Giáo trình</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Cấp đề tài</label>
              <select value={form.level} onChange={(e) => set('level', e.target.value)} style={selectStyle}>
                <option value="UNIVERSITY">Cấp Trường</option>
                <option value="MINISTRY">Cấp Bộ</option>
                <option value="STATE">Cấp Nhà nước</option>
              </select>
            </div>
          </div>

          <Field label="Tóm tắt" value={form.abstract} onChange={(v) => set('abstract', v)} placeholder="Mô tả ngắn gọn nội dung nghiên cứu..." multiline />
          <Field label="Từ khóa (cách nhau bởi dấu phẩy)" value={form.keywords} onChange={(v) => set('keywords', v)} placeholder="VD: AI, deep learning, y tế, chẩn đoán" />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
            <Field label="Kinh phí (VNĐ)" value={form.budget} onChange={(v) => set('budget', v)} placeholder="50000000" />
            <Field label="Tạp chí / Hội nghị" value={form.journalName} onChange={(v) => set('journalName', v)} placeholder="IEEE Access" />
            <Field label="ISSN / DOI" value={form.issn} onChange={(v) => set('issn', v)} placeholder="1859-1531" />
          </div>

          <button type="submit" disabled={loading} className="btn-signature" style={{ padding: '14px', fontSize: '0.95rem', marginTop: 8 }}>
            {loading && <Loader2 size={18} className="spin" />}
            {loading ? 'Đang đăng ký...' : 'Đăng ký công trình'}
          </button>
        </form>
      </div>
      <style>{`.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, multiline }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; multiline?: boolean }) {
  const Tag = multiline ? 'textarea' : 'input';
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <Tag value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        style={{ ...inputStyle, ...(multiline ? { minHeight: 100, resize: 'vertical' as const } : {}) }} />
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6, color: 'var(--on-surface)' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 14px', border: '1.5px solid var(--surface-variant)', borderRadius: 10, fontSize: '0.9rem', fontFamily: 'inherit', outline: 'none', background: 'var(--surface-lowest)' };
const selectStyle: React.CSSProperties = { ...inputStyle, cursor: 'pointer' };
