import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import ProtectedRoute from './components/ProtectedRoute';
import { CommitteeEvaluation } from './pages/CommitteeEvaluation';
import { Publications } from './pages/Publications';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import UserManagement from './pages/admin/UserManagement';
import DashboardPage from './pages/DashboardPage';
import WorkList from './pages/works/WorkList';
import WorkDetail from './pages/works/WorkDetail';
import WorkCreate from './pages/works/WorkCreate';
import AiAnalysis from './pages/ai/AiAnalysis';
import { Role } from './types';

function Wrapped({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute><AppLayout>{children}</AppLayout></ProtectedRoute>;
}

function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Protected routes */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<Wrapped><DashboardPage /></Wrapped>} />

      {/* Scientific Works */}
      <Route path="/projects" element={<Wrapped><WorkList /></Wrapped>} />
      <Route path="/projects/new" element={<Wrapped><WorkCreate /></Wrapped>} />
      <Route path="/projects/:id" element={<Wrapped><WorkDetail /></Wrapped>} />

      {/* AI */}
      <Route path="/ai" element={<Wrapped><AiAnalysis /></Wrapped>} />

      {/* Committees */}
      <Route path="/committees" element={<Wrapped><CommitteeEvaluation /></Wrapped>} />

      {/* Publications (keep existing) */}
      <Route path="/publications" element={<Wrapped><Publications /></Wrapped>} />

      {/* Admin */}
      <Route path="/admin/users" element={
        <ProtectedRoute roles={[Role.ADMIN]}>
          <AppLayout><UserManagement /></AppLayout>
        </ProtectedRoute>
      } />

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
