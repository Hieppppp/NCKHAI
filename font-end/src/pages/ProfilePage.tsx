import { useState, useEffect } from 'react';
import {
  User, Mail, Phone, Building2, BookOpen, FileText,
  ClipboardCheck, Save, Loader2, Shield, Calendar, GraduationCap,
  Edit3, Check,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/authService';
import { useToast } from '../components/common/Toast';
import { RoleLabels } from '../types';
import type { User as UserType } from '../types';

const ROLE_COLORS: Record<string, string> = { ADMIN: '#dc2626', REVIEWER: '#475569', LECTURER: '#2563eb', STUDENT: '#059669' };

export default function ProfilePage() {
  const { user } = useAuth();
  const { error: showError, success: showSuccess } = useToast();
  const [profile, setProfile] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({ name: '', department: '', specialization: '', phone: '' });

  useEffect(() => {
    authService.getProfile().then((p) => {
      setProfile(p);
      setForm({ name: p.name || '', department: p.department || '', specialization: p.specialization || '', phone: p.phone || '' });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await authService.updateProfile(form);
      setProfile(updated);
      localStorage.setItem('user', JSON.stringify(updated));
      setEditing(false);
      setSaved(true);
      showSuccess('Cập nhật hồ sơ thành công');
      setTimeout(() => setSaved(false), 3000);
    } catch { showError('Cập nhật thất bại'); }
    setSaving(false);
  };

  if (loading) return <div className="pf-loading"><Loader2 size={36} className="pf-spin" color="var(--primary-indigo)" /></div>;
  const p = profile || user;
  if (!p) return null;

  const stats = [
    { icon: BookOpen, label: 'Đề tài NCKH', value: p._count?.scientificWorks || 0, color: '#4f46e5' },
    { icon: FileText, label: 'Công bố khoa học', value: p._count?.publications || 0, color: '#475569' },
    { icon: ClipboardCheck, label: 'Đánh giá phản biện', value: p._count?.reviews || 0, color: '#0891b2' },
  ];

  return (
    <div className="pf">
      {/* Hero */}
      <section className="pf-hero">
        <div className="pf-hero-inner">
          <div className="pf-avatar-lg">{(p.name || p.email || 'U')[0].toUpperCase()}</div>
          <div className="pf-hero-info">
            <h1>{p.name || 'Chưa cập nhật tên'}</h1>
            <div className="pf-hero-meta">
              <span className="pf-role-pill" style={{ background: ROLE_COLORS[p.role] || '#4f46e5' }}>
                <Shield size={11} /> {RoleLabels[p.role]}
              </span>
              {p.department && <span className="pf-meta-tag"><Building2 size={13} /> {p.department}</span>}
              <span className="pf-meta-tag"><Calendar size={13} /> Tham gia: {p.createdAt ? new Date(p.createdAt).toLocaleDateString('vi-VN') : '—'}</span>
            </div>
          </div>
          <button className={`pf-hero-btn ${editing ? 'cancel' : ''}`} onClick={() => setEditing(!editing)}>
            {editing ? 'Hủy' : <><Edit3 size={15} /> Chỉnh sửa</>}
          </button>
        </div>
      </section>

      {/* Stats */}
      <section className="pf-stats">
        {stats.map(s => (
          <div key={s.label} className="surface-card pf-stat">
            <div className="pf-stat-icon" style={{ background: `${s.color}12`, color: s.color }}><s.icon size={22} /></div>
            <div><span className="pf-stat-val" style={{ color: s.color }}>{s.value}</span><span className="pf-stat-label">{s.label}</span></div>
          </div>
        ))}
      </section>

      {saved && <div className="pf-success"><Check size={16} /> Cập nhật hồ sơ thành công!</div>}

      <div className="pf-body">
        {/* Info */}
        <section className="surface-card pf-card">
          <div className="pf-card-head"><User size={18} /> Thông tin cá nhân</div>
          <div className="pf-grid">
            <PfField icon={User} label="Họ và tên" editing={editing} value={form.name} onChange={v => setForm({ ...form, name: v })} display={p.name} />
            <PfField icon={Mail} label="Email" editing={false} value="" onChange={() => {}} display={p.email} />
            <PfField icon={Phone} label="Số điện thoại" editing={editing} value={form.phone} onChange={v => setForm({ ...form, phone: v })} placeholder="Nhập số điện thoại" display={p.phone} />
            <PfField icon={Building2} label="Khoa / Phòng ban" editing={editing} value={form.department} onChange={v => setForm({ ...form, department: v })} placeholder="VD: Khoa Công nghệ thông tin" display={p.department} />
            <div className="pf-field pf-full">
              <label><GraduationCap size={13} /> Chuyên ngành / Lĩnh vực nghiên cứu</label>
              {editing ? (
                <input value={form.specialization} onChange={e => setForm({ ...form, specialization: e.target.value })} placeholder="VD: Trí tuệ nhân tạo, Xử lý ngôn ngữ tự nhiên" />
              ) : (
                <p className={p.specialization ? '' : 'pf-empty'}>{p.specialization || 'Chưa cập nhật'}</p>
              )}
            </div>
          </div>
          {editing && (
            <div className="pf-save-row">
              <button className="pf-save-btn" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 size={15} className="pf-spin" /> : <Save size={15} />}
                {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          )}
        </section>

        {/* Account */}
        <section className="surface-card pf-card">
          <div className="pf-card-head"><Shield size={18} /> Tài khoản & Bảo mật</div>
          <div className="pf-account">
            <div className="pf-acc-row">
              <span>Vai trò hệ thống</span>
              <span className="pf-role-pill" style={{ background: ROLE_COLORS[p.role] || '#4f46e5' }}>{RoleLabels[p.role]}</span>
            </div>
            <div className="pf-acc-row">
              <span>Trạng thái</span>
              <span className={`pf-status ${p.isActive !== false ? 'active' : 'inactive'}`}>{p.isActive !== false ? 'Đang hoạt động' : 'Đã vô hiệu hóa'}</span>
            </div>
            <div className="pf-acc-row">
              <span>Ngày tạo tài khoản</span>
              <strong>{p.createdAt ? new Date(p.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}</strong>
            </div>
            <div className="pf-acc-row">
              <span>Email đăng nhập</span>
              <strong>{p.email}</strong>
            </div>
          </div>
        </section>
      </div>

      <style>{`
        .pf{display:flex;flex-direction:column;gap:1.5rem;padding-bottom:3rem}
        .pf-loading{display:flex;justify-content:center;padding:80px}

        .pf-hero{background:linear-gradient(135deg,#0f172a 0%,#1e293b 40%,#334155 100%);border-radius:20px;padding:2.5rem;color:#fff}
        .pf-hero-inner{display:flex;align-items:center;gap:1.5rem}
        .pf-avatar-lg{width:80px;height:80px;border-radius:50%;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-size:2rem;font-weight:800;border:3px solid rgba(255,255,255,.3);flex-shrink:0}
        .pf-hero-info{flex:1}
        .pf-hero-info h1{font-size:1.5rem;font-weight:800;margin-bottom:.5rem;color:#fff}
        .pf-hero-meta{display:flex;align-items:center;gap:.75rem;flex-wrap:wrap}
        .pf-role-pill{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:100px;color:#fff;font-size:.7rem;font-weight:700}
        .pf-meta-tag{display:flex;align-items:center;gap:4px;font-size:.8rem;opacity:.8}
        .pf-hero-btn{background:#fff;color:#0f172a;border:none;padding:10px 20px;border-radius:10px;font-weight:700;font-size:.8rem;cursor:pointer;display:flex;align-items:center;gap:6px;white-space:nowrap}
        .pf-hero-btn.cancel{background:rgba(255,255,255,.15);color:#fff;border:1.5px solid rgba(255,255,255,.3)}

        .pf-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:1rem}
        .pf-stat{display:flex;align-items:center;gap:1rem}
        .pf-stat-icon{width:48px;height:48px;border-radius:14px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .pf-stat-val{font-size:1.75rem;font-weight:800;display:block;line-height:1}
        .pf-stat-label{font-size:.8rem;color:var(--on-surface-muted)}

        .pf-success{display:flex;align-items:center;gap:8px;background:#d1fae5;color:#065f46;padding:12px 16px;border-radius:12px;font-weight:600;font-size:.875rem}

        .pf-body{display:grid;grid-template-columns:1fr 340px;gap:1.5rem;align-items:start}
        .pf-card{padding:2rem}
        .pf-card-head{display:flex;align-items:center;gap:8px;font-size:.9375rem;font-weight:700;margin-bottom:1.5rem}

        .pf-grid{display:grid;grid-template-columns:1fr 1fr;gap:1.25rem}
        .pf-field{display:flex;flex-direction:column;gap:.375rem}
        .pf-field.pf-full{grid-column:1/-1}
        .pf-field label{font-size:.7rem;font-weight:800;color:var(--on-surface-muted);text-transform:uppercase;letter-spacing:.03em;display:flex;align-items:center;gap:4px}
        .pf-field p{font-size:.875rem;padding:10px 14px;background:var(--surface-low);border-radius:10px;min-height:42px;display:flex;align-items:center}
        .pf-field p.pf-empty{color:var(--on-surface-muted);font-style:italic}
        .pf-field input{padding:10px 14px;border:2px solid var(--surface-variant);border-radius:10px;font-size:.875rem;font-family:inherit;outline:none;background:var(--surface-lowest);transition:border-color .2s}
        .pf-field input:focus{border-color:var(--primary-indigo)}

        .pf-save-row{margin-top:1.5rem;display:flex;justify-content:flex-end}
        .pf-save-btn{background:var(--signature-gradient);color:#fff;border:none;padding:10px 24px;border-radius:10px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:6px;font-size:.85rem}
        .pf-save-btn:disabled{opacity:.6;cursor:not-allowed}

        .pf-account{display:flex;flex-direction:column;gap:.75rem}
        .pf-acc-row{display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:var(--surface-low);border-radius:10px;font-size:.8125rem}
        .pf-acc-row span:first-child{color:var(--on-surface-muted)}
        .pf-acc-row strong{font-weight:600;font-size:.8rem}
        .pf-status{padding:3px 10px;border-radius:100px;font-size:.7rem;font-weight:700}
        .pf-status.active{background:#d1fae5;color:#065f46}
        .pf-status.inactive{background:#fee2e2;color:#991b1b}

        .pf-spin{animation:pf-spin 1s linear infinite}
        @keyframes pf-spin{to{transform:rotate(360deg)}}

        @media(max-width:1024px){
          .pf-body{grid-template-columns:1fr}
          .pf-stats{grid-template-columns:1fr}
          .pf-hero-inner{flex-direction:column;text-align:center}
          .pf-hero-meta{justify-content:center}
        }
      `}</style>
    </div>
  );
}

function PfField({ icon: Icon, label, editing, value, onChange, display, placeholder }: {
  icon: typeof User; label: string; editing: boolean; value: string; onChange: (v: string) => void; display?: string | null; placeholder?: string;
}) {
  return (
    <div className="pf-field">
      <label><Icon size={13} /> {label}</label>
      {editing ? (
        <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
      ) : (
        <p className={display ? '' : 'pf-empty'}>{display || 'Chưa cập nhật'}</p>
      )}
    </div>
  );
}
