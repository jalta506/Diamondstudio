import { useState, FormEvent, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('ds_token')) navigate('/admin', { replace: true });
  }, [navigate]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token } = await api.auth.login(email, password);
      localStorage.setItem('ds_token', token);
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-dark flex items-center justify-center p-6">
      {/* Background texture */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_#1a1108_0%,_#0a0806_60%)] pointer-events-none" />

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 border border-gold/30 mb-5">
            <span className="text-2xl">✂️</span>
          </div>
          <h1 className="font-headline text-3xl text-cream mb-1">Diamond Studio</h1>
          <p className="text-cream/40 text-sm tracking-widest uppercase">Panel de administración</p>
        </div>

        {/* Card */}
        <div className="border border-white/10 p-8 bg-white/[0.02]">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-cream/60 text-xs tracking-wide uppercase mb-2">
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/5 border border-white/10 text-cream px-4 py-3 text-sm focus:outline-none focus:border-gold/60 transition-colors placeholder:text-cream/20"
                placeholder="admin@diamondstudio.cr"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-cream/60 text-xs tracking-wide uppercase mb-2">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 text-cream px-4 py-3 text-sm focus:outline-none focus:border-gold/60 transition-colors"
                required
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gold text-dark font-semibold py-3 text-sm tracking-widest uppercase hover:bg-gold/90 disabled:opacity-50 transition-colors mt-2"
            >
              {loading ? 'Entrando…' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
