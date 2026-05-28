import { useState, useEffect } from 'react';
import {
  Search, Loader2, Trophy, BookOpen, Lightbulb, BookMarked, Calendar, User,
  Building2, Award, Hash,
} from 'lucide-react';
import { workService } from '../services/workService';
import { patentService } from '../services/patentService';
import { textbookService } from '../services/textbookService';

// 3 nguồn công trình đã thành công / được duyệt
const KIND = {
  work: { label: 'Công trình khoa học', icon: BookOpen, color: '#2563eb' },
  patent: { label: 'Bằng sáng chế', icon: Lightbulb, color: '#7c3aed' },
  textbook: { label: 'Giáo trình', icon: BookMarked, color: '#0d9488' },
} as const;

type Kind = keyof typeof KIND;

interface Item {
  key: string;
  kind: Kind;
  title: string;
  authors: string;
  sub?: string;          // dòng phụ (đơn vị cấp / NXB ...)
  statusLabel: string;
  date?: string;
}

const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString('vi-VN') : '');

export const Publications = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'all' | Kind>('all');

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [works, patents, textbooks] = await Promise.all([
          workService.getAll({ category: 'scientific', limit: '100' }).catch(() => ({ data: [] })),
          patentService.getAll({ limit: '100' }).catch(() => ({ data: [] })),
          textbookService.getAll({ limit: '100' }).catch(() => ({ data: [] })),
        ]);

        const merged: Item[] = [];

        for (const w of works.data || []) {
          if (w.status === 'ACCEPTED' || w.status === 'ARCHIVED') {
            merged.push({
              key: `work-${w.id}`, kind: 'work', title: w.title, authors: w.authors,
              sub: w.level === 'STATE' ? 'Cấp Nhà nước' : w.level === 'MINISTRY' ? 'Cấp Bộ' : 'Cấp Trường',
              statusLabel: 'Đã nghiệm thu', date: w.updatedAt || w.createdAt,
            });
          }
        }
        for (const p of patents.data || []) {
          if (p.status === 'GRANTED') {
            merged.push({
              key: `patent-${p.id}`, kind: 'patent', title: p.title, authors: p.inventors,
              sub: [p.patentNo && `Số bằng ${p.patentNo}`, p.issuingAuthority].filter(Boolean).join(' · '),
              statusLabel: 'Đã cấp bằng', date: p.grantDate || p.updatedAt || p.createdAt,
            });
          }
        }
        for (const t of textbooks.data || []) {
          if (t.status === 'APPROVED' || t.status === 'PUBLISHED') {
            merged.push({
              key: `textbook-${t.id}`, kind: 'textbook', title: t.title, authors: t.authors,
              sub: [t.publisher, t.publishYear && `${t.publishYear}`].filter(Boolean).join(' · '),
              statusLabel: t.status === 'PUBLISHED' ? 'Đã xuất bản' : 'Đã nghiệm thu', date: t.updatedAt || t.createdAt,
            });
          }
        }

        merged.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        setItems(merged);
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, []);

  const counts = {
    all: items.length,
    work: items.filter(i => i.kind === 'work').length,
    patent: items.filter(i => i.kind === 'patent').length,
    textbook: items.filter(i => i.kind === 'textbook').length,
  };

  const filtered = items.filter(i =>
    (tab === 'all' || i.kind === tab) &&
    (!search || i.title.toLowerCase().includes(search.toLowerCase()) || i.authors.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="cs">
      {/* Hero */}
      <section className="cs-hero">
        <div className="cs-hero-text">
          <span className="cs-hero-badge"><Trophy size={13} /> Vinh danh</span>
          <h1>Công trình thành công</h1>
          <p>Tổng hợp các công trình khoa học, bằng sáng chế và giáo trình đã được nghiệm thu / cấp bằng / xuất bản.</p>
        </div>
        <div className="cs-hero-stats">
          <div className="cs-hstat"><span>{counts.all}</span><small>Tổng cộng</small></div>
          <div className="cs-hstat"><span>{counts.work}</span><small>Công trình</small></div>
          <div className="cs-hstat"><span>{counts.patent}</span><small>Sáng chế</small></div>
          <div className="cs-hstat"><span>{counts.textbook}</span><small>Giáo trình</small></div>
        </div>
      </section>

      {/* Toolbar */}
      <div className="cs-toolbar">
        <div className="cs-tabs">
          {(['all', 'work', 'patent', 'textbook'] as const).map(k => (
            <button key={k} className={`cs-tab ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>
              {k === 'all' ? 'Tất cả' : KIND[k].label} <span className="cs-tab-count">{counts[k]}</span>
            </button>
          ))}
        </div>
        <div className="cs-search">
          <Search size={16} color="var(--on-surface-muted)" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm theo tên, tác giả..." />
        </div>
      </div>

      {loading ? (
        <div className="cs-loading"><Loader2 size={32} className="spin" color="var(--primary-indigo)" /></div>
      ) : filtered.length === 0 ? (
        <div className="cs-empty surface-card"><Trophy size={48} style={{ opacity: .25 }} /><p>Chưa có công trình nào được duyệt thành công</p></div>
      ) : (
        <div className="cs-list">
          {filtered.map(it => {
            const k = KIND[it.kind];
            const Icon = k.icon;
            return (
              <div key={it.key} className="surface-card cs-item">
                <div className="cs-item-icon" style={{ background: `${k.color}15`, color: k.color }}><Icon size={20} /></div>
                <div className="cs-item-main">
                  <div className="cs-item-badges">
                    <span className="cs-kind" style={{ background: `${k.color}15`, color: k.color }}>{k.label}</span>
                    <span className="cs-status">{it.statusLabel}</span>
                  </div>
                  <h3>{it.title}</h3>
                  <div className="cs-item-meta">
                    <span><User size={12} /> {it.authors}</span>
                    {it.sub && <span>{it.kind === 'patent' ? <Award size={12} /> : it.kind === 'textbook' ? <Building2 size={12} /> : <Hash size={12} />} {it.sub}</span>}
                    {it.date && <span><Calendar size={12} /> {fmtDate(it.date)}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        .cs{display:flex;flex-direction:column;gap:1.25rem;padding-bottom:3rem}
        .cs-hero{background:linear-gradient(135deg,#1e3a8a 0%,#4f46e5 55%,#7c3aed 100%);border-radius:20px;padding:2rem 2.25rem;color:#fff;display:flex;justify-content:space-between;align-items:center;gap:1.5rem;flex-wrap:wrap}
        .cs-hero-badge{display:inline-flex;align-items:center;gap:5px;background:rgba(255,255,255,.18);padding:3px 10px;border-radius:100px;font-size:.68rem;font-weight:700;margin-bottom:.5rem}
        .cs-hero-text h1{font-size:1.7rem;font-weight:800;color:#fff;margin-bottom:.35rem}
        .cs-hero-text p{font-size:.875rem;opacity:.9;max-width:560px;line-height:1.55}
        .cs-hero-stats{display:flex;gap:1rem}
        .cs-hstat{display:flex;flex-direction:column;align-items:center;background:rgba(255,255,255,.12);border-radius:12px;padding:.7rem 1rem;min-width:72px}
        .cs-hstat span{font-size:1.4rem;font-weight:800}
        .cs-hstat small{font-size:.6rem;opacity:.8;font-weight:600}
        .cs-toolbar{display:flex;justify-content:space-between;align-items:center;gap:1rem;flex-wrap:wrap}
        .cs-tabs{display:flex;gap:6px;flex-wrap:wrap}
        .cs-tab{display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border-radius:10px;border:1.5px solid var(--surface-variant);background:var(--surface-lowest);cursor:pointer;font-weight:700;font-size:.8rem;color:var(--on-surface-muted)}
        .cs-tab.active{border-color:var(--primary-indigo);color:var(--primary-indigo);background:#eef2ff}
        .cs-tab-count{font-size:.65rem;background:var(--surface-variant);padding:1px 7px;border-radius:100px}
        .cs-tab.active .cs-tab-count{background:#fff}
        .cs-search{display:flex;align-items:center;gap:8px;background:var(--surface-lowest);border:1.5px solid var(--surface-variant);border-radius:10px;padding:8px 12px;min-width:260px}
        .cs-search input{flex:1;border:none;outline:none;background:transparent;font-size:.85rem}
        .cs-loading{display:flex;justify-content:center;padding:4rem}
        .cs-empty{display:flex;flex-direction:column;align-items:center;gap:1rem;padding:4rem!important;text-align:center;color:var(--on-surface-muted)}
        .cs-list{display:flex;flex-direction:column;gap:.75rem}
        .cs-item{display:flex;gap:1rem;align-items:flex-start;padding:1.1rem 1.4rem!important}
        .cs-item-icon{width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .cs-item-main{flex:1;min-width:0}
        .cs-item-badges{display:flex;gap:6px;margin-bottom:5px;align-items:center;flex-wrap:wrap}
        .cs-kind{padding:2px 9px;border-radius:6px;font-size:.66rem;font-weight:800}
        .cs-status{padding:2px 9px;border-radius:6px;font-size:.66rem;font-weight:700;background:#d1fae5;color:#059669}
        .cs-item-main h3{font-weight:700;font-size:1rem;line-height:1.4;margin-bottom:5px}
        .cs-item-meta{display:flex;gap:14px;flex-wrap:wrap;font-size:.73rem;color:var(--on-surface-muted)}
        .cs-item-meta span{display:flex;align-items:center;gap:4px}
        .spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
        @media(max-width:768px){.cs-hero{flex-direction:column;align-items:flex-start}.cs-toolbar{flex-direction:column;align-items:stretch}.cs-search{min-width:0}}
      `}</style>
    </div>
  );
};
