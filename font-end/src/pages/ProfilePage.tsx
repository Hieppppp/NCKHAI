import { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Phone,
  Building2,
  BookOpen,
  Award,
  FileText,
  ClipboardCheck,
  Save,
  Loader2,
  Shield,
  Calendar,
  GraduationCap,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/authService';
import { RoleLabels } from '../types';
import type { User as UserType } from '../types';

export default function ProfilePage() {
  const { user, login } = useAuth();
  const [profile, setProfile] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    name: '',
    department: '',
    specialization: '',
    phone: '',
  });

  useEffect(() => {
    authService.getProfile().then((p) => {
      setProfile(p);
      setForm({
        name: p.name || '',
        department: p.department || '',
        specialization: p.specialization || '',
        phone: p.phone || '',
      });
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
      setTimeout(() => setSaved(false), 2000);
    } catch {
      alert('Cập nhật thất bại');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--on-surface-muted)' }}>Đang tải...</div>;
  }

  const p = profile || user;
  if (!p) return null;

  const stats = [
    { icon: BookOpen, label: 'Đề tài NCKH', value: p._count?.scientificWorks || 0, color: '#4f46e5' },
    { icon: FileText, label: 'Công bố khoa học', value: p._count?.publications || 0, color: '#7c3aed' },
    { icon: ClipboardCheck, label: 'Đánh giá phản biện', value: p._count?.reviews || 0, color: '#0891b2' },
  ];

  const ROLE_COLORS: Record<string, string> = {
    ADMIN: '#dc2626',
    REVIEWER: '#7c3aed',
    LECTURER: '#2563eb',
    STUDENT: '#059669',
  };

  return (
    <div className="profile-page">
      <header className="profile-header-section">
        <div className="profile-cover" />
        <div className="profile-header-content">
          <div className="profile-avatar-large">
            <span>{(p.name || p.email || 'U')[0].toUpperCase()}</span>
          </div>
          <div className="profile-header-info">
            <h1>{p.name || 'Chưa cập nhật tên'}</h1>
            <div className="profile-header-meta">
              <span className="role-badge" style={{ background: ROLE_COLORS[p.role] || '#4f46e5' }}>
                <Shield size={12} />
                {RoleLabels[p.role]}
              </span>
              {p.department && (
                <span className="meta-tag">
                  <Building2 size={14} />
                  {p.department}
                </span>
              )}
              <span className="meta-tag">
                <Calendar size={14} />
                Tham gia: {p.createdAt ? new Date(p.createdAt).toLocaleDateString('vi-VN') : '—'}
              </span>
            </div>
          </div>
          <button
            className={editing ? 'btn-cancel' : 'btn-edit-profile'}
            onClick={() => setEditing(!editing)}
          >
            {editing ? 'Hủy' : 'Chỉnh sửa hồ sơ'}
          </button>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="stats-row">
        {stats.map((s) => (
          <div key={s.label} className="stat-item surface-card">
            <div className="stat-icon-wrap" style={{ background: `${s.color}15` }}>
              <s.icon size={22} color={s.color} />
            </div>
            <div className="stat-detail">
              <span className="stat-number">{s.value}</span>
              <span className="stat-desc">{s.label}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="profile-body">
        {/* Info Card */}
        <section className="surface-card info-card">
          <h3><User size={18} /> Thông tin cá nhân</h3>

          {saved && (
            <div className="success-banner">
              <Award size={16} />
              Cập nhật hồ sơ thành công!
            </div>
          )}

          <div className="info-grid">
            <div className="info-field">
              <label><User size={14} /> Họ và tên</label>
              {editing ? (
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nhập họ và tên" />
              ) : (
                <p>{p.name || <span className="empty-value">Chưa cập nhật</span>}</p>
              )}
            </div>

            <div className="info-field">
              <label><Mail size={14} /> Email</label>
              <p>{p.email}</p>
            </div>

            <div className="info-field">
              <label><Phone size={14} /> Số điện thoại</label>
              {editing ? (
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Nhập số điện thoại" />
              ) : (
                <p>{p.phone || <span className="empty-value">Chưa cập nhật</span>}</p>
              )}
            </div>

            <div className="info-field">
              <label><Building2 size={14} /> Khoa / Phòng ban</label>
              {editing ? (
                <input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} placeholder="VD: Khoa Công nghệ thông tin" />
              ) : (
                <p>{p.department || <span className="empty-value">Chưa cập nhật</span>}</p>
              )}
            </div>

            <div className="info-field full-width">
              <label><GraduationCap size={14} /> Chuyên ngành / Lĩnh vực nghiên cứu</label>
              {editing ? (
                <input value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} placeholder="VD: Trí tuệ nhân tạo, Xử lý ngôn ngữ tự nhiên" />
              ) : (
                <p>{p.specialization || <span className="empty-value">Chưa cập nhật</span>}</p>
              )}
            </div>
          </div>

          {editing && (
            <div className="edit-actions">
              <button className="btn-save" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
                {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          )}
        </section>

        {/* Account Card */}
        <section className="surface-card account-card">
          <h3><Shield size={18} /> Tài khoản & Bảo mật</h3>
          <div className="account-items">
            <div className="account-row">
              <span className="account-label">Vai trò hệ thống</span>
              <span className="role-badge" style={{ background: ROLE_COLORS[p.role] || '#4f46e5' }}>
                {RoleLabels[p.role]}
              </span>
            </div>
            <div className="account-row">
              <span className="account-label">Trạng thái tài khoản</span>
              <span className={`status-badge ${p.isActive !== false ? 'active' : 'inactive'}`}>
                {p.isActive !== false ? 'Đang hoạt động' : 'Đã vô hiệu hóa'}
              </span>
            </div>
            <div className="account-row">
              <span className="account-label">Ngày tạo tài khoản</span>
              <span>{p.createdAt ? new Date(p.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}</span>
            </div>
          </div>
        </section>
      </div>

      <style>{`
        .profile-page { display: flex; flex-direction: column; gap: 2rem; padding-bottom: 3rem; }

        .profile-cover {
          height: 160px;
          background: linear-gradient(135deg, #1e1b4b 0%, #4338ca 50%, #7c3aed 100%);
          border-radius: 20px 20px 0 0;
        }

        .profile-header-content {
          display: flex; align-items: flex-end; gap: 1.5rem;
          margin-top: -48px; padding: 0 2rem 1.5rem;
        }

        .profile-avatar-large {
          width: 96px; height: 96px; border-radius: 50%;
          background: var(--signature-gradient);
          display: flex; align-items: center; justify-content: center;
          border: 4px solid white;
          box-shadow: 0 4px 16px rgba(0,0,0,0.15);
          flex-shrink: 0;
        }

        .profile-avatar-large span {
          color: white; font-size: 2.25rem; font-weight: 800;
        }

        .profile-header-info { flex: 1; }
        .profile-header-info h1 { font-size: 1.75rem; font-weight: 800; margin-bottom: 0.5rem; }

        .profile-header-meta { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; }

        .role-badge {
          display: inline-flex; align-items: center; gap: 0.375rem;
          padding: 0.25rem 0.75rem; border-radius: 100px;
          color: white; font-size: 0.75rem; font-weight: 700;
        }

        .meta-tag {
          display: flex; align-items: center; gap: 0.375rem;
          font-size: 0.8125rem; color: var(--on-surface-muted); font-weight: 500;
        }

        .btn-edit-profile {
          background: var(--primary-indigo); color: white; border: none;
          padding: 0.75rem 1.5rem; border-radius: 12px; font-weight: 700;
          cursor: pointer; font-size: 0.875rem; white-space: nowrap;
        }

        .btn-cancel {
          background: white; color: var(--on-surface); border: 1px solid var(--surface-variant);
          padding: 0.75rem 1.5rem; border-radius: 12px; font-weight: 700;
          cursor: pointer; font-size: 0.875rem; white-space: nowrap;
        }

        .stats-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; }

        .stat-item {
          padding: 1.5rem; display: flex; align-items: center; gap: 1.25rem;
        }

        .stat-icon-wrap { padding: 0.875rem; border-radius: 14px; }
        .stat-number { font-size: 1.75rem; font-weight: 800; display: block; }
        .stat-desc { font-size: 0.8125rem; color: var(--on-surface-muted); font-weight: 500; }

        .profile-body { display: grid; grid-template-columns: 1fr 360px; gap: 2rem; align-items: start; }

        .info-card, .account-card { padding: 2rem; }
        .info-card h3, .account-card h3 {
          display: flex; align-items: center; gap: 0.5rem;
          font-size: 1.0625rem; font-weight: 700; margin-bottom: 1.5rem;
        }

        .success-banner {
          display: flex; align-items: center; gap: 0.5rem;
          background: #d1fae5; color: #065f46; padding: 0.75rem 1rem;
          border-radius: 10px; font-weight: 600; font-size: 0.875rem; margin-bottom: 1.5rem;
        }

        .info-grid {
          display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;
        }

        .info-field { display: flex; flex-direction: column; gap: 0.5rem; }
        .info-field.full-width { grid-column: 1 / -1; }

        .info-field label {
          font-size: 0.75rem; font-weight: 700; color: var(--on-surface-muted);
          text-transform: uppercase; letter-spacing: 0.03em;
          display: flex; align-items: center; gap: 0.375rem;
        }

        .info-field p {
          font-size: 0.9375rem; font-weight: 500;
          padding: 0.75rem 1rem; background: var(--surface-low);
          border-radius: 10px; min-height: 44px; display: flex; align-items: center;
        }

        .info-field input {
          padding: 0.75rem 1rem; border: 2px solid var(--surface-variant);
          border-radius: 10px; font-size: 0.9375rem; font-family: inherit;
          outline: none; transition: border-color 0.2s; background: var(--surface-lowest);
        }

        .info-field input:focus { border-color: var(--primary-indigo); }

        .empty-value { color: var(--on-surface-muted); font-style: italic; }

        .edit-actions { margin-top: 1.5rem; display: flex; justify-content: flex-end; }

        .btn-save {
          background: var(--primary-indigo); color: white; border: none;
          padding: 0.75rem 2rem; border-radius: 12px; font-weight: 700;
          cursor: pointer; display: flex; align-items: center; gap: 0.5rem;
          font-size: 0.875rem;
        }

        .btn-save:disabled { opacity: 0.6; cursor: not-allowed; }

        .account-items { display: flex; flex-direction: column; gap: 1rem; }

        .account-row {
          display: flex; justify-content: space-between; align-items: center;
          padding: 1rem; background: var(--surface-low); border-radius: 12px;
        }

        .account-label { font-size: 0.875rem; color: var(--on-surface-muted); font-weight: 500; }

        .status-badge {
          padding: 0.25rem 0.75rem; border-radius: 100px;
          font-size: 0.75rem; font-weight: 700;
        }

        .status-badge.active { background: #d1fae5; color: #065f46; }
        .status-badge.inactive { background: #fee2e2; color: #991b1b; }

        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        @media (max-width: 1024px) {
          .profile-body { grid-template-columns: 1fr; }
          .stats-row { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
