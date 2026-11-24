import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../types';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'worker' as UserRole,
    phone: ''
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const u = await register(form);
      if (u.role === 'worker') navigate('/worker');
      else if (u.role === 'vehicle_operator') navigate('/operator');
      else navigate('/tasks');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Registration failed');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-xl font-bold text-slate-900">Register Operations Account</h1>
        <p className="mb-5 text-xs text-slate-500">Sanitation Workers, Vehicle Operators, or Supervisors</p>
        {error && (
          <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <input
            required
            placeholder="Full Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="email"
            required
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="password"
            required
            minLength={6}
            placeholder="Password (min 6)"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="worker">Sanitation Worker</option>
            <option value="vehicle_operator">Vehicle Operator</option>
            <option value="admin">Operations Administrator</option>
          </select>
          <input
            placeholder="Phone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="w-full rounded-lg bg-sky-600 py-2.5 text-sm font-semibold text-white hover:bg-sky-700"
          >
            Create Account
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-600">
          Already registered?{' '}
          <Link to="/login" className="font-semibold text-sky-700 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
