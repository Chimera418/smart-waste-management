import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Recycle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const DEMO_ACCOUNTS = [
  { label: 'Citizen', email: 'citizen@civicclean.org' },
  { label: 'Worker', email: 'worker@civicclean.org' },
  { label: 'Operator', email: 'operator@civicclean.org' },
  { label: 'Admin', email: 'admin@civicclean.org' }
];

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const routeByRole = (role: string) => {
    if (role === 'citizen') navigate('/citizen');
    else if (role === 'worker') navigate('/worker');
    else if (role === 'vehicle_operator') navigate('/operator');
    else navigate('/admin');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const user = await login(email, password);
      routeByRole(user.role);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Sign in failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-8">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 text-white">
            <Recycle className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">CivicClean SWM</h1>
            <p className="text-xs text-slate-500">Unified Smart Waste Management Platform</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-teal-600 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {submitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Optional Seeded Demo Accounts (Pass: Demo@1234)
          </p>
          <div className="grid grid-cols-4 gap-1.5">
            {DEMO_ACCOUNTS.map((d) => (
              <button
                key={d.label}
                type="button"
                onClick={() => {
                  setEmail(d.email);
                  setPassword('Demo@1234');
                }}
                className="rounded-lg border border-slate-300 bg-white py-1 text-xs font-medium text-slate-700 hover:bg-teal-50 hover:text-teal-800"
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        <p className="mt-5 text-center text-sm text-slate-600">
          New user?{' '}
          <Link to="/register" className="font-semibold text-teal-700 hover:underline">
            Create account
          </Link>
        </p>
      </div>
    </div>
  );
}
