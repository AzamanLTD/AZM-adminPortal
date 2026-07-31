import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff, AlertCircle, LogIn } from 'lucide-react';
import ParticleField from '@/components/ui/ParticleField';
import { spring } from '@/lib/motion';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const result = await login(email, password);
    if (!result.success) {
      setError(result.message);
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden"
      style={{ background: 'var(--az-bg)' }}>
      {/* Particle field background */}
      <ParticleField color="#00D97E" count={500} />

      {/* Vignette overlay */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center, transparent 0%, var(--az-bg) 80%)' }} />

      <motion.div
        initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-sm"
      >
        {/* Glass card */}
        <div className="az-glass rounded-2xl p-8 shadow-2xl"
          style={{
            background: 'rgba(13, 13, 26, 0.72)',
            backdropFilter: 'blur(20px) saturate(180%)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}>
          {/* Logo */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ ...spring.bouncy, delay: 0.2 }}
              className="inline-block mb-4"
            >
              <img
                src="/azaman-logo.png"
                alt="Azaman"
                className="w-14 h-14 rounded-2xl object-contain mx-auto"
                style={{ filter: 'drop-shadow(0 0 12px rgba(0, 217, 126, 0.4))' }}
              />
            </motion.div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--az-text-primary)' }}>Azaman Admin</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--az-text-secondary)' }}>Control Center Access</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={spring.snappy}
                className="flex items-center gap-2 rounded-lg p-3"
                style={{
                  background: 'var(--az-red-soft)',
                  border: '1px solid var(--az-red-soft)',
                }}
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--az-red)' }} />
                <p className="text-sm" style={{ color: 'var(--az-red)' }}>{error}</p>
              </motion.div>
            )}

            <div>
              <label className="text-xs block mb-1.5 font-medium" style={{ color: 'var(--az-text-secondary)' }}>Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@azaman.app"
                required
                className="az-input"
              />
            </div>

            <div>
              <label className="text-xs block mb-1.5 font-medium" style={{ color: 'var(--az-text-secondary)' }}>Password</label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="az-input pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: 'var(--az-text-muted)' }}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <motion.div whileTap={{ scale: 0.98 }} transition={{ duration: 0.08 }}>
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full font-medium transition-all"
                style={{
                  background: 'var(--az-emerald)',
                  color: '#070710',
                  boxShadow: '0 4px 12px var(--az-emerald-glow), inset 0 1px 0 rgba(255,255,255,0.15)',
                }}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 rounded-full animate-spin"
                      style={{ borderColor: 'rgba(7,7,16,0.3)', borderTopColor: '#070710' }} />
                    Authenticating...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <LogIn className="w-4 h-4" />
                    Sign In
                  </div>
                )}
              </Button>
            </motion.div>
          </form>

          <p className="text-xs text-center mt-6" style={{ color: 'var(--az-text-muted)' }}>
            Only admin accounts can access this portal.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
