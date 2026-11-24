import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import api from '../services/api';

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  registerAdmin: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('swm_p3_token');
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get('/auth/me')
      .then((res) => setUser(res.data.data.user))
      .catch(() => localStorage.removeItem('swm_p3_token'))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    localStorage.setItem('swm_p3_token', res.data.data.token);
    setUser(res.data.data.user);
  };

  const registerAdmin = async (name: string, email: string, password: string) => {
    const res = await api.post('/auth/register', { name, email, password, role: 'admin' });
    localStorage.setItem('swm_p3_token', res.data.data.token);
    setUser(res.data.data.user);
  };

  const logout = () => {
    localStorage.removeItem('swm_p3_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, registerAdmin, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
