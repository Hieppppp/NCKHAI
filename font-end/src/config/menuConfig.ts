import { 
  LayoutDashboard, 
  BookOpen, 
  FileText, 
  Users, 
  DollarSign, 
  Library, 
  Cpu,
  Settings,
  LogOut,
  PlusCircle
} from 'lucide-react';

export interface MenuItem {
  key: string;
  name: string;
  icon: any;
  path?: string;
}

export const mainMenuItems: MenuItem[] = [
  { key: 'dashboard', name: 'Bảng điều khiển', icon: LayoutDashboard, path: '/dashboard' },
  { key: 'projects', name: 'Quản lý đề tài', icon: BookOpen, path: '/projects' },
  { key: 'publications', name: 'Công bố khoa học', icon: FileText, path: '/publications' },
  { key: 'committees', name: 'Hội đồng chấm điểm', icon: Users, path: '/committees' },
  { key: 'finance', name: 'Kinh phí & Khen thưởng', icon: DollarSign, path: '/finance' },
  { key: 'library', name: 'Thư viện số', icon: Library, path: '/library' },
  { key: 'ai-assistant', name: 'Trợ lý AI', icon: Cpu, path: '/ai-assistant' },
];

export const bottomMenuItems: MenuItem[] = [
  { key: 'settings', name: 'Cài đặt', icon: Settings },
  { key: 'logout', name: 'Đăng xuất', icon: LogOut },
];

export const actionButton = {
  name: 'Đăng ký đề tài mới',
  icon: PlusCircle,
};
