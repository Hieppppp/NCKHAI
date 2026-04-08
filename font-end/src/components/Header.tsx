import { Search, Bell, HelpCircle } from 'lucide-react';

export const Header = () => {
  return (
    <header className="app-header">
      <div className="search-container">
        <Search size={18} color="var(--on-surface-variant)" />
        <input 
          type="text" 
          placeholder="Tìm kiếm đề tài, bài báo, tác giả..." 
          className="search-input"
        />
      </div>

      <div className="header-actions">
        <button className="icon-btn">
          <Bell size={20} />
          <div className="notification-dot" />
        </button>
        <button className="icon-btn">
          <HelpCircle size={20} />
        </button>
        
        <div className="user-profile">
          <div className="user-info">
            <span className="user-name">GS. Nguyễn Văn A</span>
            <span className="user-role">QUẢN TRỊ VIÊN</span>
          </div>
          <div className="avatar-container">
            <img 
              src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" 
              alt="User Avatar" 
              className="user-avatar"
            />
          </div>
        </div>
      </div>

      <style>{`
        .app-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 0;
          margin-bottom: 2rem;
        }

        .search-container {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background-color: var(--surface-lowest);
          padding: 0.75rem 1.25rem;
          border-radius: 100px;
          width: 400px;
          transition: box-shadow 0.2s ease;
        }

        .search-container:focus-within {
          box-shadow: 0 0 0 2px var(--surface-high);
        }

        .search-input {
          border: none;
          background: transparent;
          outline: none;
          flex: 1;
          color: var(--on-surface);
          font-family: inherit;
        }

        .search-input::placeholder {
          color: var(--on-surface-variant);
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .icon-btn {
          background: transparent;
          border: none;
          color: var(--on-surface-muted);
          cursor: pointer;
          padding: 0.5rem;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }

        .icon-btn:hover {
          background-color: var(--surface-low);
          color: var(--on-surface);
        }

        .notification-dot {
          position: absolute;
          top: 6px;
          right: 6px;
          width: 8px;
          height: 8px;
          background-color: var(--error);
          border-radius: 50%;
          border: 2px solid var(--surface);
        }

        .user-profile {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding-left: 1rem;
          border-left: 2px solid var(--surface-low);
        }

        .user-info {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
        }

        .user-name {
          font-weight: 700;
          font-size: 0.875rem;
          color: var(--primary-indigo);
        }

        .user-role {
          font-size: 0.625rem;
          font-weight: 700;
          color: var(--on-surface-muted);
        }

        .avatar-container {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          overflow: hidden;
          background: var(--surface-high);
        }

        .user-avatar {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
      `}</style>
    </header>
  );
};
