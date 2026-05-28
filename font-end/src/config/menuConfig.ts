import {
  LayoutDashboard,
  BookOpen,
  Lightbulb,
  BookMarked,
  Trophy,
  FileSignature,
  Users,
  Wallet,
  Library,
  Cpu,
  Settings,
  LogOut,
  PlusCircle,
  UserCog,
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
  /** Nhãn nhóm hiển thị phía trên mục (để chia khu vực menu) */
  section?: string;
}

// Phân quyền chặt: chỉ gán `roles` cho các mục nhạy cảm; mục không có `roles` thì mọi vai trò đều thấy.
// Mỗi mục đều mang `section` để nhãn nhóm hiển thị đúng kể cả khi vài mục bị ẩn theo vai trò.
export const mainMenuItems: MenuItem[] = [
  // ── Tổng quan ──
  { key: 'dashboard', name: 'Bảng điều khiển', icon: LayoutDashboard, path: '/dashboard', section: 'TỔNG QUAN' },

  // ── Nghiệp vụ chính: quản lý các loại công trình ──
  { key: 'works', name: 'Công trình khoa học', icon: BookOpen, path: '/projects', section: 'QUẢN LÝ CÔNG TRÌNH' },
  { key: 'patents', name: 'Bằng sáng chế', icon: Lightbulb, path: '/patents', section: 'QUẢN LÝ CÔNG TRÌNH' },
  { key: 'textbooks', name: 'Giáo trình', icon: BookMarked, path: '/textbooks', section: 'QUẢN LÝ CÔNG TRÌNH' },
  { key: 'publications', name: 'Công trình thành công', icon: Trophy, path: '/publications', section: 'QUẢN LÝ CÔNG TRÌNH' },

  // ── Tra cứu & hỗ trợ ──
  { key: 'library', name: 'Thư viện số', icon: Library, path: '/library', section: 'TRA CỨU & TRỢ LÝ' },
  { key: 'ai-assistant', name: 'Trợ lý AI', icon: Cpu, path: '/ai', section: 'TRA CỨU & TRỢ LÝ' },

  // ── Hội đồng & xét duyệt: Quản trị + Phản biện ──
  { key: 'committees', name: 'Hội đồng chấm điểm', icon: Users, path: '/committees', roles: [Role.ADMIN, Role.REVIEWER], section: 'HỘI ĐỒNG & XÉT DUYỆT' },

  // ── Quản trị hệ thống: chỉ Quản trị viên ──
  { key: 'finance', name: 'Tài chính & Thi đua', icon: Wallet, path: '/finance', roles: [Role.ADMIN], section: 'QUẢN TRỊ HỆ THỐNG' },
  { key: 'templates', name: 'Mẫu tài liệu', icon: FileSignature, path: '/templates', roles: [Role.ADMIN], section: 'QUẢN TRỊ HỆ THỐNG' },
  { key: 'files', name: 'Kho tài liệu (MinIO)', icon: FolderOpen, path: '/files', roles: [Role.ADMIN], section: 'QUẢN TRỊ HỆ THỐNG' },
  { key: 'jobs', name: 'Hàng đợi tác vụ', icon: Activity, path: '/jobs', roles: [Role.ADMIN], section: 'QUẢN TRỊ HỆ THỐNG' },
  { key: 'user-management', name: 'Quản lý người dùng', icon: UserCog, path: '/admin/users', roles: [Role.ADMIN], section: 'QUẢN TRỊ HỆ THỐNG' },
];

export const bottomMenuItems: MenuItem[] = [
  { key: 'settings', name: 'Cài đặt', icon: Settings },
  { key: 'logout', name: 'Đăng xuất', icon: LogOut },
];

export const actionButton = {
  name: 'Đăng ký công trình mới',
  icon: PlusCircle,
  path: '/projects/new',
};
