import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Truck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const u = await login(email, password);
      if (u.role === 'worker') navigate('/worker');
      else if (u.role === 'vehicle_operator') navigate('/operator');
      else navigate('/tasks');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Sign in failed');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-600 text-white">
            <Truck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Collection & Fleet Portal</h1>
            <p className="text-xs text-slate-500">Person 2 Workspace — Workers, Vehicles & GPS</p>
          </div>
        </div>
        {error && (
          <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="password"
            required
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="w-full rounded-lg bg-sky-600 py-2.5 text-sm font-semibold text-white hover:bg-sky-700"
          >
            Sign In
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-600">
          Need an account?{' '}
          <Link to="/register" className="font-semibold text-sky-700 hover:underline">
            Register worker / operator
          </Link>
        </p>
      </div>
    </div>
  );
}
