import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { Role } from '../types';

interface Props {
  children: React.ReactNode;
  roles?: Role[];
}

export default function ProtectedRoute({ children, roles }: Props) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'var(--surface-lowest)',
      }}>
        <div style={{
          width: 40,
          height: 40,
          border: '3px solid var(--surface-variant)',
          borderTopColor: 'var(--primary-indigo)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && user && !roles.includes(user.role)) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        gap: 16,
        background: 'var(--surface-lowest)',
      }}>
        <div style={{ fontSize: 64 }}>403</div>
        <h2 style={{ color: 'var(--on-surface)', margin: 0 }}>Không có quyền truy cập</h2>
        <p style={{ color: 'var(--on-surface-muted)' }}>
          Bạn không có quyền truy cập trang này.
        </p>
        <a href="/dashboard" style={{
          padding: '10px 24px',
          background: 'var(--primary-indigo)',
          color: '#fff',
          borderRadius: 8,
          textDecoration: 'none',
        }}>
          Về trang chính
        </a>
      </div>
    );
  }

  return <>{children}</>;
}
