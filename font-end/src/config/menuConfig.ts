import {
  LayoutDashboard,
  BookOpen,
  FileText,
  Users,
  Wallet,
  Library,
  Cpu,
  Settings,
  LogOut,
  PlusCircle,
  UserCog,
  Clock,
  FolderOpen,
  Activity,
} from 'lucide-react';
import { Role } from '../types';

export interface MenuItem {
  key: string;
  name: string;
  icon: any;
  path?: string;
  roles?: Role[];
}

export const mainMenuItems: MenuItem[] = [
  { key: 'dashboard', name: 'Bảng điều khiển', icon: LayoutDashboard, path: '/dashboard' },
  { key: 'projects', name: 'Quản lý đề tài', icon: BookOpen, path: '/projects' },
  { key: 'publications', name: 'Công bố khoa học', icon: FileText, path: '/publications' },
  { key: 'committees', name: 'Hội đồng chấm điểm', icon: Users, path: '/committees' },
  { key: 'research-hours', name: 'Giờ chuẩn NCKH', icon: Clock, path: '/research-hours' },
  { key: 'finance', name: 'Tài chính & Thi đua', icon: Wallet, path: '/finance' },
  { key: 'library', name: 'Thư viện số', icon: Library, path: '/library' },
  { key: 'templates', name: 'Mẫu tài liệu', icon: FileText, path: '/templates' },
  { key: 'files', name: 'Quản lý tài liệu', icon: FolderOpen, path: '/files' },
  { key: 'jobs', name: 'Quản lý tác vụ', icon: Activity, path: '/jobs' },
  { key: 'ai-assistant', name: 'Trợ lý AI', icon: Cpu, path: '/ai' },
  { key: 'user-management', name: 'Quản lý người dùng', icon: UserCog, path: '/admin/users', roles: [Role.ADMIN] },
];

export const bottomMenuItems: MenuItem[] = [
  { key: 'settings', name: 'Cài đặt', icon: Settings },
  { key: 'logout', name: 'Đăng xuất', icon: LogOut },
];

export const actionButton = {
  name: 'Đăng ký đề tài mới',
  icon: PlusCircle,
};
