import { useState, useEffect, useCallback } from 'react';
import {
  Users, Search, Shield, ShieldCheck, BookOpen, GraduationCap,
  MoreVertical, UserCog, Trash2, ToggleLeft, ToggleRight,
  ChevronLeft, ChevronRight, X, Loader2, AlertCircle, Check,
} from 'lucide-react';
import { userService } from '../../services/userService';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/common/Toast';
import { Role, RoleLabels } from '../../types';
import type { User, UserStats, PaginatedResponse } from '../../types';

const RoleIcons: Record<Role, typeof Shield> = {
  [Role.ADMIN]: ShieldCheck,
  [Role.REVIEWER]: Shield,
  [Role.LECTURER]: BookOpen,
  [Role.STUDENT]: GraduationCap,
};

const RoleColors: Record<Role, string> = {
  [Role.ADMIN]: '#dc2626',
  [Role.REVIEWER]: '#475569',
  [Role.LECTURER]: '#2563eb',
  [Role.STUDENT]: '#059669',
};

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const { confirm: showConfirm } = useToast();
  const [data, setData] = useState<PaginatedResponse<User> | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [actionMenuId, setActionMenuId] = useState<number | null>(null);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editRole, setEditRole] = useState<Role>(Role.STUDENT);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, statsRes] = await Promise.all([
        userService.getAll(page, 10, search || undefined),
        userService.getStats(),
      ]);
      setData(usersRes);
      setStats(statsRes);
    } catch {
      setFeedback({ type: 'error', message: 'Không thể tải dữ liệu' });
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (feedback) {
      const t = setTimeout(() => setFeedback(null), 3000);
      return () => clearTimeout(t);
    }
  }, [feedback]);

  async function handleToggleActive(user: User) {
    try {
      await userService.update(user.id, { isActive: !user.isActive });
      setFeedback({ type: 'success', message: `Đã ${user.isActive ? 'vô hiệu hóa' : 'kích hoạt'} ${user.name || user.email}` });
      setActionMenuId(null);
      load();
    } catch {
      setFeedback({ type: 'error', message: 'Thao tác thất bại' });
    }
  }

  async function handleDelete(user: User) {
    showConfirm('Xóa người dùng', `Bạn có chắc muốn xóa "${user.name || user.email}"? Thao tác không thể hoàn tác.`, async () => {
    try {
      await userService.remove(user.id);
      setFeedback({ type: 'success', message: `Đã xóa ${user.name || user.email}` });
      setActionMenuId(null);
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setFeedback({ type: 'error', message: msg || 'Không thể xóa người dùng' });
    }
    }, { confirmLabel: 'Xóa', danger: true });
  }

  async function handleSaveRole() {
    if (!editUser) return;
    setSaving(true);
    try {
      await userService.update(editUser.id, { role: editRole });
      setFeedback({ type: 'success', message: `Đã cập nhật vai trò cho ${editUser.name || editUser.email}` });
      setEditUser(null);
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setFeedback({ type: 'error', message: msg || 'Cập nhật thất bại' });
    } finally {
      setSaving(false);
    }
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    load();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
            Quản lý người dùng
          </h1>
          <p style={{ color: 'var(--on-surface-muted)', marginTop: 4 }}>
            Quản lý tài khoản và phân quyền người dùng hệ thống
          </p>
        </div>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 1000,
          padding: '12px 20px', borderRadius: 10,
          background: feedback.type === 'success' ? '#ecfdf5' : '#fef2f2',
          color: feedback.type === 'success' ? 'var(--success)' : 'var(--error)',
          display: 'flex', alignItems: 'center', gap: 8,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          fontSize: '0.875rem', fontWeight: 600,
          animation: 'slideIn 0.3s ease',
        }}>
          {feedback.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
          {feedback.message}
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
          <StatCard icon={Users} label="Tổng người dùng" value={stats.total} color="var(--primary-indigo)" />
          <StatCard icon={ShieldCheck} label="Quản trị viên" value={stats.byRole.ADMIN || 0} color={RoleColors[Role.ADMIN]} />
          <StatCard icon={Shield} label="Phản biện" value={stats.byRole.REVIEWER || 0} color={RoleColors[Role.REVIEWER]} />
          <StatCard icon={BookOpen} label="Giảng viên" value={stats.byRole.LECTURER || 0} color={RoleColors[Role.LECTURER]} />
          <StatCard icon={GraduationCap} label="Sinh viên" value={stats.byRole.STUDENT || 0} color={RoleColors[Role.STUDENT]} />
        </div>
      )}

      {/* Search */}
      <div className="surface-card" style={{ padding: '16px 20px' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: 12 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={18} color="var(--on-surface-muted)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo email hoặc tên..."
              style={{
                width: '100%', padding: '10px 14px 10px 40px',
                border: '1.5px solid var(--surface-variant)', borderRadius: 10,
                fontSize: '0.9rem', fontFamily: 'inherit', outline: 'none',
                background: 'var(--surface)',
              }}
            />
          </div>
          <button type="submit" className="btn-signature" style={{ padding: '10px 24px', fontSize: '0.875rem' }}>
            Tìm kiếm
          </button>
        </form>
      </div>

      {/* Users Table */}
      <div className="surface-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
            <Loader2 size={32} color="var(--primary-indigo)" className="spin" />
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--surface-low)' }}>
                {['ID', 'Người dùng', 'Email', 'Vai trò', 'Trạng thái', 'Ngày tạo', ''].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data?.data.map((u) => {
                const Icon = RoleIcons[u.role];
                const isMe = u.id === currentUser?.id;
                return (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--surface-variant)' }}>
                    <td style={tdStyle}><span style={{ color: 'var(--on-surface-muted)', fontSize: '0.8rem' }}>#{u.id}</span></td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: '50%',
                          background: `${RoleColors[u.role]}15`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: RoleColors[u.role], fontWeight: 700, fontSize: '0.8rem',
                        }}>
                          {(u.name || u.email)[0].toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                            {u.name || '—'}
                            {isMe && <span style={{ fontSize: '0.7rem', color: 'var(--primary-violet)', marginLeft: 6 }}>(Bạn)</span>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={tdStyle}><span style={{ fontSize: '0.875rem', color: 'var(--on-surface-muted)' }}>{u.email}</span></td>
                    <td style={tdStyle}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '4px 10px', borderRadius: 6,
                        background: `${RoleColors[u.role]}12`,
                        color: RoleColors[u.role],
                        fontSize: '0.8rem', fontWeight: 600,
                      }}>
                        <Icon size={14} />
                        {RoleLabels[u.role]}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        fontSize: '0.8rem', fontWeight: 600,
                        color: u.isActive ? 'var(--success)' : 'var(--error)',
                      }}>
                        <div style={{
                          width: 7, height: 7, borderRadius: '50%',
                          background: u.isActive ? 'var(--success)' : 'var(--error)',
                        }} />
                        {u.isActive ? 'Hoạt động' : 'Vô hiệu'}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--on-surface-muted)' }}>
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString('vi-VN') : '—'}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, position: 'relative' }}>
                      <button
                        onClick={() => setActionMenuId(actionMenuId === u.id ? null : u.id)}
                        style={iconBtnStyle}
                      >
                        <MoreVertical size={18} />
                      </button>
                      {actionMenuId === u.id && (
                        <div style={menuStyle}>
                          <button style={menuItemStyle} onClick={() => { setEditUser(u); setEditRole(u.role); setActionMenuId(null); }}>
                            <UserCog size={15} /> Đổi vai trò
                          </button>
                          <button style={menuItemStyle} onClick={() => handleToggleActive(u)}>
                            {u.isActive ? <ToggleLeft size={15} /> : <ToggleRight size={15} />}
                            {u.isActive ? 'Vô hiệu hóa' : 'Kích hoạt'}
                          </button>
                          {!isMe && u.role !== Role.ADMIN && (
                            <button style={{ ...menuItemStyle, color: 'var(--error)' }} onClick={() => handleDelete(u)}>
                              <Trash2 size={15} /> Xóa
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {(!data || data.data.length === 0) && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 48, color: 'var(--on-surface-muted)' }}>
                    Không tìm thấy người dùng nào
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {data && data.meta.totalPages > 1 && (
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '12px 20px', borderTop: '1px solid var(--surface-variant)',
          }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--on-surface-muted)' }}>
              Hiển thị {data.data.length} / {data.meta.total} người dùng
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                style={{ ...pageBtnStyle, opacity: page <= 1 ? 0.4 : 1 }}
              >
                <ChevronLeft size={16} />
              </button>
              <span style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem', fontWeight: 600, padding: '0 8px' }}>
                {page} / {data.meta.totalPages}
              </span>
              <button
                disabled={page >= data.meta.totalPages}
                onClick={() => setPage(page + 1)}
                style={{ ...pageBtnStyle, opacity: page >= data.meta.totalPages ? 0.4 : 1 }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Role Modal */}
      {editUser && (
        <div style={overlayStyle} onClick={() => setEditUser(null)}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontWeight: 700 }}>Phân quyền người dùng</h3>
              <button onClick={() => setEditUser(null)} style={iconBtnStyle}><X size={20} /></button>
            </div>

            <div style={{ padding: 16, background: 'var(--surface-low)', borderRadius: 10, marginBottom: 20 }}>
              <div style={{ fontWeight: 600 }}>{editUser.name || '—'}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--on-surface-muted)' }}>{editUser.email}</div>
            </div>

            <label style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: 8, display: 'block' }}>
              Chọn vai trò mới
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
              {(Object.values(Role) as Role[]).map((role) => {
                const Icon = RoleIcons[role];
                const selected = editRole === role;
                return (
                  <button
                    key={role}
                    onClick={() => setEditRole(role)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
                      border: selected ? `2px solid ${RoleColors[role]}` : '2px solid var(--surface-variant)',
                      background: selected ? `${RoleColors[role]}08` : 'var(--surface-lowest)',
                      fontFamily: 'inherit', textAlign: 'left',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: 8,
                      background: `${RoleColors[role]}15`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: RoleColors[role],
                    }}>
                      <Icon size={18} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem', color: RoleColors[role] }}>
                        {RoleLabels[role]}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--on-surface-muted)' }}>
                        {role}
                      </div>
                    </div>
                    {selected && (
                      <Check size={16} color={RoleColors[role]} style={{ marginLeft: 'auto' }} />
                    )}
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setEditUser(null)}
                style={{
                  padding: '10px 20px', borderRadius: 10, border: '1.5px solid var(--surface-variant)',
                  background: 'var(--surface-lowest)', cursor: 'pointer', fontWeight: 600,
                  fontFamily: 'inherit', fontSize: '0.875rem',
                }}
              >
                Hủy
              </button>
              <button
                onClick={handleSaveRole}
                disabled={saving || editRole === editUser.role}
                className="btn-signature"
                style={{
                  padding: '10px 20px', fontSize: '0.875rem',
                  opacity: saving || editRole === editUser.role ? 0.5 : 1,
                }}
              >
                {saving ? <Loader2 size={16} className="spin" /> : null}
                {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideIn { from { transform: translateX(100px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      `}</style>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: typeof Users; label: string; value: number; color: string }) {
  return (
    <div className="surface-card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{
        width: 44, height: 44, borderRadius: 10,
        background: `${color}12`, display: 'flex',
        alignItems: 'center', justifyContent: 'center', color,
      }}>
        <Icon size={22} />
      </div>
      <div>
        <div style={{ fontSize: '1.25rem', fontWeight: 800, color }}>{value}</div>
        <div style={{ fontSize: '0.75rem', color: 'var(--on-surface-muted)', fontWeight: 600 }}>{label}</div>
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: '12px 16px', textAlign: 'left',
  fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase',
  letterSpacing: '0.05em', color: 'var(--on-surface-muted)',
};

const tdStyle: React.CSSProperties = {
  padding: '14px 16px',
};

const iconBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer',
  padding: 6, borderRadius: 8, color: 'var(--on-surface-muted)',
  display: 'flex', alignItems: 'center',
};

const menuStyle: React.CSSProperties = {
  position: 'absolute', right: 16, top: '100%', zIndex: 50,
  background: 'var(--surface-lowest)', borderRadius: 10,
  boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
  padding: 6, minWidth: 180,
  border: '1px solid var(--surface-variant)',
};

const menuItemStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 10,
  width: '100%', padding: '10px 12px', border: 'none',
  background: 'none', cursor: 'pointer', borderRadius: 6,
  fontSize: '0.85rem', fontFamily: 'inherit', color: 'var(--on-surface)',
  textAlign: 'left',
};

const pageBtnStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: 32, height: 32, borderRadius: 8, border: '1.5px solid var(--surface-variant)',
  background: 'var(--surface-lowest)', cursor: 'pointer',
};

const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 100,
  background: 'rgba(0,0,0,0.4)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};

const modalStyle: React.CSSProperties = {
  background: 'var(--surface-lowest)', borderRadius: 16,
  padding: 28, width: '100%', maxWidth: 480,
  boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
};
