import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { authService } from '../services/authService';
import type { User, Role } from '../types';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => void;
  hasRole: (...roles: Role[]) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const savedUser = localStorage.getItem('user');

    if (token && savedUser) {
      try {
        const user = JSON.parse(savedUser) as User;
        setState({ user, isLoading: false, isAuthenticated: true });

        authService.getProfile().then((freshUser) => {
          localStorage.setItem('user', JSON.stringify(freshUser));
          setState({ user: freshUser, isLoading: false, isAuthenticated: true });
        }).catch(() => {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('user');
          setState({ user: null, isLoading: false, isAuthenticated: false });
        });
      } catch {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        setState({ user: null, isLoading: false, isAuthenticated: false });
      }
    } else {
      setState({ user: null, isLoading: false, isAuthenticated: false });
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await authService.login(email, password);
    localStorage.setItem('accessToken', response.accessToken);
    localStorage.setItem('user', JSON.stringify(response.user));
    setState({ user: response.user, isLoading: false, isAuthenticated: true });
  }, []);

  const register = useCallback(async (email: string, password: string, name?: string) => {
    const response = await authService.register(email, password, name);
    localStorage.setItem('accessToken', response.accessToken);
    localStorage.setItem('user', JSON.stringify(response.user));
    setState({ user: response.user, isLoading: false, isAuthenticated: true });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    setState({ user: null, isLoading: false, isAuthenticated: false });
  }, []);

  const hasRole = useCallback((...roles: Role[]) => {
    if (!state.user) return false;
    return roles.includes(state.user.role);
  }, [state.user]);

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
