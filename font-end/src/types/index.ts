export enum Role {
  ADMIN = 'ADMIN',
  REVIEWER = 'REVIEWER',
  LECTURER = 'LECTURER',
  STUDENT = 'STUDENT',
}

export const RoleLabels: Record<Role, string> = {
  [Role.ADMIN]: 'Quản trị viên',
  [Role.REVIEWER]: 'Phản biện',
  [Role.LECTURER]: 'Giảng viên',
  [Role.STUDENT]: 'Sinh viên',
};

export interface User {
  id: number;
  email: string;
  name: string | null;
  role: Role;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface UserStats {
  total: number;
  active: number;
  inactive: number;
  byRole: Record<string, number>;
}
