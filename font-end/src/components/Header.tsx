import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, HelpCircle, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { RoleLabels } from '../types';
import { notificationService } from '../services/notificationService';

export const Header = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    notificationService.getUnreadCount().then((d) => setUnread(d.count)).catch(() => {});
    const t = setInterval(() => {
      notificationService.getUnreadCount().then((d) => setUnread(d.count)).catch(() => {});
    }, 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setShowDropdown(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function toggleDropdown() {
    if (!showDropdown) {
      const data = await notificationService.getAll();
      setNotifications(data);
    }
    setShowDropdown(!showDropdown);
  }

  async function markAllRead() {
    await notificationService.markAllAsRead();
    setUnread(0);
    setNotifications((n) => n.map((x) => ({ ...x, isRead: true })));
  }

  return (
    <header className="app-header">
      <div className="search-container">
        <Search size={18} color="var(--on-surface-variant)" />
        <input type="text" placeholder="Tìm kiếm đề tài, bài báo, tác giả..." className="search-input" />
      </div>

      <div className="header-actions">
        <div ref={ref} style={{ position: 'relative' }}>
          <button className="icon-btn" onClick={toggleDropdown}>
            <Bell size={20} />
            {unread > 0 && <div className="notification-dot">{unread > 9 ? '9+' : unread}</div>}
          </button>

          {showDropdown && (
            <div style={{
              position: 'absolute', right: 0, top: 44, width: 360, maxHeight: 400,
              background: 'var(--surface-lowest)', borderRadius: 12, overflow: 'hidden',
              boxShadow: '0 12px 36px rgba(0,0,0,0.15)', zIndex: 200,
              border: '1px solid var(--surface-variant)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--surface-variant)' }}>
                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Thông báo</span>
                {unread > 0 && (
                  <button onClick={markAllRead} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: 'var(--primary-violet)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                    <Check size={12} /> Đọc tất cả
                  </button>
                )}
              </div>
              <div style={{ overflowY: 'auto', maxHeight: 340 }}>
                {notifications.length === 0 && <p style={{ padding: 24, textAlign: 'center', color: 'var(--on-surface-muted)', fontSize: '0.85rem' }}>Không có thông báo</p>}
                {notifications.map((n) => (
                  <div key={n.id}
                    onClick={() => { if (n.link) navigate(n.link); setShowDropdown(false); }}
                    style={{
                      padding: '10px 16px', cursor: n.link ? 'pointer' : 'default',
                      borderBottom: '1px solid var(--surface-variant)',
                      background: n.isRead ? 'transparent' : 'var(--surface-low)',
                    }}>
                    <div style={{ fontWeight: n.isRead ? 500 : 700, fontSize: '0.85rem', marginBottom: 2 }}>{n.title}</div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-muted)', lineHeight: 1.4 }}>{n.message}</p>
                    <span style={{ fontSize: '0.65rem', color: 'var(--on-surface-variant)' }}>{new Date(n.createdAt).toLocaleString('vi-VN')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <button className="icon-btn"><HelpCircle size={20} /></button>

        <div className="user-profile">
          <div className="user-info">
            <span className="user-name">{user?.name || user?.email || 'Người dùng'}</span>
            <span className="user-role">{user ? RoleLabels[user.role] : ''}</span>
          </div>
          <div className="avatar-container">
            <div className="user-avatar-text">{(user?.name || user?.email || 'U')[0].toUpperCase()}</div>
          </div>
        </div>
      </div>

      <style>{`
        .app-header { display: flex; justify-content: space-between; align-items: center; padding: 1rem 0; margin-bottom: 2rem; }
        .search-container { display: flex; align-items: center; gap: 0.75rem; background-color: var(--surface-lowest); padding: 0.75rem 1.25rem; border-radius: 100px; width: 400px; transition: box-shadow 0.2s ease; }
        .search-container:focus-within { box-shadow: 0 0 0 2px var(--surface-high); }
        .search-input { border: none; background: transparent; outline: none; flex: 1; color: var(--on-surface); font-family: inherit; }
        .search-input::placeholder { color: var(--on-surface-variant); }
        .header-actions { display: flex; align-items: center; gap: 1rem; }
        .icon-btn { background: transparent; border: none; color: var(--on-surface-muted); cursor: pointer; padding: 0.5rem; border-radius: 8px; display: flex; align-items: center; justify-content: center; position: relative; }
        .icon-btn:hover { background-color: var(--surface-low); color: var(--on-surface); }
        .notification-dot { position: absolute; top: 2px; right: 2px; min-width: 16px; height: 16px; background-color: var(--error); border-radius: 8px; border: 2px solid var(--surface); font-size: 0.55rem; font-weight: 800; color: #fff; display: flex; align-items: center; justify-content: center; padding: 0 3px; }
        .user-profile { display: flex; align-items: center; gap: 1rem; padding-left: 1rem; border-left: 2px solid var(--surface-low); }
        .user-info { display: flex; flex-direction: column; align-items: flex-end; }
        .user-name { font-weight: 700; font-size: 0.875rem; color: var(--primary-indigo); }
        .user-role { font-size: 0.625rem; font-weight: 700; color: var(--on-surface-muted); text-transform: uppercase; }
        .avatar-container { width: 40px; height: 40px; border-radius: 50%; overflow: hidden; background: var(--signature-gradient); display: flex; align-items: center; justify-content: center; }
        .user-avatar-text { color: #fff; font-weight: 800; font-size: 1rem; }
      `}</style>
    </header>
  );
};
