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
import LibraryPage from './pages/LibraryPage';
import FinancePage from './pages/FinancePage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import DocumentTemplatePage from './pages/DocumentTemplatePage';
import FileManagerPage from './pages/FileManagerPage';
import JobManagerPage from './pages/JobManagerPage';
import { WORKS_MODULES } from './config/worksModules';
import { Role } from './types';

function Wrapped({ children, roles }: { children: React.ReactNode; roles?: Role[] }) {
  return <ProtectedRoute roles={roles}><AppLayout>{children}</AppLayout></ProtectedRoute>;
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

      {/* Công trình khoa học */}
      <Route path="/projects" element={<Wrapped><WorkList mod={WORKS_MODULES.works} /></Wrapped>} />
      <Route path="/projects/new" element={<Wrapped><WorkCreate mod={WORKS_MODULES.works} /></Wrapped>} />
      <Route path="/projects/:id" element={<Wrapped><WorkDetail mod={WORKS_MODULES.works} /></Wrapped>} />

      {/* Bằng sáng chế */}
      <Route path="/patents" element={<Wrapped><WorkList mod={WORKS_MODULES.patents} /></Wrapped>} />
      <Route path="/patents/new" element={<Wrapped><WorkCreate mod={WORKS_MODULES.patents} /></Wrapped>} />
      <Route path="/patents/:id" element={<Wrapped><WorkDetail mod={WORKS_MODULES.patents} /></Wrapped>} />

      {/* Giáo trình */}
      <Route path="/textbooks" element={<Wrapped><WorkList mod={WORKS_MODULES.textbooks} /></Wrapped>} />
      <Route path="/textbooks/new" element={<Wrapped><WorkCreate mod={WORKS_MODULES.textbooks} /></Wrapped>} />
      <Route path="/textbooks/:id" element={<Wrapped><WorkDetail mod={WORKS_MODULES.textbooks} /></Wrapped>} />

      {/* AI */}
      <Route path="/ai" element={<Wrapped><AiAnalysis /></Wrapped>} />

      {/* Công bố khoa học */}
      <Route path="/publications" element={<Wrapped><Publications /></Wrapped>} />

      {/* Thư viện số */}
      <Route path="/library" element={<Wrapped><LibraryPage /></Wrapped>} />

      {/* Hội đồng chấm điểm — Quản trị + Phản biện */}
      <Route path="/committees" element={<Wrapped roles={[Role.ADMIN, Role.REVIEWER]}><CommitteeEvaluation /></Wrapped>} />

      {/* Khu vực quản trị — chỉ Quản trị viên */}
      <Route path="/finance" element={<Wrapped roles={[Role.ADMIN]}><FinancePage /></Wrapped>} />
      <Route path="/templates" element={<Wrapped roles={[Role.ADMIN]}><DocumentTemplatePage /></Wrapped>} />
      <Route path="/files" element={<Wrapped roles={[Role.ADMIN]}><FileManagerPage /></Wrapped>} />
      <Route path="/jobs" element={<Wrapped roles={[Role.ADMIN]}><JobManagerPage /></Wrapped>} />
      <Route path="/admin/users" element={<Wrapped roles={[Role.ADMIN]}><UserManagement /></Wrapped>} />

      {/* Cài đặt & Hồ sơ */}
      <Route path="/settings" element={<Wrapped><SettingsPage /></Wrapped>} />
      <Route path="/profile" element={<Wrapped><ProfilePage /></Wrapped>} />

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
