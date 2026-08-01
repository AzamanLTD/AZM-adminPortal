import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/AuthContext';
import { Eye, EyeOff, AlertCircle, ArrowRight } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await login(email, password);
    if (!result.success) setError(result.message);
    setLoading(false);
  };

  return (
    <div
      className="min-h-screen flex"
      style={{ background: 'var(--f-bg)' }}
    >
      {/* ── Left branding panel ── */}
      <div
        className="hidden lg:flex flex-col justify-between w-[340px] shrink-0 p-10 border-r"
        style={{
          background:  'var(--f-surface)',
          borderColor: 'var(--f-line)',
        }}
      >
        {/* Top: logo + tagline */}
        <div>
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
            className="flex items-center gap-3 mb-10"
          >
            <img
              src="/azaman-logo.png"
              alt="Azaman"
              className="w-9 h-9 rounded-xl object-contain"
            />
            <div>
              <p className="text-sm font-bold tracking-tight" style={{ color: 'var(--f-text)' }}>AZAMAN</p>
              <p className="text-[11px] font-medium" style={{ color: 'var(--f-text-3)' }}>Admin Portal</p>
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1, ease: [0.4, 0, 0.2, 1] }}
            className="text-[22px] font-bold leading-snug mb-3"
            style={{ color: 'var(--f-text)' }}
          >
            Platform<br />Control Center
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="text-sm leading-relaxed"
            style={{ color: 'var(--f-text-2)' }}
          >
            Manage users, compliance, finance, Susu groups, and merchants across the Azaman platform.
          </motion.p>
        </div>

        {/* Middle: feature list */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="space-y-3"
        >
          {[
            'Real-time platform stats',
            'KYC / KYB compliance queue',
            'Fee engine & revenue reporting',
            'Susu group monitoring',
            'Withdrawal & dispute management',
          ].map((f) => (
            <div key={f} className="flex items-center gap-2.5">
              <div
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ background: 'var(--f-ok)' }}
              />
              <span className="text-sm" style={{ color: 'var(--f-text-2)' }}>{f}</span>
            </div>
          ))}
        </motion.div>

        {/* Footer */}
        <p className="text-xs" style={{ color: 'var(--f-text-3)' }}>
          © 2026 Azaman. All rights reserved.
        </p>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          className="w-full max-w-[360px]"
        >
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <img src="/azaman-logo.png" alt="Azaman" className="w-8 h-8 rounded-xl object-contain" />
            <p className="text-sm font-bold" style={{ color: 'var(--f-text)' }}>AZAMAN Admin</p>
          </div>

          <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--f-text)' }}>Sign in</h2>
          <p className="text-sm mb-7" style={{ color: 'var(--f-text-3)' }}>
            Admin access only
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                className="block text-xs font-semibold uppercase tracking-wide mb-1.5"
                style={{ color: 'var(--f-text-3)' }}
              >
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@azaman.app"
                className="az-input"
                autoComplete="email"
              />
            </div>

            <div>
              <label
                className="block text-xs font-semibold uppercase tracking-wide mb-1.5"
                style={{ color: 'var(--f-text-3)' }}
              >
                Password
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="az-input pr-10"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: 'var(--f-text-3)' }}
                >
                  {showPw
                    ? <EyeOff style={{ width: 15, height: 15 }} />
                    : <Eye    style={{ width: 15, height: 15 }} />}
                </button>
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.18 }}
                className="flex items-center gap-2 p-3 rounded-md"
                style={{
                  background: 'var(--f-bad-bg)',
                  border:     '1px solid rgba(220,38,38,0.18)',
                }}
              >
                <AlertCircle style={{ width: 13, height: 13, color: 'var(--f-bad)', flexShrink: 0 }} />
                <p className="text-xs" style={{ color: 'var(--f-bad)' }}>{error}</p>
              </motion.div>
            )}

            <motion.button
              type="submit"
              disabled={loading}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.08 }}
              className="az-btn-primary w-full mt-1"
            >
              {loading ? (
                <div className="az-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight style={{ width: 14, height: 14 }} />
                </>
              )}
            </motion.button>
          </form>

          <p className="text-xs text-center mt-6" style={{ color: 'var(--f-text-3)' }}>
            Only admin accounts can access this portal.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
