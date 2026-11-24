import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, MapPin, ShieldCheck, Truck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const DEMO_ACCOUNTS = [
  { label: 'Citizen', email: 'citizen@civicclean.org', note: 'Report & track' },
  { label: 'Worker', email: 'worker@civicclean.org', note: 'Field crew' },
  { label: 'Operator', email: 'operator@civicclean.org', note: 'Vehicle GPS' },
  { label: 'Admin', email: 'admin@civicclean.org', note: 'Dispatch & SLA' }
];

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
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
      setError(err.response?.data?.error?.message || 'Sign in failed. Please check your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-dvh grid lg:grid-cols-12">
      {/* Left Architectural Editorial Panel */}
      <section className="civic-topo-bg hidden flex-col justify-between p-10 text-white lg:col-span-6 lg:flex xl:p-14">
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
              Municipal Operations Network
            </p>
          </div>
        </div>

        <div className="max-w-lg space-y-6">
          <div className="inline-flex items-center gap-2 rounded-md border border-[#26332C] bg-[#161E1A] px-3 py-1 font-mono text-[11px] text-[#A7F3D0]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#34D399]" />
            BENGALURU WARD NETWORK · LIVE DISPATCH
          </div>
          <h1 className="font-display text-4xl font-extrabold leading-[1.12] tracking-tight text-white">
            Cleaner wards through live dispatch and accountable SLAs.
          </h1>
          <p className="text-sm leading-relaxed text-[#A3ADA7]">
            One municipal workspace connecting citizen waste reports, weighted fleet routing, live vehicle telemetry, and automated SLA governance.
          </p>

          <div className="grid grid-cols-3 gap-4 border-t border-[#222B26] pt-6 text-xs">
            <div className="space-y-1">
              <MapPin className="h-4 w-4 text-[#34D399]" />
              <p className="font-semibold text-white">GeoJSON Wards</p>
              <p className="text-[#8A948E]">Pinpoint routing & 500m duplicate alerts</p>
            </div>
            <div className="space-y-1">
              <Truck className="h-4 w-4 text-[#34D399]" />
              <p className="font-semibold text-white">Live Fleet GPS</p>
              <p className="text-[#8A948E]">Real-time ETA & arrival notifications</p>
            </div>
            <div className="space-y-1">
              <ShieldCheck className="h-4 w-4 text-[#34D399]" />
              <p className="font-semibold text-white">Audited SLAs</p>
              <p className="text-[#8A948E]">Priority escalations & immutable logs</p>
            </div>
          </div>
        </div>

        <p className="font-mono text-[11px] text-[#6B7570]">
          CIVICCLEAN MUNICIPAL PLATFORM · ROLE-BASED PORTAL ACCESS
        </p>
      </section>

      {/* Right Clean Alabaster Sign-In Panel */}
      <section className="flex items-center justify-center bg-[#F5F4EF] px-6 py-10 lg:col-span-6">
        <div className="w-full max-w-md space-y-6">
          <div>
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#14533C]">
              Portal Sign In
            </p>
            <h2 className="mt-1 font-display text-2xl font-bold text-[#141917]">
              Access your workspace
            </h2>
            <p className="mt-1 text-sm text-[#5C6460]">
              Sign in with your municipal or citizen credentials.
            </p>
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
            <div>
              <label htmlFor="login-email" className="mb-1.5 block text-xs font-semibold text-[#141917]">
                Email Address
              </label>
              <input
                id="login-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="civic-input"
              />
            </div>

            <div>
              <label htmlFor="login-password" className="mb-1.5 block text-xs font-semibold text-[#141917]">
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPwd ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="civic-input pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  aria-label={showPwd ? 'Hide password' : 'Show password'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#78807B] hover:text-[#141917]"
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={submitting} className="civic-btn-primary w-full py-2.5">
              {submitting ? 'Signing in...' : 'Sign In'}
              {!submitting && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>

          <div className="rounded-xl border border-[#E2E0D5] bg-[#EFEDE6]/70 p-4">
            <div className="mb-2.5 flex items-center justify-between">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[#5C6460]">
                Quick Demo Accounts
              </p>
              <span className="font-mono text-[10px] text-[#78807B]">Pass: Demo@1234</span>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {DEMO_ACCOUNTS.map((d) => (
                <button
                  key={d.label}
                  type="button"
                  onClick={() => {
                    setEmail(d.email);
                    setPassword('Demo@1234');
                  }}
                  className="rounded-lg border border-[#D5D2C6] bg-white px-2.5 py-2 text-left transition hover:border-[#14533C] hover:bg-[#F5F4EF]"
                >
                  <p className="text-xs font-semibold text-[#141917]">{d.label}</p>
                  <p className="text-[10px] text-[#78807B]">{d.note}</p>
                </button>
              ))}
            </div>
          </div>

          <p className="text-center text-sm text-[#5C6460]">
            New to CivicClean?{' '}
            <Link to="/register" className="font-semibold text-[#14533C] hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
