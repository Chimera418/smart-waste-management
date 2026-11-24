import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import api from '../services/api';
import type { User } from '../types';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (payload: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    address?: string;
  }) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    const token = localStorage.getItem('swm_token');
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const res = await api.get('/auth/me');
      setUser(res.data.data.user);
    } catch {
      localStorage.removeItem('swm_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    localStorage.setItem('swm_token', res.data.data.token);
    setUser(res.data.data.user);
    return res.data.data.user as User;
  };

  const register = async (payload: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    address?: string;
  }) => {
    const res = await api.post('/auth/register', { ...payload, role: 'citizen' });
    localStorage.setItem('swm_token', res.data.data.token);
    setUser(res.data.data.user);
    return res.data.data.user as User;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore network failures during stateless logout
    }
    localStorage.removeItem('swm_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
