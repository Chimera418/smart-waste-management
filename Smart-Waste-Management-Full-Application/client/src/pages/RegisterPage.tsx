import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../types';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'citizen' as UserRole,
    phone: '',
    address: ''
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const u = await register(form);
      if (u.role === 'citizen') navigate('/citizen');
      else if (u.role === 'worker') navigate('/worker');
      else if (u.role === 'vehicle_operator') navigate('/operator');
      else navigate('/admin');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-dvh grid lg:grid-cols-12">
      <section className="civic-topo-bg hidden flex-col justify-between p-10 text-white lg:col-span-5 lg:flex xl:p-14">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#14533C] text-[#A7F3D0] ring-1 ring-[#2B7A5B]/60">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1">
              <path d="M4 17V7l8-4 8 4v10l-8 4-8-4Z" />
              <path d="M12 3v18M4 7l8 4 8-4" opacity="0.65" />
            </svg>
          </div>
          <div>
            <p className="font-display text-base font-bold tracking-tight">CivicClean SWM</p>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#8A948E]">
              Municipal Onboarding
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <h1 className="font-display text-3xl font-extrabold leading-tight text-white">
            Register for real-time waste alerts and live pickup tracking.
          </h1>
          <p className="text-sm leading-relaxed text-[#A3ADA7]">
            Use your real email address to receive instant confirmation, dispatch notifications, and live collection arrival updates.
          </p>
        </div>

        <p className="font-mono text-[11px] text-[#6B7570]">CIVICCLEAN · VERIFIED EMAIL ALERTS ENABLED</p>
      </section>

      <section className="flex items-center justify-center bg-[#F5F4EF] px-6 py-10 lg:col-span-7">
        <div className="w-full max-w-lg space-y-5">
          <div>
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#14533C]">
              New Account
            </p>
            <h2 className="mt-1 font-display text-2xl font-bold text-[#141917]">
              Create CivicClean Account
            </h2>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-lg border border-[#FCA5A5] bg-[#FEF2F2] px-3.5 py-2.5 text-xs font-medium text-[#991B1B]"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="civic-card space-y-4 p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#141917]">Full Name</label>
                <input
                  required
                  placeholder="Aarav Sharma"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="civic-input"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#141917]">Role</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
                  className="civic-input"
                >
                  <option value="citizen">Citizen</option>
                  <option value="worker">Sanitation Worker</option>
                  <option value="vehicle_operator">Vehicle Operator</option>
                  <option value="admin">Municipal Administrator</option>
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#141917]">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="you@gmail.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="civic-input"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#141917]">Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Min 6 characters"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="civic-input"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#141917]">Phone</label>
                <input
                  placeholder="+91 98765 43210"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="civic-input"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#141917]">Street Address</label>
                <input
                  placeholder="14 MG Road, Bengaluru"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="civic-input"
                />
              </div>
            </div>

            <button type="submit" disabled={submitting} className="civic-btn-primary w-full py-2.5">
              {submitting ? 'Creating account...' : 'Create Account'}
              {!submitting && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>

          <p className="text-center text-sm text-[#5C6460]">
            Already registered?{' '}
            <Link to="/login" className="font-semibold text-[#14533C] hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
