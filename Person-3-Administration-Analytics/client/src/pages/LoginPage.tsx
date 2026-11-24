import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const { login, registerAdmin } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (mode === 'login') await login(email, password);
      else await registerAdmin(name, email, password);
      navigate('/admin');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Authentication failed');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Municipal Admin Portal</h1>
            <p className="text-xs text-slate-500">Person 3 Workspace — Analytics, AI Priority & Audit</p>
          </div>
        </div>
        {error && (
          <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <input
              required
              placeholder="Administrator Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          )}
          <input
            type="email"
            required
            placeholder="Admin Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="password"
            required
            minLength={6}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            {mode === 'login' ? 'Sign In' : 'Create Admin Account'}
          </button>
        </form>
        <button
          onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
          className="mt-4 w-full text-center text-xs font-semibold text-indigo-700 hover:underline"
        >
          {mode === 'login' ? 'Register new admin account' : 'Back to sign in'}
        </button>
      </div>
    </div>
  );
}
