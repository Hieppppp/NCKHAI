import { useLocation, useNavigate } from 'react-router-dom';
import { mainMenuItems, bottomMenuItems, actionButton } from '../config/menuConfig';
import { GraduationCap } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, hasRole } = useAuth();

  const handleSelect = (path: string | undefined) => {
    if (path) {
      navigate(path);
    }
  };

  const handleBottomClick = (key: string) => {
    if (key === 'logout') {
      logout();
      navigate('/login');
    }
  };

  const visibleMenuItems = mainMenuItems.filter(
    (item) => !item.roles || (user && hasRole(...item.roles))
  );

  return (
    <aside className="sidebar-container glass-slab">
      <div className="logo-section">
        <div className="logo-icon">
          <GraduationCap size={28} color="white" />
        </div>
        <div className="logo-text">
          <span className="logo-title">Hệ thống NCKH</span>
          <span className="logo-subtitle">DIGITAL CURATOR</span>
        </div>
      </div>

      <nav className="nav-section">
        <ul className="nav-list">
          {visibleMenuItems.map((item) => (
            <li
              key={item.key}
              className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
              onClick={() => handleSelect(item.path)}
            >
              <item.icon size={20} />
              <span className="nav-name">{item.name}</span>
              {location.pathname === item.path && <div className="active-pill" />}
            </li>
          ))}
        </ul>
      </nav>

      <div className="action-section">
        <button className="btn-signature">
          <actionButton.icon size={18} />
          {actionButton.name}
        </button>
      </div>

      <div className="bottom-section">
        <ul className="nav-list">
          {bottomMenuItems.map((item) => (
            <li
              key={item.key}
              className="nav-item"
              onClick={() => handleBottomClick(item.key)}
            >
              <item.icon size={20} />
              <span className="nav-name">{item.name}</span>
            </li>
          ))}
        </ul>
      </div>

      <style>{`
        .sidebar-container {
          width: 280px;
          height: 100vh;
          position: fixed;
          left: 0;
          top: 0;
          display: flex;
          flex-direction: column;
          padding: 2.5rem 1.5rem;
          background: rgba(255, 255, 255, 0.8);
          border-right: none;
          z-index: 100;
        }

        .logo-section {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 3rem;
          padding: 0 0.5rem;
        }

        .logo-icon {
          width: 40px;
          height: 40px;
          background: var(--signature-gradient);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .logo-title {
          display: block;
          font-weight: 800;
          font-size: 1.125rem;
          color: var(--on-surface);
        }

        .logo-subtitle {
          display: block;
          font-size: 0.625rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          color: var(--on-surface-muted);
        }

        .nav-section {
          flex: 1;
        }

        .nav-list {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.875rem 1rem;
          border-radius: 12px;
          color: var(--on-surface-muted);
          cursor: pointer;
          transition: all 0.2s ease;
          position: relative;
        }

        .nav-item:hover {
          background-color: var(--surface-low);
          color: var(--on-surface);
        }

        .nav-item.active {
          color: var(--primary-indigo);
          font-weight: 700;
          background-color: var(--surface-low);
        }

        .active-pill {
          position: absolute;
          left: -4px;
          width: 4px;
          height: 24px;
          background: var(--primary-violet);
          border-radius: 0 4px 4px 0;
        }

        .action-section {
          margin: 2rem 0;
        }

        .bottom-section {
          border-top: 2px solid var(--surface-low);
          padding-top: 1.5rem;
        }
      `}</style>
    </aside>
  );
};
